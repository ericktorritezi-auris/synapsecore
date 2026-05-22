require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./db');
const { runMigrations } = require('./db/migrations');

const app     = express();
const PORT    = process.env.PORT || 3000;
const VERSION = '3.7.0';

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
// ── CONTEXTO INICIAL — público, sem auth ──
app.get('/api/contexto/:token', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT m.id, m.paciente_id, m.contexto_inicial, m.contexto_token, m.created_at,
              m.indices_json, m.flags_json, m.risco_nivel,
              m.protocolo_json,
              p.nome_completo, p.perfil_tipo
       FROM mapeamentos m
       JOIN pacientes p ON p.id = m.paciente_id
       WHERE m.contexto_token::text = $1`,
      [req.params.token]
    );
    if (!r.rows.length || !r.rows[0].contexto_inicial) {
      return res.status(404).json({ message: 'Contexto não encontrado.' });
    }
    const row = r.rows[0];

    // Parse stored contexto
    var dados = {};
    try { dados = JSON.parse(row.contexto_inicial); }
    catch(e) { dados.texto = String(row.contexto_inicial || ''); }

    // Merge structural data
    if (!dados.indices) dados.indices = row.indices_json  || null;
    if (!dados.flags)   dados.flags   = row.flags_json    || [];
    if (!dados.risco)   dados.risco   = row.risco_nivel   || 'verde';

    // Always fetch CIDs fresh from DB — single source of truth, no duplicates
    try {
      const cQ = await db.query(
        `SELECT DISTINCT ON (cid_codigo) cid_codigo, cid_nome, confirmado
         FROM cids_paciente
         WHERE paciente_id = $1
         ORDER BY cid_codigo, confirmado DESC, id ASC`,
        [row.paciente_id]
      );
      dados.cids = cQ.rows || [];
    } catch(e2) {
      dados.cids = [];
    }

    // Get sintese from relatorio if not stored
    if (!dados.sintese) {
      var rel = row.protocolo_json || {};
      dados.sintese = rel.sintese_caso || '';
    }

    // Build explicit response — no spread to avoid surprises
    var resposta = {
      nome_completo: row.nome_completo,
      perfil_tipo:   row.perfil_tipo,
      created_at:    row.created_at,
      texto:         dados.texto    || '',
      indices:       dados.indices  || null,
      flags:         dados.flags    || [],
      cids:          dados.cids     || [],
      sintese:       dados.sintese  || '',
      risco:         dados.risco    || 'verde',
      nome:          dados.nome     || row.nome_completo
    };

    res.json(resposta);
  } catch(e) {
    console.error('GET /api/contexto error:', e.message, e.stack);
    res.status(500).json({ message: e.message });
  }
});

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
// ── v3.3.0 — CENTRAL DE ALERTAS ──
app.use('/api/alertas',    require('./routes/alertas'));
app.use('/api/consumo',   require('./routes/consumo'));
app.get('/consumo',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'consumo.html')));
app.post('/api/webhooks/agenda', (req, res, next) => {
  req.url = '/webhook-agenda';
  require('./routes/alertas')(req, res, next);
});

// ── PAGES ──
app.get('/',              (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/pacientes',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'pacientes.html')));
app.get('/paciente-novo', (req, res) => res.sendFile(path.join(__dirname, 'public', 'paciente-novo.html')));
app.get('/anamnese/:token', (req, res) => res.sendFile(path.join(__dirname, 'public', 'anamnese.html')));
app.get('/mapeamento/:id',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'mapeamento.html')));
app.get('/sessoes/:id',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'sessoes.html')));
app.get('/evolucao/:token', (req, res) => res.sendFile(path.join(__dirname, 'public', 'evolucao.html')));
app.get('/contexto/:token', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contexto.html')));
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

    // ── v3.3.0: Cron de alertas ──
    const { gerarAlertas } = require('./services/alertas-cron');
    gerarAlertas().catch(e => console.error('Cron alertas inicial:', e.message));
    setInterval(function() {
      gerarAlertas().catch(e => console.error('Cron alertas:', e.message));
    }, 60 * 60 * 1000); // a cada 1 hora
  } catch (err) {
    console.error('❌ Erro ao iniciar banco:', err.message);
    process.exit(1);
  }
});
