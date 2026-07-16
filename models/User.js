const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    nome: { type: String, trim: true, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    senhaHash: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.senhaHash; // nunca devolver o hash da senha pro front-end
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
