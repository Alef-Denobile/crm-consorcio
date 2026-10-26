const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../utils/equipesDoUsuario');
const { montarEmailResumo, calcularResumo } = require('../utils/resumoDiario');

test('gestorEmTodas: vale a regra mais restrita entre as equipes', () => {
  const soGestor = { equipeId: 'a', papelEquipe: 'supervisor', outrasEquipes: [{ equipeId: 'b', papel: 'supervisor' }] };
  const misto = { equipeId: 'a', papelEquipe: 'supervisor', outrasEquipes: [{ equipeId: 'b', papel: 'membro' }] };
  const membroQueCriou = { equipeId: 'novo', papelEquipe: 'supervisor', outrasEquipes: [{ equipeId: 'a', papel: 'membro' }] };
  assert.equal(T.gestorEmTodas(soGestor), true);
  assert.equal(T.gestorEmTodas(misto), false);
  assert.equal(T.gestorEmTodas(membroQueCriou), false); // criar outra equipe não libera a exclusão
  assert.equal(T.gestorEmTodas({ outrasEquipes: [] }), false);
});

test('e-mail do resumo: gestor de várias equipes vê um bloco por equipe', () => {
  const resumo = calcularResumo({ colunas: [], cards: [], tarefas: [], meta: null, hoje: '2026-10-26' });
  const grupos = [{ nome: 'Norte', membros: [{ nome: 'Ana', resumo }] }, { nome: 'Sul', membros: [{ nome: 'Beto', resumo }] }];
  const msg = montarEmailResumo({ nome: 'Gui', perfil: 'consorcio', resumo, equipe: grupos, hoje: '2026-10-26' });
  assert.match(msg.html, /Equipe Norte/);
  assert.match(msg.html, /Equipe Sul/);
  assert.match(msg.html, /Ana/);
  assert.match(msg.html, /Beto/);
});
