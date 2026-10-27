const mongoose = require('mongoose');

const funilSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nome: { type: String, required: true, trim: true },
    ordem: { type: Number, default: 0 },
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

// Índices (consultas mais usadas): sem eles o banco lê a coleção inteira a cada pedido
funilSchema.index({ userId: 1, ordem: 1 });

module.exports = mongoose.model('Funil', funilSchema);
