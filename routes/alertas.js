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

    console.log('=== WEBHOOK AGENDA ===');
    console.log('Event:', event, '| Tenant:', payload.tenant || 'N/A');
    console.log('======================');

    // ── FILTRO DE TENANT ──
    var tenantEsperado = process.env.WEBHOOK_TENANT_NAME || 'Terapia Evolutiva';
    if (payload.tenant && payload.tenant !== tenantEsperado) {
      console.log('Webhook ignorado — tenant:', payload.tenant);
      return res.json({ received: true, ignored: true, reason: 'tenant_mismatch' });
    }

    // ── EXTRAIR DADOS — payload.appointment ──
    var appt     = payload.appointment || {};
    var patName  = appt.patient_name  || '';
    var patPhone = appt.patient_phone || '';
    var dataAppt = appt.date          || '';
    var horaAppt = appt.time          || '';
    var proc     = appt.procedure     || 'sessão';
    var cidade   = appt.city          || '';

    // Formatar data
    var dataStr = '';
    if (dataAppt) {
      try {
        var d = new Date(dataAppt);
        dataStr = d.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'2-digit' });
      } catch(e) { dataStr = dataAppt; }
    }

    // WhatsApp — garantir prefixo 55
    var wppNum = patPhone.replace(/\D/g,'');
    if (wppNum && !wppNum.startsWith('55')) wppNum = '55' + wppNum;

    // ── MATCH PACIENTE ──
    var paciente_id  = null;
    var pacienteNome = patName || 'Paciente';

    if (wppNum.length >= 10) {
      var rp = await db.query(
        `SELECT id, nome_completo FROM pacientes
         WHERE REGEXP_REPLACE(telefone,'[^0-9]','','g') LIKE $1
         AND status='ativo' LIMIT 1`,
        ['%' + wppNum.slice(-8) + '%']
      );
      if (rp.rows.length) {
        paciente_id  = rp.rows[0].id;
        pacienteNome = rp.rows[0].nome_completo.split(' ')[0];
      }
    }
    if (!paciente_id && patName) {
      var rn = await db.query(
        `SELECT id, nome_completo FROM pacientes
         WHERE nome_completo ILIKE $1 AND status='ativo' LIMIT 1`,
        [patName.trim().split(' ')[0] + '%']
      );
      if (rn.rows.length) {
        paciente_id  = rn.rows[0].id;
        pacienteNome = rn.rows[0].nome_completo.split(' ')[0];
      }
    }

    // ── EVENTOS ──
    if (event === 'appointment.created') {
      var titulo = '📅 Novo agendamento: ' + pacienteNome;
      var corpo  = patName + ' agendou ' + proc +
        (dataStr  ? ' para ' + dataStr  : '') +
        (horaAppt ? ' às ' + horaAppt   : '') +
        (cidade   ? ' — ' + cidade      : '') + '.';
      await db.query(
        `INSERT INTO alertas (tipo,prioridade,titulo,corpo,paciente_id,acao_tipo,acao_url,acao_whatsapp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        ['agendamento_novo','informativo',titulo,corpo,
         paciente_id||null,'paciente',
         paciente_id?'/sessoes/'+paciente_id:'/pacientes',
         wppNum||null]
      );
      console.log('Alerta criado:', titulo);
    }
    else if (event === 'appointment.reminder') {
      var titulo2 = '⏰ Sessão em 30 minutos: ' + pacienteNome;
      var corpo2  = 'Próxima sessão com ' + patName +
        (horaAppt ? ' às ' + horaAppt : '') +
        (proc !== 'sessão' ? ' — ' + proc : '') + '. Preparação recomendada.';
      await db.query(
        `INSERT INTO alertas (tipo,prioridade,titulo,corpo,paciente_id,acao_tipo,acao_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        ['sessao_em_breve','atencao',titulo2,corpo2,
         paciente_id||null,'paciente',
         paciente_id?'/sessoes/'+paciente_id:'/pacientes']
      );
      console.log('Alerta criado:', titulo2);
    }
    else if (event === 'appointment.cancelled') {
      var titulo3 = '⚠️ Sessão cancelada: ' + pacienteNome;
      var corpo3  = patName + ' cancelou a sessão' +
        (dataStr  ? ' de ' + dataStr  : '') +
        (horaAppt ? ' às ' + horaAppt : '') + '.';
      await db.query(
        `INSERT INTO alertas (tipo,prioridade,titulo,corpo,paciente_id,acao_tipo,acao_url,acao_whatsapp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        ['sessao_cancelada','operacional',titulo3,corpo3,
         paciente_id||null,'paciente',
         paciente_id?'/sessoes/'+paciente_id:'/pacientes',
         wppNum||null]
      );
      console.log('Alerta criado:', titulo3);
    }
    else {
      console.log('Evento não processado:', event);
    }

    res.json({ received: true, event, tenant: payload.tenant, paciente_encontrado: !!paciente_id });

  } catch(e) {
    console.error('Webhook agenda erro:', e.message);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
