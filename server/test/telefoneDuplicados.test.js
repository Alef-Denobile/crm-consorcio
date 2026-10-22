const test = require('node:test');
const assert = require('node:assert');
const { variantesTelefone, chaveTelefone } = require('../utils/telefone');
const { agruparDuplicados } = require('../utils/unificarDuplicados');

test('celular brasileiro: acha o mesmo contato com e sem o 9', () => {
  assert.deepEqual(variantesTelefone('5515988295905'), ['5515988295905', '551588295905']);
  assert.deepEqual(variantesTelefone('551588295905'), ['551588295905', '5515988295905']);
  assert.deepEqual(variantesTelefone('(15) 98829-5905'), ['5515988295905', '551588295905']);
  assert.equal(chaveTelefone('551588295905'), '5515988295905');
  assert.equal(chaveTelefone('5515988295905'), '5515988295905');
});

test('telefone fixo e número de fora não ganham variante', () => {
  assert.deepEqual(variantesTelefone('551532221111'), ['551532221111']);
  assert.deepEqual(variantesTelefone('4915112345678'), ['4915112345678']);
  assert.deepEqual(variantesTelefone(''), []);
});

test('agrupa duplicados (com/sem 9) e deixa o mais antigo primeiro; distintos não juntam', () => {
  const cards = [
    { _id: 'b', cliente: 'Novo contato', telefoneNormalizado: '551588295905', createdAt: new Date('2026-10-22') },
    { _id: 'a', cliente: 'Willian', telefoneNormalizado: '5515988295905', createdAt: new Date('2026-10-01') },
    { _id: 'c', cliente: 'Outro', telefoneNormalizado: '5515988111111', createdAt: new Date('2026-10-02') },
  ];
  const g = agruparDuplicados(cards);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].cards.map((c) => c._id), ['a', 'b']);
});
