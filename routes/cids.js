const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const router  = express.Router();

// GET /api/cids/:paciente_id
router.get('/:paciente_id', verifyToken, async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM cids_paciente WHERE paciente_id = $1 ORDER BY confirmado DESC, created_at DESC`,
      [req.params.paciente_id]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar CIDs.' });
  }
});

// PUT /api/cids/:cid_id/confirmar
router.put('/:cid_id/confirmar', verifyToken, async (req, res) => {
  try {
    await db.query('UPDATE cids_paciente SET confirmado = true WHERE id = $1', [req.params.cid_id]);
    res.json({ message: 'CID confirmado.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao confirmar CID.' });
  }
});

// PUT /api/cids/:cid_id/rejeitar
router.put('/:cid_id/rejeitar', verifyToken, async (req, res) => {
  try {
    await db.query('DELETE FROM cids_paciente WHERE id = $1', [req.params.cid_id]);
    res.json({ message: 'CID removido.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao rejeitar CID.' });
  }
});

// POST /api/cids/:paciente_id/manual
router.post('/:paciente_id/manual', verifyToken, async (req, res) => {
  try {
    const { cid_codigo, cid_nome, relato_paciente, significado_medico } = req.body;
    if (!cid_codigo || !cid_nome) return res.status(400).json({ message: 'Código e nome são obrigatórios.' });
    const r = await db.query(
      `INSERT INTO cids_paciente (paciente_id, cid_codigo, cid_nome, relato_paciente, significado_medico, confirmado, gerado_por_ia)
       VALUES ($1,$2,$3,$4,$5,true,false) RETURNING *`,
      [req.params.paciente_id, cid_codigo.trim().toUpperCase(), cid_nome.trim(), relato_paciente||null, significado_medico||null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao adicionar CID.' });
  }
});

module.exports = router;
