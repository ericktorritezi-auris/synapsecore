require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./db');
const { runMigrations } = require('./db/migrations');

const app     = express();
const PORT    = process.env.PORT || 3000;
const VERSION = '3.2.7';

// ── MIDDLEWARE ──
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Disable caching for all API routes
app.use('/api', function(req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ── API ROUTES ──
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/pacientes', require('./routes/pacientes'));
app.use('/api/pacotes',   require('./routes/pacotes'));
app.use('/api/anamnese',  require('./routes/anamnese'));
app.use('/api/mapeamentos',require('./routes/mapeamentos'));
app.use('/api/sessoes',    require('./routes/sessoes'));
app.use('/api/evolucao',   require('./routes/evolucao'));
app.use('/api/perfil',     require('./routes/perfil'));
app.use('/api/cids',       require('./routes/cids'));
app.use('/api/documentos', require('./routes/documentos'));
app.use('/api/push',       require('./routes/push'));
app.use('/api/radar',      require('./routes/radar'));
app.use('/api/programas',  require('./routes/programas'));
app.use('/api/financeiro', require('./routes/financeiro'));
app.use('/api/feedbacks',  require('./routes/feedbacks'));
// ── v3.0 — Inteligência Clínica ──
app.use('/api/briefing',    require('./routes/briefing'));
app.use('/api/intervencoes',require('./routes/intervencoes'));
app.use('/api/memoria',     require('./routes/memoria'));
app.use('/api/analise',     require('./routes/analise'));
app.get('/analise/:pid',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'analise.html')));
app.use('/api/prontuario',  require('./routes/prontuario'));
app.get('/prontuario-inteligente', (req, res) => res.sendFile(path.join(__dirname, 'public', 'prontuario.html')));
// ── CADASTRO PÚBLICO (sem auth) ──
app.use('/api/cadastro',   require('./routes/cadastro'));
app.get('/cadastro',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'cadastro.html')));

// ── PAGES ──
app.get('/',              (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/pacientes',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'pacientes.html')));
app.get('/paciente-novo', (req, res) => res.sendFile(path.join(__dirname, 'public', 'paciente-novo.html')));
app.get('/anamnese/:token', (req, res) => res.sendFile(path.join(__dirname, 'public', 'anamnese.html')));
app.get('/mapeamento/:id',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'mapeamento.html')));
app.get('/sessoes/:id',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'sessoes.html')));
app.get('/evolucao/:token', (req, res) => res.sendFile(path.join(__dirname, 'public', 'evolucao.html')));
app.get('/financeiro',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'financeiro.html')));
app.get('/programas',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'programas.html')));
app.get('/radar',          (req, res) => res.sendFile(path.join(__dirname, 'public', 'radar.html')));
app.get('/perfil',         (req, res) => res.sendFile(path.join(__dirname, 'public', 'perfil.html')));
app.get('/documentos/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'documentos.html')));
app.get('/doc/:token',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'doc-viewer.html')));

// ── HEALTH ──
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', app: 'Synapse Core', version: VERSION, database: 'conectado', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'erro', database: 'desconectado', message: err.message });
  }
});

// ── START ──
app.listen(PORT, async () => {
  console.log(`╔══════════════════════════════════════╗`);
  console.log(`║   SYNAPSE CORE v${VERSION}            ║`);
  console.log(`║   Plataforma de Inteligência Clínica  ║`);
  console.log(`║   Porta: ${PORT}                          ║`);
  console.log(`╚══════════════════════════════════════╝`);
  try {
    const r = await db.query('SELECT NOW() AS agora');
    console.log(`✅ PostgreSQL conectado — ${r.rows[0].agora}`);
    await runMigrations();
  } catch (err) {
    console.error('❌ Erro ao iniciar banco:', err.message);
    process.exit(1);
  }
});
