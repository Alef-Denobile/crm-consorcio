const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Card = require('../models/Card');
const Column = require('../models/Column');

const router = express.Router();
router.use(auth); // todas as rotas de card exigem login

const CAMPOS_PERMITIDOS = ['columnId', 'cliente', 'valor', 'temperatura', 'telefone', 'obs', 'mes'];
function filtrarCampos(body) {
  const dados = {};
  for (const campo of CAMPOS_PERMITIDOS) {
    if (body[campo] !== undefined) dados[campo] = body[campo];
  }
  return dados;
}

// POST /api/cards -> cria um novo cliente/card para o usuário logado
router.post('/', async (req, res) => {
  try {
    const dados = filtrarCampos(req.body);
    if (!dados.cliente || !dados.cliente.trim()) {
      return res.status(400).json({ error: 'Nome do cliente é obrigatório.' });
    }
    if (!dados.columnId || !mongoose.isValidObjectId(dados.columnId)) {
      return res.status(400).json({ error: 'Coluna inválida.' });
    }
    // garante que a coluna de destino pertence a este usuário
    const coluna = await Column.findOne({ _id: dados.columnId, userId: req.userId });
    if (!coluna) return res.status(404).json({ error: 'Coluna não encontrada.' });

    const card = await Card.create({ ...dados, userId: req.userId });
    res.status(201).json(card.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar cliente.' });
  }
});

// PUT /api/cards/:id -> atualiza os dados do cliente (edição via modal)
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    const dados = filtrarCampos(req.body);
    if (dados.columnId) {
      const coluna = await Column.findOne({ _id: dados.columnId, userId: req.userId });
      if (!coluna) return res.status(404).json({ error: 'Coluna inválida.' });
    }
    const card = await Card.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      dados,
      { new: true, runValidators: true }
    );
    if (!card) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.json(card.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar cliente.' });
  }
});

// PUT /api/cards/:id/move -> usado no drag and drop entre colunas
router.put('/:id/move', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    const { columnId } = req.body;
    if (!columnId || !mongoose.isValidObjectId(columnId)) {
      return res.status(400).json({ error: 'Coluna de destino inválida.' });
    }
    const coluna = await Column.findOne({ _id: columnId, userId: req.userId });
    if (!coluna) return res.status(404).json({ error: 'Coluna não encontrada.' });

    const card = await Card.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { columnId },
      { new: true }
    );
    if (!card) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.json(card.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao mover cliente.' });
  }
});

// DELETE /api/cards/:id -> remove o cliente (só se for do usuário logado)
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    const card = await Card.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!card) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir cliente.' });
  }
});

module.exports = router;
