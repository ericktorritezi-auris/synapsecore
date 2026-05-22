const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const { gerarEvolucao } = require('../services/ai');
const router  = express.Router();

function baseUrl() {
  return (process.env.BASE_URL || 'https://www.synapsecore.app.br').replace(/\/+$/, '');
}

async function getTerapeuta(id) {
  const t = await db.query(
    `SELECT t.*, array_agg(json_build_object('inst',r.instituicao,'num',r.numero)) AS registros_arr
     FROM terapeutas t
     LEFT JOIN registros_profissionais r ON r.terapeuta_id = t.id
     WHERE t.id = $1 GROUP BY t.id`, [id]
  );
  const row = t.rows[0];
  row.registros = (row.registros_arr || []).filter(r => r.inst);
  delete row.registros_arr;
  return row;
}

async function getPaciente(id) {
  const r = await db.query('SELECT * FROM pacientes WHERE id = $1', [id]);
  return r.rows[0];
}

async function getCIDs(paciente_id) {
  const r = await db.query('SELECT * FROM cids_paciente WHERE paciente_id=$1 AND confirmado=true ORDER BY cid_codigo', [paciente_id]);
  return r.rows;
}

async function saveDoc(paciente_id, tipo, titulo, conteudo, sessao_id, periodo_inicio, periodo_fim) {
  const r = await db.query(
    `INSERT INTO documentos (paciente_id, sessao_id, tipo, titulo, conteudo_json, periodo_inicio, periodo_fim)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, token`,
    [paciente_id, sessao_id||null, tipo, titulo, JSON.stringify(conteudo), periodo_inicio||null, periodo_fim||null]
  );
  return r.rows[0];
}

// ── GET /api/documentos/:paciente_id ──
router.get('/:paciente_id', verifyToken, async (req, res) => {
  try {
    const r = await db.query(
      `SELECT d.id, d.tipo, d.titulo, d.token, d.periodo_inicio, d.periodo_fim, d.created_at,
              s.sessao_numero, s.data_sessao
       FROM documentos d LEFT JOIN sessoes s ON s.id = d.sessao_id
       WHERE d.paciente_id = $1 ORDER BY d.created_at DESC`,
      [req.params.paciente_id]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar documentos.' });
  }
});

// ── POST recibo-sessao ──
router.post('/:paciente_id/recibo-sessao', verifyToken, async (req, res) => {
  try {
    const { sessao_id } = req.body;
    if (!sessao_id) return res.status(400).json({ message: 'Informe a sessão.' });
    const [terap, pac, sessRes] = await Promise.all([
      getTerapeuta(req.terapeuta.id),
      getPaciente(req.params.paciente_id),
      db.query('SELECT * FROM sessoes WHERE id=$1', [sessao_id])
    ]);
    const sess = sessRes.rows[0];
    if (!sess) return res.status(404).json({ message: 'Sessão não encontrada.' });
    const cids = await getCIDs(req.params.paciente_id);

    const conteudo = {
      tipo: 'recibo_sessao', terapeuta: terap, paciente: pac,
      sessao: sess, cids,
      data_emissao: new Date().toISOString()
    };
    const doc = await saveDoc(req.params.paciente_id, 'recibo_sessao',
      `Recibo — Sessão ${sess.sessao_numero} — ${new Date(sess.data_sessao).toLocaleDateString('pt-BR')}`,
      conteudo, sessao_id);
    res.json({ link: baseUrl()+'/doc/'+doc.token, token: doc.token, id: doc.id });
  } catch (err) {
    console.error('recibo-sessao:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── POST recibo-ir ──
router.post('/:paciente_id/recibo-ir', verifyToken, async (req, res) => {
  try {
    const { periodo_inicio, periodo_fim } = req.body;
    if (!periodo_inicio || !periodo_fim) return res.status(400).json({ message: 'Informe o período.' });
    const [terap, pac] = await Promise.all([getTerapeuta(req.terapeuta.id), getPaciente(req.params.paciente_id)]);
    const sessRes = await db.query(
      `SELECT * FROM sessoes WHERE paciente_id=$1 AND status='realizada'
       AND data_sessao BETWEEN $2 AND $3 ORDER BY data_sessao ASC`,
      [req.params.paciente_id, periodo_inicio, periodo_fim]
    );
    if (!sessRes.rows.length) return res.status(400).json({ message: 'Nenhuma sessão realizada no período.' });
    const cids = await getCIDs(req.params.paciente_id);
    const total = sessRes.rows.reduce((s,r) => s + parseFloat(r.valor_cobrado||0), 0);

    const conteudo = {
      tipo: 'recibo_ir', terapeuta: terap, paciente: pac,
      sessoes: sessRes.rows, total_valor: total, cids,
      periodo_inicio, periodo_fim, data_emissao: new Date().toISOString()
    };
    const pIni = new Date(periodo_inicio).toLocaleDateString('pt-BR',{month:'short',year:'numeric'});
    const pFim = new Date(periodo_fim).toLocaleDateString('pt-BR',{month:'short',year:'numeric'});
    const doc = await saveDoc(req.params.paciente_id, 'recibo_ir',
      `Recibo IR — ${pIni} a ${pFim}`, conteudo, null, periodo_inicio, periodo_fim);
    res.json({ link: baseUrl()+'/doc/'+doc.token, token: doc.token, id: doc.id });
  } catch (err) {
    console.error('recibo-ir:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── POST declaracao ──
router.post('/:paciente_id/declaracao', verifyToken, async (req, res) => {
  try {
    const { periodo_inicio, periodo_fim, finalidade } = req.body;
    if (!periodo_inicio || !periodo_fim) return res.status(400).json({ message: 'Informe o período.' });
    const [terap, pac] = await Promise.all([getTerapeuta(req.terapeuta.id), getPaciente(req.params.paciente_id)]);
    const sessRes = await db.query(
      `SELECT * FROM sessoes WHERE paciente_id=$1 AND status='realizada'
       AND data_sessao BETWEEN $2 AND $3 ORDER BY data_sessao ASC`,
      [req.params.paciente_id, periodo_inicio, periodo_fim]
    );
    const conteudo = {
      tipo: 'declaracao', terapeuta: terap, paciente: pac,
      sessoes: sessRes.rows, finalidade: finalidade||null,
      periodo_inicio, periodo_fim, data_emissao: new Date().toISOString()
    };
    const doc = await saveDoc(req.params.paciente_id, 'declaracao',
      `Declaração de Comparecimento — ${new Date(periodo_inicio).toLocaleDateString('pt-BR')}`,
      conteudo, null, periodo_inicio, periodo_fim);
    res.json({ link: baseUrl()+'/doc/'+doc.token, token: doc.token, id: doc.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST laudo ──
router.post('/:paciente_id/laudo', verifyToken, async (req, res) => {
  try {
    const [terap, pac] = await Promise.all([getTerapeuta(req.terapeuta.id), getPaciente(req.params.paciente_id)]);
    const mapRes = await db.query('SELECT * FROM mapeamentos WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1',[req.params.paciente_id]);
    const mapeamento = mapRes.rows[0];
    const sessRes = await db.query('SELECT * FROM sessoes WHERE paciente_id=$1 AND status=$2 ORDER BY sessao_numero',[req.params.paciente_id,'realizada']);
    const resumoRes = await db.query('SELECT conteudo_ia FROM resumos_clinicos WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1',[req.params.paciente_id]);
    const cids = await getCIDs(req.params.paciente_id);
    const proto = mapeamento?.protocolo_json || {};

    // AI generation
    const laudoTexto = await gerarLaudo({ terapeuta: terap, paciente: pac, mapeamento, sessoes: sessRes.rows, resumo: resumoRes.rows[0]?.conteudo_ia, cids });

    const conteudo = {
      tipo: 'laudo', terapeuta: terap, paciente: pac, cids,
      total_sessoes: sessRes.rows.length,
      data_inicio: sessRes.rows[0]?.data_sessao || null,
      data_ultima: sessRes.rows[sessRes.rows.length-1]?.data_sessao || null,
      texto_laudo: laudoTexto,
      objetivos: proto.objetivos_iniciais || '',
      data_emissao: new Date().toISOString()
    };
    const doc = await saveDoc(req.params.paciente_id, 'laudo',
      `Laudo Terapêutico — ${pac.nome_completo}`, conteudo);
    res.json({ link: baseUrl()+'/doc/'+doc.token, token: doc.token, id: doc.id });
  } catch (err) {
    console.error('laudo:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── POST alta ──
router.post('/:paciente_id/alta', verifyToken, async (req, res) => {
  try {
    const [terap, pac] = await Promise.all([getTerapeuta(req.terapeuta.id), getPaciente(req.params.paciente_id)]);
    const mapRes = await db.query('SELECT * FROM mapeamentos WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1',[req.params.paciente_id]);
    const mapeamento = mapRes.rows[0];
    const sessRes = await db.query('SELECT * FROM sessoes WHERE paciente_id=$1 AND status=$2 ORDER BY sessao_numero',[req.params.paciente_id,'realizada']);
    const resumoRes = await db.query('SELECT conteudo_ia FROM resumos_clinicos WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1',[req.params.paciente_id]);
    const cids = await getCIDs(req.params.paciente_id);
    const evolRes = await db.query('SELECT conteudo_json FROM relatorio_tokens WHERE paciente_id=$1 ORDER BY criado_em DESC LIMIT 1',[req.params.paciente_id]);
    const evolucao = evolRes.rows[0]?.conteudo_json || null;

    const altaTexto = await gerarRelatorioAlta({ terapeuta: terap, paciente: pac, mapeamento, sessoes: sessRes.rows, resumo: resumoRes.rows[0]?.conteudo_ia, cids, evolucao });

    const conteudo = {
      tipo: 'alta', terapeuta: terap, paciente: pac, cids,
      total_sessoes: sessRes.rows.length,
      data_inicio: sessRes.rows[0]?.data_sessao || null,
      data_ultima: sessRes.rows[sessRes.rows.length-1]?.data_sessao || null,
      indices_iniciais: mapeamento?.dimensoes_json || {},
      indices_finais:   evolucao?.indices_atuais  || {},
      texto_alta: altaTexto,
      data_emissao: new Date().toISOString()
    };
    const doc = await saveDoc(req.params.paciente_id, 'alta',
      `Relatório de Alta — ${pac.nome_completo}`, conteudo);
    res.json({ link: baseUrl()+'/doc/'+doc.token, token: doc.token, id: doc.id });
  } catch (err) {
    console.error('alta:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/documentos/view/:token (público) ──
router.get('/view/:token', async (req, res) => {
  try {
    const r = await db.query('SELECT conteudo_json, tipo, titulo, created_at FROM documentos WHERE token=$1', [req.params.token]);
    if (!r.rows.length) return res.status(404).json({ message: 'Documento não encontrado.' });
    res.json({ valido: true, ...r.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar documento.' });
  }
});

// ── DELETE /api/documentos/:doc_id ──
router.delete('/:doc_id', verifyToken, async (req, res) => {
  try {
    await db.query('DELETE FROM documentos WHERE id=$1', [req.params.doc_id]);
    res.json({ message: 'Documento removido.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover documento.' });
  }
});

// ── AI: Laudo Terapêutico ──
async function gerarLaudo({ terapeuta, paciente, mapeamento, sessoes, resumo, cids }) {
  const cidsStr = cids.map(c => c.cid_codigo+' — '+c.cid_nome).join(', ') || 'Não classificado';
  const sessStr = sessoes.map(s => `Sessão ${s.sessao_numero} (${new Date(s.data_sessao).toLocaleDateString('pt-BR')}): ${s.resumo_terapeuta||'sem resumo'}`).join('\n');
  const proto = mapeamento?.protocolo_json || {};

  const prompt = `Você é o assistente clínico do Synapse Core — Evolution Therapy.
Gere um Laudo Terapêutico profissional em português brasileiro.
Terapeuta: ${terapeuta.nome} — ${terapeuta.especialidades||'Psicoterapeuta'}
Paciente: ${paciente.nome_completo} | Perfil: ${paciente.perfil_tipo||'adulto'}
CIDs: ${cidsStr}
Total de sessões: ${sessoes.length}
${resumo ? 'Resumo clínico: '+resumo.substring(0,800) : ''}
Objetivos: ${proto.objetivos_iniciais||''}
Histórico: ${sessStr.substring(0,1000)}

O laudo deve conter:
1. Identificação do paciente e terapeuta
2. Motivo do acompanhamento
3. Processo terapêutico (abordagem, técnicas, duração)
4. Evolução observada
5. Estado atual
6. Encaminhamentos e recomendações

Use linguagem técnica e formal. NÃO diagnostique — use "apresenta padrões compatíveis com", "observa-se quadro sugestivo de".
Retorne APENAS o texto do laudo em prosa, sem títulos JSON, sem marcadores. Use parágrafos separados por quebra de linha.`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
    body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:2500, messages:[{role:'user',content:prompt}] })
  });
  if (!resp.ok) throw new Error('Anthropic error: '+resp.status);
  const d = await resp.json();
  return d.content?.[0]?.text || 'Laudo não gerado.';
}

// ── AI: Relatório de Alta ──
async function gerarRelatorioAlta({ terapeuta, paciente, mapeamento, sessoes, resumo, cids, evolucao }) {
  const cidsStr = cids.map(c => c.cid_codigo+' — '+c.cid_nome).join(', ') || 'Não classificado';

  const prompt = `Você é o assistente clínico do Synapse Core — Evolution Therapy.
Gere um Relatório de Alta Terapêutica profissional em português brasileiro.
Terapeuta: ${terapeuta.nome} — ${terapeuta.especialidades||'Psicoterapeuta'}
Paciente: ${paciente.nome_completo}
CIDs: ${cidsStr}
Total de sessões realizadas: ${sessoes.length}
${resumo ? 'Resumo evolutivo: '+resumo.substring(0,800) : ''}
${evolucao ? 'Narrativa de evolução: '+(evolucao.narrativa_paciente||'').substring(0,500) : ''}

O relatório de alta deve conter:
1. Contextualização do processo (início, duração, programa)
2. Objetivos trabalhados e resultados alcançados
3. Evolução observada por dimensão (emocional, cognitiva, relacional, comportamental)
4. Conquistas e recursos desenvolvidos pelo paciente
5. Estado no momento da alta
6. Recomendações para continuidade do desenvolvimento

Use linguagem técnica, formal e cuidadosa. Seja específico sobre as conquistas.
Retorne APENAS o texto em prosa, sem JSON, sem marcadores. Parágrafos separados por quebra de linha.`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
    body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:2500, messages:[{role:'user',content:prompt}] })
  });
  if (!resp.ok) throw new Error('Anthropic error: '+resp.status);
  const d = await resp.json();
  return d.content?.[0]?.text || 'Relatório não gerado.';
}

// ── POST encaminhamento-psiquiatrico ──
router.post('/:paciente_id/encaminhamento-psiquiatrico', verifyToken, async (req, res) => {
  try {
    const { motivo, sintomas, objetivo, resumo, frequencia, periodo_inicio } = req.body;
    const [terap, pac] = await Promise.all([getTerapeuta(req.terapeuta.id), getPaciente(req.params.paciente_id)]);
    const sessRes  = await db.query('SELECT * FROM sessoes WHERE paciente_id=$1 AND status=$2 ORDER BY data_sessao ASC', [req.params.paciente_id, 'realizada']);
    const cids     = await getCIDs(req.params.paciente_id);
    const dataInicio = periodo_inicio || sessRes.rows[0]?.data_sessao || null;

    const conteudo = {
      tipo:              'encaminhamento_psiq',
      terapeuta:         terap,
      paciente:          pac,
      cids,
      motivo:            motivo   || '',
      sintomas:          sintomas || '',
      objetivo:          objetivo || '',
      resumo_clinico:    resumo   || '',
      frequencia:        frequencia || '',
      total_sessoes:     sessRes.rows.length,
      data_inicio:       dataInicio,
      data_emissao:      new Date().toISOString(),
      gerado_com_ia:     req.body.gerado_com_ia || false
    };

    const doc = await saveDoc(req.params.paciente_id, 'encaminhamento_psiq',
      'Encaminhamento para Avaliação Psiquiátrica — ' + pac.nome_completo,
      conteudo);

    // Audit log
    const { registrarAuditoria } = require('../services/ai');
    await registrarAuditoria(db, {
      paciente_id: req.params.paciente_id,
      modulo: 'encaminhamento_psiq',
      referencia_tipo: 'documento',
      referencia_id: doc.id,
      output_resumo: 'Encaminhamento emitido para ' + pac.nome_completo,
      sucesso: true,
      modo: req.body.gerado_com_ia ? 'ia' : 'manual'
    });

    res.json({ link: baseUrl()+'/doc/'+doc.token, token: doc.token, id: doc.id });
  } catch (err) {
    console.error('encaminhamento-psiquiatrico:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── POST encaminhamento-psiquiatrico/sugerir — IA sugere campos ──
router.post('/:paciente_id/encaminhamento-psiquiatrico/sugerir', verifyToken, async (req, res) => {
  try {
    const { gerarResumoEncaminhamento } = require('../services/ai');
    const pac = await getPaciente(req.params.paciente_id);
    const sessRes = await db.query('SELECT * FROM sessoes WHERE paciente_id=$1 AND status=$2 ORDER BY data_sessao ASC', [req.params.paciente_id, 'realizada']);
    const mapRes  = await db.query('SELECT * FROM mapeamentos WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1', [req.params.paciente_id]);
    const anaRes  = await db.query('SELECT * FROM analise_estrutural WHERE paciente_id=$1 ORDER BY created_at DESC LIMIT 1', [req.params.paciente_id]);
    const hipRes  = await db.query('SELECT * FROM hipoteses_clinicas WHERE paciente_id=$1 ORDER BY created_at DESC LIMIT 3', [req.params.paciente_id]);
    const memRes  = await db.query('SELECT conteudo FROM memoria_terapeutica WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1', [req.params.paciente_id]);

    const sugestoes = await gerarResumoEncaminhamento({
      paciente:  pac,
      sessoes:   sessRes.rows,
      mapeamento: mapRes.rows[0] || null,
      analise:   anaRes.rows[0] || null,
      hipoteses: hipRes.rows,
      memoria:   memRes.rows[0]?.conteudo || null,
      cids:      await getCIDs(req.params.paciente_id)
    });

    res.json(sugestoes);
  } catch(err) {
    console.error('sugerir-encaminhamento:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
