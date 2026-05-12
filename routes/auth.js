const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db');
const { verifyToken } = require('../middleware/auth');
const router   = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { login, senha } = req.body;
  if (!login || !senha) {
    return res.status(400).json({ message: 'Login e senha são obrigatórios.' });
  }
  try {
    const result = await db.query(
      `SELECT id, nome, login, senha_hash, email, foto_url, especialidades
       FROM terapeutas WHERE login = $1`, [login]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Login ou senha incorretos.' });
    }
    const terapeuta = result.rows[0];
    const senhaValida = bcrypt.compareSync(senha, terapeuta.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ message: 'Login ou senha incorretos.' });
    }
    const token = jwt.sign(
      { id: terapeuta.id, login: terapeuta.login, nome: terapeuta.nome },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({
      token,
      terapeuta: {
        id:           terapeuta.id,
        nome:         terapeuta.nome,
        login:        terapeuta.login,
        email:        terapeuta.email,
        foto_url:     terapeuta.foto_url,
        especialidades: terapeuta.especialidades
      }
    });
  } catch (err) {
    console.error('Erro no login:', err.message);
    res.status(500).json({ message: 'Erro interno. Tente novamente.' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, nome, login, email, foto_url, especialidades, bio
       FROM terapeutas WHERE id = $1`, [req.terapeuta.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Terapeuta não encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erro interno.' });
  }
});

module.exports = router;
