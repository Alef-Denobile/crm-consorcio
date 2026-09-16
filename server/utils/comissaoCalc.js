/* ---- Regra de comissão (fixa, não editável pelo usuário) ----
   10 primeiras parcelas = valor da carta × 0,00103388
   3 últimas parcelas    = valor da carta × 0,00190561
   Baseado no padrão: carta de R$1.000.000 → 10x R$1.033,88 + 3x R$1.905,61
   Vale pra Imóvel, Investimento e Serviços. */
const COMISSAO_PARCELAS_BLOCO1 = 10;
const COMISSAO_PARCELAS_BLOCO2 = 3;
const COMISSAO_FATOR_BLOCO1 = 1033.88 / 1000000;
const COMISSAO_FATOR_BLOCO2 = 1905.61 / 1000000;

/* ---- Regra de comissão pra Veículo (diferente das outras 3 modalidades) ----
   Comissão total = 1,6% do valor da carta, dividida em 11 parcelas iguais.
   Ex: carta de R$100.000 → R$100.000 × 1,6% = R$1.600 → 11x R$145,45 */
const COMISSAO_VEICULO_PARCELAS = 11;
const COMISSAO_VEICULO_PERCENTUAL = 0.016;

/* ---- Regra de comissão pra Home Equity e Car Equity (diferente das outras) ----
   Comissão = 1,1% do valor da carta, paga numa parcela só — diferente das outras
   modalidades porque o pagamento pode demorar até 2 meses pra acontecer de verdade,
   então o mês fica editável na aba Comissões em vez de fixo no mês do lead. */
const COMISSAO_EQUITY_PARCELAS = 1;
const COMISSAO_EQUITY_PERCENTUAL = 0.011;

function calcComissaoParcelas(creditoValor) {
  const credito = parseFloat(creditoValor) || 0;
  const value1 = Math.round(credito * COMISSAO_FATOR_BLOCO1 * 100) / 100;
  const value2 = Math.round(credito * COMISSAO_FATOR_BLOCO2 * 100) / 100;
  return { value1, value2 };
}

function calcComissaoVeiculo(creditoValor) {
  const credito = parseFloat(creditoValor) || 0;
  const totalComissao = credito * COMISSAO_VEICULO_PERCENTUAL;
  const valorParcela = Math.round((totalComissao / COMISSAO_VEICULO_PARCELAS) * 100) / 100;
  return { valorParcela };
}

function calcComissaoEquity(creditoValor) {
  const credito = parseFloat(creditoValor) || 0;
  const valorParcela = Math.round(credito * COMISSAO_EQUITY_PERCENTUAL * 100) / 100;
  return { valorParcela };
}

// Monta os 4 campos salvos no Contrato (parcelas/parcelas1/value/value2), já
// escolhendo a fórmula certa conforme o tipo de carta de crédito. Veículo usa um
// "bloco" só (11 parcelas iguais); Home Equity/Car Equity usam 1 parcela só; os
// outros 3 tipos continuam com os dois blocos.
function calcComissaoPorTipo(creditoValor, tipoCarta) {
  if (tipoCarta === 'veiculo') {
    const { valorParcela } = calcComissaoVeiculo(creditoValor);
    return { parcelas: COMISSAO_VEICULO_PARCELAS, parcelas1: COMISSAO_VEICULO_PARCELAS, value: valorParcela, value2: 0 };
  }
  if (tipoCarta === 'home_equity' || tipoCarta === 'car_equity') {
    const { valorParcela } = calcComissaoEquity(creditoValor);
    return { parcelas: COMISSAO_EQUITY_PARCELAS, parcelas1: COMISSAO_EQUITY_PARCELAS, value: valorParcela, value2: 0 };
  }
  const { value1, value2 } = calcComissaoParcelas(creditoValor);
  return { parcelas: COMISSAO_PARCELAS_BLOCO1 + COMISSAO_PARCELAS_BLOCO2, parcelas1: COMISSAO_PARCELAS_BLOCO1, value: value1, value2 };
}

module.exports = {
  COMISSAO_PARCELAS_BLOCO1,
  COMISSAO_PARCELAS_BLOCO2,
  COMISSAO_VEICULO_PARCELAS,
  COMISSAO_VEICULO_PERCENTUAL,
  COMISSAO_EQUITY_PARCELAS,
  COMISSAO_EQUITY_PERCENTUAL,
  calcComissaoParcelas,
  calcComissaoVeiculo,
  calcComissaoEquity,
  calcComissaoPorTipo,
};
