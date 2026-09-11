const Contrato = require('../models/Contrato');
const Column = require('../models/Column');
const { calcComissaoPorTipo } = require('./comissaoCalc');

// Quando um cliente entra numa coluna do tipo "ganho" (fechado), gera a comissão
// dele automaticamente na aba Comissões — só uma vez por cliente, mesmo que passe
// por mais de uma coluna "ganho" ou seja movido/editado depois. Nunca lança erro
// pra fora: se algo der errado aqui, a ação principal (mover/criar o card) segue
// normalmente, só não gera a comissão dessa vez.
async function gerarComissaoAutomaticaSeGanho(userId, card, columnId) {
  try {
    const coluna = await Column.findOne({ _id: columnId, userId });
    if (!coluna || coluna.tipo !== 'ganho') return;

    const credito = parseFloat(card.valor) || 0;
    if (credito <= 0) return; // sem valor cadastrado, nada pra comissionar

    const jaExiste = await Contrato.findOne({ cardId: card._id });
    if (jaExiste) return; // já foi gerada antes pra esse cliente, não duplica

    const { parcelas, parcelas1, value, value2 } = calcComissaoPorTipo(credito, card.tipoCarta);
    // Usa o "mês" que a pessoa definiu no lead como referência — só cai pra data de hoje
    // se o lead não tiver esse campo preenchido (formato esperado: "YYYY-MM").
    const mesValido = /^\d{4}-\d{2}$/.test(card.mes || '');
    const hoje = new Date();
    const dataReferencia = mesValido
      ? new Date(Number(card.mes.slice(0, 4)), Number(card.mes.slice(5, 7)) - 1, 1)
      : new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    await Contrato.create({
      userId,
      cardId: card._id,
      geradoAutomaticamente: true,
      desc: card.cliente || 'Cliente',
      scope: 'Pessoal',
      date: dataReferencia,
      creditoValor: credito,
      tipoCarta: card.tipoCarta || 'imovel',
      parcelas,
      parcelas1,
      value,
      value2,
    });
  } catch (err) {
    console.error('Erro ao gerar comissão automática:', err.message);
  }
}

// Quando um cliente que JÁ tinha comissão gerada (estava numa coluna "ganho") é
// movido pra uma coluna do tipo "perdido" — cobrindo tanto "nunca fechou" quanto
// "fechou e depois cancelou" — corta a comissão dele a partir do mês desse movimento
// em diante. Meses anteriores (já vencidos) continuam contando normalmente.
async function cancelarComissaoSePerdidoAposGanho(userId, card, columnId) {
  try {
    const coluna = await Column.findOne({ _id: columnId, userId });
    if (!coluna || coluna.tipo !== 'perdido') return;

    const contrato = await Contrato.findOne({ cardId: card._id, userId });
    if (!contrato || contrato.canceladoNoMes) return; // sem contrato, ou já estava cancelado — não mexe

    const hoje = new Date();
    contrato.canceladoNoMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    await contrato.save();
  } catch (err) {
    console.error('Erro ao cancelar comissão automaticamente:', err.message);
  }
}

module.exports = { gerarComissaoAutomaticaSeGanho, cancelarComissaoSePerdidoAposGanho };
