const mongoose = require('mongoose');

const googleCalendarSchema = new mongoose.Schema(
  {
    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
    expiryDate: { type: Number, default: null },
    calendarId: { type: String, default: null },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    nome: { type: String, trim: true, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    senhaHash: { type: String, default: null }, // null quando a conta usa só login com Google
    googleId: { type: String, default: null, unique: true, sparse: true },
    googleCalendar: { type: googleCalendarSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        ret.temSenha = !!ret.senhaHash;
        delete ret.senhaHash; // nunca devolver o hash da senha pro front-end
        ret.googleCalendarConnected = !!(ret.googleCalendar && ret.googleCalendar.refreshToken);
        delete ret.googleCalendar; // tokens nunca saem do servidor
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
