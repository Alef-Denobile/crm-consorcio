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
    const hoje = new Date();
    await Contrato.create({
      userId,
      cardId: card._id,
      geradoAutomaticamente: true,
      desc: card.cliente || 'Cliente',
      scope: 'Pessoal',
      date: new Date(hoje.getFullYear(), hoje.getMonth(), 1),
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

module.exports = { gerarComissaoAutomaticaSeGanho };
