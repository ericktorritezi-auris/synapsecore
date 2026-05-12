require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = '1.0.0';

// ── MIDDLEWARE ──
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── STATIC FILES ──
app.use(express.static(path.join(__dirname, 'public')));

// ── HEALTH CHECK ──
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Synapse Core',
    version: VERSION,
    timestamp: new Date().toISOString()
  });
});

// ── ROOT → LOGIN ──
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── START ──
app.listen(PORT, () => {
  console.log(`╔══════════════════════════════════════╗`);
  console.log(`║   SYNAPSE CORE v${VERSION}              ║`);
  console.log(`║   Plataforma de Inteligência Clínica  ║`);
  console.log(`║   Porta: ${PORT}                          ║`);
  console.log(`╚══════════════════════════════════════╝`);
});
