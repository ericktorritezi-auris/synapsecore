const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const { gerarIntervencoes } = require('../services/ai');
const router  = express.Router();

// GET /api/intervencoes/:paciente_id
router.get('/:paciente_id', verifyToken, async (req, res) => {
  try {
    const r = await db.query(
      'SELECT * FROM intervencoes WHERE paciente_id=$1 ORDER BY gerado_em DESC',
      [req.params.paciente_id]
    );
    res.json(r.rows);
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// POST /api/intervencoes/:paciente_id/gerar
router.post('/:paciente_id/gerar', verifyToken, async (req, res) => {
  try {
    const pid = req.params.paciente_id;
    const pacRes = await db.query('SELECT * FROM pacientes WHERE id=$1', [pid]);
    if (!pacRes.rows.length) return res.status(404).json({ message: 'Paciente não encontrado.' });
    const paciente = pacRes.rows[0];

    const mapRes = await db.query('SELECT * FROM mapeamentos WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1', [pid]);
    const mapeamento = mapRes.rows[0] || null;
    const sessRes = await db.query('SELECT * FROM sessoes WHERE paciente_id=$1 AND status=$2 ORDER BY sessao_numero DESC LIMIT 5', [pid,'realizada']);
    const sessoes = sessRes.rows;
    const resRes  = await db.query('SELECT conteudo_ia FROM resumos_clinicos WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1', [pid]);
    const resumoAtual = resRes.rows[0]?.conteudo_ia || null;
    const riscoNivel = mapeamento?.risco_nivel || 'verde';

    const result = await gerarIntervencoes({ db, paciente, mapeamento, sessoes, resumoAtual, riscoNivel });

    // Se alerta de segurança, retorna sem salvar no banco
    if (result.modo === 'alerta_seguranca') {
      return res.json({ intervencoes: result.intervencoes, modo: result.modo, alerta: true });
    }

    // Save each intervention
    const saved = [];
    for (const interv of result.intervencoes) {
      const r = await db.query(
        `INSERT INTO intervencoes (paciente_id, mapeamento_id, tipo, categoria_clinica, publico_alvo, titulo, descricao, fundamentacao, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'sugerida') RETURNING *`,
        [pid, mapeamento?.id||null, interv.tipo||null, interv.categoria_clinica||null,
         interv.publico_alvo||paciente.perfil_tipo||'adulto', interv.titulo, interv.descricao||null, interv.fundamentacao||null]
      );
      saved.push(r.rows[0]);
    }

    res.json({ intervencoes: saved, modo: result.modo });
  } catch(err) {
    console.error('intervencoes/gerar:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/intervencoes/:id/status
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status, favorita, avaliacao, observacao } = req.body;
    await db.query(
      `UPDATE intervencoes SET
         status = COALESCE($1, status),
         favorita = COALESCE($2, favorita),
         avaliacao = COALESCE($3, avaliacao),
         observacao = COALESCE($4, observacao),
         atualizado_em = NOW()
       WHERE id = $5`,
      [status||null, favorita!=null?favorita:null, avaliacao||null, observacao||null, req.params.id]
    );
    res.json({ message: 'Intervenção atualizada.' });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/intervencoes/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await db.query('DELETE FROM intervencoes WHERE id=$1', [req.params.id]);
    res.json({ message: 'Intervenção removida.' });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
