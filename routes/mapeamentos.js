const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const { calcularIndices, detectarFlags, gerarMapeamento, sugerirPrograma, sugerirProgramaLocal, sugerirCIDs, gerarContextoInicial, registrarAuditoria } = require('../services/ai');
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

    // Load active packages WITH sessoes_json for AI
    const pacotesRes = await db.query('SELECT * FROM pacotes WHERE ativo = true ORDER BY id');
    const pacotes = pacotesRes.rows.map(p => ({
      ...p, sessoes_json: p.sessoes_json || []
    }));

    // Calculate indices and flags
    const indices = calcularIndices(respostas);
    const flags   = detectarFlags(respostas, indices);

    // Suggest program via AI (with fallback)
    const prog = await sugerirPrograma(paciente.perfil_tipo, indices, flags, pacotes);

    // Generate mapping via AI
    const { relatorio } = await gerarMapeamento({ db,
      paciente, respostas, indices, flags, pacotes, riscoNivel
    });

    // Determine next version number
    const versaoRes = await db.query(
      'SELECT COALESCE(MAX(versao), 0) + 1 AS proxima FROM mapeamentos WHERE paciente_id = $1',
      [paciente_id]
    );
    const versao = versaoRes.rows[0].proxima;

    // Save mapping with programa_modo
    const saved = await db.query(
      `INSERT INTO mapeamentos
         (paciente_id, versao, resumo_ia, dimensoes_json, indices_json, flags_json,
          protocolo_json, pacote_recomendado_id, compatibilidade_pct, risco_nivel, programa_modo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [
        paciente_id, versao,
        JSON.stringify(relatorio),
        JSON.stringify(indices.dimensoes),
        JSON.stringify(indices),
        JSON.stringify(flags),
        JSON.stringify({ ...relatorio, programa_justificativa: prog.justificativa, programa_aderencia: prog.aderencia_sessoes }),
        prog.id || null,
        prog.compat,
        riscoNivel,
        prog.modo || 'fallback'
      ]
    );

    const programa = prog;

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
    sugerirCIDs({ db, paciente, respostas, indices, flags })
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
              pk.nome AS pacote_nome, pk.qtd_sessoes AS pacote_qtd_sessoes
       FROM mapeamentos m
       JOIN pacientes p ON p.id = m.paciente_id
       LEFT JOIN pacotes pk ON pk.id = m.pacote_recomendado_id
       WHERE m.paciente_id = $1
       ORDER BY m.versao DESC LIMIT 1`,
      [req.params.paciente_id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Nenhum mapeamento gerado.' });

    const row = r.rows[0];
    const proto = row.protocolo_json || {};

    // Build programa object so frontend renderReport always has it structured
    const programa = row.pacote_recomendado_id ? {
      id:            row.pacote_recomendado_id,
      nome:          row.pacote_nome || '',
      compat:        row.compatibilidade_pct || null,
      justificativa: proto.programa_justificativa || proto.programa_recomendado?.justificativa || '',
      aderencia:     proto.programa_aderencia || row.compatibilidade_pct || null,
      modo:          row.programa_modo || 'ia'
    } : null;

    res.json({ ...row, programa });
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

// ── POST /api/mapeamentos/:mapeamento_id/regerar-programa ──
// Regenerates program suggestion using AI (called when fallback was used)
router.post('/:mapeamento_id/regerar-programa', verifyToken, async (req, res) => {
  try {
    const mapRes = await db.query(
      `SELECT m.*, p.perfil_tipo, p.nome_completo
       FROM mapeamentos m JOIN pacientes p ON p.id = m.paciente_id
       WHERE m.id = $1`, [req.params.mapeamento_id]
    );
    if (!mapRes.rows.length) return res.status(404).json({ message: 'Mapeamento não encontrado.' });
    const map = mapRes.rows[0];

    const pacotesRes = await db.query('SELECT * FROM pacotes WHERE ativo = true ORDER BY id');
    const pacotes = pacotesRes.rows.map(p => ({ ...p, sessoes_json: p.sessoes_json || [] }));

    const indices = map.indices_json || {};
    const flags   = map.flags_json   || [];

    // Force AI (no fallback here — user explicitly requested)
    let prog, modo;
    try {
      const { sugerirProgramaLocal: _, ...aiMod } = require('../services/ai');
      const { sugerirProgramaLocal: localFn } = require('../services/ai');
      // Use the internal AI function directly
      const aiResult = await (async () => {
        const { sugerirPrograma } = require('../services/ai');
        // Call sugerirPrograma which tries AI first
        return await sugerirPrograma(map.perfil_tipo, indices, flags, pacotes);
      })();
      prog = aiResult;
      modo = aiResult.modo;
    } catch(e) {
      return res.status(503).json({
        message: 'API de IA indisponível. Tente novamente em instantes.',
        api_erro: e.message
      });
    }

    if (modo === 'fallback') {
      return res.status(503).json({
        message: 'API de IA indisponível no momento. Tente novamente em instantes.',
        api_erro: prog.api_erro
      });
    }

    // Update mapeamento with new suggestion
    const proto = map.protocolo_json || {};
    await db.query(
      `UPDATE mapeamentos SET
         pacote_recomendado_id = $1,
         compatibilidade_pct   = $2,
         programa_modo         = 'ia',
         protocolo_json        = $3
       WHERE id = $4`,
      [
        prog.id || null,
        prog.compat,
        JSON.stringify({ ...proto, programa_justificativa: prog.justificativa, programa_aderencia: prog.aderencia_sessoes }),
        req.params.mapeamento_id
      ]
    );

    res.json({
      programa_id:   prog.id,
      programa_nome: prog.nome,
      compat:        prog.compat,
      justificativa: prog.justificativa,
      aderencia:     prog.aderencia_sessoes,
      modo:          'ia'
    });
  } catch (err) {
    console.error('regerar-programa:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/mapeamentos/:mapeamento_id/contexto-inicial ──
// Gera UMA VEZ o contexto inicial para o paciente
// Se já existe, retorna o existente sem regenerar
router.post('/:mapeamento_id/contexto-inicial', verifyToken, async (req, res) => {
  try {
    const { mapeamento_id } = req.params;

    // Load mapeamento + patient
    const r = await db.query(
      `SELECT m.*, p.nome_completo, p.perfil_tipo, p.motivo_busca,
              m.contexto_token, m.contexto_inicial
       FROM mapeamentos m
       JOIN pacientes p ON p.id = m.paciente_id
       WHERE m.id = $1`,
      [mapeamento_id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Mapeamento não encontrado.' });

    const row = r.rows[0];
    const baseUrl = process.env.BASE_URL || 'https://www.synapsecore.app.br';
    const link = baseUrl + '/contexto/' + row.contexto_token;

    const forcarRegerar = req.body && req.body.regerar === true;

    // Load CIDs (confirmed + IA-suggested)
    const cidsR = await db.query(
      `SELECT cid_codigo, cid_nome, confirmado
       FROM cids_paciente
       WHERE paciente_id = $1
       ORDER BY confirmado DESC, id ASC`,
      [row.paciente_id]
    );
    const cids = cidsR.rows;

    // Already generated and not forcing regen — return existing
    if (row.contexto_inicial && !forcarRegerar) {
      var dadosSalvos = {};
      try { dadosSalvos = JSON.parse(row.contexto_inicial); } catch(e) {
        // legacy: plain text
        dadosSalvos = { texto: row.contexto_inicial };
      }
      return res.json({
        novo:   false,
        token:  row.contexto_token,
        link,
        nome:   row.nome_completo,
        dados:  dadosSalvos
      });
    }

    // Generate (first time or forced regen)
    const paciente   = { nome_completo: row.nome_completo, perfil_tipo: row.perfil_tipo, motivo_busca: row.motivo_busca };
    const mapeamento = {
      relatorio_json: row.relatorio_json,
      protocolo_json: row.protocolo_json,
      indices_json:   row.indices_json,
      flags_json:     row.flags_json,
      risco_nivel:    row.risco_nivel
    };

    const resultado = await gerarContextoInicial({ paciente, mapeamento, cids });

    // Audit IA usage
    if (resultado._usage) {
      await registrarAuditoria(db, {
        paciente_id: row.paciente_id, modulo: 'contexto_inicial',
        referencia_tipo: 'mapeamento', referencia_id: mapeamento_id,
        output_resumo: 'Contexto inicial gerado',
        tokens_usados: resultado._usage.output_tokens || null,
        input_tokens:  resultado._usage.input_tokens  || null,
        sucesso: true, modelo: 'claude-sonnet-4-20250514', modo: 'ia'
      }).catch(function(e){ console.warn('audit contexto:', e.message); });
    }

    // Store as JSON with all structured data
    const dadosJson = JSON.stringify({
      texto:   resultado.texto,
      indices: resultado.indices,
      flags:   resultado.flags,
      sintese: resultado.sintese,
      risco:   resultado.risco,
      nome:    resultado.nome,
      cids:    cids
    });

    await db.query(
      'UPDATE mapeamentos SET contexto_inicial = $1 WHERE id = $2',
      [dadosJson, mapeamento_id]
    );

    res.json({
      novo:  true,
      token: row.contexto_token,
      link,
      nome:  row.nome_completo,
      dados: JSON.parse(dadosJson)
    });

  } catch (err) {
    console.error('contexto-inicial:', err.message);
    res.status(500).json({ message: 'Erro ao gerar contexto inicial.' });
  }
});

// ── GET /api/contexto/:token — público, sem auth ──
module.exports = router;
