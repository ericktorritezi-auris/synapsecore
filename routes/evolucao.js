const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const { gerarEvolucao } = require('../services/ai');
const router  = express.Router();

// ── POST /api/evolucao/:paciente_id/gerar  (terapeuta, protegido) ──
router.post('/:paciente_id/gerar', verifyToken, async (req, res) => {
  try {
    const { paciente_id } = req.params;

    const pacRes = await db.query('SELECT * FROM pacientes WHERE id = $1', [paciente_id]);
    if (!pacRes.rows.length) return res.status(404).json({ message: 'Paciente não encontrado.' });
    const paciente = pacRes.rows[0];

    const mapRes = await db.query(
      'SELECT * FROM mapeamentos WHERE paciente_id = $1 ORDER BY versao DESC LIMIT 1', [paciente_id]
    );
    if (!mapRes.rows.length) return res.status(400).json({ message: 'Nenhum mapeamento encontrado. Gere o mapeamento antes.' });
    const mapeamento = mapRes.rows[0];

    const sessRes = await db.query(
      'SELECT * FROM sessoes WHERE paciente_id = $1 AND status = $2 ORDER BY sessao_numero ASC',
      [paciente_id, 'realizada']
    );
    if (!sessRes.rows.length) return res.status(400).json({ message: 'Nenhuma sessão registrada. Registre ao menos uma sessão.' });
    const sessoes = sessRes.rows;

    const resumoRes = await db.query(
      'SELECT conteudo_ia FROM resumos_clinicos WHERE paciente_id = $1 ORDER BY versao DESC LIMIT 1',
      [paciente_id]
    );
    const resumoClinico = resumoRes.rows[0]?.conteudo_ia || null;

    const pacoteRes = await db.query('SELECT * FROM pacotes WHERE id = $1', [paciente.pacote_id || 0]);
    const pacote = pacoteRes.rows[0] || null;

    // Generate evolution via AI
    const evolucao = await gerarEvolucao({ paciente, mapeamento, sessoes, resumoClinico, pacote });

    // Calculate deltas
    const indicesIniciais = mapeamento.dimensoes_json || {};
    const delta = {};
    const dimKeys = ['D1','D2','D3','D4','D5','D6','D7'];
    dimKeys.forEach(k => {
      const ini = indicesIniciais[k] || 50;
      const atu = evolucao.indices_atuais?.[k] || ini;
      delta[k] = atu - ini;
    });

    const conteudo = {
      paciente: {
        nome:        paciente.nome_completo,
        perfil_tipo: paciente.perfil_tipo,
        idade:       null
      },
      pacote:          pacote ? { nome: pacote.nome, qtd_sessoes: pacote.qtd_sessoes } : null,
      sessoes_total:   sessoes.length,
      data_inicio:     sessoes[0]?.data_sessao,
      data_ultima:     sessoes[sessoes.length - 1]?.data_sessao,
      indices_iniciais: indicesIniciais,
      indices_atuais:  evolucao.indices_atuais || {},
      delta,
      narrativa_paciente: evolucao.narrativa_paciente || '',
      conquistas:         evolucao.conquistas || [],
      objetivos:          evolucao.objetivos || [],
      proximos_focos:     evolucao.proximos_focos || '',
      mensagem_terapeuta: evolucao.mensagem_terapeuta || '',
      gerado_em:          new Date().toISOString()
    };

    // Invalidate previous tokens for this patient
    await db.query(
      'UPDATE relatorio_tokens SET expira_em = NOW() WHERE paciente_id = $1', [paciente_id]
    );

    // Create new token (7 days)
    const expira = new Date();
    expira.setDate(expira.getDate() + 7);

    const tokRes = await db.query(
      `INSERT INTO relatorio_tokens (paciente_id, mapeamento_id, conteudo_json, expira_em)
       VALUES ($1, $2, $3, $4) RETURNING token`,
      [paciente_id, mapeamento.id, JSON.stringify(conteudo), expira]
    );

    const token = tokRes.rows[0].token;
    const base  = (process.env.BASE_URL || 'https://www.synapsecore.app.br').replace(/\/+$/, '');

    res.json({
      link:     base + '/evolucao/' + token,
      token,
      expira_em: expira,
      conteudo
    });
  } catch (err) {
    console.error('POST /evolucao/gerar:', err.message);
    res.status(500).json({ message: err.message || 'Erro ao gerar relatório de evolução.' });
  }
});

// ── GET /api/evolucao/:token  (público, sem auth) ──
router.get('/:token', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT conteudo_json, expira_em, criado_em
       FROM relatorio_tokens
       WHERE token = $1 AND expira_em > NOW()`,
      [req.params.token]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Relatório não encontrado ou expirado.' });
    res.json({ valido: true, ...r.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar relatório.' });
  }
});

module.exports = router;
