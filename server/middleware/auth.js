const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'troque-este-segredo-no-env';

// Protege rotas: exige um header "Authorization: Bearer <token>" válido.
// Também confere se o token ainda é a versão mais recente do usuário — permite
// "desconectar todos os dispositivos" sem precisar guardar sessão nenhuma.
// Em caso de sucesso, disponibiliza req.userId para a rota usar.
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
    const user = await User.findById(payload.sub).select('tokenVersion');
    if (!user) return sessaoInvalida('Sessão expirada ou inválida.');
    if ((payload.tv || 0) !== (user.tokenVersion || 0)) {
      return sessaoInvalida('Sessão encerrada em outro dispositivo. Faça login novamente.');
    }
    req.userId = payload.sub;
    next();
  } catch (err) {
    // erro do banco (ex.: acordando depois de um tempo parado): a sessão pode estar ótima
    console.error('[auth] erro ao conferir a sessão no banco:', err.message);
    return res.status(503).json({ error: 'O servidor está acordando. Tente de novo em alguns segundos.' });
  }
};

module.exports.JWT_SECRET = JWT_SECRET;
