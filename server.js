require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { Pool } = require('pg');

const app     = express();
const PORT    = process.env.PORT || 3000;
const VERSION = '1.0.1';

// ── DATABASE ──
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

async function testDB() {
  try {
    const result = await db.query('SELECT NOW() AS agora');
    console.log(`✅ PostgreSQL conectado — ${result.rows[0].agora}`);
  } catch (err) {
    console.error('❌ Erro ao conectar ao PostgreSQL:', err.message);
    process.exit(1);
  }
}

// ── MIDDLEWARE ──
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── STATIC FILES ──
app.use(express.static(path.join(__dirname, 'public')));

// ── HEALTH CHECK ──
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'ok',
      app: 'Synapse Core',
      version: VERSION,
      database: 'conectado',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'erro',
      database: 'desconectado',
      message: err.message
    });
  }
});

// ── ROOT → LOGIN ──
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── START ──
app.listen(PORT, async () => {
  console.log(`╔══════════════════════════════════════╗`);
  console.log(`║   SYNAPSE CORE v${VERSION}            ║`);
  console.log(`║   Plataforma de Inteligência Clínica  ║`);
  console.log(`║   Porta: ${PORT}                          ║`);
  console.log(`╚══════════════════════════════════════╝`);
  await testDB();
});

module.exports = { db };
