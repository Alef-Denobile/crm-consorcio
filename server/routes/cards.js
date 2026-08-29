const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Card = require('../models/Card');
const Column = require('../models/Column');
const Automacao = require('../models/Automacao');
const Task = require('../models/Task');
const Fluxo = require('../models/Fluxo');
const FluxoExecucao = require('../models/FluxoExecucao');
const Anexo = require('../models/Anexo');
const { registrarAuditoria } = require('../utils/auditoria');

const router = express.Router();
router.use(auth); // todas as rotas de card exigem login

// Roda depois que um card entra numa coluna que tem fluxo(s) ativo(s) — inicia a
// execução do zero pra esse cliente (se já não tiver uma rodando pra esse mesmo fluxo).
async function iniciarFluxosDaColuna(userId, colunaId, card) {
  try {
    const fluxos = await Fluxo.find({ userId, colunaGatilhoId: colunaId, ativo: true });
    for (const fluxo of fluxos) {
      if (!fluxo.etapas || !fluxo.etapas.length) continue;
      const jaExiste = await FluxoExecucao.findOne({ fluxoId: fluxo._id, cardId: card._id, concluido: false });
      if (jaExiste) continue;
      await FluxoExecucao.create({ userId, fluxoId: fluxo._id, cardId: card._id, etapaAtual: 0, iniciadoEm: new Date() });
    }
  } catch (e) {
    console.error('Erro ao iniciar fluxos:', e.message);
  }
}

// Roda depois que um card entra numa coluna — nunca deixa erro aqui quebrar a resposta principal
async function executarAutomacoesDaColuna(userId, colunaId, card) {
  try {
    const automacoes = await Automacao.find({
      userId,
      colunaGatilhoId: colunaId,
      ativa: true,
      // automações antigas (de antes desse campo existir) não têm gatilhoTipo salvo — tratamos como entrada_coluna
      $or: [{ gatilhoTipo: 'entrada_coluna' }, { gatilhoTipo: { $exists: false } }],
    });
    for (const auto of automacoes) {
      try {
        if (auto.acaoTipo === 'criar_tarefa') {
          const dias = (auto.acaoParams && auto.acaoParams.diasParaVencimento) || 3;
          const venc = new Date();
          venc.setDate(venc.getDate() + Number(dias));
          await Task.create({
            userId,
            titulo: (auto.acaoParams && auto.acaoParams.titulo) || 'Follow-up automático',
            vencimento: venc,
            prioridade: 'media',
            leadId: card._id,
            descricao: `Criada automaticamente pela automação "${auto.nome}".`,
          });
        } else if (auto.acaoTipo === 'mover_coluna') {
          const destino = auto.acaoParams && auto.acaoParams.colunaDestinoId;
          if (destino && String(destino) !== String(colunaId)) {
            await Card.findByIdAndUpdate(card._id, { columnId: destino });
          }
        }
      } catch (e) {
        console.error('Erro ao executar automação:', e.message);
      }
    }
  } catch (e) {
    console.error('Erro ao buscar automações:', e.message);
  }
}

const CAMPOS_PERMITIDOS = ['columnId', 'cliente', 'valor', 'temperatura', 'telefone', 'obs', 'mes', 'etiquetas', 'camposPersonalizados'];
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
    executarAutomacoesDaColuna(req.userId, dados.columnId, card);
    iniciarFluxosDaColuna(req.userId, dados.columnId, card);
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

// DELETE /api/cards/:id/sugestao-ia -> descarta a sugestão da IA proativa daquele card
router.delete('/:id/sugestao-ia', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    const card = await Card.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { sugestaoIA: { texto: null, tarefaTitulo: null, tarefaDias: null, geradaEm: null } },
      { new: true }
    );
    if (!card) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.json(card.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao descartar a sugestão.' });
  }
});

// PUT /api/cards/:id/arquivar -> tira o cliente de vista sem excluir
router.put('/:id/arquivar', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
    const card = await Card.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { arquivado: true },
      { new: true }
    );
    if (!card) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.json(card.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao arquivar cliente.' });
  }
});

// PUT /api/cards/:id/desarquivar -> traz o cliente de volta pra vista normal
router.put('/:id/desarquivar', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
    const card = await Card.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { arquivado: false },
      { new: true }
    );
    if (!card) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.json(card.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desarquivar cliente.' });
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
    executarAutomacoesDaColuna(req.userId, columnId, card);
    iniciarFluxosDaColuna(req.userId, columnId, card);
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
    registrarAuditoria(req.userId, 'card_excluido', `Cliente "${card.cliente}" excluído`);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir cliente.' });
  }
});

// GET /api/cards/:id/anexos -> lista os anexos de um cliente (com o arquivo já incluso — arquivos são pequenos)
router.get('/:id/anexos', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
    const card = await Card.findOne({ _id: req.params.id, userId: req.userId });
    if (!card) return res.status(404).json({ error: 'Cliente não encontrado.' });
    const anexos = await Anexo.find({ cardId: card._id, userId: req.userId }).sort({ createdAt: -1 });
    res.json({ anexos: anexos.map((a) => a.toJSON()) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar os anexos.' });
  }
});

// POST /api/cards/:id/anexos -> sobe um anexo novo (já em base64, gerado no navegador)
router.post('/:id/anexos', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
    const { nomeArquivo, tipoMime, dadosBase64 } = req.body;
    if (!nomeArquivo || !dadosBase64) return res.status(400).json({ error: 'Arquivo inválido.' });
    if (dadosBase64.length > 4 * 1024 * 1024) {
      return res.status(400).json({ error: 'Arquivo muito grande. O limite é de aproximadamente 3 MB por anexo.' });
    }
    const card = await Card.findOne({ _id: req.params.id, userId: req.userId });
    if (!card) return res.status(404).json({ error: 'Cliente não encontrado.' });

    const anexo = await Anexo.create({
      userId: req.userId,
      cardId: card._id,
      nomeArquivo,
      tipoMime: tipoMime || 'application/octet-stream',
      dadosBase64,
      tamanho: Math.round((dadosBase64.length * 3) / 4), // estimativa do tamanho original a partir do base64
    });
    res.status(201).json(anexo.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao subir o anexo.' });
  }
});

// DELETE /api/cards/:id/anexos/:anexoId -> remove um anexo
router.delete('/:id/anexos/:anexoId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.anexoId)) return res.status(400).json({ error: 'ID inválido.' });
    const anexo = await Anexo.findOneAndDelete({ _id: req.params.anexoId, cardId: req.params.id, userId: req.userId });
    if (!anexo) return res.status(404).json({ error: 'Anexo não encontrado.' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir o anexo.' });
  }
});

module.exports = router;
