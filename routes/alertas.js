const express    = require('express');
const db         = require('../db');
const { verifyToken } = require('../middleware/auth');
const router     = express.Router();

// ── PRIORIDADES ──
const PRIORIDADE_ORDER = { critico:0, atencao:1, operacional:2, informativo:3 };

// ─────────────────────────────────────────────
// GET /api/alertas — lista alertas ativos
// ─────────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT a.*, p.nome_completo, p.telefone
      FROM alertas a
      LEFT JOIN pacientes p ON p.id = a.paciente_id
      WHERE a.resolvido = false
        AND (
          a.lido = false
          OR (a.lembrar_depois = true AND a.lembrar_em <= NOW())
        )
      ORDER BY
        CASE a.prioridade
          WHEN 'critico'     THEN 0
          WHEN 'atencao'     THEN 1
          WHEN 'operacional' THEN 2
          ELSE 3
        END ASC,
        a.gerado_em DESC
      LIMIT 50
    `);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── GET /api/alertas/count — badge count
router.get('/count', verifyToken, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT COUNT(*) AS total FROM alertas
      WHERE resolvido = false
        AND (
          lido = false
          OR (lembrar_depois = true AND lembrar_em <= NOW())
        )
    `);
    res.json({ count: parseInt(r.rows[0].total) || 0 });
  } catch(e) { res.json({ count: 0 }); }
});

// ── PUT /api/alertas/:id/lido
router.put('/:id/lido', verifyToken, async (req, res) => {
  try {
    await db.query(
      'UPDATE alertas SET lido=true, lido_em=NOW(), lembrar_depois=false WHERE id=$1',
      [req.params.id]
    );
    res.json({ message: 'Alerta marcado como lido.' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── PUT /api/alertas/lidos-todos
router.put('/lidos-todos', verifyToken, async (req, res) => {
  try {
    await db.query(
      'UPDATE alertas SET lido=true, lido_em=NOW(), lembrar_depois=false WHERE resolvido=false AND lido=false'
    );
    res.json({ message: 'Todos os alertas marcados como lidos.' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── PUT /api/alertas/:id/lembrar
router.put('/:id/lembrar', verifyToken, async (req, res) => {
  try {
    var lembrarEm = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.query(
      'UPDATE alertas SET lido=true, lido_em=NOW(), lembrar_depois=true, lembrar_em=$1 WHERE id=$2',
      [lembrarEm, req.params.id]
    );
    res.json({ message: 'Lembrete definido para 24h.' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── POST /api/webhooks/agenda — receptor Belle Planner (Fase B)
router.post('/webhook-agenda', async (req, res) => {
  try {
    var secret = req.headers['x-webhook-secret'];
    var expected = process.env.WEBHOOK_AGENDA_SECRET;
    if (expected && secret !== expected) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    var payload = req.body;
    console.log('Webhook agenda recebido:', payload.event, payload.patient && payload.patient.name);
    // Fase B: processar eventos appointment.created, appointment.reminder
    // Por enquanto apenas confirma recebimento
    res.json({ received: true, event: payload.event });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
