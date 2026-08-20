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
    mes: { type: String, default: '' }, // formato "YYYY-MM"
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.columnId = ret.columnId ? ret.columnId.toString() : null;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

// mantém telefoneNormalizado em dia tanto em .create()/.save() quanto em findOneAndUpdate()
cardSchema.pre('save', function (next) {
  if (this.isModified('telefone')) this.telefoneNormalizado = normalizarTelefone(this.telefone);
  next();
});
cardSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && update.telefone !== undefined) {
    update.telefoneNormalizado = normalizarTelefone(update.telefone);
  }
  next();
});

module.exports = mongoose.model('Card', cardSchema);
