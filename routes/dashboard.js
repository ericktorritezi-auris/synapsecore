const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const router  = express.Router();

// GET /api/dashboard/stats
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const pacientes   = await db.query(`SELECT COUNT(*) FROM pacientes WHERE status = 'ativo'`);
    const mapeamentos = await db.query(`SELECT COUNT(*) FROM mapeamentos`);
    const sessoes     = await db.query(`SELECT COUNT(*) FROM sessoes WHERE status = 'realizada'`);
    const pacotes_ativos = await db.query(`SELECT COUNT(*) FROM pacotes WHERE ativo = true`);

    res.json({
      pacientes_ativos:  parseInt(pacientes.rows[0].count),
      mapeamentos_gerados: parseInt(mapeamentos.rows[0].count),
      sessoes_realizadas: parseInt(sessoes.rows[0].count),
      pacotes_ativos:    parseInt(pacotes_ativos.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao carregar stats.' });
  }
});

// GET /api/dashboard/aniversariantes
router.get('/aniversariantes', verifyToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, nome_completo, data_nascimento, telefone, foto_url, genero,
        EXTRACT(DAY FROM data_nascimento)   AS dia,
        EXTRACT(MONTH FROM data_nascimento) AS mes,
        DATE_PART('year', AGE(data_nascimento)) AS idade
      FROM pacientes
      WHERE status = 'ativo'
        AND data_nascimento IS NOT NULL
        AND (
          TO_CHAR(data_nascimento, 'MM-DD') BETWEEN
            TO_CHAR(NOW(), 'MM-DD') AND
            TO_CHAR(NOW() + INTERVAL '7 days', 'MM-DD')
          OR
          TO_CHAR(data_nascimento, 'MM-DD') = TO_CHAR(NOW(), 'MM-DD')
        )
      ORDER BY TO_CHAR(data_nascimento, 'MM-DD')
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar aniversariantes.' });
  }
});

module.exports = router;
