const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { filtroMembros } = require('../utils/equipesDoUsuario');

const JWT_SECRET = process.env.JWT_SECRET || 'troque-este-segredo-no-env';
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test' && !process.argv.some((a) => a.includes('--test'))) {
  // sem JWT_SECRET qualquer pessoa conseguiria forjar um login: define a variável no Render (Environment)
  console.warn('⚠ ATENÇÃO: JWT_SECRET não está definido. Defina uma frase longa e secreta nas variáveis de ambiente do servidor.');
}

// Protege rotas: exige um header "Authorization: Bearer <token>" válido.
// Também confere se o token ainda é a versão mais recente do usuário — permite
// "desconectar todos os dispositivos" sem precisar guardar sessão nenhuma.
// Em caso de sucesso, disponibiliza req.userId para a rota usar.
// "Atuar como": o gestor da equipe trabalha no funil de um consultor (vê, cria, edita, exclui
// e transfere leads e tarefas dele). O navegador manda o header X-Atuar-Como com o id do
// consultor; só vale se quem pede é gestor e o consultor é da MESMA equipe. Só estas áreas
// aceitam o modo (nada de configurações, senha, integrações, backup...), e as conversas
// de WhatsApp ficam só para leitura. Toda alteração fica registrada na auditoria.
const AREAS_ATUAR_COMO = ['/api/board', '/api/columns', '/api/cards', '/api/tasks', '/api/funis', '/api/historico-contato', '/api/campos-personalizados', '/api/whatsapp', '/api/calendar/agenda-mes'];
function areaPermitidaParaAtuarComo(req){
  const url = (req.originalUrl || '').split('?')[0];
  if (!AREAS_ATUAR_COMO.some(p => url === p || url.startsWith(p + '/'))) return false;
  if ((url.startsWith('/api/whatsapp') || url.startsWith('/api/calendar')) && req.method !== 'GET') return false;
  return true;
}

module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Não autenticado.', codigo: 'sessao_invalida' });
  }

  // "codigo: sessao_invalida" é o que avisa o navegador que a sessão acabou de verdade e ele pode
  // mandar a pessoa pro login. Qualquer outro problema (banco acordando, falha de rede) NÃO usa
  // esse código, pra ninguém ser deslogado por um soluço do servidor.
  const sessaoInvalida = (mensagem) => res.status(401).json({ error: mensagem, codigo: 'sessao_invalida' });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return sessaoInvalida('Sessão expirada ou inválida.');
  }
  if (payload.twofa) {
    // token temporário de 2FA — só serve pra validar o código, nunca pra acessar rotas normais
    return sessaoInvalida('Sessão expirada ou inválida.');
  }
  try {
    const user = await User.findById(payload.sub).select('tokenVersion equipeId papelEquipe nome');
    if (!user) return sessaoInvalida('Sessão expirada ou inválida.');
    if ((payload.tv || 0) !== (user.tokenVersion || 0)) {
      return sessaoInvalida('Sessão encerrada em outro dispositivo. Faça login novamente.');
    }
    req.userId = payload.sub;

    const alvoId = req.headers['x-atuar-como'];
    if (alvoId && String(alvoId) !== String(payload.sub)) {
      if (!mongoose.isValidObjectId(alvoId)) return res.status(400).json({ error: 'Consultor inválido.' });
      if (!user.equipeId || user.papelEquipe !== 'supervisor') {
        return res.status(403).json({ error: 'Só o gestor da equipe pode atuar no funil de outra pessoa.', codigo: 'atuar_como_negado' });
      }
      const alvo = await User.findOne({ _id: alvoId, ...filtroMembros(user.equipeId) }).select('nome email');
      if (!alvo) return res.status(404).json({ error: 'Esse consultor não está na sua equipe.', codigo: 'atuar_como_negado' });
      if (!areaPermitidaParaAtuarComo(req)) {
        return res.status(403).json({ error: 'Essa ação não está disponível enquanto você atua no funil de outra pessoa.' });
      }
      req.realUserId = String(payload.sub);
      req.atuandoComo = true;
      req.userId = String(alvo._id);
      if (req.method !== 'GET') {
        const nomeAlvo = alvo.nome || alvo.email;
        const nomeGestor = user.nome || 'O gestor';
        const rota = (req.originalUrl || '').split('?')[0].replace('/api/', '');
        res.on('finish', () => {
          if (res.statusCode >= 400) return;
          AuditLog.create([
            { userId: user._id, acao: 'gestor_atuou', detalhe: `Você (gestor) fez ${req.method} em ${rota} no funil de ${nomeAlvo}` },
            { userId: alvo._id, acao: 'gestor_atuou', detalhe: `O gestor ${nomeGestor} fez ${req.method} em ${rota} no seu funil` },
          ]).catch(() => {});
        });
      }
    }
    next();
  } catch (err) {
    // erro do banco (ex.: acordando depois de um tempo parado): a sessão pode estar ótima
    console.error('[auth] erro ao conferir a sessão no banco:', err.message);
    return res.status(503).json({ error: 'O servidor está acordando. Tente de novo em alguns segundos.' });
  }
};

module.exports.JWT_SECRET = JWT_SECRET;
