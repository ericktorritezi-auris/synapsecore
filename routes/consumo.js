const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const router  = express.Router();

// Preços Sonnet 4 (USD por token)
const PRECO_INPUT  = 0.000003;  // $3 por 1M
const PRECO_OUTPUT = 0.000015;  // $15 por 1M

// ── GET /api/consumo/stats ──
router.get('/stats', verifyToken, async (req, res) => {
  try {
    // Config (saldo, taxa)
    const cfg = await db.query('SELECT * FROM consumo_config WHERE id=1');
    const config = cfg.rows[0] || { saldo_usd:0, total_carregado_usd:0, taxa_cambio:5.75 };

    // Total consumido (soma de custos registrados)
    const totalRes = await db.query(`
      SELECT COALESCE(SUM(custo_usd),0) AS total,
             COUNT(*) AS chamadas
      FROM ia_auditoria
      WHERE sucesso = true AND custo_usd IS NOT NULL
    `);
    const totalUsd  = parseFloat(totalRes.rows[0].total)  || 0;
    const chamadas  = parseInt(totalRes.rows[0].chamadas) || 0;

    // Este mês
    const mesRes = await db.query(`
      SELECT COALESCE(SUM(custo_usd),0) AS total,
             COUNT(*) AS chamadas
      FROM ia_auditoria
      WHERE sucesso = true AND custo_usd IS NOT NULL
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
    `);
    const mesUsd     = parseFloat(mesRes.rows[0].total)    || 0;
    const mesChamadas= parseInt(mesRes.rows[0].chamadas)   || 0;

    // Hoje
    const hojeRes = await db.query(`
      SELECT COALESCE(SUM(custo_usd),0) AS total, COUNT(*) AS chamadas
      FROM ia_auditoria
      WHERE sucesso = true AND custo_usd IS NOT NULL
        AND DATE_TRUNC('day', created_at) = DATE_TRUNC('day', NOW())
    `);
    const hojeUsd = parseFloat(hojeRes.rows[0].total) || 0;

    // Dias únicos este mês (para média)
    const diasRes = await db.query(`
      SELECT COUNT(DISTINCT DATE_TRUNC('day', created_at)) AS dias
      FROM ia_auditoria
      WHERE sucesso = true AND custo_usd IS NOT NULL
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
    `);
    const dias = parseInt(diasRes.rows[0].dias) || 1;
    const mediaUsd = mesUsd / dias;

    // Últimos 14 dias
    const graficoRes = await db.query(`
      SELECT DATE_TRUNC('day', created_at)::date AS dia,
             COALESCE(SUM(custo_usd),0) AS total,
             COUNT(*) AS chamadas
      FROM ia_auditoria
      WHERE sucesso = true AND custo_usd IS NOT NULL
        AND created_at >= NOW() - INTERVAL '14 days'
      GROUP BY dia ORDER BY dia ASC
    `);

    // Por módulo (top 8)
    const modulosRes = await db.query(`
      SELECT modulo,
             COUNT(*) AS chamadas,
             COALESCE(SUM(custo_usd),0) AS custo
      FROM ia_auditoria
      WHERE sucesso = true AND custo_usd IS NOT NULL
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
      GROUP BY modulo
      ORDER BY custo DESC
      LIMIT 8
    `);

    // Módulo labels
    var MODULO_LABELS = {
      mapeamento:      'Gerar Mapeamento',
      analise:         'Análise Estrutural',
      hipoteses:       'Hipóteses Clínicas',
      identidade:      'Mapa de Identidade',
      preditiva:       'Evolução Preditiva',
      risco_abandono:  'Risco de Abandono',
      prontuario:      'Prontuário Inteligente',
      briefing:        'Briefing de Sessão',
      intervencoes:    'Intervenções',
      memoria:         'Memória Terapêutica',
      evolucao:        'Evolução',
      contexto_inicial:'Contexto Inicial',
      cids:            'Sugestão CIDs',
      resumo:          'Resumo Clínico',
      snapshot:        'Snapshot Evolutivo',
    };

    var modulos = modulosRes.rows.map(function(r) {
      return {
        modulo: r.modulo,
        label:  MODULO_LABELS[r.modulo] || r.modulo,
        chamadas: parseInt(r.chamadas),
        custo:    parseFloat(r.custo)
      };
    });

    // Dias restantes estimados
    const diasRestantes = mediaUsd > 0
      ? Math.round(parseFloat(config.saldo_usd) / mediaUsd)
      : null;

    res.json({
      config: {
        saldo_usd:           Math.max(0, parseFloat(config.total_carregado_usd) - totalUsd),
        total_carregado_usd: parseFloat(config.total_carregado_usd),
        taxa_cambio:         parseFloat(config.taxa_cambio)
      },
      stats: {
        total_usd:     totalUsd,
        chamadas_total: chamadas,
        mes_usd:       mesUsd,
        mes_chamadas:  mesChamadas,
        hoje_usd:      hojeUsd,
        media_diaria:  mediaUsd,
        dias_restantes: diasRestantes
      },
      grafico: graficoRes.rows.map(function(r) {
        return {
          dia:     r.dia,
          total:   parseFloat(r.total),
          chamadas: parseInt(r.chamadas)
        };
      }),
      modulos
    });
  } catch(e) {
    console.error('consumo/stats:', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── PUT /api/consumo/config ──
router.put('/config', verifyToken, async (req, res) => {
  try {
    const { saldo_usd, total_carregado_usd, taxa_cambio } = req.body;
    await db.query(
      `UPDATE consumo_config SET
         saldo_usd           = COALESCE($1, saldo_usd),
         total_carregado_usd = COALESCE($2, total_carregado_usd),
         taxa_cambio         = COALESCE($3, taxa_cambio),
         updated_at          = NOW()
       WHERE id = 1`,
      [saldo_usd||null, total_carregado_usd||null, taxa_cambio||null]
    );
    res.json({ message: 'Configuração salva.' });
  } catch(e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
