const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const router  = express.Router();

// GET /api/pacotes — list active packages
router.get('/', verifyToken, async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM pacotes WHERE ativo = true ORDER BY id`);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar pacotes.' });
  }
});

module.exports = router;
