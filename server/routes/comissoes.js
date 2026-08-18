const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Contrato = require('../models/Contrato');

const router = express.Router();
router.use(auth); // todas as rotas de comissão exigem login

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

// GET /api/comissoes -> todos os contratos do usuário logado
router.get('/', async (req, res) => {
  try {
    const contratos = await Contrato.find({ userId: req.userId }).sort({ date: -1, createdAt: -1 });
    res.json({ contratos: contratos.map((c) => c.toJSON()) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar comissões.' });
  }
});

// POST /api/comissoes -> cria um novo contrato (calcula as parcelas automaticamente)
router.post('/', async (req, res) => {
  try {
    const { desc, scope, date, creditoValor } = req.body;
    if (!desc || !desc.trim()) {
      return res.status(400).json({ error: 'Descrição do contrato é obrigatória.' });
    }
    if (!date) {
      return res.status(400).json({ error: 'Mês da 1ª parcela é obrigatório.' });
    }
    const credito = parseFloat(creditoValor) || 0;
    if (credito <= 0) {
      return res.status(400).json({ error: 'Valor da carta de crédito é obrigatório.' });
    }

    const { value1, value2 } = calcComissaoParcelas(credito);
    const contrato = await Contrato.create({
      userId: req.userId,
      desc: desc.trim(),
      scope: scope === 'Empresa' ? 'Empresa' : 'Pessoal',
      date: new Date(date),
      creditoValor: credito,
      parcelas: COMISSAO_PARCELAS_BLOCO1 + COMISSAO_PARCELAS_BLOCO2,
      parcelas1: COMISSAO_PARCELAS_BLOCO1,
      value: value1,
      value2,
    });
    res.status(201).json(contrato.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar contrato.' });
  }
});

// PUT /api/comissoes/:id -> edita um contrato (recalcula as parcelas se o valor da carta mudar)
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    const { desc, scope, date, creditoValor } = req.body;
    const updates = {};
    if (typeof desc === 'string') updates.desc = desc.trim();
    if (scope) updates.scope = scope === 'Empresa' ? 'Empresa' : 'Pessoal';
    if (date) updates.date = new Date(date);
    if (creditoValor !== undefined) {
      const credito = parseFloat(creditoValor) || 0;
      const { value1, value2 } = calcComissaoParcelas(credito);
      updates.creditoValor = credito;
      updates.value = value1;
      updates.value2 = value2;
      updates.parcelas = COMISSAO_PARCELAS_BLOCO1 + COMISSAO_PARCELAS_BLOCO2;
      updates.parcelas1 = COMISSAO_PARCELAS_BLOCO1;
    }

    const contrato = await Contrato.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!contrato) return res.status(404).json({ error: 'Contrato não encontrado.' });
    res.json(contrato.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar contrato.' });
  }
});

// DELETE /api/comissoes/:id -> remove o contrato
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    const contrato = await Contrato.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!contrato) return res.status(404).json({ error: 'Contrato não encontrado.' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir contrato.' });
  }
});

module.exports = router;
