const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const router  = express.Router();

// GET /api/perfil
router.get('/', verifyToken, async (req, res) => {
  try {
    const t = await db.query(
      `SELECT id, nome, login, email, telefone, especialidades, bio,
              foto_url, logo_url, assinatura_url, carimbo_url,
              pix_tipo, pix_chave, created_at
       FROM terapeutas WHERE id = $1`, [req.terapeuta.id]
    );
    if (!t.rows.length) return res.status(404).json({ message: 'Perfil não encontrado.' });

    const r = await db.query(
      `SELECT id, instituicao, numero FROM registros_profissionais
       WHERE terapeuta_id = $1 ORDER BY id ASC`, [req.terapeuta.id]
    );

    res.json({ ...t.rows[0], registros: r.rows });
  } catch (err) {
    console.error('GET /perfil:', err.message);
    res.status(500).json({ message: 'Erro ao buscar perfil.' });
  }
});

// PUT /api/perfil/dados
router.put('/dados', verifyToken, async (req, res) => {
  try {
    const { nome, email, telefone, especialidades, bio, pix_tipo, pix_chave } = req.body;
    if (!nome || !nome.trim()) return res.status(400).json({ message: 'Nome é obrigatório.' });

    await db.query(
      `UPDATE terapeutas SET nome=$1, email=$2, telefone=$3,
       especialidades=$4, bio=$5, pix_tipo=$6, pix_chave=$7, updated_at=NOW() WHERE id=$8`,
      [nome.trim(), email||null, telefone||null, especialidades||null, bio||null,
       pix_tipo||null, pix_chave||null, req.terapeuta.id]
    );

    // Update cached name in token context (client needs to refresh)
    res.json({ message: 'Dados atualizados com sucesso.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar dados.' });
  }
});

// PUT /api/perfil/uploads
router.put('/uploads', verifyToken, async (req, res) => {
  try {
    const { foto_url, logo_url, assinatura_url, carimbo_url } = req.body;

    const fields = [];
    const values = [];
    if (foto_url      !== undefined) { values.push(foto_url);      fields.push(`foto_url=$${values.length}`); }
    if (logo_url      !== undefined) { values.push(logo_url);      fields.push(`logo_url=$${values.length}`); }
    if (assinatura_url !== undefined){ values.push(assinatura_url); fields.push(`assinatura_url=$${values.length}`); }
    if (carimbo_url   !== undefined) { values.push(carimbo_url);   fields.push(`carimbo_url=$${values.length}`); }

    if (!fields.length) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });

    values.push(req.terapeuta.id);
    await db.query(
      `UPDATE terapeutas SET ${fields.join(',')} , updated_at=NOW() WHERE id=$${values.length}`,
      values
    );
    res.json({ message: 'Imagens atualizadas com sucesso.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar imagens.' });
  }
});

// POST /api/perfil/registros
router.post('/registros', verifyToken, async (req, res) => {
  try {
    const { instituicao, numero } = req.body;
    if (!instituicao || !numero) return res.status(400).json({ message: 'Instituição e número são obrigatórios.' });

    const r = await db.query(
      `INSERT INTO registros_profissionais (terapeuta_id, instituicao, numero)
       VALUES ($1,$2,$3) RETURNING *`,
      [req.terapeuta.id, instituicao.trim(), numero.trim()]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao adicionar registro.' });
  }
});

// DELETE /api/perfil/registros/:id
router.delete('/registros/:id', verifyToken, async (req, res) => {
  try {
    await db.query(
      `DELETE FROM registros_profissionais WHERE id=$1 AND terapeuta_id=$2`,
      [req.params.id, req.terapeuta.id]
    );
    res.json({ message: 'Registro removido.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover registro.' });
  }
});

// PUT /api/perfil/senha
router.put('/senha', verifyToken, async (req, res) => {
  try {
    const { senha_atual, senha_nova, senha_confirmacao } = req.body;
    if (!senha_atual || !senha_nova) return res.status(400).json({ message: 'Preencha todos os campos.' });
    if (senha_nova !== senha_confirmacao) return res.status(400).json({ message: 'Nova senha e confirmação não conferem.' });
    if (senha_nova.length < 6) return res.status(400).json({ message: 'A nova senha deve ter ao menos 6 caracteres.' });

    const t = await db.query('SELECT senha_hash FROM terapeutas WHERE id=$1', [req.terapeuta.id]);
    if (!t.rows.length) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const ok = bcrypt.compareSync(senha_atual, t.rows[0].senha_hash);
    if (!ok) return res.status(401).json({ message: 'Senha atual incorreta.' });

    const novo_hash = bcrypt.hashSync(senha_nova, 12);
    await db.query('UPDATE terapeutas SET senha_hash=$1, updated_at=NOW() WHERE id=$2', [novo_hash, req.terapeuta.id]);
    res.json({ message: 'Senha alterada com sucesso.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao alterar senha.' });
  }
});

module.exports = router;
