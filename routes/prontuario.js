const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const { gerarProntuarioInteligente, registrarAuditoria } = require('../services/ai');
const router  = express.Router();

// GET /api/prontuario/:paciente_id/contexto — agrega todo contexto sem chamar IA
router.get('/:pid/contexto', verifyToken, async (req, res) => {
  try {
    const pid = req.params.pid;
    const ctx = await carregarContextoProntuario(pid);
    if (!ctx.paciente) return res.status(404).json({ message: 'Paciente não encontrado.' });
    res.json({ paciente: ctx.paciente.nome_completo, sessoes: ctx.sessoes.length, tem_mapeamento: !!ctx.mapeamento, tem_analise: !!ctx.analiseEstrutural, tem_memoria: !!ctx.memoria, tem_briefing: !!ctx.briefing });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// POST /api/prontuario/:paciente_id/gerar
router.post('/:pid/gerar', verifyToken, async (req, res) => {
  try {
    const pid = req.params.pid;
    const ctx = await carregarContextoProntuario(pid);
    if (!ctx.paciente) return res.status(404).json({ message: 'Paciente não encontrado.' });
    const resultado = await gerarProntuarioInteligente({ db, ...ctx });
    res.json(resultado);
  } catch(e) {
    console.error('prontuario/gerar:', e.message);
    res.status(500).json({ message: e.message });
  }
});

async function carregarContextoProntuario(pid) {
  const [pac, map, sess, feed, res, pac2] = await Promise.all([
    db.query('SELECT * FROM pacientes WHERE id=$1', [pid]),
    db.query('SELECT * FROM mapeamentos WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1', [pid]),
    db.query('SELECT * FROM sessoes WHERE paciente_id=$1 AND status=$2 ORDER BY sessao_numero ASC', [pid,'realizada']),
    db.query('SELECT * FROM feedbacks_paciente WHERE paciente_id=$1 ORDER BY data_feedback DESC LIMIT 10', [pid]).catch(()=>({rows:[]})),
    db.query('SELECT conteudo_ia, versao FROM resumos_clinicos WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1', [pid]).catch(()=>({rows:[]})),
    db.query('SELECT nome, telefone FROM terapeutas LIMIT 1', []),
  ]);

  const [aeRes, hipRes, memRes, brifRes, linhaRes, riscoRes, predRes, pacoteRes, interRes] = await Promise.all([
    db.query('SELECT conteudo_json FROM analise_estrutural WHERE paciente_id=$1 AND ativa=true ORDER BY versao DESC LIMIT 1',[pid]).catch(()=>({rows:[]})),
    db.query('SELECT * FROM hipoteses_clinicas WHERE paciente_id=$1 AND ativa=true AND status NOT IN ($2,$3) ORDER BY nivel_confianca DESC',[pid,'descartada','reformulada']).catch(()=>({rows:[]})),
    db.query('SELECT conteudo_json FROM memoria_terapeutica WHERE paciente_id=$1 AND ativa=true ORDER BY versao DESC LIMIT 1',[pid]).catch(()=>({rows:[]})),
    db.query('SELECT conteudo_json FROM briefings WHERE paciente_id=$1 ORDER BY gerado_em DESC LIMIT 1',[pid]).catch(()=>({rows:[]})),
    db.query('SELECT scores_estruturais_json, tendencia, gerado_em FROM linha_evolutiva WHERE paciente_id=$1 ORDER BY gerado_em DESC LIMIT 8',[pid]).catch(()=>({rows:[]})),
    db.query('SELECT * FROM risco_abandono WHERE paciente_id=$1 ORDER BY gerado_em DESC LIMIT 1',[pid]).catch(()=>({rows:[]})),
    db.query('SELECT * FROM evolucao_preditiva WHERE paciente_id=$1 ORDER BY gerado_em DESC LIMIT 1',[pid]).catch(()=>({rows:[]})),
    db.query('SELECT * FROM pacotes WHERE id=$1',[pac.rows[0]&&pac.rows[0].pacote_id||0]).catch(()=>({rows:[]})),
    db.query('SELECT titulo,tipo,avaliacao,status FROM intervencoes WHERE paciente_id=$1 AND status IN ($2,$3) ORDER BY atualizado_em DESC LIMIT 10',[pid,'utilizada','descartada']).catch(()=>({rows:[]})),
  ]);

  return {
    paciente:        pac.rows[0],
    mapeamento:      map.rows[0]||null,
    sessoes:         sess.rows,
    feedbacks:       feed.rows,
    resumoAtual:     (res.rows[0]&&res.rows[0].conteudo_ia)||null,
    terapeuta:       pac2.rows[0]||null,
    analiseEstrutural: (aeRes.rows[0]&&aeRes.rows[0].conteudo_json)||null,
    hipoteses:       hipRes.rows,
    memoria:         (memRes.rows[0]&&memRes.rows[0].conteudo_json)||null,
    briefing:        (brifRes.rows[0]&&brifRes.rows[0].conteudo_json)||null,
    linhaEvolutiva:  linhaRes.rows,
    riscoAbandono:   riscoRes.rows[0]||null,
    preditiva:       predRes.rows[0]||null,
    pacote:          pacoteRes.rows[0]||null,
    intervencoes:    interRes.rows,
  };
}

module.exports = router;
