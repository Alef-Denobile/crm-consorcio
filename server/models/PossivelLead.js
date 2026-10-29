const mongoose = require('mongoose');

const possivelLeadSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nome: { type: String, default: '' },
    telefone: { type: String, default: '' },
    tipoServico: { type: String, default: '' },
    origemArquivo: { type: String, default: '' }, // nome do arquivo importado, só pra referência
    // de onde veio: planilha importada, ou contato novo que mandou mensagem (triagem de contatos ligada)
    origem: { type: String, enum: ['planilha', 'whatsapp', 'instagram'], default: 'planilha' },
    telefoneNormalizado: { type: String, default: null, index: true }, // só dígitos, com DDI — casa as próximas mensagens do mesmo número
    instagramId: { type: String, default: null, index: true },
    // mensagens que a pessoa mandou enquanto esperava a sua decisão (viram o histórico do cliente ao aceitar)
    mensagens: {
      type: [{
        _id: false,
        texto: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
        whatsappMessageId: { type: String, default: null },
        instagramMessageId: { type: String, default: null },
        midiaTipo: { type: String, default: null },
      }],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

module.exports = mongoose.model('PossivelLead', possivelLeadSchema);
