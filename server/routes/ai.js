const express = require('express');
const mongoose = require('mongoose');
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
    const { funilId } = req.body;
    const filtroColuna = { userId: req.userId };
    if (funilId && mongoose.isValidObjectId(funilId)) filtroColuna.funilId = funilId;

    const columns = await Column.find(filtroColuna);
    const columnIds = columns.map((c) => c._id.toString());
    const cards = (await Card.find({ userId: req.userId })).filter((c) => columnIds.includes(c.columnId.toString()));
    if (!cards.length) {
      return res.json({ insights: ['Ainda não há clientes cadastrados nesse funil para gerar insights.'] });
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

// Descreve o sistema inteiro pro assistente flutuante saber explicar qualquer parte
// dele e ajudar o usuário a navegar. Mantido aqui (não em arquivo à parte) porque só
// essa rota usa.
const SYSTEM_PROMPT_ASSISTENTE = `Você é o assistente de ajuda do "Painel CRM", um sistema de CRM (gestão de vendas) voltado para consultores de consórcio no Brasil. Seu papel é tirar dúvidas sobre como usar o sistema e ajudar o usuário a encontrar e entender qualquer funcionalidade. Responda sempre em português do Brasil, de forma direta e amigável, sem enrolação. Use no máximo uns 3-4 parágrafos curtos ou uma lista curta — nunca uma resposta gigante.

Estas são as áreas do sistema, acessíveis pela barra lateral:

- **Dashboard**: métricas do período (novos leads, em negociação, vendido, taxa de conversão), meta de vendas individual e da equipe, gráfico de leads captados, funil por etapa, últimos leads e tarefas abertas. Os painéis podem ser recolhidos clicando na seta ao lado do título.
- **Pipeline**: o quadro Kanban principal, com colunas que representam etapas do funil de vendas (ex: Leads, Qualificação, Negociação, Fechado, Perdido). Dá pra ter vários funis diferentes (aba "Funil Principal" + "Novo funil"). Os clientes (cards) são arrastados entre colunas — no computador com o mouse, no celular segurando e arrastando o card. Cada card mostra nome, valor, temperatura (frio/morno/quente), telefone com botão de WhatsApp direto. Dentro de cada card tem um botão "Extras" que abre Etiquetas, Anexos, Tarefas e Histórico de contato daquele cliente. Também dá pra filtrar por mês ou ver "Esfriando" (leads parados há mais de 7 dias).
- **Leads**: tabela com todos os clientes cadastrados, com filtros e exportação para CSV.
- **Conversas**: histórico de mensagens de WhatsApp trocadas com os clientes (quando o WhatsApp Business está conectado).
- **Comissões**: calcula automaticamente a comissão de cada contrato vendido, mês a mês, com base no valor da carta de crédito.
- **Relatórios**: análises do desempenho de vendas, com exportação em PDF.
- **Fluxos**: sequências automatizadas — por exemplo, "quando um lead entra na coluna X, espera 2 dias e manda uma mensagem de WhatsApp automaticamente, depois move pra outra coluna".
- **Importar/Exportar**: permite subir uma planilha (Excel ou CSV) de leads pra importar em massa, e exportar os leads existentes.
- **Equipe**: chat interno entre os membros da equipe, e (pra quem é Gestor) supervisão do desempenho de todos e ranking.
- **Agenda/Tarefas**: tem duas abas. "Calendário" mostra as tarefas do CRM junto com os compromissos do Google Agenda (se conectado), num calendário mensal. "GEROT" é uma grade semanal de rotina (segunda a sexta, 8h às 19h) onde a pessoa planeja blocos de horário pra cada atividade — os blocos podem durar mais de 30 minutos e a grade mescla as células automaticamente. O GEROT também tem botões de exportar/importar em planilha Excel.
- **Configurações**: perfil (nome, foto, senha, 2FA), integrações (WhatsApp Business, Google Agenda, Instagram, templates de mensagem), aparência (cor de destaque, modo claro/escuro), campos personalizados, e manutenção (backup dos dados).

Se o usuário perguntar algo bem específico dos dados dele (tipo "quantos leads eu tenho"), explique que você não tem acesso direto aos dados dele nesta conversa, e sugira onde ele encontra essa informação no próprio sistema (ex: Dashboard ou Leads). Se a pergunta não tiver nada a ver com o CRM, responda com educação que seu foco é ajudar com o sistema.`;

// POST /api/ai/assistente -> chat de ajuda geral sobre o sistema (bolinha flutuante)
router.post('/assistente', async (req, res) => {
  try {
    const { mensagens } = req.body;
    if (!Array.isArray(mensagens) || !mensagens.length) {
      return res.status(400).json({ error: 'Nenhuma mensagem enviada.' });
    }
    // limita o histórico enviado (últimas 12 mensagens) pra manter o custo/latência baixos
    const historico = mensagens.slice(-12).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 2000),
    }));
    const resposta = await perguntarClaude(null, { maxTokens: 500, system: SYSTEM_PROMPT_ASSISTENTE, mensagens: historico });
    res.json({ resposta });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao consultar o assistente.' });
  }
});

module.exports = router;
