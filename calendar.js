const express = require('express');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { CLIENT_ID, CLIENT_SECRET, listarEventosPrimario } = require('../utils/calendarSync');
const Task = require('../models/Task');

const router = express.Router();
const JWT_SECRET = auth.JWT_SECRET;

function redirectUriDe(req) {
  return `${req.protocol}://${req.get('host')}/api/calendar/callback`;
}

// GET /api/calendar/status -> diz se o usuário logado já conectou a Google Agenda
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ connected: !!(user && user.googleCalendar && user.googleCalendar.refreshToken) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar a conexão com o Google Agenda.' });
  }
});

// GET /api/calendar/connect-url -> devolve a URL de autorização do Google
router.get('/connect-url', auth, (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'Integração com o Google Agenda não está configurada neste servidor.' });
  }
  const state = jwt.sign({ sub: req.userId }, JWT_SECRET, { expiresIn: '10m' });
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUriDe(req),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: 'https://www.googleapis.com/auth/calendar',
    state,
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

// GET /api/calendar/callback -> o Google redireciona o navegador pra cá após o consentimento
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error || !code || !state) return res.redirect('/index.html?calendar=erro');

    const payload = jwt.verify(state, JWT_SECRET);
    const userId = payload.sub;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUriDe(req),
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      return res.redirect('/index.html?calendar=erro');
    }

    const updates = {
      'googleCalendar.accessToken': tokens.access_token,
      'googleCalendar.expiryDate': Date.now() + tokens.expires_in * 1000,
    };
    // o Google só manda refresh_token na primeira autorização (por isso usamos prompt=consent)
    if (tokens.refresh_token) updates['googleCalendar.refreshToken'] = tokens.refresh_token;

    await User.findByIdAndUpdate(userId, updates);
    res.redirect('/index.html?calendar=conectado');
  } catch (err) {
    res.redirect('/index.html?calendar=erro');
  }
});

// POST /api/calendar/disconnect -> apaga os tokens guardados (não mexe nos eventos já criados)
router.post('/disconnect', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      'googleCalendar.accessToken': null,
      'googleCalendar.refreshToken': null,
      'googleCalendar.expiryDate': null,
      'googleCalendar.calendarId': null,
    });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desconectar do Google Agenda.' });
  }
});

// GET /api/calendar/agenda-mes?mes=YYYY-MM -> tarefas do CRM + eventos do Google
// Agenda (calendário principal do usuário) misturados, pra montar a visão de calendário
router.get('/agenda-mes', auth, async (req, res) => {
  try {
    const mes = req.query.mes; // "YYYY-MM"
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return res.status(400).json({ error: 'Informe o mês no formato YYYY-MM.' });
    const [ano, mesNum] = mes.split('-').map(Number);
    const inicioMes = new Date(ano, mesNum - 1, 1);
    const fimMes = new Date(ano, mesNum, 0, 23, 59, 59);

    const tarefas = await Task.find({
      userId: req.userId,
      vencimento: { $gte: inicioMes, $lte: fimMes },
    }).select('titulo vencimento prioridade concluida leadId').populate('leadId', 'cliente');

    let eventosGoogle = [];
    const user = await User.findById(req.userId);
    if (user && user.googleCalendar && user.googleCalendar.refreshToken) {
      try {
        eventosGoogle = await listarEventosPrimario(user, inicioMes, fimMes);
      } catch (e) {
        console.error('Erro ao buscar eventos do Google Agenda:', e.message);
      }
    }

    res.json({
      tarefas: tarefas.map((t) => ({
        id: t._id.toString(),
        titulo: t.titulo,
        vencimento: t.vencimento,
        prioridade: t.prioridade,
        concluida: t.concluida,
        leadId: t.leadId ? t.leadId._id.toString() : null,
        clienteNome: t.leadId ? t.leadId.cliente : null,
      })),
      eventosGoogle,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar a agenda do mês.' });
  }
});

module.exports = router;
