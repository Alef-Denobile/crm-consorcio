const test = require('node:test');
const assert = require('node:assert');
const T = require('../utils/equipesDoUsuario');

const A = 'a1', B = 'b2', C = 'c3';
const novo = () => ({ equipeId: null, papelEquipe: 'membro', supervisorDeDados: false, rodizio: { ativo: false, membros: [], contador: 0 }, outrasEquipes: [] });

test('entrar numa segunda equipe guarda a primeira', () => {
  const u = novo();
  T.entrarEquipe(u, A, 'supervisor', true);
  u.rodizio = { ativo: true, membros: ['x'], contador: 4 };
  T.entrarEquipe(u, B, 'membro', false);
  assert.equal(u.equipeId, B); assert.equal(u.papelEquipe, 'membro'); assert.equal(u.rodizio.ativo, false);
  assert.deepEqual(T.idsDasEquipes(u).sort(), [A, B]);
  assert.equal(T.papelEm(u, A), 'supervisor');
  assert.equal(T.supervisorDeDadosEm(u, A), true);
});
test('abrir devolve papel, rodízio e supervisor de dados da equipe', () => {
  const u = novo();
  T.entrarEquipe(u, A, 'supervisor', true);
  u.rodizio = { ativo: true, membros: ['x'], contador: 4 };
  T.entrarEquipe(u, B, 'membro', false);
  assert.equal(T.abrirEquipe(u, A), true);
  assert.equal(u.equipeId, A); assert.equal(u.papelEquipe, 'supervisor'); assert.equal(u.supervisorDeDados, true);
  assert.equal(u.rodizio.ativo, true); assert.equal(u.rodizio.contador, 4);
  assert.equal(T.papelEm(u, B), 'membro');
  assert.equal(T.abrirEquipe(u, C), false);
});
test('papel é independente por equipe', () => {
  const u = novo();
  T.entrarEquipe(u, A, 'membro', false); T.entrarEquipe(u, B, 'membro', false);
  T.definirPapel(u, A, 'supervisor');
  assert.equal(T.papelEm(u, A), 'supervisor'); assert.equal(T.papelEm(u, B), 'membro');
  assert.equal(T.gestorEmAlguma(u), true);
  assert.equal(T.definirPapel(u, C, 'supervisor'), false);
});
test('sair da equipe aberta abre a próxima; sair da guardada só remove', () => {
  const u = novo();
  T.entrarEquipe(u, A, 'membro', false); T.entrarEquipe(u, B, 'supervisor', true);
  T.sairEquipe(u, B);
  assert.equal(u.equipeId, A); assert.deepEqual(T.idsDasEquipes(u), [A]);
  T.entrarEquipe(u, C, 'membro', false);
  T.sairEquipe(u, A);
  assert.deepEqual(T.idsDasEquipes(u), [C]);
  T.sairEquipe(u, C);
  assert.equal(u.equipeId, null); assert.equal(T.emAlgumaEquipe(u), false);
});
test('equipe em comum e filtro de membros', () => {
  const a = novo(), b = novo();
  T.entrarEquipe(a, A, 'membro', false); T.entrarEquipe(a, B, 'membro', false);
  T.entrarEquipe(b, B, 'membro', false);
  assert.equal(T.equipeEmComum(a, b), true);
  const c = novo(); T.entrarEquipe(c, C, 'membro', false);
  assert.equal(T.equipeEmComum(a, c), false);
  assert.deepEqual(T.filtroMembros('X'), { $or: [{ equipeId: 'X' }, { 'outrasEquipes.equipeId': 'X' }] });
});
