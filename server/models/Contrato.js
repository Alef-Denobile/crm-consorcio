const mongoose = require('mongoose');

const contratoSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    desc: { type: String, required: true, trim: true },
    scope: { type: String, enum: ['Pessoal', 'Empresa'], default: 'Pessoal' },
    date: { type: Date, required: true }, // mês da 1ª parcela (dia 1)
    creditoValor: { type: Number, required: true }, // valor da carta de crédito vendida

    // calculados uma vez, na criação/edição, e guardados — assim o histórico
    // não muda retroativamente se a regra de cálculo mudar no futuro
    parcelas: { type: Number, required: true },
    parcelas1: { type: Number, required: true },
    value: { type: Number, required: true },
    value2: { type: Number, required: true },
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

module.exports = mongoose.model('Contrato', contratoSchema);
