const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    columnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Column', required: true },
    cliente: { type: String, required: true, trim: true },
    valor: { type: Number, default: 0 },
    temperatura: { type: String, enum: ['quente', 'morno', 'frio'], default: 'morno' },
    telefone: { type: String, default: '' },
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

module.exports = mongoose.model('Card', cardSchema);
