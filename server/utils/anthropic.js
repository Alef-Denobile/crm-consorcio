const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
// Haiku é rápido e barato — suficiente para sugestões curtas de texto.
const MODELO = 'claude-haiku-4-5-20251001';

async function perguntarClaude(prompt, { maxTokens = 300 } = {}) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('A integração com IA não está configurada neste servidor.');
  }
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data.error && data.error.message) || 'Erro ao consultar a IA.');
  }
  const bloco = (data.content || []).find((b) => b.type === 'text');
  return bloco ? bloco.text.trim() : '';
}

module.exports = { perguntarClaude };
