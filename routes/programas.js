const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const router  = express.Router();

// GET /api/programas
router.get('/', verifyToken, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM mapeamentos m WHERE m.pacote_recomendado_id = p.id) AS vezes_recomendado
      FROM pacotes p ORDER BY p.ativo DESC, p.id ASC
    `);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar programas.' });
  }
});

// GET /api/programas/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM pacotes WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'Programa não encontrado.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar programa.' });
  }
});

// POST /api/programas
router.post('/', verifyToken, async (req, res) => {
  try {
    const { nome, descricao, publico_alvo, qtd_sessoes, valor_avista, valor_parcelado, parcelas, sessoes_json } = req.body;
    if (!nome || !nome.trim()) return res.status(400).json({ message: 'Nome é obrigatório.' });
    const r = await db.query(
      `INSERT INTO pacotes (nome, descricao, publico_alvo, qtd_sessoes, valor_avista, valor_parcelado, parcelas, sessoes_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nome.trim(), descricao||null, publico_alvo||'adulto',
       qtd_sessoes||null, valor_avista||null, valor_parcelado||null,
       parcelas||null, JSON.stringify(sessoes_json||[])]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar programa.' });
  }
});

// PUT /api/programas/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { nome, descricao, publico_alvo, qtd_sessoes, valor_avista, valor_parcelado, parcelas, sessoes_json } = req.body;
    if (!nome || !nome.trim()) return res.status(400).json({ message: 'Nome é obrigatório.' });
    await db.query(
      `UPDATE pacotes SET nome=$1, descricao=$2, publico_alvo=$3, qtd_sessoes=$4,
       valor_avista=$5, valor_parcelado=$6, parcelas=$7, sessoes_json=$8, updated_at=NOW()
       WHERE id=$9`,
      [nome.trim(), descricao||null, publico_alvo||'adulto',
       qtd_sessoes||null, valor_avista||null, valor_parcelado||null,
       parcelas||null, JSON.stringify(sessoes_json||[]), req.params.id]
    );
    res.json({ message: 'Programa atualizado.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar programa.' });
  }
});

// PUT /api/programas/:id/toggle — ativar/inativar
router.put('/:id/toggle', verifyToken, async (req, res) => {
  try {
    const r = await db.query('SELECT ativo FROM pacotes WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'Programa não encontrado.' });
    const novoStatus = !r.rows[0].ativo;
    await db.query('UPDATE pacotes SET ativo=$1, updated_at=NOW() WHERE id=$2', [novoStatus, req.params.id]);
    res.json({ ativo: novoStatus, message: novoStatus ? 'Programa ativado.' : 'Programa inativado.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao alterar status.' });
  }
});

// DELETE /api/programas/:id — só se nunca foi recomendado
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const uso = await db.query('SELECT COUNT(*) FROM mapeamentos WHERE pacote_recomendado_id=$1', [req.params.id]);
    if (parseInt(uso.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Este programa já foi recomendado em mapeamentos. Use Inativar para removê-lo da seleção.' });
    }
    await db.query('DELETE FROM pacotes WHERE id=$1', [req.params.id]);
    res.json({ message: 'Programa excluído.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao excluir programa.' });
  }
});

module.exports = router;
