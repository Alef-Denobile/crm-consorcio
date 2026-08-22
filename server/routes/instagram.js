const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Card = require('../models/Card');
const Column = require('../models/Column');

const router = express.Router();

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || '';
const GRAPH_API = 'https://graph.facebook.com/v19.0';

// tenta achar o valor de um campo do formulário, testando os nomes mais comuns
function extrairCampo(campos, possiveisNomes) {
  for (const nome of possiveisNomes) {
    if (campos[nome]) return campos[nome];
  }
  return '';
}

/* ===================== rotas públicas (chamadas pela Meta) ===================== */

// GET /api/instagram/webhook -> verificação inicial exigida pela Meta ao cadastrar o webhook
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// POST /api/instagram/webhook -> a Meta chama aqui toda vez que alguém preenche um formulário de anúncio
router.post('/webhook', async (req, res) => {
  res.sendStatus(200); // responde rápido e sempre 200, senão a Meta reenvia o mesmo evento
  try {
    const entry = (req.body.entry || [])[0];
    if (!entry) return;
    const pageId = entry.id;
    const user = await User.findOne({ 'instagramLeads.pageId': pageId });
    if (!user) return; // página não pertence a nenhuma conta cadastrada aqui

    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue;
      const leadgenId = change.value && change.value.leadgen_id;
      if (!leadgenId) continue;

      const resp = await fetch(`${GRAPH_API}/${leadgenId}?access_token=${user.instagramLeads.pageAccessToken}`);
      const leadData = await resp.json();
      if (!resp.ok) {
        console.error('Erro ao buscar lead do Instagram:', leadData.error && leadData.error.message);
        continue;
      }

      const campos = {};
      (leadData.field_data || []).forEach((f) => {
        campos[f.name] = (f.values && f.values[0]) || '';
      });

      const nome = extrairCampo(campos, ['full_name', 'nome_completo', 'name', 'nome']) || 'Lead do Instagram';
      const telefone = extrairCampo(campos, ['phone_number', 'telefone', 'phone']);
      const email = extrairCampo(campos, ['email', 'e-mail']);

      const coluna = await Column.findOne({ userId: user._id, tipo: 'aberto' }).sort({ ordem: 1 });
      if (!coluna) continue; // usuário não tem nenhuma coluna "em aberto" pra receber o lead

      await Card.create({
        userId: user._id,
        columnId: coluna._id,
        cliente: nome,
        telefone,
        valor: 0,
        temperatura: 'morno',
        obs: `Capturado via anúncio do Instagram/Facebook.${email ? ` E-mail: ${email}` : ''}`,
        mes: new Date().toISOString().slice(0, 7),
      });
    }
  } catch (err) {
    console.error('Erro ao processar webhook do Instagram:', err.message);
  }
});

/* ===================== rotas autenticadas (usadas pelo painel) ===================== */

// GET /api/instagram/status -> diz se o usuário já conectou a captação de leads
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const conectado = !!(
      user &&
      user.instagramLeads &&
      user.instagramLeads.pageAccessToken &&
      user.instagramLeads.pageId
    );
    res.json({ connected: conectado });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar a conexão com o Instagram.' });
  }
});

// POST /api/instagram/configurar -> salva o Page ID e o token de acesso de página gerados no Meta
router.post('/configurar', auth, async (req, res) => {
  try {
    const { pageId, pageAccessToken } = req.body;
    if (!pageId || !pageAccessToken) {
      return res.status(400).json({ error: 'Preencha o Page ID e o Access Token da página.' });
    }
    await User.findByIdAndUpdate(req.userId, {
      'instagramLeads.pageId': pageId.trim(),
      'instagramLeads.pageAccessToken': pageAccessToken.trim(),
    });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar a configuração.' });
  }
});

// POST /api/instagram/desconectar
router.post('/desconectar', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      'instagramLeads.pageId': null,
      'instagramLeads.pageAccessToken': null,
    });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desconectar.' });
  }
});

module.exports = router;
