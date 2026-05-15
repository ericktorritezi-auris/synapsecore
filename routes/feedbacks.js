const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const router  = express.Router();

// GET /api/feedbacks/:paciente_id
router.get('/:paciente_id', verifyToken, async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM feedbacks_paciente WHERE paciente_id = $1 ORDER BY data_feedback DESC, created_at DESC`,
      [req.params.paciente_id]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar feedbacks.' });
  }
});

// POST /api/feedbacks/:paciente_id
router.post('/:paciente_id', verifyToken, async (req, res) => {
  try {
    const { data_feedback, conteudo } = req.body;
    if (!conteudo || !conteudo.trim()) return res.status(400).json({ message: 'Conteúdo é obrigatório.' });
    const r = await db.query(
      `INSERT INTO feedbacks_paciente (paciente_id, data_feedback, conteudo)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.paciente_id, data_feedback || new Date().toISOString().split('T')[0], conteudo.trim()]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao salvar feedback.' });
  }
});

// DELETE /api/feedbacks/:feedback_id
router.delete('/:feedback_id', verifyToken, async (req, res) => {
  try {
    await db.query('DELETE FROM feedbacks_paciente WHERE id = $1', [req.params.feedback_id]);
    res.json({ message: 'Feedback removido.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover feedback.' });
  }
});

module.exports = router;
