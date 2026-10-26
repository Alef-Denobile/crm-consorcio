const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-teste';
const { montarEmailBoasVindasEquipe } = require('../utils/email');
const { gerarTokenReset, tokenResetValido } = require('../utils/senhaReset');

test('e-mail de boas-vindas: tem o link, o nome do gestor e escapa HTML', () => {
  const m = montarEmailBoasVindasEquipe({ nome: '<b>Ana</b>', gestorNome: 'Gui', equipeNome: 'Norte', link: 'https://x/login.html?reset=abc', validadeDias: 7 });
  assert.match(m.html, /reset=abc/);
  assert.match(m.html, /Gui/);
  assert.match(m.html, /equipe Norte/);
  assert.ok(!m.html.includes('<b>Ana</b>'));
  assert.match(m.texto, /7 dias/);
});

test('o link de boas-vindas (token de 7 dias) vale e vence depois', () => {
  const { token, hash } = gerarTokenReset();
  const user = { resetSenhaHash: hash, resetSenhaExpira: new Date(Date.now() + 7 * 24 * 3600 * 1000) };
  assert.equal(tokenResetValido(user, token), true);
  assert.equal(tokenResetValido(user, token, Date.now() + 8 * 24 * 3600 * 1000), false);
});
