const express  = require('express');
const webpush  = require('web-push');
const db       = require('../db');
const { verifyToken } = require('../middleware/auth');
const router   = express.Router();

// Configure VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:contato@synapsecore.app.br',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// ── GET /api/push/vapid-key (público) ──
router.get('/vapid-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ message: 'Push não configurado. Adicione VAPID_PUBLIC_KEY no Railway.' });
  res.json({ publicKey: key });
});

// ── GET /api/push/status ── (verifica se este dispositivo está inscrito)
router.get('/status', verifyToken, async (req, res) => {
  try {
    const endpoint = req.query.endpoint;
    if (!endpoint) return res.json({ inscrito: false });
    const r = await db.query(
      'SELECT id, created_at FROM push_subscriptions WHERE terapeuta_id=$1 AND endpoint=$2',
      [req.terapeuta.id, endpoint]
    );
    res.json({ inscrito: r.rows.length > 0, created_at: r.rows[0]?.created_at || null });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao verificar status.' });
  }
});

// ── POST /api/push/subscribe ──
router.post('/subscribe', verifyToken, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ message: 'Dados de subscription inválidos.' });
    }
    await db.query(
      `INSERT INTO push_subscriptions (terapeuta_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (terapeuta_id, endpoint)
       DO UPDATE SET p256dh=$3, auth=$4, user_agent=$5`,
      [req.terapeuta.id, subscription.endpoint, subscription.keys.p256dh,
       subscription.keys.auth, req.headers['user-agent'] || '']
    );
    res.json({ message: 'Subscription registrada com sucesso.' });
  } catch (err) {
    console.error('subscribe:', err.message);
    res.status(500).json({ message: 'Erro ao registrar subscription.' });
  }
});

// ── DELETE /api/push/unsubscribe ──
router.delete('/unsubscribe', verifyToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await db.query(
        'DELETE FROM push_subscriptions WHERE terapeuta_id=$1 AND endpoint=$2',
        [req.terapeuta.id, endpoint]
      );
    } else {
      // Remove all subscriptions for this therapist
      await db.query('DELETE FROM push_subscriptions WHERE terapeuta_id=$1', [req.terapeuta.id]);
    }
    res.json({ message: 'Subscription removida.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover subscription.' });
  }
});

// ── POST /api/push/test ── (dispara push de teste)
router.post('/test', verifyToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const where = endpoint
      ? 'WHERE terapeuta_id=$1 AND endpoint=$2'
      : 'WHERE terapeuta_id=$1';
    const params = endpoint ? [req.terapeuta.id, endpoint] : [req.terapeuta.id];
    const subs = await db.query(`SELECT * FROM push_subscriptions ${where}`, params);
    if (!subs.rows.length) return res.status(404).json({ message: 'Nenhum dispositivo registrado.' });

    const payload = JSON.stringify({
      title: 'Synapse Core',
      body:  '✅ Push reconectado com sucesso! Notificações ativas.',
      icon:  '/icons/apple-touch-icon.png',
      badge: '/icons/icon-96x96.png',
      url:   '/dashboard'
    });

    let ok = 0;
    for (const sub of subs.rows) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
        ok++;
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          await db.query('DELETE FROM push_subscriptions WHERE id=$1', [sub.id]);
        }
      }
    }
    res.json({ message: `Push de teste enviado para ${ok} dispositivo(s).`, enviados: ok });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao enviar push de teste.' });
  }
});

// ── sendPushToTerapeuta (uso interno) ──
async function sendPushToTerapeuta(terapeutaId, title, body, url) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  try {
    const subs = await db.query('SELECT * FROM push_subscriptions WHERE terapeuta_id=$1', [terapeutaId]);
    if (!subs.rows.length) return;
    const payload = JSON.stringify({
      title, body,
      icon:  '/icons/apple-touch-icon.png',
      badge: '/icons/icon-96x96.png',
      url:   url || '/pacientes'
    });
    for (const sub of subs.rows) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          await db.query('DELETE FROM push_subscriptions WHERE id=$1', [sub.id]);
        }
      }
    }
  } catch (e) {
    console.error('sendPush error:', e.message);
  }
}

module.exports = router;
module.exports.sendPushToTerapeuta = sendPushToTerapeuta;
