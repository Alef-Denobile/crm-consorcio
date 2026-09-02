/* ---- Regra de comissão (fixa, não editável pelo usuário) ----
   10 primeiras parcelas = valor da carta × 0,00103388
   3 últimas parcelas    = valor da carta × 0,00190561
   Baseado no padrão: carta de R$1.000.000 → 10x R$1.033,88 + 3x R$1.905,61 */
const COMISSAO_PARCELAS_BLOCO1 = 10;
const COMISSAO_PARCELAS_BLOCO2 = 3;
const COMISSAO_FATOR_BLOCO1 = 1033.88 / 1000000;
const COMISSAO_FATOR_BLOCO2 = 1905.61 / 1000000;

function calcComissaoParcelas(creditoValor) {
  const credito = parseFloat(creditoValor) || 0;
  const value1 = Math.round(credito * COMISSAO_FATOR_BLOCO1 * 100) / 100;
  const value2 = Math.round(credito * COMISSAO_FATOR_BLOCO2 * 100) / 100;
  return { value1, value2 };
}

module.exports = {
  COMISSAO_PARCELAS_BLOCO1,
  COMISSAO_PARCELAS_BLOCO2,
  calcComissaoParcelas,
};
