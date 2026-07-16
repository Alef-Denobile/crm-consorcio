const Column = require('./models/Column');

// Roda uma vez para cada usuário novo (chamado no cadastro),
// criando o funil padrão para ele começar a trabalhar.
async function seedColunasPadrao(userId) {
  await Column.insertMany([
    { userId, nome: 'Leads', tipo: 'aberto', ordem: 0 },
    { userId, nome: 'Qualificação', tipo: 'aberto', ordem: 1 },
    { userId, nome: 'Negociação', tipo: 'aberto', ordem: 2 },
    { userId, nome: 'Fechado — Vendido', tipo: 'ganho', ordem: 3 },
    { userId, nome: 'Perdido', tipo: 'perdido', ordem: 4 },
  ]);
}

module.exports = { seedColunasPadrao };
