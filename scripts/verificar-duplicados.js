// Acusa função declarada duas vezes (a segunda sobrescreve a primeira em silêncio, porque os
// scripts do painel carregam em ordem e dividem o mesmo escopo global).
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '../public/js/app');
const vistos = new Map(); let erro = false;
for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.js')).sort()) {
  fs.readFileSync(path.join(dir, f), 'utf8').split('\n').forEach((l, i) => {
    const m = l.match(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/); if (!m) return;
    if (vistos.has(m[1])) { console.log(`✗ ${m[1]} duplicada: ${vistos.get(m[1])} e ${f}:${i + 1}`); erro = true; }
    else vistos.set(m[1], `${f}:${i + 1}`);
  });
}
if (!erro) console.log(`✔ ${vistos.size} funções, nenhuma duplicada`);
process.exit(erro ? 1 : 0);
