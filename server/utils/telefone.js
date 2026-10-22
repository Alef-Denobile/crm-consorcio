// Transforma qualquer formato de telefone digitado (com espaço, parênteses, +55, etc.)
// no formato que a API do WhatsApp espera: só dígitos, com o 55 do Brasil na frente
// quando a pessoa não digitou o código do país.
function normalizarTelefone(tel) {
  let digitos = String(tel || '').replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length <= 11) digitos = '55' + digitos; // assume Brasil se não veio com DDI
  return digitos;
}

// O WhatsApp às vezes entrega o mesmo celular brasileiro com e sem o "9" depois do DDD
// (5515988295905 e 551588295905). Devolve os dois jeitos, pra achar o mesmo contato nos dois casos
// e não criar um segundo lead/conversa pra mesma pessoa. Fixo (começa com 2 a 5) não tem variante.
function variantesTelefone(tel) {
  const n = normalizarTelefone(tel);
  if (!n) return [];
  const v = [n];
  if (n.startsWith('55') && n.length === 13 && n[4] === '9') v.push(n.slice(0, 4) + n.slice(5)); // tira o 9
  else if (n.startsWith('55') && n.length === 12 && /[6-9]/.test(n[4])) v.push(n.slice(0, 4) + '9' + n.slice(4)); // põe o 9
  return v;
}

// Chave única da pessoa, igual pros dois jeitos do mesmo celular (sempre a versão com o 9).
function chaveTelefone(tel) {
  const v = variantesTelefone(tel);
  return v.length ? v.reduce((a, b) => (b.length > a.length ? b : a)) : null;
}

module.exports = { normalizarTelefone, variantesTelefone, chaveTelefone };
