const test = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-teste';

const User = require('../models/User');
const Column = require('../models/Column');
const { validarAtribuicao, colunaEquivalente } = require('../utils/atribuirLead');

const EQUIPE = 'e'.repeat(24);
const GESTOR = 'a'.repeat(24);
const MEMBRO = 'b'.repeat(24);
const DE_FORA = 'c'.repeat(24);

function stubUsuarios() {
  const usuarios = {
    [GESTOR]: { _id: GESTOR, equipeId: EQUIPE, papelEquipe: 'supervisor', nome: 'Gestor' },
    [MEMBRO]: { _id: MEMBRO, equipeId: EQUIPE, papelEquipe: 'membro', nome: 'Membro' },
    [DE_FORA]: { _id: DE_FORA, equipeId: 'f'.repeat(24), papelEquipe: 'membro', nome: 'Fora' },
  };
  User.findById = async (id) => usuarios[id] || null;
  User.findOne = async (q) => {
    const u = usuarios[q._id];
    return u && String(u.equipeId) === String((q.equipeId || (q.$or && q.$or[0].equipeId))) ? u : null;
  };
}

test('gestor pode atribuir para alguém da mesma equipe', async () => {
  stubUsuarios();
  const { alvo } = await validarAtribuicao(GESTOR, MEMBRO);
  assert.equal(alvo.nome, 'Membro');
});

test('membro comum não pode atribuir leads', async () => {
  stubUsuarios();
  await assert.rejects(() => validarAtribuicao(MEMBRO, GESTOR), (e) => e.status === 403);
});

test('não atribui para alguém de outra equipe nem sem escolher ninguém', async () => {
  stubUsuarios();
  await assert.rejects(() => validarAtribuicao(GESTOR, DE_FORA), (e) => e.status === 404);
  await assert.rejects(() => validarAtribuicao(GESTOR, ''), (e) => e.status === 400);
});

test('a coluna equivalente é a de mesmo nome e tipo; senão a primeira em aberto', async () => {
  const colunas = {
    origem: { _id: 'origem', nome: 'Negociação', tipo: 'aberto' },
  };
  Column.findById = async (id) => colunas[id] || null;
  const doAlvo = [
    { _id: 'x1', nome: 'Leads', tipo: 'aberto', ordem: 1 },
    { _id: 'x2', nome: 'negociação', tipo: 'aberto', ordem: 2 },
  ];
  Column.find = () => ({ sort: async () => doAlvo });
  assert.equal((await colunaEquivalente('origem', MEMBRO))._id, 'x2');
  colunas.origem.nome = 'Outra coisa';
  assert.equal((await colunaEquivalente('origem', MEMBRO))._id, 'x1');
});

test('transferirTodosOsCards passa todos os leads em lote, mapeando colunas, e leva os dados ligados', async () => {
  const Card = require('../models/Card');
  const Message = require('../models/Message');
  const Task = require('../models/Task');
  const { transferirTodosOsCards } = require('../utils/atribuirLead');
  const modelos = ['Anexo', 'HistoricoContato', 'MensagemAgendada', 'Contrato', 'FluxoExecucao'].map((n) => require(`../models/${n}`));

  const chamadas = [];
  Card.find = () => ({ select: async () => [{ _id: 'c1', columnId: 'origem' }, { _id: 'c2', columnId: 'origem' }] });
  Card.findOne = () => ({ sort: async () => ({ ordem: 3000 }) });
  Card.updateMany = async (f, u) => { chamadas.push(['Card', f, u]); };
  Message.updateMany = async (f, u) => { chamadas.push(['Message', f, u]); };
  Task.updateMany = async (f, u) => { chamadas.push(['Task', f, u]); };
  for (const m of modelos) m.updateMany = async (f, u) => { chamadas.push([m.modelName, f, u]); };
  Column.findById = async () => ({ _id: 'origem', nome: 'Leads', tipo: 'aberto' });
  Column.find = () => ({ sort: async () => [{ _id: 'dest1', nome: 'Leads', tipo: 'aberto', ordem: 1 }] });

  const total = await transferirTodosOsCards('antigo', { _id: 'novo' }, 'gestor');
  assert.equal(total, 2);
  const card = chamadas.find((c) => c[0] === 'Card');
  assert.deepEqual(card[1]._id.$in, ['c1', 'c2']);
  assert.equal(card[2][0].$set.columnId, 'dest1');
  assert.equal(card[2][0].$set.userId, 'novo');
  // tudo que é ligado aos leads também troca de dono
  for (const nome of ['Message', 'Task', 'Anexo', 'HistoricoContato', 'MensagemAgendada', 'Contrato', 'FluxoExecucao']) {
    assert.ok(chamadas.some((c) => c[0] === nome && c[2].userId === 'novo'), `${nome} não foi transferido`);
  }
});
