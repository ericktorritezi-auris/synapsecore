const express = require('express');
const db      = require('../db');
const crypto  = require('crypto');
const { verifyToken } = require('../middleware/auth');
const { gerarAnaliseEstrutural, gerarHipotesesClinicas, gerarMapaIdentidade } = require('../services/ai');
const router  = express.Router();

function buildHash(paciente_id, mapId, resumoV, sessIds, feedIds) {
  return crypto.createHash('md5').update(`${paciente_id}|${mapId}|${resumoV}|${sessIds}|${feedIds}`).digest('hex');
}

async function loadContexto(pid) {
  const [pac, map, sess, feed, res, mem] = await Promise.all([
    db.query('SELECT * FROM pacientes WHERE id=$1',[pid]),
    db.query('SELECT * FROM mapeamentos WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1',[pid]),
    db.query('SELECT * FROM sessoes WHERE paciente_id=$1 AND status=$2 ORDER BY sessao_numero ASC',[pid,'realizada']),
    db.query('SELECT * FROM feedbacks_paciente WHERE paciente_id=$1 ORDER BY data_feedback ASC',[pid]),
    db.query('SELECT conteudo_ia, versao FROM resumos_clinicos WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1',[pid]),
    db.query('SELECT conteudo_json FROM memoria_terapeutica WHERE paciente_id=$1 AND ativa=true ORDER BY versao DESC LIMIT 1',[pid]),
  ]);
  return {
    paciente: pac.rows[0], mapeamento: map.rows[0]||null,
    sessoes: sess.rows, feedbacks: feed.rows,
    resumoAtual: (res.rows[0] && res.rows[0].conteudo_ia) || null, resumoVersao: (res.rows[0] && res.rows[0].versao) || 0,
    memoriaAtual: mem.rows[0] ? JSON.stringify(mem.rows[0].conteudo_json) : null
  };
}

// ═══ ANALISE ESTRUTURAL ═══

router.get('/:pid/estrutural/atual', verifyToken, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM analise_estrutural WHERE paciente_id=$1 AND ativa=true ORDER BY versao DESC LIMIT 1',[req.params.pid]);
    res.json(r.rows[0]||null);
  } catch(e){ res.status(500).json({message:e.message}); }
});

router.get('/:pid/estrutural/historico', verifyToken, async (req, res) => {
  try {
    const r = await db.query('SELECT id,versao,ativa,resumo_executivo,gerado_em FROM analise_estrutural WHERE paciente_id=$1 ORDER BY versao DESC',[req.params.pid]);
    res.json(r.rows);
  } catch(e){ res.status(500).json({message:e.message}); }
});

router.post('/:pid/estrutural/gerar', verifyToken, async (req, res) => {
  try {
    const pid = req.params.pid;
    const ctx = await loadContexto(pid);
    if (!ctx.paciente) return res.status(404).json({message:'Paciente não encontrado.'});
    if (!ctx.mapeamento && !ctx.resumoAtual) return res.status(400).json({message:'Gere o mapeamento deste paciente antes de iniciar a análise estrutural.'});
    const hash = buildHash(pid, ctx.mapeamento && ctx.mapeamento.id, ctx.resumoVersao, ctx.sessoes.map(s=>s.id).join(','), ctx.feedbacks.map(f=>f.id).join(','));
    const last = await db.query('SELECT * FROM analise_estrutural WHERE paciente_id=$1 AND ativa=true ORDER BY versao DESC LIMIT 1',[pid]);
    if (last.rows[0] && last.rows[0].hash_contexto===hash && !req.body.force) {
      return res.json({...last.rows[0], sem_mudancas:true, message:'Análise estrutural sem alterações desde a última versão.'});
    }
    const result = await gerarAnaliseEstrutural({db,...ctx});
    const versao = ((last.rows[0] && last.rows[0].versao) || 0)+1;
    await db.query('UPDATE analise_estrutural SET ativa=false WHERE paciente_id=$1',[pid]);
    const saved = await db.query(
      `INSERT INTO analise_estrutural (paciente_id,mapeamento_id,versao,ativa,resumo_executivo,conteudo_json,hash_contexto,modelo_ia,modo)
       VALUES ($1,$2,$3,true,$4,$5,$6,$7,$8) RETURNING *`,
      [pid,ctx.mapeamento && ctx.mapeamento.id||null,versao,result.resumo_executivo,JSON.stringify(result.json),hash,result.modelo,result.modo]
    );
    res.json({...saved.rows[0], sem_mudancas:false});
  } catch(e){ console.error('estrutural/gerar:',e.message); res.status(500).json({message:e.message}); }
});

// ═══ HIPÓTESES CLÍNICAS ═══

router.get('/:pid/hipoteses', verifyToken, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM hipoteses_clinicas WHERE paciente_id=$1 AND ativa=true ORDER BY nivel_confianca DESC NULLS LAST, criado_em DESC',[req.params.pid]);
    res.json(r.rows);
  } catch(e){ res.status(500).json({message:e.message}); }
});

router.post('/:pid/hipoteses/gerar', verifyToken, async (req, res) => {
  try {
    const pid = req.params.pid;
    const ctx = await loadContexto(pid);
    if (!ctx.paciente) return res.status(404).json({message:'Paciente não encontrado.'});
    const aeRes = await db.query('SELECT conteudo_json FROM analise_estrutural WHERE paciente_id=$1 AND ativa=true ORDER BY versao DESC LIMIT 1',[pid]);
    const analiseEstrutural = (aeRes.rows[0] && aeRes.rows[0].conteudo_json) || null;
    const lastVRes = await db.query('SELECT MAX(versao_geracao) AS v FROM hipoteses_clinicas WHERE paciente_id=$1',[pid]);
    const lastVersao = (lastVRes.rows[0] && lastVRes.rows[0].v) || 0;
    const result = await gerarHipotesesClinicas({db, paciente:ctx.paciente, mapeamento:ctx.mapeamento, sessoes:ctx.sessoes, resumoAtual:ctx.resumoAtual, analiseEstrutural});
    // Mark old hypotheses inactive and insert new ones
    await db.query('UPDATE hipoteses_clinicas SET ativa=false WHERE paciente_id=$1 AND status=$2',[pid,'ativa']);
    const saved = [];
    for (const h of result.hipoteses) {
      const r = await db.query(
        `INSERT INTO hipoteses_clinicas (paciente_id,mapeamento_id,versao_geracao,tipo,nivel_confianca,origem,hipotese_ia,evidencias_favoraveis,evidencias_contrarias,perguntas_validacao)
         VALUES ($1,$2,$3,$4,$5,'ia',$6,$7,$8,$9) RETURNING *`,
        [pid,ctx.mapeamento && ctx.mapeamento.id||null,lastVersao+1,h.tipo||null,h.nivel_confianca||null,h.hipotese,
         JSON.stringify(h.evidencias_favoraveis||[]),JSON.stringify(h.evidencias_contrarias||[]),JSON.stringify(h.perguntas_validacao||[])]
      );
      saved.push(r.rows[0]);
    }
    res.json({hipoteses:saved, modo:result.modo});
  } catch(e){ console.error('hipoteses/gerar:',e.message); res.status(500).json({message:e.message}); }
});

router.put('/:hid/hipoteses/atualizar', verifyToken, async (req, res) => {
  try {
    const { interpretacao_terapeuta, ajuste_clinico, status } = req.body;
    // hipotese_ia is NEVER touched
    await db.query(
      `UPDATE hipoteses_clinicas SET
         interpretacao_terapeuta = COALESCE($1, interpretacao_terapeuta),
         ajuste_clinico = COALESCE($2, ajuste_clinico),
         status = COALESCE($3, status),
         atualizado_em = NOW()
       WHERE id=$4`,
      [interpretacao_terapeuta||null, ajuste_clinico||null, status||null, req.params.hid]
    );
    res.json({message:'Hipótese atualizada. Texto original da IA preservado.'});
  } catch(e){ res.status(500).json({message:e.message}); }
});

// ═══ MAPA DE IDENTIDADE ═══

router.get('/:pid/identidade/atual', verifyToken, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM mapa_identidade WHERE paciente_id=$1 AND ativa=true ORDER BY versao DESC LIMIT 1',[req.params.pid]);
    res.json(r.rows[0]||null);
  } catch(e){ res.status(500).json({message:e.message}); }
});

router.get('/:pid/identidade/historico', verifyToken, async (req, res) => {
  try {
    const r = await db.query('SELECT id,versao,ativa,frase_identitaria,gerado_em FROM mapa_identidade WHERE paciente_id=$1 ORDER BY versao DESC',[req.params.pid]);
    res.json(r.rows);
  } catch(e){ res.status(500).json({message:e.message}); }
});

router.post('/:pid/identidade/gerar', verifyToken, async (req, res) => {
  try {
    const pid = req.params.pid;
    const ctx = await loadContexto(pid);
    if (!ctx.paciente) return res.status(404).json({message:'Paciente não encontrado.'});
    const aeRes = await db.query('SELECT conteudo_json FROM analise_estrutural WHERE paciente_id=$1 AND ativa=true ORDER BY versao DESC LIMIT 1',[pid]);
    const analiseEstrutural = (aeRes.rows[0] && aeRes.rows[0].conteudo_json) || null;
    const hash = buildHash(pid, ctx.mapeamento && ctx.mapeamento.id, ctx.resumoVersao, ctx.sessoes.map(s=>s.id).join(','), '');
    const last = await db.query('SELECT * FROM mapa_identidade WHERE paciente_id=$1 AND ativa=true ORDER BY versao DESC LIMIT 1',[pid]);
    if (last.rows[0] && last.rows[0].hash_contexto===hash && !req.body.force) {
      return res.json({...last.rows[0], sem_mudancas:true, message:'Mapa de identidade sem alterações desde a última versão.'});
    }
    const result = await gerarMapaIdentidade({db, paciente:ctx.paciente, mapeamento:ctx.mapeamento, resumoAtual:ctx.resumoAtual, analiseEstrutural});
    const versao = ((last.rows[0] && last.rows[0].versao) || 0)+1;
    await db.query('UPDATE mapa_identidade SET ativa=false WHERE paciente_id=$1',[pid]);
    const saved = await db.query(
      `INSERT INTO mapa_identidade (paciente_id,mapeamento_id,versao,ativa,conteudo_json,frase_identitaria,praticas_sustentacao,hash_contexto,modelo_ia,modo)
       VALUES ($1,$2,$3,true,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [pid,ctx.mapeamento && ctx.mapeamento.id||null,versao,JSON.stringify(result.json),result.frase_identitaria,
       JSON.stringify(result.praticas_sustentacao),hash,result.modelo,result.modo]
    );
    res.json({...saved.rows[0], sem_mudancas:false});
  } catch(e){ console.error('identidade/gerar:',e.message); res.status(500).json({message:e.message}); }
});

// ═══ VISÃO GERAL (todos os módulos ativos) ═══

router.get('/:pid/visao-geral', verifyToken, async (req, res) => {
  try {
    const pid = req.params.pid;
    const [ae, hip, mi] = await Promise.all([
      db.query('SELECT resumo_executivo, versao, gerado_em FROM analise_estrutural WHERE paciente_id=$1 AND ativa=true ORDER BY versao DESC LIMIT 1',[pid]),
      db.query('SELECT tipo, hipotese_ia, nivel_confianca, status FROM hipoteses_clinicas WHERE paciente_id=$1 AND ativa=true ORDER BY nivel_confianca DESC NULLS LAST LIMIT 5',[pid]),
      db.query('SELECT frase_identitaria, versao, gerado_em FROM mapa_identidade WHERE paciente_id=$1 AND ativa=true ORDER BY versao DESC LIMIT 1',[pid]),
    ]);
    res.json({ analise_estrutural: ae.rows[0]||null, hipoteses: hip.rows, mapa_identidade: mi.rows[0]||null });
  } catch(e){ res.status(500).json({message:e.message}); }
});

module.exports = router;
