const Card = require('../models/Card');
const Message = require('../models/Message');
const Anexo = require('../models/Anexo');
const HistoricoContato = require('../models/HistoricoContato');
const MensagemAgendada = require('../models/MensagemAgendada');
const Contrato = require('../models/Contrato');
const FluxoExecucao = require('../models/FluxoExecucao');
const Task = require('../models/Task');
const Column = require('../models/Column');
const { chaveTelefone } = require('./telefone');

const nomeGenerico = (n) => !n || /^novo contato/i.test(String(n).trim());

// Agrupa os cards da pessoa que são o MESMO celular (com ou sem o 9). Devolve só grupos com 2+ cards;
// em cada grupo o primeiro é o que fica (o mais antigo).
function agruparDuplicados(cards) {
  const grupos = new Map();
  for (const c of cards) {
    const chave = chaveTelefone(c.telefoneNormalizado || c.telefone);
    if (!chave) continue;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(c);
  }
  return [...grupos.entries()]
    .map(([chave, lista]) => ({ chave, cards: lista.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) }))
    .filter((g) => g.cards.length > 1);
}

async function listarDuplicados(userId) {
  const cards = await Card.find({ userId, telefoneNormalizado: { $ne: null } }).select('cliente telefone telefoneNormalizado createdAt');
  return agruparDuplicados(cards);
}

// Junta cada grupo no card mais antigo: conversas, anexos, histórico, agendamentos, contratos, fluxos e tarefas vão para ele;
// completa nome/valor/observações/etiquetas se o que fica estiver vazio; apaga os repetidos.
async function unificarDuplicados(userId) {
  const grupos = await listarDuplicados(userId);
  let removidos = 0;
  const colunas = grupos.length ? await Column.find({ userId }).select('tipo') : [];
  const tipoDaColuna = new Map(colunas.map((c) => [String(c._id), c.tipo]));
  for (const g of grupos) {
    const completos = await Card.find({ _id: { $in: g.cards.map((c) => c._id) }, userId });
    // quem fica: o que está à vista (não arquivado) primeiro, depois o que já tem venda (coluna "ganho"), depois o mais antigo.
    // Assim a venda nunca some dentro de um contato arquivado nem de um que está em "perdido".
    const peso = (c) => (c.arquivado ? 0 : 2) + (tipoDaColuna.get(String(c.columnId)) === 'ganho' ? 1 : 0);
    completos.sort((a, b) => peso(b) - peso(a) || new Date(a.createdAt) - new Date(b.createdAt));
    const [fica, ...resto] = completos;
    for (const outro of resto) {
      const mover = { cardId: outro._id, userId };
      await Promise.all([
        Message.updateMany(mover, { cardId: fica._id }),
        Anexo.updateMany(mover, { cardId: fica._id }),
        HistoricoContato.updateMany(mover, { cardId: fica._id }),
        MensagemAgendada.updateMany(mover, { cardId: fica._id }),
        Contrato.updateMany(mover, { cardId: fica._id }),
        FluxoExecucao.updateMany(mover, { cardId: fica._id }),
        Task.updateMany({ leadId: outro._id, userId }, { leadId: fica._id }),
      ]);
      if (nomeGenerico(fica.cliente) && !nomeGenerico(outro.cliente)) fica.cliente = outro.cliente;
      if (!Number(fica.valor) && Number(outro.valor)) fica.valor = outro.valor;
      if (outro.obs && !String(fica.obs || '').includes(outro.obs)) fica.obs = [fica.obs, outro.obs].filter(Boolean).join('\n');
      fica.etiquetas = [...new Set([...(fica.etiquetas || []), ...(outro.etiquetas || [])])];
      if (!fica.instagramId && outro.instagramId) fica.instagramId = outro.instagramId;
      if (!fica.mes && outro.mes) fica.mes = outro.mes;
      await Card.deleteOne({ _id: outro._id, userId });
      removidos++;
    }
    await fica.save();
  }
  return { grupos: grupos.length, removidos };
}

module.exports = { agruparDuplicados, listarDuplicados, unificarDuplicados };
