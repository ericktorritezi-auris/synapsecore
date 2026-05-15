const express = require('express');
const db      = require('../db');
const crypto  = require('crypto');
const { verifyToken } = require('../middleware/auth');
const { gerarBriefingSessao } = require('../services/ai');
const router  = express.Router();

// GET /api/briefing/:paciente_id/ultimo
router.get('/:paciente_id/ultimo', verifyToken, async (req, res) => {
  try {
    const r = await db.query(
      'SELECT * FROM briefings WHERE paciente_id=$1 ORDER BY gerado_em DESC LIMIT 1',
      [req.params.paciente_id]
    );
    res.json(r.rows[0] || null);
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// POST /api/briefing/:paciente_id/gerar
router.post('/:paciente_id/gerar', verifyToken, async (req, res) => {
  try {
    const pid = req.params.paciente_id;
    const pacRes  = await db.query('SELECT * FROM pacientes WHERE id=$1', [pid]);
    if (!pacRes.rows.length) return res.status(404).json({ message: 'Paciente não encontrado.' });
    const paciente = pacRes.rows[0];

    const sessRes  = await db.query('SELECT * FROM sessoes WHERE paciente_id=$1 AND status=$2 ORDER BY sessao_numero ASC', [pid,'realizada']);
    const sessoes  = sessRes.rows;
    const feedRes  = await db.query('SELECT * FROM feedbacks_paciente WHERE paciente_id=$1 ORDER BY data_feedback ASC', [pid]);
    const feedbacks = feedRes.rows;
    const mapRes   = await db.query('SELECT * FROM mapeamentos WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1', [pid]);
    const mapeamento = mapRes.rows[0] || null;
    const resRes   = await db.query('SELECT conteudo_ia, versao FROM resumos_clinicos WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1', [pid]);
    const resumoAtual = resRes.rows[0]?.conteudo_ia || null;
    const resumoVersao = resRes.rows[0]?.versao || null;
    const riscoNivel = mapeamento?.risco_nivel || 'verde';

    // Build context hash
    const sessIds  = sessoes.map(s=>s.id).join(',');
    const feedIds  = feedbacks.map(f=>f.id).join(',');
    const hashCtx  = crypto.createHash('md5').update(`${sessIds}|${feedIds}|${resumoVersao}`).digest('hex');

    // Check if context changed since last briefing
    const lastRes  = await db.query('SELECT * FROM briefings WHERE paciente_id=$1 ORDER BY gerado_em DESC LIMIT 1', [pid]);
    const last     = lastRes.rows[0];
    if (last && last.hash_contexto === hashCtx && !req.body.force) {
      return res.json({ ...last, sem_mudancas: true, message: 'Briefing não atualizado pois não houve alterações desde o último.' });
    }

    const result = await gerarBriefingSessao({ db, paciente, sessoes, feedbacks, mapeamento, resumoAtual, riscoNivel });

    const saved = await db.query(
      `INSERT INTO briefings (paciente_id, conteudo_json, conteudo_texto, sessoes_base, feedbacks_base, resumo_versao, hash_contexto, modo, erro_msg)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [pid, JSON.stringify(result.json), result.texto,
       JSON.stringify(sessoes.map(s=>s.id)), JSON.stringify(feedbacks.map(f=>f.id)),
       resumoVersao, hashCtx, result.modo, result.api_erro||null]
    );

    res.json({ ...saved.rows[0], sem_mudancas: false });
  } catch(err) {
    console.error('briefing/gerar:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
