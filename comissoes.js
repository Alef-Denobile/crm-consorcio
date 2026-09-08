const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Contrato = require('../models/Contrato');
const { calcComissaoPorTipo } = require('../utils/comissaoCalc');

const router = express.Router();
router.use(auth); // todas as rotas de comissão exigem login

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
    const { desc, scope, date, creditoValor, tipoCarta } = req.body;
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
    const tipo = ['imovel', 'veiculo', 'investimento', 'servicos'].includes(tipoCarta) ? tipoCarta : 'imovel';

    const { parcelas, parcelas1, value, value2 } = calcComissaoPorTipo(credito, tipo);
    const contrato = await Contrato.create({
      userId: req.userId,
      desc: desc.trim(),
      scope: scope === 'Empresa' ? 'Empresa' : 'Pessoal',
      date: new Date(date),
      creditoValor: credito,
      tipoCarta: tipo,
      parcelas,
      parcelas1,
      value,
      value2,
    });
    res.status(201).json(contrato.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar contrato.' });
  }
});

// PUT /api/comissoes/:id -> edita um contrato (recalcula as parcelas se o valor da carta ou o tipo mudar)
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    const { desc, scope, date, creditoValor, tipoCarta } = req.body;
    const updates = {};
    if (typeof desc === 'string') updates.desc = desc.trim();
    if (scope) updates.scope = scope === 'Empresa' ? 'Empresa' : 'Pessoal';
    if (date) updates.date = new Date(date);
    if (creditoValor !== undefined || tipoCarta !== undefined) {
      const contratoAtual = await Contrato.findOne({ _id: req.params.id, userId: req.userId }).select('creditoValor tipoCarta');
      if (!contratoAtual) return res.status(404).json({ error: 'Contrato não encontrado.' });
      const credito = creditoValor !== undefined ? (parseFloat(creditoValor) || 0) : contratoAtual.creditoValor;
      const tipo = tipoCarta !== undefined
        ? (['imovel', 'veiculo', 'investimento', 'servicos'].includes(tipoCarta) ? tipoCarta : 'imovel')
        : (contratoAtual.tipoCarta || 'imovel');
      const { parcelas, parcelas1, value, value2 } = calcComissaoPorTipo(credito, tipo);
      updates.creditoValor = credito;
      updates.tipoCarta = tipo;
      updates.value = value;
      updates.value2 = value2;
      updates.parcelas = parcelas;
      updates.parcelas1 = parcelas1;
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
