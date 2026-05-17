const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const router  = express.Router();

// GET /api/dashboard/stats
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const pacientes   = await db.query(`SELECT COUNT(*) FROM pacientes WHERE status = 'ativo'`);
    const mapeamentos = await db.query(`SELECT COUNT(*) FROM mapeamentos`);
    const sessoes = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM sessoes WHERE status = 'realizada')
        + COALESCE((SELECT SUM(sessoes_anteriores) FROM pacientes WHERE status != 'inativo' AND sessoes_anteriores > 0), 0)
        AS total
    `);
    const pacotes_ativos = await db.query(`SELECT COUNT(*) FROM pacotes WHERE ativo = true`);

    res.json({
      pacientes_ativos:  parseInt(pacientes.rows[0].count),
      mapeamentos_gerados: parseInt(mapeamentos.rows[0].count),
      sessoes_realizadas: parseInt(sessoes.rows[0].total),
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

// ── GET /api/dashboard/atividade ── últimas ações do sistema
router.get('/atividade', verifyToken, async (req, res) => {
  try {
    // Novos cadastros (status pendente — via formulário público)
    const cadastros = await db.query(`
      SELECT 'cadastro' AS tipo, nome_completo, id AS paciente_id,
             created_at AS data_acao
      FROM pacientes
      WHERE status = 'pendente'
      ORDER BY created_at DESC LIMIT 5
    `);

    // Formulários preenchidos
    const forms = await db.query(`
      SELECT 'formulario' AS tipo, p.nome_completo, p.id AS paciente_id,
             r.created_at AS data_acao
      FROM respostas_formulario r
      JOIN pacientes p ON p.id = r.paciente_id
      ORDER BY r.created_at DESC LIMIT 5
    `);

    // Mapeamentos gerados
    const maps = await db.query(`
      SELECT 'mapeamento' AS tipo, p.nome_completo, p.id AS paciente_id,
             m.created_at AS data_acao, m.versao
      FROM mapeamentos m
      JOIN pacientes p ON p.id = m.paciente_id
      ORDER BY m.created_at DESC LIMIT 5
    `);

    // Sessões registradas
    const sess = await db.query(`
      SELECT 'sessao' AS tipo, p.nome_completo, p.id AS paciente_id,
             s.created_at AS data_acao, s.sessao_numero
      FROM sessoes s
      JOIN pacientes p ON p.id = s.paciente_id
      WHERE s.status = 'realizada'
      ORDER BY s.created_at DESC LIMIT 5
    `);

    // Merge and sort by date
    const all = [
      ...cadastros.rows.map(r => ({ ...r, data_acao: r.data_acao })),
      ...forms.rows.map(r => ({ ...r, data_acao: r.data_acao })),
      ...maps.rows.map(r => ({ ...r, data_acao: r.data_acao })),
      ...sess.rows.map(r => ({ ...r, data_acao: r.data_acao }))
    ]
    .sort((a,b) => new Date(b.data_acao) - new Date(a.data_acao))
    .slice(0, 8);

    res.json(all);
  } catch (err) {
    console.error('GET /dashboard/atividade:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
