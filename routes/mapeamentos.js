const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const { calcularIndices, detectarFlags, gerarMapeamento, sugerirCIDs } = require('../services/ai');
const router  = express.Router();

// ── POST /api/mapeamentos/:paciente_id/gerar ──
router.post('/:paciente_id/gerar', verifyToken, async (req, res) => {
  try {
    const { paciente_id } = req.params;

    // Load patient
    const pacRes = await db.query('SELECT * FROM pacientes WHERE id = $1', [paciente_id]);
    if (!pacRes.rows.length) return res.status(404).json({ message: 'Paciente não encontrado.' });
    const paciente = pacRes.rows[0];

    // Load latest form responses
    const respRes = await db.query(
      `SELECT * FROM respostas_formulario
       WHERE paciente_id = $1 AND concluido = true
       ORDER BY created_at DESC LIMIT 1`,
      [paciente_id]
    );
    if (!respRes.rows.length) return res.status(400).json({ message: 'Nenhum formulário respondido para este paciente.' });
    const respRow   = respRes.rows[0];
    const respostas = respRow.respostas_json;
    const riscoNivel = respRow.risco_nivel || 'verde';

    // Load active packages
    const pacotesRes = await db.query('SELECT * FROM pacotes WHERE ativo = true ORDER BY id');
    const pacotes = pacotesRes.rows;

    // Calculate indices and flags
    const indices = calcularIndices(respostas);
    const flags   = detectarFlags(respostas, indices);

    // Generate mapping via AI
    const { relatorio, programa } = await gerarMapeamento({
      paciente, respostas, indices, flags, pacotes, riscoNivel
    });

    // Determine next version number
    const versaoRes = await db.query(
      'SELECT COALESCE(MAX(versao), 0) + 1 AS proxima FROM mapeamentos WHERE paciente_id = $1',
      [paciente_id]
    );
    const versao = versaoRes.rows[0].proxima;

    // Save mapping
    const saved = await db.query(
      `INSERT INTO mapeamentos
         (paciente_id, versao, resumo_ia, dimensoes_json, indices_json, flags_json,
          protocolo_json, pacote_recomendado_id, compatibilidade_pct, risco_nivel)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        paciente_id, versao,
        JSON.stringify(relatorio),
        JSON.stringify(indices.dimensoes),
        JSON.stringify(indices),
        JSON.stringify(flags),
        JSON.stringify(relatorio),
        programa.id || null,
        programa.compat,
        riscoNivel
      ]
    );

    res.json({
      mapeamento_id: saved.rows[0].id,
      versao,
      indices,
      flags,
      relatorio,
      programa,
      risco_nivel: riscoNivel
    });

    // Generate CID suggestions in background (don't block response)
    sugerirCIDs({ paciente, respostas, indices, flags })
      .then(async function(cids) {
        if (!cids.length) return;
        // Remove old unconfirmed CIDs for this patient
        await db.query(
          'DELETE FROM cids_paciente WHERE paciente_id = $1 AND confirmado = false',
          [paciente_id]
        );
        for (const c of cids) {
          await db.query(
            `INSERT INTO cids_paciente (paciente_id, mapeamento_id, cid_codigo, cid_nome, relato_paciente, significado_medico)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [paciente_id, saved.rows[0].id, c.cid_codigo, c.cid_nome, c.relato_paciente, c.significado_medico]
          );
        }
      })
      .catch(e => console.error('CID suggestion error:', e.message));
  } catch (err) {
    console.error('POST /mapeamentos/gerar:', err.message);
    res.status(500).json({ message: err.message || 'Erro ao gerar mapeamento.' });
  }
});

// ── GET /api/mapeamentos/:paciente_id ── (latest)
router.get('/:paciente_id', verifyToken, async (req, res) => {
  try {
    const r = await db.query(
      `SELECT m.*, p.nome_completo, p.perfil_tipo, p.data_nascimento,
              DATE_PART('year', AGE(p.data_nascimento))::int AS idade,
              pk.nome AS pacote_nome
       FROM mapeamentos m
       JOIN pacientes p ON p.id = m.paciente_id
       LEFT JOIN pacotes pk ON pk.id = m.pacote_recomendado_id
       WHERE m.paciente_id = $1
       ORDER BY m.versao DESC LIMIT 1`,
      [req.params.paciente_id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Nenhum mapeamento gerado.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar mapeamento.' });
  }
});

// ── PUT /api/mapeamentos/:mapeamento_id/obs ── (update therapist notes)
router.put('/:mapeamento_id/obs', verifyToken, async (req, res) => {
  try {
    const { obs_terapeuta, objetivos_iniciais, protocolo_editado, finalizado } = req.body;
    const r = await db.query(
      'SELECT protocolo_json FROM mapeamentos WHERE id = $1', [req.params.mapeamento_id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Mapeamento não encontrado.' });

    const proto = r.rows[0].protocolo_json || {};
    if (obs_terapeuta     !== undefined) proto.obs_terapeuta     = obs_terapeuta;
    if (objetivos_iniciais !== undefined) proto.objetivos_iniciais = objetivos_iniciais;
    if (protocolo_editado !== undefined) proto.protocolo_sugerido = protocolo_editado;

    const updates = ['protocolo_json = $1'];
    const vals    = [JSON.stringify(proto)];
    if (finalizado !== undefined) { vals.push(finalizado); updates.push(`finalizado = $${vals.length}`); }
    vals.push(req.params.mapeamento_id);

    await db.query(
      `UPDATE mapeamentos SET ${updates.join(',')} WHERE id = $${vals.length}`, vals
    );
    res.json({ message: 'Mapeamento atualizado.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar.' });
  }
});

// ── GET /api/mapeamentos/:paciente_id/historico ──
router.get('/:paciente_id/historico', verifyToken, async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, versao, risco_nivel, finalizado, created_at
       FROM mapeamentos WHERE paciente_id = $1 ORDER BY versao DESC`,
      [req.params.paciente_id]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar histórico.' });
  }
});

module.exports = router;
