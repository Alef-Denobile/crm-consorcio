const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Equipe = require('../models/Equipe');
const ConviteEquipe = require('../models/ConviteEquipe');
const ChatMensagem = require('../models/ChatMensagem');
const Card = require('../models/Card');
const Column = require('../models/Column');
const MetaVendasEquipe = require('../models/MetaVendasEquipe');
const MetaVendas = require('../models/MetaVendas');
const Task = require('../models/Task');
const { emailConfigurado, urlBaseDoApp, enviarEmail, montarEmailConviteEquipe } = require('../utils/email');
const { registrarAuditoria } = require('../utils/auditoria');
const { transferirTodosOsCards } = require('../utils/atribuirLead');
const T = require('../utils/equipesDoUsuario');

const router = express.Router();
router.use(auth); // todas as rotas de equipe exigem login

// Convites pendentes pro e-mail do usuário, com o nome da equipe e de quem convidou.
async function listarConvitesRecebidos(user) {
  if (!user || !user.email) return [];
  const convites = await ConviteEquipe.find({ email: user.email.toLowerCase() }).sort({ createdAt: -1 });
  const lista = [];
  for (const c of convites) {
    const equipe = await Equipe.findById(c.equipeId);
    if (!equipe) { await ConviteEquipe.findByIdAndDelete(c._id); continue; } // equipe já não existe
    const quem = await User.findById(c.convidadoPorId).select('nome email');
    lista.push({ id: c._id.toString(), equipeNome: equipe.nome, convidadoPor: (quem && (quem.nome || quem.email)) || 'Gestor' });
  }
  return lista;
}

// GET /api/equipe -> dados da equipe do usuário logado (null se ele não fizer parte de nenhuma)
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    // sem equipe: mostra os convites que chegaram pro e-mail dessa pessoa (ela decide se aceita)
    if (user && !user.equipeId && (user.outrasEquipes || []).length) { T.abrirEquipe(user, user.outrasEquipes[0].equipeId); await user.save(); }
    if (!user || !user.equipeId) return res.json({ equipe: null, minhasEquipes: [], convitesRecebidos: await listarConvitesRecebidos(user) });

    const equipe = await Equipe.findById(user.equipeId);
    if (!equipe) return res.json({ equipe: null, minhasEquipes: [], convitesRecebidos: await listarConvitesRecebidos(user) });

    const membros = await User.find({ ...T.filtroMembros(equipe._id) }).select('nome email papelEquipe supervisorDeDados equipeId outrasEquipes');
    const minhasEquipes = [];
    for (const eid of T.idsDasEquipes(user)) {
      const e = eid === equipe._id.toString() ? equipe : await Equipe.findById(eid);
      if (e) minhasEquipes.push({ id: e._id.toString(), nome: e.nome, papel: T.papelEm(user, e._id), ativa: e._id.toString() === equipe._id.toString(), membros: await User.countDocuments(T.filtroMembros(e._id)) });
    }
    const souSupervisor = user.papelEquipe === 'supervisor';

    res.json({
      equipe: {
        id: equipe._id.toString(),
        nome: equipe.nome,
        codigoConvite: souSupervisor ? equipe.codigoConvite : null,
        rodizio: souSupervisor ? { ativo: !!(user.rodizio && user.rodizio.ativo), membros: ((user.rodizio && user.rodizio.membros) || []).map(String) } : null,
        convitesPendentes: souSupervisor ? (await ConviteEquipe.find({ equipeId: equipe._id }).sort({ createdAt: -1 })).map((c) => ({ id: c._id.toString(), email: c.email, criadoEm: c.createdAt })) : [],
        souDono: equipe.donoId.toString() === req.userId,
        souSupervisor,
        souSupervisorDeDados: !!user.supervisorDeDados,
        membros: membros.map((m) => ({
          id: m._id.toString(),
          nome: m.nome,
          email: m.email,
          papel: T.papelEm(m, equipe._id),
          supervisorDeDados: T.supervisorDeDadosEm(m, equipe._id),
          souEu: m._id.toString() === req.userId,
        })),
      },
      minhasEquipes,
      convitesRecebidos: await listarConvitesRecebidos(user),
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar a equipe.' });
  }
});

// POST /api/equipe -> cria uma equipe nova (quem cria vira supervisor(a))
router.post('/', async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome da equipe é obrigatório.' });

    const user = await User.findById(req.userId);
    if (T.idsDasEquipes(user).length >= 10) return res.status(400).json({ error: 'Você já está em muitas equipes (limite de 10).' });

    const equipe = await Equipe.create({ nome: nome.trim(), donoId: req.userId });
    T.entrarEquipe(user, equipe._id, 'supervisor', true); // a equipe nova fica aberta; a que estava aberta fica guardada
    await user.save();

    res.status(201).json({ id: equipe._id.toString(), nome: equipe.nome, codigoConvite: equipe.codigoConvite });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar equipe.' });
  }
});

// POST /api/equipe/convites -> o gestor convida uma pessoa pelo e-mail (só supervisor). A pessoa precisa aceitar.
// A resposta é a mesma exista conta ou não, pra ninguém descobrir quem tem cadastro só testando e-mails.
router.post('/convites', async (req, res) => {
  try {
    const gestor = await User.findById(req.userId);
    if (!gestor || !gestor.equipeId || gestor.papelEquipe !== 'supervisor') {
      return res.status(403).json({ error: 'Só o gestor da equipe pode convidar pessoas.' });
    }
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Digite um e-mail válido.' });

    const jaMembro = await User.findOne({ email, ...T.filtroMembros(gestor.equipeId) });
    if (jaMembro) return res.status(400).json({ error: 'Essa pessoa já faz parte da equipe.' });

    const pendentes = await ConviteEquipe.countDocuments({ equipeId: gestor.equipeId });
    if (pendentes >= 50) return res.status(400).json({ error: 'Muitos convites pendentes. Cancele alguns antes de convidar mais.' });

    await ConviteEquipe.updateOne(
      { equipeId: gestor.equipeId, email },
      { $setOnInsert: { equipeId: gestor.equipeId, email, convidadoPorId: req.userId } },
      { upsert: true }
    );
    registrarAuditoria(req.userId, 'membro_convidado', `Convidou "${email}" para a equipe`);
    // aviso por e-mail (só se o servidor tiver e-mail configurado; se falhar, o convite continua valendo dentro do CRM)
    let emailEnviado = false;
    if (emailConfigurado()) {
      try {
        const msg = montarEmailConviteEquipe({ gestorNome: gestor.nome, link: `${urlBaseDoApp()}/login.html` });
        await enviarEmail({ para: email, assunto: msg.assunto, html: msg.html, texto: msg.texto });
        emailEnviado = true;
      } catch (e) { console.error('Erro ao enviar e-mail de convite:', e.message); }
    }
    res.status(201).json({ emailEnviado });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar o convite.' });
  }
});

// DELETE /api/equipe/convites/:id -> o gestor cancela um convite pendente
router.delete('/convites/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
    const gestor = await User.findById(req.userId);
    if (!gestor || !gestor.equipeId || gestor.papelEquipe !== 'supervisor') {
      return res.status(403).json({ error: 'Só o gestor da equipe pode cancelar convites.' });
    }
    const apagado = await ConviteEquipe.findOneAndDelete({ _id: req.params.id, equipeId: gestor.equipeId });
    if (!apagado) return res.status(404).json({ error: 'Convite não encontrado.' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cancelar o convite.' });
  }
});

// POST /api/equipe/convites/:id/aceitar -> a pessoa convidada entra na equipe
router.post('/convites/:id/aceitar', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
    const user = await User.findById(req.userId);
    const convite = await ConviteEquipe.findOne({ _id: req.params.id, email: user.email.toLowerCase() });
    if (!convite) return res.status(404).json({ error: 'Convite não encontrado.' });
    const equipe = await Equipe.findById(convite.equipeId);
    if (!equipe) { await ConviteEquipe.findByIdAndDelete(convite._id); return res.status(404).json({ error: 'Essa equipe não existe mais.' }); }

    if (T.membroDe(user, equipe._id)) { await ConviteEquipe.deleteMany({ equipeId: equipe._id, email: user.email.toLowerCase() }); return res.status(400).json({ error: 'Você já faz parte dessa equipe.' }); }
    if (T.idsDasEquipes(user).length >= 10) return res.status(400).json({ error: 'Você já está em muitas equipes (limite de 10).' });
    T.entrarEquipe(user, equipe._id, 'membro', false);
    await user.save();
    await ConviteEquipe.deleteMany({ equipeId: equipe._id, email: user.email.toLowerCase() }); // entrou: o convite dessa equipe some; os de outras continuam
    registrarAuditoria(convite.convidadoPorId, 'membro_entrou', `"${user.nome || user.email}" aceitou o convite e entrou na equipe`);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao aceitar o convite.' });
  }
});

// POST /api/equipe/convites/:id/recusar -> a pessoa convidada recusa
router.post('/convites/:id/recusar', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
    const user = await User.findById(req.userId);
    const apagado = await ConviteEquipe.findOneAndDelete({ _id: req.params.id, email: user.email.toLowerCase() });
    if (!apagado) return res.status(404).json({ error: 'Convite não encontrado.' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao recusar o convite.' });
  }
});

// PUT /api/equipe/rodizio -> o gestor liga/desliga o rodízio de leads novos e escolhe quem participa (só supervisor)
router.put('/rodizio', async (req, res) => {
  try {
    const gestor = await User.findById(req.userId);
    if (!gestor || !gestor.equipeId || gestor.papelEquipe !== 'supervisor') {
      return res.status(403).json({ error: 'Só o gestor da equipe pode configurar o rodízio.' });
    }
    const ativo = !!(req.body && req.body.ativo);
    const pedidos = Array.isArray(req.body && req.body.membros) ? req.body.membros.map(String) : [];
    const validos = await User.find({ _id: { $in: pedidos.filter((i) => mongoose.isValidObjectId(i)) }, ...T.filtroMembros(gestor.equipeId) }).select('_id');
    const ids = pedidos.filter((id) => validos.some((v) => String(v._id) === id)); // mantém a ordem escolhida
    if (ativo && !ids.length) return res.status(400).json({ error: 'Escolha pelo menos uma pessoa para o rodízio.' });
    await User.findByIdAndUpdate(req.userId, { 'rodizio.ativo': ativo, 'rodizio.membros': ids });
    registrarAuditoria(req.userId, 'rodizio_alterado', ativo ? `Rodízio de leads ligado com ${ids.length} pessoa(s)` : 'Rodízio de leads desligado');
    res.json({ ativo, membros: ids });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar o rodízio.' });
  }
});

// POST /api/equipe/entrar -> entra numa equipe existente usando o código de convite (vira membro)
router.post('/entrar', async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo || !codigo.trim()) return res.status(400).json({ error: 'Informe o código de convite.' });

    const user = await User.findById(req.userId);
    const equipe = await Equipe.findOne({ codigoConvite: codigo.trim().toUpperCase() });
    if (!equipe) return res.status(404).json({ error: 'Código de convite inválido.' });
    if (T.membroDe(user, equipe._id)) return res.status(400).json({ error: 'Você já faz parte dessa equipe.' });
    if (T.idsDasEquipes(user).length >= 10) return res.status(400).json({ error: 'Você já está em muitas equipes (limite de 10).' });

    T.entrarEquipe(user, equipe._id, 'membro', false);
    await user.save();

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao entrar na equipe.' });
  }
});

// POST /api/equipe/sair -> sai da equipe atual (o funil da pessoa continua intocado)
router.post('/sair', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const alvoId = (req.body && req.body.equipeId) || user.equipeId; // sem equipeId no pedido: sai da que está aberta
    if (!alvoId || !T.membroDe(user, alvoId)) return res.status(400).json({ error: 'Você não faz parte dessa equipe.' });

    const equipe = await Equipe.findById(alvoId);
    const eraDono = equipe && equipe.donoId.toString() === req.userId;

    T.sairEquipe(user, alvoId);
    await user.save();

    if (eraDono && equipe) {
      const restantes = await User.find({ ...T.filtroMembros(equipe._id) });
      if (!restantes.length) {
        // ninguém mais na equipe — apaga a equipe e o histórico do chat dela
        await Equipe.findByIdAndDelete(equipe._id);
        await ChatMensagem.deleteMany({ equipeId: equipe._id });
      } else {
        // passa a "dona" pra outro supervisor, ou promove o primeiro membro que sobrou
        const novoDono = restantes.find((m) => T.papelEm(m, equipe._id) === 'supervisor') || restantes[0];
        equipe.donoId = novoDono._id;
        await equipe.save();
        if (T.papelEm(novoDono, equipe._id) !== 'supervisor') {
          T.definirPapel(novoDono, equipe._id, 'supervisor');
          await novoDono.save();
        }
      }
    }

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao sair da equipe.' });
  }
});

// POST /api/equipe/abrir -> troca a equipe que está aberta (a pessoa continua em todas)
router.post('/abrir', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const alvoId = req.body && req.body.equipeId;
    if (!alvoId || !mongoose.isValidObjectId(alvoId) || !T.abrirEquipe(user, alvoId)) {
      return res.status(404).json({ error: 'Você não faz parte dessa equipe.' });
    }
    await user.save();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao abrir a equipe.' });
  }
});

// POST /api/equipe/regenerar-codigo -> gera um novo código de convite (só supervisor)
router.post('/regenerar-codigo', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user.equipeId || user.papelEquipe !== 'supervisor') {
      return res.status(403).json({ error: 'Só supervisores podem gerar um novo código.' });
    }
    const equipe = await Equipe.findById(user.equipeId);
    equipe.codigoConvite = Equipe.gerarCodigo();
    await equipe.save();
    res.json({ codigoConvite: equipe.codigoConvite });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar novo código.' });
  }
});

// PUT /api/equipe/membro/:userId/papel -> promove ou rebaixa um membro (só supervisor)
router.put('/membro/:userId/papel', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ error: 'ID inválido.' });
    const user = await User.findById(req.userId);
    if (!user.equipeId || user.papelEquipe !== 'supervisor') {
      return res.status(403).json({ error: 'Só supervisores podem alterar papéis.' });
    }
    const { papel } = req.body;
    if (!['supervisor', 'membro'].includes(papel)) return res.status(400).json({ error: 'Papel inválido.' });

    const alvo = await User.findOne({ _id: req.params.userId, ...T.filtroMembros(user.equipeId) });
    if (!alvo) return res.status(404).json({ error: 'Membro não encontrado nesta equipe.' });

    T.definirPapel(alvo, user.equipeId, papel);
    await alvo.save();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar o papel do membro.' });
  }
});

// PUT /api/equipe/membro/:userId/supervisor-dados -> concede ou revoga acesso ao
// monitoramento de erros (separado do papel de gestor da equipe; só gestor concede)
router.put('/membro/:userId/supervisor-dados', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ error: 'ID inválido.' });
    const user = await User.findById(req.userId);
    if (!user.equipeId || user.papelEquipe !== 'supervisor') {
      return res.status(403).json({ error: 'Só o gestor da equipe pode conceder esse acesso.' });
    }
    const { ativo } = req.body;
    const alvo = await User.findOne({ _id: req.params.userId, ...T.filtroMembros(user.equipeId) });
    if (!alvo) return res.status(404).json({ error: 'Membro não encontrado nesta equipe.' });

    T.definirSupervisorDeDados(alvo, user.equipeId, ativo);
    await alvo.save();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar o acesso de supervisor de dados.' });
  }
});

// GET /api/equipe/membro/:userId/leads -> quantos leads a pessoa tem (pra o gestor decidir o que fazer ao remover)
router.get('/membro/:userId/leads', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ error: 'ID inválido.' });
    const user = await User.findById(req.userId);
    if (!user.equipeId || user.papelEquipe !== 'supervisor') return res.status(403).json({ error: 'Só supervisores podem ver isso.' });
    const alvo = await User.findOne({ _id: req.params.userId, ...T.filtroMembros(user.equipeId) });
    if (!alvo) return res.status(404).json({ error: 'Membro não encontrado nesta equipe.' });
    res.json({ total: await Card.countDocuments({ userId: alvo._id }) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao contar os leads.' });
  }
});

// DELETE /api/equipe/membro/:userId -> remove um membro da equipe (só supervisor; o funil dele fica intacto)
router.delete('/membro/:userId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ error: 'ID inválido.' });
    const user = await User.findById(req.userId);
    if (!user.equipeId || user.papelEquipe !== 'supervisor') {
      return res.status(403).json({ error: 'Só supervisores podem remover membros.' });
    }
    if (req.params.userId === req.userId) {
      return res.status(400).json({ error: 'Use "Sair da equipe" para se remover.' });
    }
    const alvo = await User.findOne({ _id: req.params.userId, ...T.filtroMembros(user.equipeId) });
    if (!alvo) return res.status(404).json({ error: 'Membro não encontrado nesta equipe.' });

    // opcional: ?destinoLeads=<id de outra pessoa da equipe> passa todos os leads de quem sai pra ela.
    // Sem isso, os leads ficam com quem saiu (como sempre foi).
    let leadsPassados = 0;
    let destino = null;
    const destinoId = req.query.destinoLeads;
    if (destinoId) {
      if (!mongoose.isValidObjectId(destinoId) || destinoId === req.params.userId) {
        return res.status(400).json({ error: 'Escolha outra pessoa da equipe pra receber os leads.' });
      }
      destino = await User.findOne({ _id: destinoId, ...T.filtroMembros(user.equipeId) });
      if (!destino) return res.status(404).json({ error: 'A pessoa que receberia os leads não faz parte da equipe.' });
      try {
        leadsPassados = await transferirTodosOsCards(alvo._id, destino, req.userId);
      } catch (e) {
        return res.status(e.status || 500).json({ error: e.mensagem || 'Não foi possível passar os leads. Ninguém foi removido.' });
      }
    }

    T.sairEquipe(alvo, user.equipeId);
    await alvo.save();
    registrarAuditoria(req.userId, 'membro_removido', `Removeu "${alvo.nome || alvo.email}" da equipe${destino ? ` e passou ${leadsPassados} lead(s) para "${destino.nome || destino.email}"` : ''}`);
    res.json({ leadsPassados });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover o membro.' });
  }
});

// GET /api/equipe/chat -> mensagens do chat interno da equipe
router.get('/chat', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user.equipeId) return res.status(400).json({ error: 'Você não faz parte de nenhuma equipe.' });

    const mensagens = await ChatMensagem.find({ equipeId: user.equipeId, destinatarioId: null }).sort({ timestamp: 1 }).limit(200);
    res.json({ mensagens: mensagens.map((m) => m.toJSON()) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar o chat.' });
  }
});

// POST /api/equipe/chat -> envia uma mensagem no chat interno (da equipe toda)
router.post('/chat', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user.equipeId) return res.status(400).json({ error: 'Você não faz parte de nenhuma equipe.' });

    const { texto } = req.body;
    if (!texto || !texto.trim()) return res.status(400).json({ error: 'Mensagem vazia.' });

    const msg = await ChatMensagem.create({
      equipeId: user.equipeId,
      remetenteId: req.userId,
      remetenteNome: user.nome || user.email,
      texto: texto.trim(),
    });
    res.status(201).json(msg.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar a mensagem.' });
  }
});

// GET /api/equipe/chat/:userId -> histórico da conversa privada com um colega específico
router.get('/chat/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user.equipeId) return res.status(400).json({ error: 'Você não faz parte de nenhuma equipe.' });
    const outroId = req.params.userId;
    const outro = await User.findOne({ _id: outroId, ...T.filtroMembros(user.equipeId) });
    if (!outro) return res.status(404).json({ error: 'Esse colega não faz parte da sua equipe.' });

    const mensagens = await ChatMensagem.find({
      equipeId: user.equipeId,
      $or: [
        { remetenteId: req.userId, destinatarioId: outroId },
        { remetenteId: outroId, destinatarioId: req.userId },
      ],
    }).sort({ timestamp: 1 }).limit(200);
    res.json({ mensagens: mensagens.map((m) => m.toJSON()) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar a conversa.' });
  }
});

// POST /api/equipe/chat/:userId -> envia uma mensagem privada pra um colega específico
router.post('/chat/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user.equipeId) return res.status(400).json({ error: 'Você não faz parte de nenhuma equipe.' });
    const outroId = req.params.userId;
    const outro = await User.findOne({ _id: outroId, ...T.filtroMembros(user.equipeId) });
    if (!outro) return res.status(404).json({ error: 'Esse colega não faz parte da sua equipe.' });

    const { texto } = req.body;
    if (!texto || !texto.trim()) return res.status(400).json({ error: 'Mensagem vazia.' });

    const msg = await ChatMensagem.create({
      equipeId: user.equipeId,
      remetenteId: req.userId,
      remetenteNome: user.nome || user.email,
      destinatarioId: outroId,
      texto: texto.trim(),
    });
    res.status(201).json(msg.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar a mensagem.' });
  }
});

// GET /api/equipe/supervisao -> desempenho de cada membro (só supervisor).
// Cada membro tem o próprio funil isolado — aqui só lemos um resumo agregado,
// nunca os clientes/negociações em si.
router.get('/supervisao', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user.equipeId || user.papelEquipe !== 'supervisor') {
      return res.status(403).json({ error: 'Só supervisores podem ver essa página.' });
    }

    const membros = await User.find({ ...T.filtroMembros(user.equipeId) });
    const mesAtual = new Date().toISOString().slice(0, 7);
    const resultado = [];
    for (const m of membros) {
      const [colunas, cards, metaMembro] = await Promise.all([
        Column.find({ userId: m._id }),
        Card.find({ userId: m._id }),
        MetaVendas.findOne({ userId: m._id, mes: mesAtual }),
      ]);
      let vendidoNoMes = 0;
      let ganhoValor = 0;
      let perdidoValor = 0;
      let abertoValor = 0;
      cards.forEach((c) => {
        const col = colunas.find((k) => k._id.toString() === c.columnId.toString());
        if (!col) return;
        if (col.tipo === 'ganho') { ganhoValor += Number(c.valor) || 0; if (c.mes === mesAtual) vendidoNoMes += Number(c.valor) || 0; }
        else if (col.tipo === 'perdido') perdidoValor += Number(c.valor) || 0;
        else if (col.tipo === 'aberto') abertoValor += Number(c.valor) || 0;
      });
      resultado.push({
        userId: m._id.toString(),
        nome: m.nome || m.email,
        papel: T.papelEm(m, user.equipeId),
        totalLeads: cards.length,
        ganhoValor,
        perdidoValor,
        abertoValor,
        vendidoNoMes,
        metaMes: metaMembro ? metaMembro.valorMeta : 0,
      });
    }
    res.json({ membros: resultado, mes: mesAtual });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar a supervisão.' });
  }
});

// GET /api/equipe/supervisao/:userId/dashboard -> tudo que o Dashboard precisa
// (colunas, clientes, tarefas, meta individual) de um membro específico da equipe —
// só leitura, pro supervisor acompanhar sem poder alterar nada daquela pessoa.
router.get('/supervisao/:userId/dashboard', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    const user = await User.findById(req.userId);
    if (!user.equipeId || user.papelEquipe !== 'supervisor') {
      return res.status(403).json({ error: 'Só supervisores podem ver essa página.' });
    }
    const membro = await User.findOne({ _id: req.params.userId, ...T.filtroMembros(user.equipeId) });
    if (!membro) return res.status(404).json({ error: 'Membro não encontrado nessa equipe.' });

    const mesAtual = new Date().toISOString().slice(0, 7);
    const [columns, cards, tasks, meta] = await Promise.all([
      Column.find({ userId: membro._id }),
      Card.find({ userId: membro._id, arquivado: { $ne: true } }),
      Task.find({ userId: membro._id }),
      MetaVendas.findOne({ userId: membro._id, mes: mesAtual }),
    ]);

    res.json({
      nome: membro.nome || membro.email,
      columns: columns.map((c) => c.toJSON()),
      cards: cards.map((c) => c.toJSON()),
      tasks: tasks.map((t) => t.toJSON()),
      metaVendasValor: meta ? meta.valorMeta : 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar o dashboard desse membro.' });
  }
});

// GET /api/equipe/meta-vendas/:mes -> meta e total vendido pela equipe inteira naquele mês
router.get('/meta-vendas/:mes', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user.equipeId) return res.status(400).json({ error: 'Você não faz parte de nenhuma equipe.' });

    const mes = req.params.mes;
    const [meta, membros] = await Promise.all([
      MetaVendasEquipe.findOne({ equipeId: user.equipeId, mes }),
      User.find({ ...T.filtroMembros(user.equipeId) }),
    ]);

    let vendidoNoMes = 0;
    for (const m of membros) {
      const [colunas, cards] = await Promise.all([
        Column.find({ userId: m._id }),
        Card.find({ userId: m._id, mes }),
      ]);
      cards.forEach((c) => {
        const col = colunas.find((k) => k._id.toString() === c.columnId.toString());
        if (col && col.tipo === 'ganho') vendidoNoMes += Number(c.valor) || 0;
      });
    }

    res.json({
      mes,
      valorMeta: meta ? meta.valorMeta : 12000000,
      vendidoNoMes,
      souGestor: user.papelEquipe === 'supervisor',
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar a meta da equipe.' });
  }
});

// PUT /api/equipe/membro/:userId/meta-vendas -> o gestor define a meta do mês atual de uma pessoa da equipe
router.put('/membro/:userId/meta-vendas', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ error: 'ID inválido.' });
    const gestor = await User.findById(req.userId);
    if (!gestor || !gestor.equipeId || gestor.papelEquipe !== 'supervisor') {
      return res.status(403).json({ error: 'Só o gestor da equipe pode definir a meta de uma pessoa.' });
    }
    const membro = await User.findOne({ _id: req.params.userId, ...T.filtroMembros(gestor.equipeId) });
    if (!membro) return res.status(404).json({ error: 'Membro não encontrado nessa equipe.' });
    const valorMeta = req.body && req.body.valorMeta;
    if (typeof valorMeta !== 'number' || !isFinite(valorMeta) || valorMeta < 0) {
      return res.status(400).json({ error: 'Informe um valor de meta válido.' });
    }
    const mes = new Date().toISOString().slice(0, 7);
    const meta = await MetaVendas.findOneAndUpdate({ userId: membro._id, mes }, { valorMeta }, { new: true, upsert: true, runValidators: true });
    registrarAuditoria(req.userId, 'meta_membro_alterada', `Definiu meta de ${valorMeta} para ${membro.nome || membro.email} em ${mes}`);
    res.json({ mes, valorMeta: meta.valorMeta });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar a meta da pessoa.' });
  }
});

// PUT /api/equipe/meta-vendas/:mes -> define/atualiza a meta da equipe naquele mês (só gestor)
router.put('/meta-vendas/:mes', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user.equipeId) return res.status(400).json({ error: 'Você não faz parte de nenhuma equipe.' });
    if (user.papelEquipe !== 'supervisor') {
      return res.status(403).json({ error: 'Só o gestor da equipe pode alterar essa meta.' });
    }
    const { valorMeta } = req.body;
    if (typeof valorMeta !== 'number' || valorMeta < 0) {
      return res.status(400).json({ error: 'Informe um valor de meta válido.' });
    }
    const meta = await MetaVendasEquipe.findOneAndUpdate(
      { equipeId: user.equipeId, mes: req.params.mes },
      { valorMeta },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(meta.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar a meta da equipe.' });
  }
});

module.exports = router;
