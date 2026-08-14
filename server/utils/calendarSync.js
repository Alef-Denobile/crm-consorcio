const User = require('../models/User');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const NOME_CALENDARIO = 'Painel do Consórcio — Tarefas';

// Troca o refresh token por um access token novo (o access token expira em ~1h)
async function renovarAccessToken(refreshToken) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('Falha ao renovar o token do Google.');
  return res.json(); // { access_token, expires_in, ... }
}

// Devolve um access token válido para o usuário, renovando se necessário.
// Retorna null se o usuário nunca conectou a Google Agenda.
async function getValidAccessToken(user) {
  const gc = user.googleCalendar;
  if (!gc || !gc.refreshToken) return null;

  const agora = Date.now();
  if (gc.accessToken && gc.expiryDate && gc.expiryDate - 60000 > agora) {
    return gc.accessToken;
  }

  const dados = await renovarAccessToken(gc.refreshToken);
  const novoExpiry = Date.now() + dados.expires_in * 1000;
  await User.findByIdAndUpdate(user._id, {
    'googleCalendar.accessToken': dados.access_token,
    'googleCalendar.expiryDate': novoExpiry,
  });
  return dados.access_token;
}

// Chamada genérica à API do Google Calendar autenticada com o token do usuário
async function chamarCalendarApi(user, path, options = {}) {
  const accessToken = await getValidAccessToken(user);
  if (!accessToken) return null;

  const res = await fetch(CALENDAR_API + path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (res.status === 204) return {};
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.error && data.error.message) || 'Erro na API do Google Agenda.');
  return data;
}

// Garante que existe um calendário dedicado ("Painel do Consórcio — Tarefas")
// e devolve o id dele, guardando em cache no próprio usuário.
async function getOrCreateCalendarId(user) {
  if (user.googleCalendar.calendarId) return user.googleCalendar.calendarId;

  const lista = await chamarCalendarApi(user, '/users/me/calendarList');
  const existente = (lista.items || []).find((c) => c.summary === NOME_CALENDARIO);

  let calendarId;
  if (existente) {
    calendarId = existente.id;
  } else {
    const criado = await chamarCalendarApi(user, '/calendars', {
      method: 'POST',
      body: JSON.stringify({ summary: NOME_CALENDARIO }),
    });
    calendarId = criado.id;
  }
  await User.findByIdAndUpdate(user._id, { 'googleCalendar.calendarId': calendarId });
  return calendarId;
}

module.exports = {
  chamarCalendarApi,
  getOrCreateCalendarId,
  getValidAccessToken,
  NOME_CALENDARIO,
  CLIENT_ID,
  CLIENT_SECRET,
};
