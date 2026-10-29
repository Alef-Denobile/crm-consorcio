const PossivelLead = require('../models/PossivelLead');
const Message = require('../models/Message');
const { normalizarTelefone, variantesTelefone } = require('./telefone');

const MAX_MENSAGENS = 30; // guarda só as últimas, pra um contato insistente não encher o banco

// Contato novo (número ou conta de Instagram que ainda não está no funil) mandou mensagem e a triagem está ligada:
// em vez de criar o lead, guarda em "Possíveis leads" junto com a mensagem. Mensagens seguintes do mesmo contato
// entram no mesmo registro. Devolve { possivel, criado }.
async function guardarComoPossivelLead(userId, { canal, telefone, instagramId, nome, mensagem }) {
  let possivel = null;
  if (canal === 'whatsapp') {
    const variantes = variantesTelefone(telefone);
    if (variantes.length) possivel = await PossivelLead.findOne({ userId, telefoneNormalizado: { $in: variantes } });
  } else if (instagramId) {
    possivel = await PossivelLead.findOne({ userId, instagramId });
  }
  const msg = {
    texto: String(mensagem.texto || '').slice(0, 2000),
    timestamp: mensagem.timestamp || new Date(),
    whatsappMessageId: mensagem.whatsappMessageId || null,
    instagramMessageId: mensagem.instagramMessageId || null,
    midiaTipo: mensagem.midiaTipo || null,
  };
  if (possivel) {
    // os provedores reenviam o mesmo evento: não guarda duas vezes a mesma mensagem
    const repetida = possivel.mensagens.some((m) => (msg.whatsappMessageId && m.whatsappMessageId === msg.whatsappMessageId)
      || (msg.instagramMessageId && m.instagramMessageId === msg.instagramMessageId));
    if (repetida) return { possivel, criado: false };
    possivel.mensagens = [...possivel.mensagens, msg].slice(-MAX_MENSAGENS);
    // o nome do perfil só entra se o registro ainda não tem um nome de verdade
    if (nome && !possivel.nome) possivel.nome = nome;
    await possivel.save();
    return { possivel, criado: false };
  }
  possivel = await PossivelLead.create({
    userId,
    nome: nome || '',
    telefone: canal === 'whatsapp' ? String(telefone || '') : '',
    telefoneNormalizado: canal === 'whatsapp' ? normalizarTelefone(telefone) : null,
    instagramId: canal === 'instagram' ? instagramId : null,
    origem: canal,
    mensagens: [msg],
  });
  return { possivel, criado: true };
}

// Ao aceitar o contato como lead, a conversa que ele já mandou vira o histórico do cliente.
// (função pura: só monta os documentos, quem chama grava)
function montarMensagensDoPossivel(possivel, cardId, userId) {
  const canal = possivel.origem === 'instagram' ? 'instagram' : 'whatsapp';
  return (possivel.mensagens || []).map((m) => ({
    userId,
    cardId,
    direction: 'in',
    canal,
    texto: m.texto,
    whatsappMessageId: m.whatsappMessageId || null,
    instagramMessageId: m.instagramMessageId || null,
    midiaTipo: m.midiaTipo || null,
    timestamp: m.timestamp || new Date(),
  }));
}

async function levarMensagensParaOCard(possivel, card) {
  const docs = montarMensagensDoPossivel(possivel, card._id, card.userId);
  if (docs.length) await Message.insertMany(docs);
  return docs.length;
}

module.exports = { guardarComoPossivelLead, montarMensagensDoPossivel, levarMensagensParaOCard, MAX_MENSAGENS };
