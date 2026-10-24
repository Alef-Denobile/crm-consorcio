const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const G = '64b000000000000000000001', M = '64b000000000000000000002', OUTRO = '64b000000000000000000003';
const EQ = '64b0000000000000000000aa';
function rodar({ headers = {}, method = 'GET', url = '/api/cards', usuarios }) {
  return new Promise((resolve) => {
    const token = jwt.sign({ sub: G, tv: 0 }, auth.JWT_SECRET);
    const orig = { f: User.findById, o: User.findOne, c: AuditLog.create };
    const logs = [];
    User.findById = () => ({ select: async () => usuarios[G] });
    User.findOne = (q) => ({ select: async () => usuarios[String(q._id)] && usuarios[String(q._id)].equipeId === (q.equipeId || (q.$or && q.$or[0].equipeId)) ? usuarios[String(q._id)] : null });
    AuditLog.create = async (l) => { logs.push(l); return l; };
    const req = { headers: { authorization: 'Bearer ' + token, ...headers }, method, originalUrl: url };
    const fim = (r) => { User.findById = orig.f; User.findOne = orig.o; AuditLog.create = orig.c; resolve({ ...r, req, logs }); };
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { fim({ status: this.statusCode, body: b }); }, on(ev, cb) { this.fin = cb; } };
    auth(req, res, () => { fim({ status: 200, next: true, res }); });
  });
}
const base = () => ({
  [G]: { _id: G, tokenVersion: 0, equipeId: EQ, papelEquipe: 'supervisor', nome: 'Chefe' },
  [M]: { _id: M, equipeId: EQ, nome: 'Maria' },
  [OUTRO]: { _id: OUTRO, equipeId: 'outra', nome: 'Fora' },
});

test('gestor atua como membro da mesma equipe', async () => {
  const r = await rodar({ headers: { 'x-atuar-como': M }, usuarios: base() });
  assert.equal(r.next, true);
  assert.equal(r.req.userId, M);
  assert.equal(r.req.realUserId, G);
});
test('não atua como gente de outra equipe', async () => {
  const r = await rodar({ headers: { 'x-atuar-como': OUTRO }, usuarios: base() });
  assert.equal(r.status, 404);
});
test('membro comum não pode atuar como outro', async () => {
  const u = base(); u[G].papelEquipe = 'membro';
  const r = await rodar({ headers: { 'x-atuar-como': M }, usuarios: u });
  assert.equal(r.status, 403);
});
test('áreas fora da lista são bloqueadas e WhatsApp só leitura', async () => {
  let r = await rodar({ headers: { 'x-atuar-como': M }, url: '/api/backup', usuarios: base() });
  assert.equal(r.status, 403);
  r = await rodar({ headers: { 'x-atuar-como': M }, method: 'POST', url: '/api/whatsapp/enviar', usuarios: base() });
  assert.equal(r.status, 403);
  r = await rodar({ headers: { 'x-atuar-como': M }, url: '/api/whatsapp/conversas', usuarios: base() });
  assert.equal(r.next, true);
});
test('sem o header tudo continua igual', async () => {
  const r = await rodar({ usuarios: base() });
  assert.equal(r.req.userId, G);
  assert.equal(r.req.atuandoComo, undefined);
});
