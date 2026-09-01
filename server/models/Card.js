const mongoose = require('mongoose');

function normalizarTelefone(tel) {
  let digitos = String(tel || '').replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length <= 11) digitos = '55' + digitos; // assume Brasil se não veio com DDI
  return digitos;
}

const cardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    columnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Column', required: true },
    cliente: { type: String, required: true, trim: true },
    valor: { type: Number, default: 0 },
    temperatura: { type: String, enum: ['quente', 'morno', 'frio'], default: 'morno' },
    telefone: { type: String, default: '' },
    telefoneNormalizado: { type: String, default: null, index: true }, // só dígitos, com DDI — usado pra casar mensagens do WhatsApp
    obs: { type: String, default: '' },
    tipoCarta: { type: String, enum: ['imovel', 'veiculo', 'investimento'], default: 'imovel' },
    mes: { type: String, default: '' }, // formato "YYYY-MM"
    colunaDesde: { type: Date, default: Date.now }, // quando entrou na coluna atual — usado pelas automações por tempo
    automacoesDisparadas: { type: [mongoose.Schema.Types.ObjectId], default: [] }, // evita repetir a mesma automação por tempo no mesmo card
    sugestaoIA: {
      texto: { type: String, default: null },
      tarefaTitulo: { type: String, default: null },
      tarefaDias: { type: Number, default: null },
      geradaEm: { type: Date, default: null },
    },
    aguardandoMenuTriagem: { type: Boolean, default: false }, // true logo depois de mandar o menu de triagem, até a pessoa responder
    etiquetas: { type: [String], default: [] },
    camposPersonalizados: { type: mongoose.Schema.Types.Mixed, default: {} }, // { campoId: valor }
    arquivado: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.columnId = ret.columnId ? ret.columnId.toString() : null;
        delete ret._id;
        delete ret.__v;
        delete ret.automacoesDisparadas; // detalhe interno, não precisa ir pro front-end
      },
    },
  }
);

// mantém telefoneNormalizado em dia tanto em .create()/.save() quanto em findOneAndUpdate();
// também reseta colunaDesde/automacoesDisparadas sempre que o card muda de coluna
cardSchema.pre('save', function (next) {
  if (this.isModified('telefone')) this.telefoneNormalizado = normalizarTelefone(this.telefone);
  if (this.isModified('columnId')) {
    this.colunaDesde = new Date();
    this.automacoesDisparadas = [];
  }
  next();
});
cardSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && update.telefone !== undefined) {
    update.telefoneNormalizado = normalizarTelefone(update.telefone);
  }
  if (update && update.columnId !== undefined) {
    update.colunaDesde = new Date();
    update.automacoesDisparadas = [];
  }
  next();
});

module.exports = mongoose.model('Card', cardSchema);
