const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true },
    direction: { type: String, enum: ['in', 'out'], required: true }, // in = cliente escreveu, out = nós escrevemos
    texto: { type: String, default: '' },
    status: { type: String, default: null }, // sent | delivered | read | failed (só pra 'out')
    whatsappMessageId: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
    enviadoPorAgente: { type: Boolean, default: false }, // true = respondida sozinha pelo agente de IA, não por um humano
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.cardId = ret.cardId ? ret.cardId.toString() : null;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

module.exports = mongoose.model('Message', messageSchema);
