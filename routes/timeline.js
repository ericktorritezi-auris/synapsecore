const express = require('express');
const crypto  = require('crypto');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const { gerarFasesTerapeuticas } = require('../services/ai');
const router  = express.Router();

// ── GET /api/timeline/:paciente_id ──
router.get('/:paciente_id', verifyToken, async (req, res) => {
  try {
    const pid = req.params.paciente_id;

    // ── 1. Paciente ──
    const pacRes = await db.query(
      'SELECT id, nome_completo, data_nascimento, motivo_busca, status FROM pacientes WHERE id=$1',
      [pid]
    );
    if (!pacRes.rows.length) return res.status(404).json({ message: 'Paciente não encontrado.' });
    const paciente = pacRes.rows[0];

    // ── 2. Sessões ──
    const sessRes = await db.query(
      `SELECT id, sessao_numero, data_sessao, resumo_terapeuta, status, valor_cobrado, pago
       FROM sessoes WHERE paciente_id=$1 AND status='realizada'
       ORDER BY data_sessao ASC`,
      [pid]
    );

    // ── 3. Histórico de evolução ──
    const evolRes = await db.query(
      `SELECT score_global, indices_json, sessoes_count, gerado_em
       FROM evolucao_historico WHERE paciente_id=$1 ORDER BY gerado_em ASC`,
      [pid]
    );

    // ── 4. Mapeamentos ──
    const mapRes = await db.query(
      `SELECT id, versao, flags_json, indices_json, risco_nivel, created_at
       FROM mapeamentos WHERE paciente_id=$1 ORDER BY versao ASC`,
      [pid]
    );

    // ── 5. CIDs confirmados ──
    const cidRes = await db.query(
      `SELECT cid_codigo, cid_nome, created_at FROM cids_paciente
       WHERE paciente_id=$1 AND confirmado=true ORDER BY created_at ASC`,
      [pid]
    );

    // ── 6. Documentos ──
    const docRes = await db.query(
      `SELECT tipo, titulo, created_at FROM documentos
       WHERE paciente_id=$1 ORDER BY created_at ASC`,
      [pid]
    );

    // ── 7. Último resumo clínico ──
    const resumoRes = await db.query(
      `SELECT conteudo_ia, gerado_em FROM resumos_clinicos
       WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1`,
      [pid]
    );

    // ── 8. Risco de abandono ──
    const riscoRes = await db.query(
      `SELECT nivel, score_clinico, score_basico, explicacao, ultima_analise_leve
       FROM risco_abandono WHERE paciente_id=$1 AND status='ativo'
       ORDER BY versao DESC LIMIT 1`,
      [pid]
    );

    // ── BUILD EVENTOS (marcos da jornada) ──
    var eventos = [];

    // Sessões
    sessRes.rows.forEach(function(s) {
      var prevScore = null;
      var curScore  = null;
      // Find score for this session date
      for (var e of evolRes.rows) {
        if (new Date(e.gerado_em) <= new Date(s.data_sessao)) prevScore = curScore;
        if (!curScore && e.sessoes_count >= s.sessao_numero) { curScore = parseFloat(e.score_global); break; }
      }
      var tipo = 'sessao';
      if (curScore !== null && prevScore !== null) {
        var diff = curScore - prevScore;
        if (diff <= -10) tipo = 'score-down';
        else if (diff >= 10) tipo = 'score-up';
      }
      // Marcos de sessão
      var isMilestone = [5,10,15,20,25,30].indexOf(s.sessao_numero) !== -1;

      eventos.push({
        tipo,
        data: s.data_sessao,
        sessao_numero: s.sessao_numero,
        score: curScore,
        score_delta: (prevScore !== null && curScore !== null) ? (curScore - prevScore) : null,
        is_milestone: isMilestone,
        resumo: s.resumo_terapeuta || null
      });
    });

    // Mapeamentos
    mapRes.rows.forEach(function(m) {
      // Extract critical flags as separate events
      var FLAGS_CRITICAS = ['risco_suicida','ideacao_suicida','avaliacao_psiquiatrica'];
      var mFlags = m.flags_json || [];
      var critFlags = mFlags.filter(function(f){ return FLAGS_CRITICAS.indexOf(f) !== -1; });
      if (critFlags.length) {
        critFlags.forEach(function(f) {
          eventos.push({
            tipo: 'flag',
            data: m.created_at,
            flag_nome: f,
            versao_mapeamento: m.versao
          });
        });
      }

      eventos.push({
        tipo: 'mapeamento',
        data: m.created_at,
        versao: m.versao,
        flags: mFlags,
        risco_nivel: m.risco_nivel,
        indices: m.indices_json,
        risco_abandono: riscoRes.rows[0] || null
      });
    });

    // CIDs
    cidRes.rows.forEach(function(c) {
      eventos.push({
        tipo: 'cid',
        data: c.created_at,
        cid_codigo: c.cid_codigo,
        cid_nome: c.cid_nome
      });
    });

    // Documentos
    docRes.rows.forEach(function(d) {
      eventos.push({
        tipo: 'documento',
        data: d.created_at,
        tipo_documento: d.tipo,
        titulo: d.titulo
      });
    });

    // Sort all events by date
    eventos.sort(function(a, b) { return new Date(a.data) - new Date(b.data); });

    // ── HASH para detectar mudanças ──
    var hashInput = JSON.stringify({
      sessoes:   sessRes.rows.length,
      evolucoes: evolRes.rows.length,
      mapas:     mapRes.rows.length,
      cids:      cidRes.rows.length,
      docs:      docRes.rows.length,
      ultimo_score: evolRes.rows.length ? evolRes.rows[evolRes.rows.length-1].score_global : null
    });
    var hash = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);

    // ── CHECK SE MUDOU ──
    const cacheRes = await db.query(
      'SELECT id, hash_dados, fases_json FROM timeline_gerado WHERE paciente_id=$1 ORDER BY gerado_em DESC LIMIT 1',
      [pid]
    );
    var cache     = cacheRes.rows[0] || null;
    var mudou     = !cache || cache.hash_dados !== hash;
    var fasesJson = cache ? cache.fases_json : [];

    res.json({
      paciente,
      eventos,
      evolucao_historico: evolRes.rows,
      mapeamentos: mapRes.rows,
      resumo_clinico: resumoRes.rows[0] || null,
      hash,
      mudou,
      fases: fasesJson || [],
      stats: {
        total_sessoes: sessRes.rows.length,
        total_mapeamentos: mapRes.rows.length,
        score_inicial: evolRes.rows.length ? parseFloat(evolRes.rows[0].score_global) : null,
        score_atual:   evolRes.rows.length ? parseFloat(evolRes.rows[evolRes.rows.length-1].score_global) : null
      },
      risco_abandono: riscoRes.rows[0] || null
    });

  } catch(err) {
    console.error('GET /timeline:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/timeline/:paciente_id/gerar — IA analisa fases ──
router.post('/:paciente_id/gerar', verifyToken, async (req, res) => {
  try {
    const pid  = req.params.paciente_id;
    const hash = req.body.hash;

    const pacRes  = await db.query('SELECT id, nome_completo FROM pacientes WHERE id=$1', [pid]);
    const sessRes = await db.query("SELECT * FROM sessoes WHERE paciente_id=$1 AND status='realizada'", [pid]);
    const mapRes  = await db.query('SELECT * FROM mapeamentos WHERE paciente_id=$1 ORDER BY versao DESC', [pid]);
    const evolRes = await db.query('SELECT * FROM evolucao_historico WHERE paciente_id=$1 ORDER BY gerado_em ASC', [pid]);

    const fases = await gerarFasesTerapeuticas({
      db,
      paciente:           pacRes.rows[0],
      sessoes:            sessRes.rows,
      mapeamentos:        mapRes.rows,
      evolucao_historico: evolRes.rows
    });

    // Save to cache
    await db.query(
      `INSERT INTO timeline_gerado (paciente_id, hash_dados, fases_json)
       VALUES ($1, $2, $3)`,
      [pid, hash, JSON.stringify(fases)]
    );

    res.json({ fases, gerado: true });
  } catch(err) {
    console.error('POST /timeline/gerar:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
