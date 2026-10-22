const Column = require('./models/Column');
const Funil = require('./models/Funil');
const CampoPersonalizado = require('./models/CampoPersonalizado');

// Roda uma vez para cada usuário novo (chamado no cadastro),
// criando o primeiro funil (com colunas padrão) para ele começar a trabalhar.
// perfil 'rh' (versão administrativa, /adm): funil de recrutamento + campos de candidato.
async function seedColunasPadrao(userId, perfil) {
  if (perfil === 'rh') {
    const funil = await Funil.create({ userId, nome: 'Processo seletivo', ordem: 0 });
    await Column.insertMany([
      { userId, funilId: funil._id, nome: 'Triagem', tipo: 'aberto', ordem: 0 },
      { userId, funilId: funil._id, nome: 'Entrevista', tipo: 'aberto', ordem: 1 },
      { userId, funilId: funil._id, nome: 'Teste / Proposta', tipo: 'aberto', ordem: 2 },
      { userId, funilId: funil._id, nome: 'Contratado', tipo: 'ganho', ordem: 3 },
      { userId, funilId: funil._id, nome: 'Descartado', tipo: 'perdido', ordem: 4 },
    ]);
    await CampoPersonalizado.insertMany([
      { userId, nome: 'Vaga', tipo: 'texto', ordem: 0 },
      { userId, nome: 'Origem do candidato', tipo: 'texto', ordem: 1 },
      { userId, nome: 'LinkedIn / currículo (link)', tipo: 'texto', ordem: 2 },
      { userId, nome: 'Data da entrevista', tipo: 'data', ordem: 3 },
      { userId, nome: 'Disponibilidade para início', tipo: 'texto', ordem: 4 },
    ]);
    return;
  }
  const funil = await Funil.create({ userId, nome: 'Funil Principal', ordem: 0 });
  await Column.insertMany([
    { userId, funilId: funil._id, nome: 'Leads', tipo: 'aberto', ordem: 0 },
    { userId, funilId: funil._id, nome: 'Qualificação', tipo: 'aberto', ordem: 1 },
    { userId, funilId: funil._id, nome: 'Negociação', tipo: 'aberto', ordem: 2 },
    { userId, funilId: funil._id, nome: 'Fechado — Vendido', tipo: 'ganho', ordem: 3 },
    { userId, funilId: funil._id, nome: 'Perdido', tipo: 'perdido', ordem: 4 },
  ]);
}

module.exports = { seedColunasPadrao };
