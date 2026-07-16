const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { seedColunasPadrao } = require('../seed');

const router = express.Router();
const JWT_SECRET = auth.JWT_SECRET;

function gerarToken(user) {
  return jwt.sign({ sub: user._id.toString() }, JWT_SECRET, { expiresIn: '30d' });
}

// POST /api/auth/register -> cria a conta e já devolve o token (login automático)
router.post('/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }
    if (senha.length < 6) {
      return res.status(400).json({ error: 'A senha precisa ter ao menos 6 caracteres.' });
    }

    const emailNormalizado = email.toLowerCase().trim();
    const existente = await User.findOne({ email: emailNormalizado });
    if (existente) {
      return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const user = await User.create({ nome: (nome || '').trim(), email: emailNormalizado, senhaHash });

    // cada novo usuário começa com o funil padrão (Leads, Qualificação, etc.)
    await seedColunasPadrao(user._id);

    const token = gerarToken(user);
    res.status(201).json({ token, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar conta.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const senhaOk = await bcrypt.compare(senha, user.senhaHash);
    if (!senhaOk) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const token = gerarToken(user);
    res.json({ token, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao entrar.' });
  }
});

// GET /api/auth/me -> dados do usuário logado (útil pra restaurar sessão)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json({ user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
});

module.exports = router;
