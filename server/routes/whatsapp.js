const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Card = require('../models/Card');
const Column = require('../models/Column');
const Message = require('../models/Message');

const router = express.Router();

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';
const GRAPH_API = 'https://graph.facebook.com/v19.0';

function normalizarTelefone(str) {
  let digitos = String(str || '').replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length <= 11) digitos = '55' + digitos;
  return digitos;
}

/* ===================== rotas públicas (chamadas pela Meta) ===================== */

// GET /api/whatsapp/webhook -> verificação inicial exigida pela Meta ao cadastrar o webhook
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// POST /api/whatsapp/webhook -> a Meta chama aqui a cada mensagem recebida (ou status de entrega)
router.post('/webhook', async (req, res) => {
  // responde rápido e sempre 200 — senão a Meta reenvia o mesmo evento várias vezes
  res.sendStatus(200);
  try {
    const entry = (req.body.entry || [])[0];
    const change = entry && (entry.changes || [])[0];
    const value = change && change.value;
    if (!value) return;

    const phoneNumberId = value.metadata && value.metadata.phone_number_id;
    if (!phoneNumberId) return;
    const user = await User.findOne({ 'whatsappBusiness.phoneNumberId': phoneNumberId });
    if (!user) return; // número não pertence a nenhuma conta cadastrada aqui

    for (const msg of value.messages || []) {
      const telefone = normalizarTelefone(msg.from);
      let card = await Card.findOne({ userId: user._id, telefoneNormalizado: telefone });

      if (!card) {
        // mensagem de um número que ainda não existe no funil — cria um lead novo automaticamente
        const coluna = await Column.findOne({ userId: user._id, tipo: 'aberto' }).sort({ ordem: 1 });
        if (!coluna) continue; // usuário não tem nenhuma coluna "em aberto" pra receber o lead
        const nomeContato =
          (value.contacts && value.contacts[0] && value.contacts[0].profile && value.contacts[0].profile.name) ||
          'Novo contato (WhatsApp)';
        card = await Card.create({
          userId: user._id,
          columnId: coluna._id,
          cliente: nomeContato,
          telefone: msg.from,
          valor: 0,
          temperatura: 'morno',
          obs: '',
          mes: new Date().toISOString().slice(0, 7),
        });
      }

      const texto = msg.text ? msg.text.body : '[mensagem em formato não suportado]';
      await Message.create({
        userId: user._id,
        cardId: card._id,
        direction: 'in',
        texto,
        whatsappMessageId: msg.id,
        timestamp: msg.timestamp ? new Date(parseInt(msg.timestamp, 10) * 1000) : new Date(),
      });
    }

    // atualizações de status (entregue/lido) das mensagens que nós mandamos
    for (const status of value.statuses || []) {
      await Message.updateOne({ whatsappMessageId: status.id }, { status: status.status });
    }
  } catch (err) {
    console.error('Erro ao processar webhook do WhatsApp:', err.message);
  }
});

/* ===================== rotas autenticadas (usadas pelo painel) ===================== */

// GET /api/whatsapp/status -> diz se o usuário já configurou o WhatsApp Business
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const conectado = !!(
      user &&
      user.whatsappBusiness &&
      user.whatsappBusiness.accessToken &&
      user.whatsappBusiness.phoneNumberId
    );
    res.json({ connected: conectado });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar a conexão com o WhatsApp.' });
  }
});

// POST /api/whatsapp/configurar -> salva o Phone Number ID e o Access Token gerados no Meta
router.post('/configurar', auth, async (req, res) => {
  try {
    const { phoneNumberId, accessToken, wabaId } = req.body;
    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({ error: 'Preencha o Phone Number ID e o Access Token.' });
    }
    await User.findByIdAndUpdate(req.userId, {
      'whatsappBusiness.phoneNumberId': phoneNumberId.trim(),
      'whatsappBusiness.accessToken': accessToken.trim(),
      'whatsappBusiness.wabaId': (wabaId || '').trim() || null,
    });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar a configuração.' });
  }
});

// POST /api/whatsapp/desconectar
router.post('/desconectar', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      'whatsappBusiness.phoneNumberId': null,
      'whatsappBusiness.accessToken': null,
      'whatsappBusiness.wabaId': null,
    });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desconectar.' });
  }
});

// GET /api/whatsapp/conversas/:cardId -> histórico de mensagens de um cliente
router.get('/conversas/:cardId', auth, async (req, res) => {
  try {
    const card = await Card.findOne({ _id: req.params.cardId, userId: req.userId });
    if (!card) return res.status(404).json({ error: 'Cliente não encontrado.' });
    const mensagens = await Message.find({ userId: req.userId, cardId: card._id }).sort({ timestamp: 1 });
    res.json({ mensagens: mensagens.map((m) => m.toJSON()) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar a conversa.' });
  }
});

// POST /api/whatsapp/enviar -> envia uma mensagem de texto pro cliente
router.post('/enviar', auth, async (req, res) => {
  try {
    const { cardId, texto } = req.body;
    if (!texto || !texto.trim()) return res.status(400).json({ error: 'Mensagem vazia.' });

    const user = await User.findById(req.userId);
    if (!user || !user.whatsappBusiness || !user.whatsappBusiness.accessToken) {
      return res.status(400).json({ error: 'WhatsApp Business não está conectado.' });
    }
    const card = await Card.findOne({ _id: cardId, userId: req.userId });
    if (!card) return res.status(404).json({ error: 'Cliente não encontrado.' });
    if (!card.telefoneNormalizado) return res.status(400).json({ error: 'Esse cliente não tem telefone cadastrado.' });

    const resp = await fetch(`${GRAPH_API}/${user.whatsappBusiness.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.whatsappBusiness.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: card.telefoneNormalizado,
        type: 'text',
        text: { body: texto },
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error((data.error && data.error.message) || 'Erro ao enviar mensagem pelo WhatsApp.');
    }

    const msg = await Message.create({
      userId: req.userId,
      cardId: card._id,
      direction: 'out',
      texto,
      whatsappMessageId: data.messages && data.messages[0] && data.messages[0].id,
      status: 'sent',
      timestamp: new Date(),
    });
    res.status(201).json(msg.toJSON());
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao enviar mensagem.' });
  }
});

module.exports = router;
