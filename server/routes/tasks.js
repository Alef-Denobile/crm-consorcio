const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Card = require('../models/Card');

const router = express.Router();
router.use(auth); // todas as rotas de tarefa exigem login

const CAMPOS_PERMITIDOS = ['titulo', 'vencimento', 'prioridade', 'leadId', 'descricao'];
function filtrarCampos(body) {
  const dados = {};
  for (const campo of CAMPOS_PERMITIDOS) {
    if (body[campo] !== undefined) dados[campo] = body[campo] === '' ? null : body[campo];
  }
  return dados;
}

// GET /api/tasks -> todas as tarefas do usuário logado
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId }).sort({ concluida: 1, vencimento: 1, createdAt: -1 });
    res.json({ tasks: tasks.map((t) => t.toJSON()) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar tarefas.' });
  }
});

// POST /api/tasks -> cria uma nova tarefa
router.post('/', async (req, res) => {
  try {
    const dados = filtrarCampos(req.body);
    if (!dados.titulo || !dados.titulo.trim()) {
      return res.status(400).json({ error: 'Título da tarefa é obrigatório.' });
    }
    if (dados.leadId && !mongoose.isValidObjectId(dados.leadId)) {
      return res.status(400).json({ error: 'Lead relacionado inválido.' });
    }
    if (dados.leadId) {
      const lead = await Card.findOne({ _id: dados.leadId, userId: req.userId });
      if (!lead) return res.status(404).json({ error: 'Lead relacionado não encontrado.' });
    }
    const task = await Task.create({ ...dados, userId: req.userId });
    res.status(201).json(task.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar tarefa.' });
  }
});

// PUT /api/tasks/:id -> edita uma tarefa
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    const dados = filtrarCampos(req.body);
    if (dados.leadId && !mongoose.isValidObjectId(dados.leadId)) {
      return res.status(400).json({ error: 'Lead relacionado inválido.' });
    }
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      dados,
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    res.json(task.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar tarefa.' });
  }
});

// PUT /api/tasks/:id/toggle -> marca/desmarca como concluída
router.put('/:id/toggle', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    task.concluida = !task.concluida;
    await task.save();
    res.json(task.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar tarefa.' });
  }
});

// DELETE /api/tasks/:id -> remove a tarefa
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir tarefa.' });
  }
});

module.exports = router;
