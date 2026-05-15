const express = require('express');
const db      = require('../db');
const crypto  = require('crypto');
const { verifyToken } = require('../middleware/auth');
const { atualizarMemoriaTerapeutica } = require('../services/ai');
const router  = express.Router();

// GET /api/memoria/:paciente_id/atual
router.get('/:paciente_id/atual', verifyToken, async (req, res) => {
  try {
    const r = await db.query(
      'SELECT * FROM memoria_terapeutica WHERE paciente_id=$1 AND ativa=true ORDER BY versao DESC LIMIT 1',
      [req.params.paciente_id]
    );
    res.json(r.rows[0] || null);
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// GET /api/memoria/:paciente_id/historico
router.get('/:paciente_id/historico', verifyToken, async (req, res) => {
  try {
    const r = await db.query(
      'SELECT id, versao, ativa, gerado_em, conteudo_json FROM memoria_terapeutica WHERE paciente_id=$1 ORDER BY versao DESC',
      [req.params.paciente_id]
    );
    res.json(r.rows);
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// POST /api/memoria/:paciente_id/gerar
router.post('/:paciente_id/gerar', verifyToken, async (req, res) => {
  try {
    const pid = req.params.paciente_id;

    const pacRes   = await db.query('SELECT * FROM pacientes WHERE id=$1', [pid]);
    if (!pacRes.rows.length) return res.status(404).json({ message: 'Paciente não encontrado.' });
    const paciente = pacRes.rows[0];

    const sessRes  = await db.query('SELECT * FROM sessoes WHERE paciente_id=$1 AND status=$2 ORDER BY sessao_numero ASC', [pid,'realizada']);
    const sessoes  = sessRes.rows;
    const feedRes  = await db.query('SELECT * FROM feedbacks_paciente WHERE paciente_id=$1 ORDER BY data_feedback ASC', [pid]);
    const feedbacks = feedRes.rows;
    const intervRes = await db.query('SELECT * FROM intervencoes WHERE paciente_id=$1 AND avaliacao IS NOT NULL ORDER BY gerado_em ASC', [pid]);
    const intervencoes = intervRes.rows;
    const resRes   = await db.query('SELECT conteudo_ia FROM resumos_clinicos WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1', [pid]);
    const resumoAtual = resRes.rows[0]?.conteudo_ia || null;

    // Get current active memory for context
    const memAtual = await db.query('SELECT * FROM memoria_terapeutica WHERE paciente_id=$1 AND ativa=true ORDER BY versao DESC LIMIT 1', [pid]);
    const memoriaAnterior = memAtual.rows[0]?.conteudo_texto || null;
    const versaoAnterior  = memAtual.rows[0]?.versao || 0;

    // Hash context
    const hashCtx = crypto.createHash('md5').update(
      sessoes.map(s=>s.id).join(',') + '|' +
      feedbacks.map(f=>f.id).join(',') + '|' +
      intervencoes.map(i=>i.id+i.avaliacao).join(',')
    ).digest('hex');

    // Check if context unchanged
    if (memAtual.rows[0] && memAtual.rows[0].hash_contexto === hashCtx && !req.body.force) {
      return res.json({ ...memAtual.rows[0], sem_mudancas: true, message: 'Memória não atualizada pois não houve alterações.' });
    }

    const result = await atualizarMemoriaTerapeutica({ db, paciente, sessoes, feedbacks, intervencoes, resumoAtual, memoriaAnterior });

    // Mark all previous as inactive
    await db.query('UPDATE memoria_terapeutica SET ativa=false WHERE paciente_id=$1', [pid]);

    // Insert new version
    const saved = await db.query(
      `INSERT INTO memoria_terapeutica (paciente_id, versao, ativa, conteudo_json, conteudo_texto, sessoes_base, feedbacks_base, intervencoes_base, hash_contexto)
       VALUES ($1,$2,true,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [pid, versaoAnterior + 1, JSON.stringify(result.json), result.texto,
       JSON.stringify(sessoes.map(s=>s.id)), JSON.stringify(feedbacks.map(f=>f.id)),
       JSON.stringify(intervencoes.map(i=>i.id)), hashCtx]
    );

    res.json({ ...saved.rows[0], sem_mudancas: false });
  } catch(err) {
    console.error('memoria/gerar:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
