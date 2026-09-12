const express = require('express');
const auth = require('../middleware/auth');
const GerotBloco = require('../models/GerotBloco');

const router = express.Router();
router.use(auth);

const HORARIOS = [];
for (let h = 8; h <= 19; h++) {
  HORARIOS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 19) HORARIOS.push(`${String(h).padStart(2, '0')}:30`);
}

// GET /api/gerot/:semanaInicio -> todos os blocos preenchidos daquela semana (YYYY-MM-DD de uma segunda-feira)
router.get('/:semanaInicio', async (req, res) => {
  try {
    const blocos = await GerotBloco.find({ userId: req.userId, semanaInicio: req.params.semanaInicio });
    res.json({ blocos: blocos.map((b) => b.toJSON()) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar o GEROT.' });
  }
});

// PUT /api/gerot -> cria/atualiza (ou apaga, se texto vazio) um bloco específico
router.put('/', async (req, res) => {
  try {
    const { semanaInicio, diaSemana, horario, texto } = req.body;
    if (!semanaInicio || diaSemana == null || !horario) {
      return res.status(400).json({ error: 'Dados incompletos.' });
    }
    if (!HORARIOS.includes(horario)) return res.status(400).json({ error: 'Horário inválido.' });

    if (!texto || !texto.trim()) {
      // texto vazio = apaga o bloco, não faz sentido guardar uma célula em branco
      await GerotBloco.deleteOne({ userId: req.userId, semanaInicio, diaSemana, horario });
      return res.json({ apagado: true });
    }

    const bloco = await GerotBloco.findOneAndUpdate(
      { userId: req.userId, semanaInicio, diaSemana, horario },
      { texto: texto.trim() },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(bloco.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar o bloco do GEROT.' });
  }
});

// POST /api/gerot/copiar -> copia todos os blocos de uma semana pra outra (não sobrescreve a de destino, só preenche o que estiver vazio)
router.post('/copiar', async (req, res) => {
  try {
    const { semanaOrigem, semanaDestino } = req.body;
    if (!semanaOrigem || !semanaDestino) return res.status(400).json({ error: 'Semanas de origem e destino são obrigatórias.' });

    const blocosOrigem = await GerotBloco.find({ userId: req.userId, semanaInicio: semanaOrigem });
    if (!blocosOrigem.length) return res.json({ copiados: 0 });

    const blocosDestinoExistentes = await GerotBloco.find({ userId: req.userId, semanaInicio: semanaDestino });
    const jaPreenchido = new Set(blocosDestinoExistentes.map((b) => `${b.diaSemana}-${b.horario}`));

    let copiados = 0;
    for (const b of blocosOrigem) {
      const chave = `${b.diaSemana}-${b.horario}`;
      if (jaPreenchido.has(chave)) continue; // não sobrescreve o que a pessoa já escreveu na semana nova
      await GerotBloco.create({ userId: req.userId, semanaInicio: semanaDestino, diaSemana: b.diaSemana, horario: b.horario, texto: b.texto });
      copiados++;
    }
    res.json({ copiados });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao copiar a semana.' });
  }
});

module.exports = router;
