const express = require('express');
const { hojeBR } = require('../utils/dataBR');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const PossivelLead = require('../models/PossivelLead');
const Card = require('../models/Card');
const Column = require('../models/Column');
const { validarAtribuicao, colunaEquivalente, proximaOrdem } = require('../utils/atribuirLead');
const { enviarPush } = require('../utils/push');
const { gerarComissaoAutomaticaSeGanho } = require('../utils/comissaoAutomatica');

const router = express.Router();
router.use(auth); // todas as rotas de possível lead exigem login

// GET /api/possiveis-leads -> lista os que ainda não foram completados/descartados
router.get('/', async (req, res) => {
  try {
    const leads = await PossivelLead.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ leads: leads.map((l) => l.toJSON()) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar os possíveis leads.' });
  }
});

// POST /api/possiveis-leads/importar -> recebe as linhas já lidas da planilha no navegador
router.post('/importar', async (req, res) => {
  try {
    const { linhas, origemArquivo } = req.body;
    if (!Array.isArray(linhas) || !linhas.length) {
      return res.status(400).json({ error: 'Nenhuma linha pra importar.' });
    }
    const documentos = linhas
      .filter((l) => l && (l.nome || l.telefone))
      .slice(0, 2000) // limite de segurança por importação
      .map((l) => ({
        userId: req.userId,
        nome: (l.nome || '').toString().trim(),
        telefone: (l.telefone || '').toString().trim(),
        tipoServico: (l.tipoServico || '').toString().trim(),
        origemArquivo: origemArquivo || '',
      }));
    if (!documentos.length) return res.status(400).json({ error: 'Nenhuma linha válida encontrada.' });
    const criados = await PossivelLead.insertMany(documentos);
    res.status(201).json({ total: criados.length });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao importar a planilha.' });
  }
});

// POST /api/possiveis-leads/promover-lote -> passa vários possíveis leads (ou todos) pra Leads reais de uma vez.
// body: { ids?: [..] (vazio/ausente = todos), columnId?, atribuirParaId? (só gestor: manda pra outra pessoa da equipe) }
router.post('/promover-lote', async (req, res) => {
  try {
    const { ids, columnId, atribuirParaId } = req.body || {};
    const filtro = { userId: req.userId };
    if (Array.isArray(ids) && ids.length) {
      const validos = ids.filter((i) => mongoose.isValidObjectId(i));
      if (!validos.length) return res.status(400).json({ error: 'Seleção inválida.' });
      filtro._id = { $in: validos };
    }
    const possiveis = await PossivelLead.find(filtro).sort({ createdAt: 1 }).limit(2000);
    if (!possiveis.length) return res.status(400).json({ error: 'Não há possíveis leads para passar.' });

    let donoId = req.userId;
    let alvoInfo = null;
    if (atribuirParaId && String(atribuirParaId) !== String(req.userId)) {
      try { alvoInfo = await validarAtribuicao(req.userId, atribuirParaId); } catch (e) { return res.status(e.status || 400).json({ error: e.mensagem || e.message }); }
      donoId = alvoInfo.alvo._id;
    }

    // coluna de destino: a escolhida (ou a equivalente na conta da outra pessoa); sem escolha, a primeira "em aberto"
    let coluna = null;
    if (alvoInfo) coluna = await colunaEquivalente(columnId, donoId);
    else if (columnId && mongoose.isValidObjectId(columnId)) coluna = await Column.findOne({ _id: columnId, userId: req.userId });
    if (!coluna && !alvoInfo) coluna = await Column.findOne({ userId: req.userId, tipo: 'aberto' }).sort({ ordem: 1 });
    if (!coluna) return res.status(400).json({ error: alvoInfo ? 'A pessoa escolhida não tem uma coluna "em aberto" pra receber os leads.' : 'Você não tem uma coluna "em aberto" pra receber os leads.' });

    let ordem = await proximaOrdem(coluna._id, donoId);
    const hoje = hojeBR();
    const criados = [];
    for (const p of possiveis) {
      const card = await Card.create({
        userId: donoId,
        columnId: coluna._id,
        cliente: (p.nome || '').trim() || (p.telefone || '').trim() || 'Sem nome',
        telefone: (p.telefone || '').trim(),
        valor: 0,
        temperatura: 'morno',
        obs: p.tipoServico ? `Serviço de interesse: ${p.tipoServico}` : '',
        mes: '', // mês de venda só é preenchido quando a venda acontece
        mesInicioContato: hoje, // dia em que o lead entrou no Pipeline
        ordem,
        atribuidoPorId: alvoInfo ? req.userId : null,
      });
      ordem += 1000;
      criados.push(card);
    }
    await PossivelLead.deleteMany({ _id: { $in: possiveis.map((p) => p._id) } });
    if (alvoInfo) {
      enviarPush(donoId, { titulo: 'Novos leads pra você', corpo: `${alvoInfo.gestor.nome || 'O gestor'} passou ${criados.length} lead(s) pra você.`, tag: 'leads-lote', url: '/index.html', tipo: 'lead' });
    }
    res.status(201).json({ total: criados.length, cards: alvoInfo ? [] : criados.map((c) => c.toJSON()), destinoNome: alvoInfo ? (alvoInfo.alvo.nome || alvoInfo.alvo.email) : null });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao passar os possíveis leads para Leads.' });
  }
});

// POST /api/possiveis-leads/:id/promover -> completa os dados e vira um cliente de verdade
router.post('/:id/promover', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
    const possivel = await PossivelLead.findOne({ _id: req.params.id, userId: req.userId });
    if (!possivel) return res.status(404).json({ error: 'Possível lead não encontrado.' });

    const { nome, telefone, columnId, valor, temperatura, obs, mes } = req.body;
    const nomeFinal = (nome || possivel.nome || '').trim();
    const telefoneFinal = (telefone || possivel.telefone || '').trim();
    if (!nomeFinal) return res.status(400).json({ error: 'Informe o nome do cliente.' });
    if (!columnId || !mongoose.isValidObjectId(columnId)) return res.status(400).json({ error: 'Escolha a coluna de destino.' });
    const coluna = await Column.findOne({ _id: columnId, userId: req.userId });
    if (!coluna) return res.status(404).json({ error: 'Coluna não encontrada.' });

    const card = await Card.create({
      userId: req.userId,
      columnId,
      cliente: nomeFinal,
      telefone: telefoneFinal,
      valor: valor || 0,
      temperatura: temperatura || 'morno',
      obs: obs || '',
      mes: '', // mês de venda só é preenchido quando a venda acontece
      mesInicioContato: hojeBR(), // dia em que o lead entrou no Pipeline
    });
    await PossivelLead.findByIdAndDelete(possivel._id);
    res.status(201).json(card.toJSON());
    gerarComissaoAutomaticaSeGanho(req.userId, card, columnId);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao promover o lead.' });
  }
});

// DELETE /api/possiveis-leads/:id -> descarta (duplicado, contato errado, etc.)
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
    const possivel = await PossivelLead.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!possivel) return res.status(404).json({ error: 'Possível lead não encontrado.' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao descartar o possível lead.' });
  }
});

module.exports = router;
