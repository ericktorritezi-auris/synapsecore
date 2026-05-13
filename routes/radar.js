const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const router  = express.Router();

// ── GET /api/radar ── dados agregados do banco
router.get('/', verifyToken, async (req, res) => {
  try {
    const tid = req.terapeuta.id;

    // Resumo geral
    const resumo = await db.query(`
      SELECT
        COUNT(DISTINCT p.id)                                          AS total_pacientes,
        COUNT(DISTINCT CASE WHEN p.status='ativo' THEN p.id END)     AS em_acompanhamento,
        COUNT(DISTINCT s.id)                                          AS total_sessoes,
        ROUND(AVG(eh.score_global)::numeric, 1)                      AS score_medio_evolucao,
        ROUND(AVG(m.indice_global)::numeric, 1)                      AS score_medio_inicial
      FROM pacientes p
      LEFT JOIN sessoes s       ON s.paciente_id = p.id AND s.status='realizada'
      LEFT JOIN mapeamentos m   ON m.id = (SELECT id FROM mapeamentos WHERE paciente_id=p.id ORDER BY versao DESC LIMIT 1)
      LEFT JOIN evolucao_historico eh ON eh.paciente_id = p.id
      WHERE p.terapeuta_id = $1
    `, [tid]);

    // CIDs confirmados
    const cids = await db.query(`
      SELECT c.cid_codigo, c.cid_nome,
             COUNT(DISTINCT c.paciente_id) AS count
      FROM cids_paciente c
      JOIN pacientes p ON p.id = c.paciente_id
      WHERE p.terapeuta_id = $1 AND c.confirmado = true
      GROUP BY c.cid_codigo, c.cid_nome
      ORDER BY count DESC
      LIMIT 10
    `, [tid]);

    const totalPac = parseInt(resumo.rows[0].total_pacientes) || 1;

    // Perfis
    const perfis = await db.query(`
      SELECT perfil_tipo, COUNT(*) AS count
      FROM pacientes WHERE terapeuta_id=$1
      GROUP BY perfil_tipo ORDER BY count DESC
    `, [tid]);

    // Flags mais frequentes
    const flagsRaw = await db.query(`
      SELECT flags_json FROM mapeamentos m
      JOIN pacientes p ON p.id = m.paciente_id
      WHERE p.terapeuta_id = $1 AND m.versao = (
        SELECT MAX(versao) FROM mapeamentos m2 WHERE m2.paciente_id = m.paciente_id
      )
    `, [tid]);

    const flagCount = {};
    flagsRaw.rows.forEach(r => {
      const flags = r.flags_json || [];
      flags.forEach(f => { flagCount[f] = (flagCount[f]||0) + 1; });
    });
    const flagsSorted = Object.entries(flagCount)
      .sort((a,b) => b[1]-a[1]).slice(0,8)
      .map(([flag, count]) => ({ flag, count }));

    // Evolução mensal (últimos 12 meses)
    const mensal = await db.query(`
      SELECT
        TO_CHAR(s.data_sessao, 'YYYY-MM') AS mes,
        COUNT(DISTINCT s.id)              AS sessoes,
        COUNT(DISTINCT s.paciente_id)     AS pacientes_ativos,
        ROUND(AVG(m.indice_global)::numeric,1) AS score_medio
      FROM sessoes s
      JOIN pacientes p ON p.id = s.paciente_id
      LEFT JOIN mapeamentos m ON m.paciente_id = s.paciente_id
      WHERE p.terapeuta_id=$1
        AND s.status='realizada'
        AND s.data_sessao >= NOW() - INTERVAL '12 months'
      GROUP BY mes ORDER BY mes ASC
    `, [tid]);

    // Top flags labels
    const FLAG_LABELS = {
      risco_depressivo:'Risco Depressivo', burnout_provavel:'Burnout Provável',
      ansiedade_elevada:'Ansiedade Elevada', trauma_indicado:'Trauma Indicado',
      isolamento_social:'Isolamento Social', instabilidade_emocional:'Instabilidade Emocional',
      conflito_relacional:'Conflito Relacional', baixa_autoestima:'Baixa Autoestima',
      neurodivergencia:'Neurodivergência', crise_existencial:'Crise Existencial',
      abuso_substancias:'Abuso de Substâncias', ideacao_suicida:'Ideação Suicida',
      transtorno_alimentar:'Transtorno Alimentar', disfuncao_sexual:'Disfunção Sexual'
    };

    res.json({
      resumo: {
        total_pacientes: parseInt(resumo.rows[0].total_pacientes)||0,
        em_acompanhamento: parseInt(resumo.rows[0].em_acompanhamento)||0,
        total_sessoes: parseInt(resumo.rows[0].total_sessoes)||0,
        score_medio_evolucao: parseFloat(resumo.rows[0].score_medio_evolucao)||null,
        score_medio_inicial:  parseFloat(resumo.rows[0].score_medio_inicial)||null
      },
      cids: cids.rows.map(c => ({
        codigo: c.cid_codigo, nome: c.cid_nome,
        count: parseInt(c.count),
        percentual: Math.round(parseInt(c.count)/totalPac*100)
      })),
      perfis: perfis.rows.map(p => ({
        tipo: p.perfil_tipo, count: parseInt(p.count),
        percentual: Math.round(parseInt(p.count)/totalPac*100)
      })),
      flags: flagsSorted.map(f => ({
        flag: f.flag,
        label: FLAG_LABELS[f.flag] || f.flag,
        count: f.count,
        percentual: Math.round(f.count/totalPac*100)
      })),
      evolucao_mensal: mensal.rows
    });
  } catch (err) {
    console.error('GET /radar:', err.message);
    res.status(500).json({ message: 'Erro ao gerar radar.' });
  }
});

// ── POST /api/radar/insight ── IA analisa os dados e gera insight
router.post('/insight', verifyToken, async (req, res) => {
  try {
    const { dados } = req.body;
    if (!dados) return res.status(400).json({ message: 'Dados não enviados.' });

    const { resumo, cids, flags, evolucao_mensal } = dados;
    const topCids  = cids.slice(0,5).map(c=>`${c.codigo} ${c.nome} (${c.percentual}%)`).join(', ');
    const topFlags = flags.slice(0,5).map(f=>`${f.label} (${f.percentual}%)`).join(', ');

    const prompt = `Você é um assistente de inteligência clínica do Synapse Core — Evolution Therapy.
Terapeuta: Erick Torritezi — Psicanalista e Psicoterapeuta Estratégico Integrativo.

DADOS CLÍNICOS DO CONSULTÓRIO:
- Total de pacientes: ${resumo.total_pacientes} | Em acompanhamento: ${resumo.em_acompanhamento}
- Total de sessões realizadas: ${resumo.total_sessoes}
- Score médio de bem-estar: ${resumo.score_medio_evolucao || resumo.score_medio_inicial || 'N/D'}
- CIDs mais frequentes: ${topCids || 'Sem dados'}
- Flags clínicas mais presentes: ${topFlags || 'Sem dados'}

Com base nesses dados, gere:
1. Um INSIGHT CLÍNICO (3-4 frases): um padrão relevante ou tendência observada nos atendimentos.
2. Uma FRASE DE IMPACTO (1 frase): que o terapeuta possa usar em uma entrevista, podcast ou palestra. Deve ser específica, baseada nos números reais.
3. Uma RECOMENDAÇÃO ESTRATÉGICA (2-3 frases): o que esses números sugerem para o desenvolvimento da clínica ou foco dos atendimentos.

Retorne APENAS JSON válido:
{
  "insight_clinico": "...",
  "frase_impacto": "...",
  "recomendacao": "..."
}`;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000, messages:[{role:'user',content:prompt}] })
    });
    const data = await resp.json();
    const text = data.content?.[0]?.text || '{}';
    const clean = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    try {
      res.json(JSON.parse(clean));
    } catch {
      const m = clean.match(/\{[\s\S]*\}/);
      res.json(m ? JSON.parse(m[0]) : { insight_clinico: text, frase_impacto:'', recomendacao:'' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/radar/tendencias ── IA busca tendências com web_search
router.post('/tendencias', verifyToken, async (req, res) => {
  try {
    const { meus_dados } = req.body;

    const prompt = `Você é um pesquisador de saúde mental do Synapse Core.

${meus_dados ? `DADOS DO CONSULTÓRIO PARA COMPARAÇÃO:
- CIDs mais frequentes: ${(meus_dados.cids||[]).slice(0,3).map(c=>c.nome+' '+c.percentual+'%').join(', ')}
- Score médio de bem-estar: ${meus_dados.resumo?.score_medio_evolucao || 'N/D'}` : ''}

Faça pesquisas web sobre:
1. Estatísticas globais atuais de saúde mental: ansiedade, burnout, depressão, estresse (OMS, APA, Lancet, Nature)
2. Tendências de saúde mental no Brasil em 2025-2026 (CFP, ABRAP, notícias)
3. Qualquer dado novo relevante sobre saúde emocional global

Retorne APENAS JSON válido:
{
  "numeros_globais": [
    {
      "categoria": "Ansiedade",
      "prevalencia_mundial": "3.6%",
      "pessoas_afetadas": "301 milhões",
      "crescimento": "+25% pós-pandemia",
      "fonte": "OMS 2024",
      "cor": "#7c3aed"
    }
  ],
  "noticias": [
    {
      "titulo": "...",
      "resumo": "...",
      "fonte": "...",
      "data": "...",
      "url": "..."
    }
  ],
  "comparativo": "Texto comparando os dados globais com os dados do consultório...",
  "ultimo_update": "Mai/2026"
}`;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role:'user', content: prompt }]
      })
    });
    const data = await resp.json();

    // Extract text from all content blocks
    let fullText = '';
    (data.content || []).forEach(block => {
      if (block.type === 'text') fullText += block.text;
    });

    const clean = fullText.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    try {
      const m = clean.match(/\{[\s\S]*\}/);
      res.json(m ? JSON.parse(m[0]) : { numeros_globais:[], noticias:[], comparativo: clean });
    } catch {
      res.json({ numeros_globais:[], noticias:[], comparativo: clean });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
