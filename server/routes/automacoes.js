const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Automacao = require('../models/Automacao');
const Column = require('../models/Column');

const router = express.Router();
router.use(auth); // todas as rotas de automação exigem login

// GET /api/automacoes -> lista as automações do usuário
router.get('/', async (req, res) => {
  try {
    const automacoes = await Automacao.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ automacoes: automacoes.map((a) => a.toJSON()) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar automações.' });
  }
});

// POST /api/automacoes -> cria uma nova automação
router.post('/', async (req, res) => {
  try {
    const { nome, colunaGatilhoId, acaoTipo, acaoParams } = req.body;
    if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome da automação é obrigatório.' });
    if (!colunaGatilhoId || !mongoose.isValidObjectId(colunaGatilhoId)) {
      return res.status(400).json({ error: 'Coluna de gatilho inválida.' });
    }
    if (!['criar_tarefa', 'mover_coluna'].includes(acaoTipo)) {
      return res.status(400).json({ error: 'Tipo de ação inválido.' });
    }
    const coluna = await Column.findOne({ _id: colunaGatilhoId, userId: req.userId });
    if (!coluna) return res.status(404).json({ error: 'Coluna de gatilho não encontrada.' });

    if (acaoTipo === 'mover_coluna') {
      const destino = acaoParams && acaoParams.colunaDestinoId;
      if (!destino || !mongoose.isValidObjectId(destino)) {
        return res.status(400).json({ error: 'Escolha a coluna de destino.' });
      }
      const colunaDestino = await Column.findOne({ _id: destino, userId: req.userId });
      if (!colunaDestino) return res.status(404).json({ error: 'Coluna de destino não encontrada.' });
    }

    const automacao = await Automacao.create({
      userId: req.userId,
      nome: nome.trim(),
      colunaGatilhoId,
      acaoTipo,
      acaoParams: acaoParams || {},
    });
    res.status(201).json(automacao.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar automação.' });
  }
});

// PUT /api/automacoes/:id -> edita (nome, ativa/inativa, parâmetros)
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
    const updates = {};
    if (typeof req.body.nome === 'string') updates.nome = req.body.nome.trim();
    if (typeof req.body.ativa === 'boolean') updates.ativa = req.body.ativa;
    if (req.body.acaoParams) updates.acaoParams = req.body.acaoParams;

    const automacao = await Automacao.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!automacao) return res.status(404).json({ error: 'Automação não encontrada.' });
    res.json(automacao.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar automação.' });
  }
});

// DELETE /api/automacoes/:id -> exclui a automação
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
    const automacao = await Automacao.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!automacao) return res.status(404).json({ error: 'Automação não encontrada.' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir automação.' });
  }
});

module.exports = router;
