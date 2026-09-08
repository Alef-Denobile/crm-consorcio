const express = require('express');
const auth = require('../middleware/auth');
const Card = require('../models/Card');
const Column = require('../models/Column');
const { perguntarClaude } = require('../utils/anthropic');

const router = express.Router();
router.use(auth); // todas as rotas de IA exigem login

// POST /api/ai/mensagem -> sugere uma mensagem de WhatsApp para retomar contato com o cliente
router.post('/mensagem', async (req, res) => {
  try {
    const { cardId } = req.body;
    const card = await Card.findOne({ _id: cardId, userId: req.userId });
    if (!card) return res.status(404).json({ error: 'Cliente não encontrado.' });
    const coluna = await Column.findOne({ _id: card.columnId, userId: req.userId });

    const prompt = `Você é um assistente de vendas de consórcios no Brasil. Escreva uma mensagem curta e cordial de WhatsApp (no máximo 3 frases, português informal mas profissional, sem emojis em excesso) para retomar contato com este cliente:
- Nome: ${card.cliente}
- Etapa do funil: ${coluna ? coluna.nome : 'não informado'}
- Qualificação: ${card.temperatura}
- Valor de crédito de interesse: R$ ${card.valor}
- Observações: ${card.obs || 'nenhuma'}

Responda só com o texto da mensagem, pronto para enviar, sem explicações antes ou depois e sem aspas envolvendo o texto.`;

    const mensagem = await perguntarClaude(prompt, { maxTokens: 250 });
    res.json({ mensagem });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao gerar mensagem.' });
  }
});

// POST /api/ai/insights -> 2 a 4 alertas curtos sobre o estado atual do funil
router.post('/insights', async (req, res) => {
  try {
    const [columns, cards] = await Promise.all([
      Column.find({ userId: req.userId }),
      Card.find({ userId: req.userId }),
    ]);
    if (!cards.length) {
      return res.json({ insights: ['Ainda não há clientes cadastrados para gerar insights.'] });
    }

    const resumo = columns.map((col) => {
      const doColuna = cards.filter((c) => c.columnId.toString() === col._id.toString());
      const total = doColuna.reduce((s, c) => s + (c.valor || 0), 0);
      return `- ${col.nome} (tipo: ${col.tipo}): ${doColuna.length} cliente(s), total R$ ${total.toFixed(2)}`;
    }).join('\n');
    const quentes = cards.filter((c) => c.temperatura === 'quente').length;

    const prompt = `Você é um analista de vendas de consórcios. Com base neste resumo do funil, escreva de 2 a 4 alertas ou insights curtos (uma frase cada, cada um em uma linha começando com "-"), em português, destacando o que precisa de atenção agora. Seja específico e direto, sem introdução nem conclusão:

${resumo}
Total de leads quentes em aberto: ${quentes}`;

    const texto = await perguntarClaude(prompt, { maxTokens: 300 });
    const insights = texto.split('\n').map((l) => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
    res.json({ insights });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao gerar insights.' });
  }
});

// POST /api/ai/sugerir-tarefa -> sugere uma tarefa de acompanhamento a partir das observações do cliente
router.post('/sugerir-tarefa', async (req, res) => {
  try {
    const { cardId } = req.body;
    const card = await Card.findOne({ _id: cardId, userId: req.userId });
    if (!card) return res.status(404).json({ error: 'Cliente não encontrado.' });

    const prompt = `Você é um assistente de vendas. Com base nestas informações sobre um cliente de consórcio, sugira UMA tarefa de acompanhamento objetiva. Responda em exatamente duas linhas, nada além disso:
Linha 1: o título da tarefa (máximo 8 palavras, sem numeração ou prefixo)
Linha 2: só um número — em quantos dias a partir de hoje ela deveria vencer

Cliente: ${card.cliente}
Qualificação: ${card.temperatura}
Observações: ${card.obs || 'nenhuma'}`;

    const texto = await perguntarClaude(prompt, { maxTokens: 80 });
    const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
    const titulo = (linhas[0] || 'Fazer follow-up').replace(/^(linha\s*1[:.]?\s*)/i, '');
    const dias = parseInt((linhas[1] || '3').replace(/\D/g, ''), 10) || 3;
    res.json({ titulo, dias });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao sugerir tarefa.' });
  }
});

module.exports = router;
