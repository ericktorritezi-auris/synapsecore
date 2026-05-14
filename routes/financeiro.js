const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const router  = express.Router();

// ── GET /api/financeiro/resumo?ano=&mes= ──
router.get('/resumo', verifyToken, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    const params = [];
    let dateFilter = '';
    if (ano && mes) {
      params.push(parseInt(ano), parseInt(mes));
      dateFilter = ` AND EXTRACT(YEAR FROM s.data_sessao) = $1 AND EXTRACT(MONTH FROM s.data_sessao) = $2`;
    } else if (ano) {
      params.push(parseInt(ano));
      dateFilter = ` AND EXTRACT(YEAR FROM s.data_sessao) = $1`;
    }

    const r = await db.query(`
      SELECT
        COUNT(*)                                                           AS total_sessoes,
        COALESCE(SUM(s.valor_cobrado),0)                                   AS total_valor,
        COALESCE(SUM(CASE WHEN s.pago     THEN s.valor_cobrado ELSE 0 END),0) AS recebido,
        COALESCE(SUM(CASE WHEN NOT s.pago THEN s.valor_cobrado ELSE 0 END),0) AS a_receber,
        COUNT(CASE WHEN s.pago     THEN 1 END)                             AS sessoes_pagas,
        COUNT(CASE WHEN NOT s.pago THEN 1 END)                             AS sessoes_abertas
      FROM sessoes s
      WHERE s.status = 'realizada'${dateFilter}
    `, params);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/financeiro/aberto ── todas as sessões não pagas
router.get('/aberto', verifyToken, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT s.id, s.sessao_numero, s.data_sessao, s.duracao_minutos,
             s.valor_cobrado, s.forma_pagamento,
             p.id AS paciente_id, p.nome_completo, p.perfil_tipo, p.foto_url
      FROM sessoes s
      JOIN pacientes p ON p.id = s.paciente_id
      WHERE s.status = 'realizada' AND s.pago = false
      ORDER BY s.data_sessao ASC
    `);
    const grouped = {};
    r.rows.forEach(function(s) {
      if (!grouped[s.paciente_id]) {
        grouped[s.paciente_id] = {
          paciente_id: s.paciente_id, nome_completo: s.nome_completo,
          perfil_tipo: s.perfil_tipo, foto_url: s.foto_url, total: 0, sessoes: []
        };
      }
      grouped[s.paciente_id].total += parseFloat(s.valor_cobrado||0);
      grouped[s.paciente_id].sessoes.push({
        id: s.id, sessao_numero: s.sessao_numero, data_sessao: s.data_sessao,
        duracao_minutos: s.duracao_minutos, valor_cobrado: s.valor_cobrado,
        forma_pagamento: s.forma_pagamento
      });
    });
    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/financeiro/historico?ano=&mes= ── sessões pagas no período
router.get('/historico', verifyToken, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    const params = [];
    let dateFilter = '';
    if (ano && mes) {
      params.push(parseInt(ano), parseInt(mes));
      dateFilter = ` AND EXTRACT(YEAR FROM s.data_sessao) = $1 AND EXTRACT(MONTH FROM s.data_sessao) = $2`;
    } else if (ano) {
      params.push(parseInt(ano));
      dateFilter = ` AND EXTRACT(YEAR FROM s.data_sessao) = $1`;
    }
    const r = await db.query(`
      SELECT s.id, s.sessao_numero, s.data_sessao, s.duracao_minutos,
             s.valor_cobrado, s.forma_pagamento,
             p.id AS paciente_id, p.nome_completo, p.perfil_tipo, p.foto_url
      FROM sessoes s
      JOIN pacientes p ON p.id = s.paciente_id
      WHERE s.status = 'realizada' AND s.pago = true${dateFilter}
      ORDER BY s.data_sessao DESC
    `, params);
    const grouped = {};
    r.rows.forEach(function(s) {
      if (!grouped[s.paciente_id]) {
        grouped[s.paciente_id] = {
          paciente_id: s.paciente_id, nome_completo: s.nome_completo,
          perfil_tipo: s.perfil_tipo, foto_url: s.foto_url, total: 0, sessoes: []
        };
      }
      grouped[s.paciente_id].total += parseFloat(s.valor_cobrado||0);
      grouped[s.paciente_id].sessoes.push({
        id: s.id, sessao_numero: s.sessao_numero, data_sessao: s.data_sessao,
        duracao_minutos: s.duracao_minutos, valor_cobrado: s.valor_cobrado,
        forma_pagamento: s.forma_pagamento
      });
    });
    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/financeiro/meses-disponiveis ──
router.get('/meses-disponiveis', verifyToken, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT DISTINCT
        EXTRACT(YEAR FROM data_sessao)::int  AS ano,
        EXTRACT(MONTH FROM data_sessao)::int AS mes
      FROM sessoes WHERE status = 'realizada'
      ORDER BY ano DESC, mes DESC
    `);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
