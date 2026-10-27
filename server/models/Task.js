const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    titulo: { type: String, required: true, trim: true },
    vencimento: { type: Date, default: null },
    prioridade: { type: String, enum: ['baixa', 'media', 'alta'], default: 'media' },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', default: null },
    descricao: { type: String, default: '' },
    concluida: { type: Boolean, default: false },
    googleEventId: { type: String, default: null },
    lembreteEmailEnviado: { type: Boolean, default: false }, // já mandamos o lembrete por e-mail (volta a false se o vencimento mudar)
    lembretePushEnviado: { type: Boolean, default: false }, // já avisamos por notificação push (volta a false se o vencimento mudar)
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.leadId = ret.leadId ? ret.leadId.toString() : null;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

// Índices (consultas mais usadas): sem eles o banco lê a coleção inteira a cada pedido
taskSchema.index({ userId: 1, vencimento: 1 });
taskSchema.index({ leadId: 1 });

module.exports = mongoose.model('Task', taskSchema);
