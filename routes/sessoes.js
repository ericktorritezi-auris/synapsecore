const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const { gerarResumoClinico, gerarSnapshotEvolutivoLeve, calcularScoreRiscoBasico } = require('../services/ai');
const router  = express.Router();

// GET /api/sessoes/:paciente_id
router.get('/:paciente_id', verifyToken, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT s.*, pk.nome AS pacote_nome
      FROM sessoes s
      LEFT JOIN pacotes pk ON pk.id = s.pacote_id
      WHERE s.paciente_id = $1
      ORDER BY s.sessao_numero DESC
    `, [req.params.paciente_id]);
    res.json(r.rows);
  } catch (err) {
    console.error('GET /sessoes:', err.message);
    res.status(500).json({ message: 'Erro ao buscar sessões.' });
  }
});

// POST /api/sessoes/:paciente_id
router.post('/:paciente_id', verifyToken, async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const {
      sessao_numero, pacote_id, data_sessao,
      duracao_minutos, valor_cobrado, forma_pagamento,
      resumo_terapeuta, status, paciente_2_id, pago
    } = req.body;

    if (!data_sessao) return res.status(400).json({ message: 'Data da sessão é obrigatória.' });

    // Auto-calculate session number if not provided
    // sessao_numero in DB is always relative (1,2,3...) — sessoes_anteriores offset applied on display
    let numSessao = sessao_numero;
    if (!numSessao) {
      const cnt = await db.query(
        'SELECT COALESCE(MAX(sessao_numero),0)+1 AS prox FROM sessoes WHERE paciente_id = $1',
        [paciente_id]
      );
      numSessao = cnt.rows[0].prox;
    }

    const result = await db.query(`
      INSERT INTO sessoes
        (paciente_id, paciente_2_id, pacote_id, sessao_numero, data_sessao,
         duracao_minutos, valor_cobrado, forma_pagamento, resumo_terapeuta, status, pago)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      paciente_id, paciente_2_id || null, pacote_id || null,
      numSessao, data_sessao,
      duracao_minutos || 50,
      valor_cobrado || null,
      forma_pagamento || null,
      resumo_terapeuta || null,
      status || 'realizada',
      pago === true || pago === 'true' ? true : false
    ]);

    const sessao = result.rows[0];

    // Update patient current session
    if (status === 'realizada' || !status) {
      await db.query(
        'UPDATE pacientes SET programa_sessao_atual = $1, updated_at = NOW() WHERE id = $2',
        [numSessao, paciente_id]
      );
    }

    // Generate clinical summary in background (don't block response)
    if (resumo_terapeuta && resumo_terapeuta.trim()) {
      gerarEAtualizarResumo(paciente_id).catch(e => console.error('Resumo IA erro:', e.message));
      // v3.2.0 — snapshot leve + score básico de risco (sem IA)
      gerarSnapshotLeve(paciente_id, res.rows[0].id).catch(e => console.error('Snapshot leve erro:', e.message));
    }

    res.status(201).json(sessao);
  } catch (err) {
    console.error('POST /sessoes:', err.message);
    res.status(500).json({ message: 'Erro ao registrar sessão.' });
  }
});

// PUT /api/sessoes/:sessao_id
router.put('/:sessao_id', verifyToken, async (req, res) => {
  try {
    const fields = ['data_sessao','duracao_minutos','valor_cobrado','forma_pagamento','resumo_terapeuta','status','pacote_id','pago'];
    const updates = []; const values = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) { values.push(req.body[f]); updates.push(f + ' = $' + values.length); }
    });
    if (!updates.length) return res.status(400).json({ message: 'Nada para atualizar.' });
    values.push(req.params.sessao_id);
    const r = await db.query(
      'UPDATE sessoes SET ' + updates.join(', ') + ', updated_at = NOW() WHERE id = $' + values.length + ' RETURNING paciente_id',
      values
    );
    if (req.body.resumo_terapeuta && r.rows[0]) {
      gerarEAtualizarResumo(r.rows[0].paciente_id).catch(e => console.error('Resumo IA:', e.message));
    }
    res.json({ message: 'Sessão atualizada.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar sessão.' });
  }
});

// PUT /api/sessoes/:sessao_id/pago — toggle pagamento
router.put('/:sessao_id/pago', verifyToken, async (req, res) => {
  try {
    const r = await db.query('SELECT pago FROM sessoes WHERE id = $1', [req.params.sessao_id]);
    if (!r.rows.length) return res.status(404).json({ message: 'Sessão não encontrada.' });
    const novoPago = !r.rows[0].pago;
    await db.query('UPDATE sessoes SET pago = $1, updated_at = NOW() WHERE id = $2', [novoPago, req.params.sessao_id]);
    res.json({ pago: novoPago, message: novoPago ? 'Sessão marcada como paga.' : 'Sessão marcada como em aberto.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar pagamento.' });
  }
});

// DELETE /api/sessoes/:sessao_id
router.delete('/:sessao_id', verifyToken, async (req, res) => {
  try {
    await db.query('DELETE FROM sessoes WHERE id = $1', [req.params.sessao_id]);
    res.json({ message: 'Sessão removida.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover sessão.' });
  }
});

// GET /api/sessoes/:paciente_id/resumo
router.get('/:paciente_id/resumo', verifyToken, async (req, res) => {
  try {
    const r = await db.query(
      'SELECT * FROM resumos_clinicos WHERE paciente_id = $1 ORDER BY versao DESC LIMIT 1',
      [req.params.paciente_id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Nenhum resumo gerado.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar resumo.' });
  }
});

// POST /api/sessoes/:paciente_id/resumo/gerar
router.post('/:paciente_id/resumo/gerar', verifyToken, async (req, res) => {
  try {
    const force = req.body && req.body.force === true;
    const resumo = await gerarEAtualizarResumo(req.params.paciente_id, force);
    if (resumo.sem_mudancas) {
      return res.status(200).json({
        sem_mudancas: true,
        message: 'Resumo não gerado pois não houve alterações no sistema desde a última versão.',
        conteudo: resumo.conteudo,
        versao: resumo.versao
      });
    }
    res.json(resumo);
  } catch (err) {
    console.error('POST /resumo/gerar:', err.message);
    res.status(500).json({ message: err.message || 'Erro ao gerar resumo.' });
  }
});

// ── INATIVAR PACIENTE ──
router.put('/:paciente_id/inativar', verifyToken, async (req, res) => {
  try {
    await db.query('UPDATE pacientes SET status = $1, updated_at = NOW() WHERE id = $2',
      ['inativo', req.params.paciente_id]);
    res.json({ message: 'Paciente inativado.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao inativar.' });
  }
});

// ── REATIVAR PACIENTE ──
router.put('/:paciente_id/reativar', verifyToken, async (req, res) => {
  try {
    await db.query('UPDATE pacientes SET status = $1, updated_at = NOW() WHERE id = $2',
      ['ativo', req.params.paciente_id]);
    res.json({ message: 'Paciente reativado.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao reativar.' });
  }
});

// ── EXCLUIR PACIENTE (apenas inativos) ── deleta TUDO relacionado
router.delete('/:paciente_id/excluir', verifyToken, async (req, res) => {
  const pid = req.params.paciente_id;
  try {
    const check = await db.query('SELECT status, nome_completo FROM pacientes WHERE id = $1', [pid]);
    if (!check.rows.length) return res.status(404).json({ message: 'Paciente não encontrado.' });
    if (check.rows[0].status !== 'inativo') return res.status(400).json({ message: 'Paciente deve ser inativado antes de excluir.' });

    // Deletar na ordem correta (FK constraints)
    await db.query('DELETE FROM evolucao_historico   WHERE paciente_id = $1', [pid]);
    await db.query('DELETE FROM relatorio_tokens      WHERE paciente_id = $1', [pid]);
    await db.query('DELETE FROM documentos            WHERE paciente_id = $1', [pid]);
    await db.query('DELETE FROM cids_paciente         WHERE paciente_id = $1', [pid]);
    await db.query('DELETE FROM resumos_clinicos      WHERE paciente_id = $1', [pid]);
    await db.query('DELETE FROM mapeamentos           WHERE paciente_id = $1', [pid]);
    await db.query('DELETE FROM sessoes               WHERE paciente_id = $1 OR paciente_2_id = $1', [pid]);
    await db.query('DELETE FROM respostas_formulario  WHERE paciente_id = $1', [pid]);
    await db.query('DELETE FROM form_tokens           WHERE paciente_id = $1', [pid]);
    await db.query('DELETE FROM lgpd_logs             WHERE paciente_id = $1', [pid]);
    await db.query('DELETE FROM pacientes             WHERE id = $1',          [pid]);

    res.json({ message: 'Paciente e todos os dados excluídos permanentemente.' });
  } catch (err) {
    console.error('excluir paciente:', err.message);
    res.status(500).json({ message: 'Erro ao excluir: ' + err.message });
  }
});

// ── v3.2.0: Snapshot leve após registrar sessão (sem IA) ──
async function gerarSnapshotLeve(paciente_id, sessao_id) {
  try {
    const pacRes  = await db.query('SELECT * FROM pacientes WHERE id=$1',[paciente_id]);
    const mapRes  = await db.query('SELECT * FROM mapeamentos WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1',[paciente_id]);
    const sessRes = await db.query('SELECT * FROM sessoes WHERE paciente_id=$1 AND status=$2 ORDER BY sessao_numero ASC',[paciente_id,'realizada']);
    const feedRes = await db.query('SELECT * FROM feedbacks_paciente WHERE paciente_id=$1 ORDER BY data_feedback ASC',[paciente_id]).catch(()=>({rows:[]}));

    const paciente  = pacRes.rows[0];
    const mapeamento = mapRes.rows[0]||null;
    const sessoes   = sessRes.rows;
    const feedbacks = feedRes.rows;

    const lastSnap = await db.query('SELECT * FROM linha_evolutiva WHERE paciente_id=$1 ORDER BY gerado_em DESC LIMIT 1',[paciente_id]);
    const snapshotAnterior = lastSnap.rows[0]||null;
    const versao = (snapshotAnterior&&snapshotAnterior.versao||0)+1;

    const snap = gerarSnapshotEvolutivoLeve({mapeamento,sessoes,feedbacks,snapshotAnterior});
    const hash = require('crypto').createHash('md5').update(paciente_id+'|'+sessoes.map(s=>s.id).join(',')+'|'+(mapeamento&&mapeamento.id||0)).digest('hex');

    if (snapshotAnterior && snapshotAnterior.hash_contexto===hash) return; // no change

    await db.query(
      `INSERT INTO linha_evolutiva (paciente_id,versao,tipo_origem,origem_id,hash_contexto,nivel_confianca,eventos_considerados_json,scores_estruturais_json,tendencia,modelo_ia)
       VALUES ($1,$2,'sessao',$3,$4,$5,$6,$7,$8,'calculado')`,
      [paciente_id,versao,sessao_id,hash,snap.nivel_confianca,JSON.stringify([{tipo:'sessao',id:sessao_id}]),JSON.stringify(snap.scores_estruturais),snap.tendencia]
    );

    // Update basic risk score
    const basic = calcularScoreRiscoBasico({sessoes,feedbacks,paciente});
    const lastRisco = await db.query('SELECT id FROM risco_abandono WHERE paciente_id=$1 ORDER BY gerado_em DESC LIMIT 1',[paciente_id]);
    if (lastRisco.rows.length) {
      await db.query('UPDATE risco_abandono SET score_basico=$1, nivel=CASE WHEN $1>=60 THEN \'critico\' WHEN $1>=40 THEN \'alto\' WHEN $1>=20 THEN \'moderado\' ELSE \'baixo\' END, ultima_analise_leve=NOW() WHERE id=$2',
        [basic.score, lastRisco.rows[0].id]);
    }
  } catch(e) {
    console.error('gerarSnapshotLeve:', e.message);
  }
}

// ── HELPER: gera e salva resumo clínico (com detecção de mudanças) ──
async function gerarEAtualizarResumo(paciente_id, forceRegenerate) {
  const crypto = require('crypto');

  const pacRes = await db.query('SELECT * FROM pacientes WHERE id = $1', [paciente_id]);
  if (!pacRes.rows.length) throw new Error('Paciente não encontrado.');
  const paciente = pacRes.rows[0];

  const sessRes = await db.query(
    'SELECT * FROM sessoes WHERE paciente_id = $1 AND status = $2 ORDER BY sessao_numero ASC',
    [paciente_id, 'realizada']
  );
  const sessoes = sessRes.rows;
  if (!sessoes.length) throw new Error('Nenhuma sessão realizada para gerar resumo.');

  const mapRes = await db.query(
    'SELECT * FROM mapeamentos WHERE paciente_id = $1 ORDER BY versao DESC LIMIT 1', [paciente_id]
  );
  const mapeamento = mapRes.rows[0] || null;

  const pacoteRes = await db.query('SELECT * FROM pacotes WHERE id = $1', [paciente.pacote_id || 0]);
  const pacote = pacoteRes.rows[0] || null;

  // Load feedbacks
  const feedRes = await db.query(
    'SELECT * FROM feedbacks_paciente WHERE paciente_id = $1 ORDER BY data_feedback ASC', [paciente_id]
  );
  const feedbacks = feedRes.rows;

  // Load last resumo
  const lastRes = await db.query(
    'SELECT * FROM resumos_clinicos WHERE paciente_id = $1 ORDER BY versao DESC LIMIT 1', [paciente_id]
  );
  const ultimoResumo = lastRes.rows[0] || null;

  // ── CHANGE DETECTION ──
  const versao = ultimoResumo ? ultimoResumo.versao + 1 : 1;
  const isPrimeiro = versao === 1;

  if (!isPrimeiro && !forceRegenerate && ultimoResumo) {
    // Build current obs hash
    const proto = mapeamento?.protocolo_json || {};
    const obsAtual = [proto.obs_terapeuta, proto.objetivos_iniciais, proto.protocolo_sugerido, proto.sintese_caso].filter(Boolean).join('|');
    const obsHashAtual = obsAtual ? crypto.createHash('md5').update(obsAtual).digest('hex') : '';

    // Check what's new
    const sessoesConsideradas = ultimoResumo.sessoes_consideradas || [];
    const feedbacksConsiderados = ultimoResumo.feedbacks_considerados || [];
    const obsHashSalvo = ultimoResumo.obs_hash || '';

    const sessoesNovas = sessoes.filter(s => !sessoesConsideradas.includes(s.id));
    const feedbacksNovos = feedbacks.filter(f => !feedbacksConsiderados.includes(f.id));
    const obsMudou = obsHashAtual !== obsHashSalvo;

    // Nothing changed — return signal
    if (!sessoesNovas.length && !feedbacksNovos.length && !obsMudou) {
      return { versao: ultimoResumo.versao, conteudo: ultimoResumo.conteudo_ia, sem_mudancas: true };
    }

    // Incremental generation
    const proto2 = mapeamento?.protocolo_json || {};
    const novosObsBlock = obsMudou ? [
      proto2.obs_terapeuta      ? 'Observações: ' + proto2.obs_terapeuta : '',
      proto2.objetivos_iniciais ? 'Objetivos: ' + proto2.objetivos_iniciais : '',
      proto2.protocolo_sugerido ? 'Protocolo: ' + proto2.protocolo_sugerido : '',
      proto2.sintese_caso        ? 'Síntese: ' + proto2.sintese_caso : ''
    ].filter(Boolean).join('\n') : null;

    const conteudo = await gerarResumoClinico({
      paciente, sessoes, mapeamento, pacote,
      isPrimeiro: false,
      novasSessoes:  sessoesNovas.length ? sessoesNovas : null,
      novosObsBlock: novosObsBlock || null,
      novosFeedbacks: feedbacksNovos.length ? feedbacksNovos : null,
      resumoAtual:   ultimoResumo.conteudo_ia
    });

    const ids = sessoes.map(s => s.id);
    const fids = feedbacks.map(f => f.id);
    const obsHash = obsHashAtual;

    await db.query(
      `INSERT INTO resumos_clinicos (paciente_id, versao, conteudo_ia, sessoes_consideradas, feedbacks_considerados, obs_hash)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [paciente_id, versao, conteudo, JSON.stringify(ids), JSON.stringify(fids), obsHash]
    );
    return { versao, conteudo, sessoes_count: sessoes.length, sem_mudancas: false };
  }

  // First generation or force full
  const proto = mapeamento?.protocolo_json || {};
  const obsAtual = [proto.obs_terapeuta, proto.objetivos_iniciais, proto.protocolo_sugerido, proto.sintese_caso].filter(Boolean).join('|');
  const obsHash = obsAtual ? crypto.createHash('md5').update(obsAtual).digest('hex') : '';

  const conteudo = await gerarResumoClinico({ paciente, sessoes, mapeamento, pacote, isPrimeiro });

  const ids  = sessoes.map(s => s.id);
  const fids = feedbacks.map(f => f.id);

  await db.query(
    `INSERT INTO resumos_clinicos (paciente_id, versao, conteudo_ia, sessoes_consideradas, feedbacks_considerados, obs_hash)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [paciente_id, versao, conteudo, JSON.stringify(ids), JSON.stringify(fids), obsHash]
  );
  return { versao, conteudo, sessoes_count: sessoes.length, sem_mudancas: false };
}

module.exports = router;
