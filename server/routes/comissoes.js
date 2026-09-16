const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Contrato = require('../models/Contrato');
const Card = require('../models/Card');
const { calcComissaoPorTipo } = require('../utils/comissaoCalc');

const TIPOS_CARTA_VALIDOS = ['imovel', 'veiculo', 'investimento', 'servicos', 'home_equity', 'car_equity'];
const TIPOS_MES_INDEPENDENTE = ['home_equity', 'car_equity']; // únicos onde o mês pode divergir do lead

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
    const tipo = TIPOS_CARTA_VALIDOS.includes(tipoCarta) ? tipoCarta : 'imovel';

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
    if (Object.prototype.hasOwnProperty.call(req.body, 'canceladoNoMes')) {
      updates.canceladoNoMes = req.body.canceladoNoMes || null;
    }
    if (creditoValor !== undefined || tipoCarta !== undefined) {
      const contratoAtual = await Contrato.findOne({ _id: req.params.id, userId: req.userId }).select('creditoValor tipoCarta');
      if (!contratoAtual) return res.status(404).json({ error: 'Contrato não encontrado.' });
      const credito = creditoValor !== undefined ? (parseFloat(creditoValor) || 0) : contratoAtual.creditoValor;
      const tipo = tipoCarta !== undefined
        ? (TIPOS_CARTA_VALIDOS.includes(tipoCarta) ? tipoCarta : 'imovel')
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

    // O mês do contrato e o mês do lead ficam sincronizados nos dois sentidos — exceto
    // pra Home Equity e Car Equity, que ficam soltos de propósito (o pagamento deles
    // pode demorar até 2 meses a mais que o mês em que o negócio foi fechado).
    if (date && contrato.cardId && !TIPOS_MES_INDEPENDENTE.includes(contrato.tipoCarta)) {
      const novoMes = contrato.date.toISOString().slice(0, 7);
      await Card.findOneAndUpdate({ _id: contrato.cardId, userId: req.userId }, { mes: novoMes });
    }

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
