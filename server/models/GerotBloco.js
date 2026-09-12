const mongoose = require('mongoose');

// Cada documento é UM bloco de meia hora preenchido na grade semanal do GEROT
// (Gestão de Rotina) — um "molde" de como a semana de trabalho deveria se parecer,
// diferente da Agenda normal (que é sobre compromissos/tarefas específicos de uma
// data). Só existe um documento por combinação usuário+semana+dia+horário.
const gerotBlocoSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    semanaInicio: { type: String, required: true }, // segunda-feira daquela semana, formato "YYYY-MM-DD"
    diaSemana: { type: Number, required: true, min: 0, max: 4 }, // 0=segunda ... 4=sexta
    horario: { type: String, required: true }, // "08:00", "08:30", ... "19:00"
    texto: { type: String, default: '' },
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
gerotBlocoSchema.index({ userId: 1, semanaInicio: 1, diaSemana: 1, horario: 1 }, { unique: true });

module.exports = mongoose.model('GerotBloco', gerotBlocoSchema);
