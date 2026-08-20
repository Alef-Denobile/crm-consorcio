const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { seedColunasPadrao } = require('../seed');

const router = express.Router();
const JWT_SECRET = auth.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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
    if (!user.senhaHash) {
      return res.status(401).json({ error: 'Esta conta usa login com Google. Use o botão "Continuar com Google".' });
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

// POST /api/auth/google -> login/cadastro usando o botão "Continuar com Google"
router.post('/google', async (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Login com Google não está configurado neste servidor.' });
    }
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Credencial do Google ausente.' });
    }

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Não foi possível verificar sua conta Google.' });
    }

    const emailNormalizado = payload.email.toLowerCase().trim();
    let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email: emailNormalizado }] });

    if (user) {
      // conta já existia (por e-mail/senha, por exemplo) — só liga o Google a ela
      if (!user.googleId) {
        user.googleId = payload.sub;
        await user.save();
      }
    } else {
      user = await User.create({
        nome: payload.name || '',
        email: emailNormalizado,
        googleId: payload.sub,
        senhaHash: null,
      });
      await seedColunasPadrao(user._id);
    }

    const token = gerarToken(user);
    res.json({ token, user: user.toJSON() });
  } catch (err) {
    res.status(401).json({ error: 'Não foi possível entrar com o Google.' });
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

// PUT /api/auth/password -> troca (ou define, se a conta só tinha login com Google) a senha
router.put('/password', auth, async (req, res) => {
  try {
    const { senhaAtual, senhaNova } = req.body;
    if (!senhaNova || senhaNova.length < 6) {
      return res.status(400).json({ error: 'A nova senha precisa ter ao menos 6 caracteres.' });
    }
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    if (user.senhaHash) {
      if (!senhaAtual) return res.status(400).json({ error: 'Informe a senha atual.' });
      const ok = await bcrypt.compare(senhaAtual, user.senhaHash);
      if (!ok) return res.status(401).json({ error: 'Senha atual incorreta.' });
    }

    user.senhaHash = await bcrypt.hash(senhaNova, 10);
    await user.save();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar a senha.' });
  }
});

module.exports = router;
