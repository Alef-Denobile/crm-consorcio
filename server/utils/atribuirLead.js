const User = require('../models/User');
const { filtroMembros } = require('./equipesDoUsuario');
const Column = require('../models/Column');
const Card = require('../models/Card');
const Message = require('../models/Message');
const Anexo = require('../models/Anexo');
const HistoricoContato = require('../models/HistoricoContato');
const MensagemAgendada = require('../models/MensagemAgendada');
const Task = require('../models/Task');
const Contrato = require('../models/Contrato');
const FluxoExecucao = require('../models/FluxoExecucao');

// Só o gestor (supervisor) da equipe pode passar um lead pra outra pessoa, e só pra alguém da MESMA equipe.
// Devolve { gestor, alvo } ou lança um erro com { status, mensagem }.
async function validarAtribuicao(gestorId, alvoId) {
  const erro = (status, mensagem) => Object.assign(new Error(mensagem), { status, mensagem });
  const gestor = await User.findById(gestorId);
  if (!gestor || !gestor.equipeId || gestor.papelEquipe !== 'supervisor') {
    throw erro(403, 'Só o gestor da equipe pode atribuir leads para outra pessoa.');
  }
  if (!alvoId || !/^[a-f\d]{24}$/i.test(String(alvoId))) throw erro(400, 'Escolha para quem vai o lead.');
  const alvo = await User.findOne({ _id: alvoId, ...filtroMembros(gestor.equipeId) });
  if (!alvo) throw erro(404, 'Essa pessoa não faz parte da sua equipe.');
  return { gestor, alvo };
}

// Acha a coluna equivalente na conta da outra pessoa: mesmo nome (e tipo); se não tiver, a primeira coluna "em aberto".
async function colunaEquivalente(colunaOrigemId, alvoId) {
  const origem = colunaOrigemId ? await Column.findById(colunaOrigemId) : null;
  const colunasAlvo = await Column.find({ userId: alvoId }).sort({ ordem: 1 });
  const norm = (t) => String(t || '').trim().toLowerCase();
  let destino = origem ? colunasAlvo.find((c) => norm(c.nome) === norm(origem.nome) && c.tipo === origem.tipo) : null;
  if (!destino) destino = colunasAlvo.find((c) => c.tipo === 'aberto');
  return destino || null;
}

async function proximaOrdem(colunaId, userId) {
  const ultimo = await Card.findOne({ columnId: colunaId, userId }).sort('-ordem');
  return ultimo ? ultimo.ordem + 1000 : 1000;
}

// Passa um card que já existe pra outra pessoa, levando junto conversas, anexos, histórico, tarefas, agendamentos e contrato.
async function transferirCard(card, alvo, gestorId) {
  const destino = await colunaEquivalente(card.columnId, alvo._id);
  if (!destino) {
    throw Object.assign(new Error('A pessoa escolhida não tem uma coluna "em aberto" pra receber o lead.'), { status: 400, mensagem: 'A pessoa escolhida não tem uma coluna "em aberto" pra receber o lead.' });
  }
  const antigoDono = card.userId;
  card.userId = alvo._id;
  card.columnId = destino._id;
  card.ordem = await proximaOrdem(destino._id, alvo._id);
  card.atribuidoPorId = gestorId;
  await card.save();
  const filtro = { cardId: card._id, userId: antigoDono };
  await Promise.all([
    Message.updateMany(filtro, { userId: alvo._id }),
    Anexo.updateMany(filtro, { userId: alvo._id }),
    HistoricoContato.updateMany(filtro, { userId: alvo._id }),
    MensagemAgendada.updateMany(filtro, { userId: alvo._id }),
    Contrato.updateMany(filtro, { userId: alvo._id }),
    FluxoExecucao.updateMany(filtro, { userId: alvo._id }),
    Task.updateMany({ leadId: card._id, userId: antigoDono }, { userId: alvo._id }),
  ]);
  return card;
}

// Passa TODOS os leads de uma pessoa pra outra (usado quando o gestor remove alguém da equipe e escolhe
// redistribuir). Em lote: cada coluna de origem vira a coluna equivalente do destino, e tudo que está
// ligado aos leads (conversas, anexos, histórico, tarefas do lead, agendamentos, contratos, fluxos) vai junto.
// Devolve quantos leads foram passados.
async function transferirTodosOsCards(origemId, alvo, gestorId) {
  const cards = await Card.find({ userId: origemId }).select('_id columnId');
  if (!cards.length) return 0;

  // coluna de destino de cada coluna de origem
  const idsColunas = [...new Set(cards.map((c) => String(c.columnId)))];
  const destinoDe = {};
  for (const colId of idsColunas) {
    const destino = await colunaEquivalente(colId, alvo._id);
    if (!destino) {
      throw Object.assign(new Error('A pessoa escolhida não tem uma coluna "em aberto" pra receber os leads.'), { status: 400, mensagem: 'A pessoa escolhida não tem uma coluna "em aberto" pra receber os leads.' });
    }
    destinoDe[colId] = destino._id;
  }

  // a ordem nova fica depois do que já existe nas colunas de destino (sem embaralhar os leads de quem recebe)
  for (const colId of idsColunas) {
    const ids = cards.filter((c) => String(c.columnId) === colId).map((c) => c._id);
    const base = await proximaOrdem(destinoDe[colId], alvo._id);
    await Card.updateMany(
      { _id: { $in: ids }, userId: origemId },
      [{ $set: { userId: alvo._id, columnId: destinoDe[colId], ordem: { $add: [{ $ifNull: ['$ordem', 0] }, base] }, atribuidoPorId: gestorId, colunaDesde: new Date() } }]
    );
  }

  const todosIds = cards.map((c) => c._id);
  const filtro = { cardId: { $in: todosIds }, userId: origemId };
  await Promise.all([
    Message.updateMany(filtro, { userId: alvo._id }),
    Anexo.updateMany(filtro, { userId: alvo._id }),
    HistoricoContato.updateMany(filtro, { userId: alvo._id }),
    MensagemAgendada.updateMany(filtro, { userId: alvo._id }),
    Contrato.updateMany(filtro, { userId: alvo._id }),
    FluxoExecucao.updateMany(filtro, { userId: alvo._id }),
    Task.updateMany({ leadId: { $in: todosIds }, userId: origemId }, { userId: alvo._id }),
  ]);
  return cards.length;
}

module.exports = { validarAtribuicao, colunaEquivalente, proximaOrdem, transferirCard, transferirTodosOsCards };
