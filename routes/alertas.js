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
    // Validate secret
    var secret   = req.headers['x-webhook-secret'];
    var expected = process.env.WEBHOOK_AGENDA_SECRET;
    if (expected && secret !== expected) {
      console.warn('Webhook agenda: secret inválido');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    var payload = req.body;
    var event   = payload.event;
    var patient = payload.patient || {};

    console.log('=== WEBHOOK AGENDA ===');
    console.log('Event:', event);
    console.log('Tenant:', payload.tenant || payload.tenant_id || payload.tenant_slug || 'NÃO INFORMADO');
    console.log('Patient:', patient.name || 'N/A', '| Phone:', patient.phone || 'N/A');
    console.log('Date:', payload.date, 'Time:', payload.time);
    console.log('Full payload:', JSON.stringify(payload));
    console.log('======================');

    // Try to find patient in Synapse Core by phone or name
    var paciente_id = null;
    var pacienteNome = patient.name || 'Paciente';

    if (patient.phone) {
      var tel = patient.phone.replace(/\D/g,'');
      var r = await db.query(
        `SELECT id, nome_completo FROM pacientes
         WHERE REGEXP_REPLACE(telefone, '[^0-9]', '', 'g') ILIKE $1
            OR REGEXP_REPLACE(telefone, '[^0-9]', '', 'g') ILIKE $2
         AND status = 'ativo' LIMIT 1`,
        ['%'+tel.slice(-8)+'%', '%'+tel.slice(-9)+'%']
      );
      if (r.rows.length) {
        paciente_id = r.rows[0].id;
        pacienteNome = r.rows[0].nome_completo.split(' ')[0];
      }
    }

    // Fallback: match by name
    if (!paciente_id && patient.name) {
      var firstName = patient.name.trim().split(' ')[0];
      var rn = await db.query(
        `SELECT id, nome_completo FROM pacientes
         WHERE nome_completo ILIKE $1 AND status='ativo' LIMIT 1`,
        [firstName+'%']
      );
      if (rn.rows.length) {
        paciente_id  = rn.rows[0].id;
        pacienteNome = rn.rows[0].nome_completo.split(' ')[0];
      }
    }

    // Format date/time
    var dataStr = '';
    if (payload.date) {
      var d = new Date(payload.date + 'T12:00:00');
      dataStr = d.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'2-digit' });
    }
    var horaStr = payload.time || '';

    // ── EVENT: appointment.created (3.4) ──
    if (event === 'appointment.created') {
      var proc    = payload.procedure || 'sessão';
      var titulo  = '📅 Novo agendamento: ' + pacienteNome;
      var corpo   = (patient.name || pacienteNome) + ' agendou ' + proc +
        (dataStr ? ' para ' + dataStr : '') +
        (horaStr ? ' às ' + horaStr : '') + '.';

      await db.query(
        `INSERT INTO alertas (tipo, prioridade, titulo, corpo, paciente_id, acao_tipo, acao_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        ['agendamento_novo','informativo', titulo, corpo,
         paciente_id||null, 'paciente',
         paciente_id ? '/sessoes/'+paciente_id : '/pacientes']
      );
      console.log('Alerta agendamento criado:', titulo);
    }

    // ── EVENT: appointment.reminder — 30min antes (3.8) ──
    else if (event === 'appointment.reminder') {
      var proc2   = payload.procedure || 'sessão';
      var titulo2 = '⏰ Sessão em 30 minutos: ' + pacienteNome;
      var corpo2  = 'Próxima sessão com ' + (patient.name||pacienteNome) +
        (horaStr ? ' às ' + horaStr : '') +
        (proc2 !== 'sessão' ? ' — ' + proc2 : '') + '. Preparação recomendada.';

      await db.query(
        `INSERT INTO alertas (tipo, prioridade, titulo, corpo, paciente_id, acao_tipo, acao_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        ['sessao_em_breve','atencao', titulo2, corpo2,
         paciente_id||null, 'paciente',
         paciente_id ? '/sessoes/'+paciente_id : '/pacientes']
      );
      console.log('Alerta sessão em breve criado:', titulo2);
    }

    // ── EVENT: appointment.cancelled (3.5 — futuro) ──
    else if (event === 'appointment.cancelled') {
      var titulo3 = '⚠️ Sessão cancelada: ' + pacienteNome;
      var corpo3  = (patient.name||pacienteNome) + ' cancelou a sessão' +
        (dataStr ? ' de ' + dataStr : '') +
        (horaStr ? ' às ' + horaStr : '') + '.';

      await db.query(
        `INSERT INTO alertas (tipo, prioridade, titulo, corpo, paciente_id, acao_tipo, acao_url, acao_whatsapp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        ['sessao_cancelada','operacional', titulo3, corpo3,
         paciente_id||null, 'paciente',
         paciente_id ? '/sessoes/'+paciente_id : '/pacientes',
         patient.phone ? patient.phone.replace(/\D/g,'').replace(/^(?!55)/,'55') : null]
      );
      console.log('Alerta cancelamento criado:', titulo3);
    }

    else {
      console.log('Webhook agenda: evento não processado —', event);
    }

    res.json({ received: true, event, paciente_encontrado: !!paciente_id });

  } catch(e) {
    console.error('Webhook agenda erro:', e.message);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
