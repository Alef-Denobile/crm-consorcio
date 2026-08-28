require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const boardRoutes = require('./routes/board');
const columnRoutes = require('./routes/columns');
const cardRoutes = require('./routes/cards');
const taskRoutes = require('./routes/tasks');
const calendarRoutes = require('./routes/calendar');
const comissoesRoutes = require('./routes/comissoes');
const aiRoutes = require('./routes/ai');
const whatsappRoutes = require('./routes/whatsapp');
const funisRoutes = require('./routes/funis');
const equipeRoutes = require('./routes/equipe');
const automacoesRoutes = require('./routes/automacoes');
const instagramRoutes = require('./routes/instagram');
const fluxosRoutes = require('./routes/fluxos');
const agendamentosRoutes = require('./routes/agendamentos');
const camposPersonalizadosRoutes = require('./routes/camposPersonalizados');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm_consorcio';

app.use(cors());
app.use(express.json());

// API (auth é pública; as outras exigem login dentro de cada rota)
app.use('/api/auth', authRoutes);
app.use('/api/board', boardRoutes);
app.use('/api/columns', columnRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/comissoes', comissoesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/funis', funisRoutes);
app.use('/api/equipe', equipeRoutes);
app.use('/api/automacoes', automacoesRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/fluxos', fluxosRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/campos-personalizados', camposPersonalizadosRoutes);

// front-end estático (a pasta public com index.html, css e js)
app.use(express.static(path.join(__dirname, '..', 'public')));

const { verificarAutomacoesPorTempo } = require('./utils/automacaoScheduler');
const { processarFluxos } = require('./utils/fluxoScheduler');
const { processarAgendamentos } = require('./utils/agendamentoScheduler');
const UMA_HORA = 60 * 60 * 1000;
const CINCO_MINUTOS = 5 * 60 * 1000;

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado ao MongoDB.');
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
    // primeira checagem logo após subir (sem esperar 1h), depois de hora em hora
    setTimeout(verificarAutomacoesPorTempo, 30 * 1000);
    setInterval(verificarAutomacoesPorTempo, UMA_HORA);
    setTimeout(processarFluxos, 45 * 1000);
    setInterval(processarFluxos, UMA_HORA);
    setTimeout(processarAgendamentos, 15 * 1000);
    setInterval(processarAgendamentos, CINCO_MINUTOS);
  } catch (err) {
    console.error('Falha ao conectar no MongoDB:', err.message);
    process.exit(1);
  }
}

start();
