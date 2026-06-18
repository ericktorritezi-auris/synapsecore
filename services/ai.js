// SYNAPSE CORE — AI Service v1.4.0
// Índices · Flags · Prompt · Anthropic API

// ── FETCH COM TIMEOUT 45s ──
async function fetchIA(body) {
  var controller = new AbortController();
  var timer = setTimeout(function(){ controller.abort(); }, 90000);
  try {
    var resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timer);
    return resp;
  } catch(e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error('A IA demorou mais que o esperado. Tente novamente.');
    throw e;
  }
}

// ── SCORE CONVERTERS ──
const sf  = v => ({r:0,av:25,f:50,qs:75,s:100}[v]??null);   // positive LF
const sn  = v => ({r:100,av:75,f:50,qs:25,s:0}[v]??null);   // negative LF
const cp  = v => ({ct:100,cp:75,n:50,dp:25,dt:0}[v]??null); // positive LC
const cn  = v => ({ct:0,cp:25,n:50,dp:75,dt:100}[v]??null); // negative LC
const ses = v => ({'0_2':10,'3_4':30,'5_6':55,'7_8':75,'9_10':95}[v]??null);

function avg(arr) {
  const v = arr.filter(x => x !== null && x !== undefined);
  return v.length ? Math.round(v.reduce((a,b) => a+b, 0) / v.length) : 50;
}

// ── CALCULA 10 ÍNDICES ──
function calcularIndices(r) {
  const d1 = avg([
    sn(r.Q01), sf(r.Q02),
    ({b:100,d:60,dom:15,ns:40}[r.Q03]??null),
    ({min:100,hor:75,dia:50,sem:25,car:5}[r.Q04]??null),
    cn(r.Q05), sn(r.Q06),
    ({ans:25,trs:30,rai:30,med:25,cul:25,vaz:10,fru:35,ent:15,bem:100}[r.Q07]??null),
    sn(r.Q08), cn(r.Q09), sn(r.Q10), sf(r.Q11), ses(r.Q12)
  ]);

  const d2 = avg([
    sn(r.Q13), cn(r.Q14),
    ({sp:50,up:70,nc:100,ns:40}[r.Q15]??null),
    ({pos:100,amb:70,ris:20,obs:80}[r.Q16]??null),
    sn(r.Q17), cn(r.Q18),
    ({log:90,eq:80,emo:50,ev:20}[r.Q19]??null),
    sn(r.Q20), cn(r.Q21),
    ({sf:0,av:40,rar:75,nao:100}[r.Q22]??null),
    sf(r.Q23),
    ({pos:100,eq:75,neg:20,con:40}[r.Q24]??null)
  ]);

  const d3 = avg([
    ({paz:100,eq:70,sof:20,pou:50}[r.Q25]??null),
    sn(r.Q26), cn(r.Q27), sn(r.Q28),
    ({sc:20,tal:50,nao:100,np:70}[r.Q29]??null),
    sf(r.Q30),
    ({cf:100,dp:70,dif:30,nn:0}[r.Q31]??null),
    ({pp:90,ms:50,eq:80,dc:20,sol:30}[r.Q32]??null),
    sn(r.Q33), cn(r.Q34), sf(r.Q35),
    ({sc:0,av:40,rar:75,nao:100}[r.Q36]??null)
  ]);

  const d4 = avg([
    ses(r.Q37), sf(r.Q38), cp(r.Q39), sn(r.Q40),
    ({sc:100,par:70,con:50,nc:20}[r.Q41]??null),
    sf(r.Q42), sf(r.Q43),
    ({pas:40,pre:100,fut:70,eq:90}[r.Q44]??null),
    cn(r.Q45),
    ({sf:100,up:70,bus:50,nao:20}[r.Q46]??null),
    ({mc:100,al:70,con:40,nc:20}[r.Q47]??null),
    ses(r.Q48)
  ]);

  const d5 = avg([
    sn(r.Q49), sn(r.Q50),
    ({bd:100,irr:60,dif:30,can:20,med:10}[r.Q51]??null),
    ({mm:50,mm2:50,up:70,nao:100}[r.Q52]??null),
    sf(r.Q53), sn(r.Q54), sn(r.Q55),
    ({sf:0,av:40,rar:75,nao:100}[r.Q56]??null),
    ({bem:100,raz:70,con:30,nac:10}[r.Q57]??null),
    ({sr:100,av:70,rar:40,nao:20}[r.Q58]??null),
    cn(r.Q59), ses(r.Q60)
  ]);

  const d6 = avg([
    sn(r.Q61), sn(r.Q62),
    ({sc:5,aq:25,tal:55,np:90}[r.Q63]??null),
    sn(r.Q64), sn(r.Q65), sn(r.Q66),
    ({sc:100,pt:60,dif:30,rar:10}[r.Q67]??null),
    sn(r.Q68),
    ({com:20,red:30,com2:25,alc:10,iso:20,var:40,rar:75,nao:100}[r.Q69]??null),
    ({rap:100,dem:70,par:30,dif:10}[r.Q70]??null),
    ({seg:40,eq:75,des:100}[r.Q71]??null),
    ses(r.Q72)
  ]);

  const d7 = avg([
    ({sv:100,du:70,ins:30,sol:10}[r.Q73]??null),
    ({sc:25,tal:50,trab:65,np:85}[r.Q74]??null),
    ({sim:25,aq:45,ns:60,nao:90,pnr:50}[r.Q75]??null),
    ({est:100,trans:70,crise:15,recon:60}[r.Q76]??null),
    ({sat:100,eq:70,est:20,na:55}[r.Q77]??null),
    cp(r.Q78)
  ]);

  // Vulnerabilidade baseada nas sentinelas
  const sentFlags = [r.S1,r.S2,r.S3,r.S4,r.S5,r.S6,r.S7,r.S8];
  const vermCount = [
    r.S1==='sim', r.S2==='rec', r.S3==='sim',
    r.S4==='atual', r.S6==='sf', r.S7==='d',
    r.S8==='eu'||r.S8==='alg'
  ].filter(Boolean).length;
  const amarCount = [
    r.S1==='av', r.S2==='pass', r.S3==='av', r.S4==='pass'||r.S4==='pnr',
    r.S5==='sv'||r.S5==='su', r.S6==='sj', r.S7==='f'||r.S7==='av', r.S8==='ns'
  ].filter(Boolean).length;
  const vulnerabilidade = Math.max(0, 100 - vermCount*35 - amarCount*15);

  const global = Math.round((d1+d2+d3+d4+d5+d6+d7+vulnerabilidade) / 8);

  return {
    regulacao_emocional:     d1,
    padrao_cognitivo:        d2,
    indice_relacional:       d3,
    indice_existencial:      d4,
    funcionamento_corporal:  d5,
    sustentacao_comportamental: d6,
    indice_psicossocial:     d7,
    vulnerabilidade_clinica: vulnerabilidade,
    global:                  global,
    dimensoes: { D1:d1, D2:d2, D3:d3, D4:d4, D5:d5, D6:d6, D7:d7 }
  };
}

// ── DETECTA 14 FLAGS ──
function detectarFlags(r, indices) {
  const flags = [];
  const add   = (f) => { if (!flags.includes(f)) flags.push(f); };

  // Risco depressivo
  if (indices.regulacao_emocional < 45 && indices.indice_existencial < 50 && (sn(r.Q10)||50) < 40) add('risco_depressivo');
  // Ansiedade funcional
  if ((sn(r.Q01)||50) < 40 && (cn(r.Q09)||50) < 50 && (sn(r.Q08)||50) < 40) add('ansiedade_funcional');
  // Apego ansioso
  if ((cn(r.Q27)||50) < 40 && (sn(r.Q28)||50) < 40 && (cn(r.Q34)||50) < 45) add('apego_ansioso');
  // Padrão evitativo
  if ((sn(r.Q66)||50) < 40 && (cn(r.Q32)||80) < 40 && (sn(r.Q06)||50) < 40) add('padrao_evitativo');
  // Sobrecarga emocional
  if ((sn(r.Q10)||50) < 35 && (sn(r.Q54)||50) < 40) add('sobrecarga_emocional');
  // Autocrítica excessiva
  if ((cn(r.Q14)||50) < 35 && (cn(r.Q18)||50) < 35) add('autocritica_excessiva');
  // Rigidez emocional
  if ((cn(r.Q21)||50) < 35 && (sn(r.Q17)||50) < 40 && indices.padrao_cognitivo < 45) add('rigidez_emocional');
  // Dissociação leve
  if (r.Q15 === 'sp' && (sn(r.Q06)||50) < 40 && (sn(r.Q08)||50) < 40) add('dissociacao_leve');
  // Procrastinação
  if ((sn(r.Q61)||50) < 40 && (sn(r.Q62)||50) < 40) add('padrao_procrastinacao');
  // Burnout provável
  if ((sn(r.Q54)||50) < 35 && (sn(r.Q10)||50) < 35 && r.Q77 === 'est') add('burnout_provavel');
  // Neurodivergência provável
  if (r.Q86 && r.Q86 !== 'nao' && r.Q86 !== 'pnr') add('neurodivergencia_provavel');
  // Avaliação psiquiátrica
  if (r.S5 === 'sv' || r.S6 === 'sf' || r.S6 === 'sj' || r.Q85 === 'sim') add('avaliacao_psiquiatrica');
  // Vulnerabilidade relacional
  if (indices.indice_relacional < 45) add('vulnerabilidade_relacional');
  // Vazio existencial
  if ((sn(r.Q40)||50) < 40 && (ses(r.Q37)||50) < 40 && indices.indice_existencial < 45) add('vazio_existencial');

  return flags;
}

// ── SUGERE PROGRAMA ──
// ── SUGERIR PROGRAMA — usa IA com fallback local ──
async function sugerirPrograma(perfilTipo, indices, flags, pacotes) {
  // Try AI first
  try {
    const result = await sugerirProgramaIA(perfilTipo, indices, flags, pacotes);
    return { ...result, modo: 'ia' };
  } catch (e) {
    console.warn('sugerirPrograma IA falhou, usando fallback local:', e.message);
    const result = sugerirProgramaLocal(perfilTipo, indices, flags, pacotes);
    return { ...result, modo: 'fallback', api_erro: e.message };
  }
}

async function sugerirProgramaIA(perfilTipo, indices, flags, pacotes) {
  const flagLabels = {
    risco_depressivo:'Risco Depressivo', burnout_provavel:'Burnout Provável',
    ansiedade_elevada:'Ansiedade Elevada', trauma_indicado:'Trauma Indicado',
    isolamento_social:'Isolamento Social', instabilidade_emocional:'Instabilidade Emocional',
    conflito_relacional:'Conflito Relacional', baixa_autoestima:'Baixa Autoestima',
    neurodivergencia:'Neurodivergência', crise_existencial:'Crise Existencial'
  };
  const flagsDesc = flags.map(f => flagLabels[f] || f).join(', ') || 'Nenhuma';

  const programasDesc = pacotes.map((p, i) =>
    `${i+1}. ${p.nome} (${p.qtd_sessoes || 'sessões contínuas'} sessões | público: ${p.publico_alvo})\n` +
    `   Descrição: ${p.descricao}\n` +
    (p.sessoes_json && p.sessoes_json.length
      ? `   Plano: ${p.sessoes_json.slice(0,4).map(s=>`S${s.numero} ${s.titulo}`).join(' · ')}${p.sessoes_json.length>4?' ...':''}`
      : '')
  ).join('\n\n');

  const prompt = `Você é o assistente clínico do Synapse Core — Evolution Therapy.
Terapeuta: Erick Torritezi — Psicanalista e Psicoterapeuta Estratégico Integrativo.

PERFIL DO PACIENTE:
- Tipo: ${perfilTipo}
- Score global: ${indices.global || 'N/D'}
- Regulação emocional: ${indices.regulacao_emocional || 'N/D'}
- Padrão cognitivo: ${indices.padrao_cognitivo || 'N/D'}
- Índice relacional: ${indices.indice_relacional || 'N/D'}
- Flags clínicas: ${flagsDesc}

PROGRAMAS DISPONÍVEIS:
${programasDesc}

Com base no perfil clínico do paciente, selecione o programa mais adequado.
Retorne APENAS JSON válido:
{
  "programa_id": <número do programa na lista acima, 1-based>,
  "compatibilidade": <número de 0 a 100>,
  "justificativa": "<2-3 frases explicando por que este programa é mais adequado para este paciente>",
  "aderencia_sessoes": "<breve descrição de como as primeiras sessões do programa se adequam ao perfil clínico>"
}`;

  const resp = await fetchIA(JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:800, messages:[{role:'user',content:prompt}] }));
  if (!resp.ok) throw new Error('Anthropic API error: ' + resp.status);
  const data  = await resp.json();
  const text  = (data.content && data.content[0] && data.content[0].text) || '{}';
  const clean = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
  const m223  = clean.match(/\{[\s\S]*\}/);
  const json  = m223 ? JSON.parse(m223[0]) : {};

  const idx = (parseInt(json.programa_id) || 1) - 1;
  const prog = pacotes[Math.min(Math.max(idx, 0), pacotes.length-1)];
  if (!prog) throw new Error('Programa não encontrado na resposta da IA');

  return {
    id: prog.id,
    nome: prog.nome,
    compat: Math.min(100, Math.max(0, parseInt(json.compatibilidade) || 75)),
    justificativa: json.justificativa || '',
    aderencia_sessoes: json.aderencia_sessoes || ''
  };
}

function sugerirProgramaLocal(perfilTipo, indices, flags, pacotes) {
  const mapa = {
    adulto:          p => p.publico_alvo === 'adulto' && p.qtd_sessoes !== 1,
    casal:           p => p.publico_alvo === 'casal',
    adolescente:     p => p.publico_alvo === 'adolescente',
    neurodivergente: p => p.publico_alvo === 'neurodivergente' && p.qtd_sessoes > 1,
    atleta:          p => p.publico_alvo === 'atleta'
  };
  const filtro = mapa[perfilTipo] || mapa.adulto;
  const candidatos = pacotes.filter(filtro);
  if (!candidatos.length) return { id: null, nome: 'Sessão Estratégica Individual', compat: 70, justificativa: 'Programa sugerido com base no perfil.' };

  const melhor = candidatos.map(p => {
    let compat = 70;
    if (flags.includes('risco_depressivo')    && p.nome.includes('Destravamento')) compat += 15;
    if (flags.includes('burnout_provavel')    && p.nome.includes('Destravamento')) compat += 10;
    if (flags.includes('ansiedade_elevada')   && p.nome.includes('Destravamento')) compat += 8;
    if (flags.includes('neurodivergencia')    && p.nome.includes('Regulação'))     compat += 20;
    if (flags.includes('conflito_relacional') && p.nome.includes('Casal'))         compat += 5;
    if (indices.global < 50) compat += 10;
    if (indices.global >= 70) compat -= 5;
    return { ...p, compat: Math.min(98, compat) };
  }).sort((a,b) => b.compat - a.compat)[0];

  return { id: melhor.id, nome: melhor.nome, compat: melhor.compat, justificativa: `Compatibilidade baseada no perfil ${perfilTipo} e padrões identificados.` };
}

// ── FLAG LABELS ──
const FLAG_LABELS = {
  risco_depressivo:          { l:'Risco Depressivo',            c:'red' },
  ansiedade_funcional:       { l:'Ansiedade Funcional',         c:'orange' },
  apego_ansioso:             { l:'Apego Ansioso',               c:'orange' },
  padrao_evitativo:          { l:'Padrão Evitativo',            c:'yellow' },
  sobrecarga_emocional:      { l:'Sobrecarga Emocional',        c:'orange' },
  autocritica_excessiva:     { l:'Autocrítica Excessiva',       c:'yellow' },
  rigidez_emocional:         { l:'Rigidez Emocional',           c:'yellow' },
  dissociacao_leve:          { l:'Dissociação Leve',            c:'orange' },
  padrao_procrastinacao:     { l:'Padrão de Procrastinação',    c:'yellow' },
  burnout_provavel:          { l:'Possível Burnout',            c:'red' },
  neurodivergencia_provavel: { l:'Neurodivergência Provável',   c:'blue' },
  avaliacao_psiquiatrica:    { l:'Avaliação Psiquiátrica Sugerida', c:'red' },
  vulnerabilidade_relacional:{ l:'Vulnerabilidade Relacional',  c:'orange' },
  vazio_existencial:         { l:'Vazio Existencial',           c:'purple' }
};

// ── GERA MAPEAMENTO VIA ANTHROPIC ──
async function gerarMapeamento({ db, paciente, respostas, indices, flags, pacotes, riscoNivel }) {
  const prog = sugerirPrograma(paciente.perfil_tipo, indices, flags, pacotes);
  const flagLabels = flags.map(f => FLAG_LABELS[f] && FLAG_LABELS[f].l || f).join(', ') || 'Nenhuma';

  // Respostas abertas
  const ra82 = respostas.Q82 || 'Não informado';
  const ra83 = respostas.Q83 !== 'sim' ? 'Não relatado' : 'Paciente indica que sim';
  const ra84 = respostas.Q84 || 'Não informado';

  const prompt = `Você é um assistente de inteligência clínica do Synapse Core — plataforma da Evolution Therapy.
Terapeuta: Erick Torritezi — Psicanalista e Psicoterapeuta Estratégico Integrativo.
Abordagem: Psicoterapia Estratégica Integrativa (Psicanálise + Hipnose Ericksoniana + Logoterapia + Neurociência + PNL + Regulação Emocional).

DADOS DO PACIENTE:
Nome: ${paciente.nome_completo}
Perfil: ${paciente.perfil_tipo || 'adulto'}
Nível de risco sentinela: ${riscoNivel}

ÍNDICES DIMENSIONAIS (0=crítico, 100=excelente):
- Regulação Emocional: ${indices.regulacao_emocional}/100
- Padrão Cognitivo: ${indices.padrao_cognitivo}/100
- Índice Relacional: ${indices.indice_relacional}/100
- Índice Existencial: ${indices.indice_existencial}/100
- Funcionamento Corporal: ${indices.funcionamento_corporal}/100
- Sustentação Comportamental: ${indices.sustentacao_comportamental}/100
- Índice Psicossocial: ${indices.indice_psicossocial}/100
- Vulnerabilidade Clínica: ${indices.vulnerabilidade_clinica}/100
- Índice Global de Bem-Estar: ${indices.global}/100

FLAGS CLÍNICAS AUTOMÁTICAS: ${flagLabels}

RESPOSTAS ABERTAS DO PACIENTE:
- Estado emocional hoje: "${ra82}"
- Carrega algo sozinho: ${ra83}
- O que mudaria na vida: "${ra84}"

PROGRAMA EVOLUTIVO SUGERIDO: ${prog.nome} (${prog.compat}% compatibilidade)

Gere um relatório clínico completo em português brasileiro para o terapeuta.
Retorne APENAS um objeto JSON válido, sem texto antes ou depois, sem markdown, sem blocos de código.
Use linguagem clínica sofisticada mas clara. Cada seção deve ter 3-5 frases densas e específicas.
NÃO diagnostique. Use linguagem de hipóteses ("sugere", "indica", "observa-se padrão compatível com").

{
  "sintese_caso": "Síntese narrativa do caso integrando todos os dados. Contextualize o estado de chegada do paciente.",
  "padroes_predominantes": "Padrões emocionais, cognitivos e comportamentais mais evidentes nos dados.",
  "hipoteses_terapeuticas": "Hipóteses clínicas sobre os conflitos centrais, mecanismos de manutenção e estrutura do sofrimento.",
  "sinais_alerta": "Pontos que merecem atenção especial do terapeuta, incluindo as flags identificadas.",
  "recursos_paciente": "Recursos internos, forças e potenciais do paciente que podem ser mobilizados no processo.",
  "objetivos_iniciais": "Objetivos terapêuticos iniciais sugeridos com base no mapeamento. Específicos e mensuráveis.",
  "protocolo_sugerido": "Protocolo de atendimento sugerido por fases, com técnicas específicas da abordagem integrativa.",
  "programa_recomendado": {
    "nome": "${prog.nome}",
    "compatibilidade": ${prog.compat},
    "justificativa": "Justificativa clínica detalhada da compatibilidade deste programa com o perfil mapeado."
  },
  "obs_terapeuta": ""
}`;

  const resp = await fetchIA(JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    }));

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error('Anthropic API error: ' + err);
  }

  const data  = await resp.json();
  const texto = data.content && data.content[0] && data.content[0].text || '';

  // Parse JSON from response
  const clean = texto.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
  let relatorio;
  try {
    relatorio = JSON.parse(clean);
  } catch (e) {
    // Try to extract JSON from text
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) relatorio = JSON.parse(match[0]);
    else throw new Error('Não foi possível parsear o relatório da IA.');
  }

  if (db) {
    await registrarAuditoria(db, {
      paciente_id: paciente.id, modulo: 'mapeamento',
      referencia_tipo: 'paciente', referencia_id: paciente.id,
      output_resumo: 'Mapeamento gerado',
      tokens_usados: data.usage && data.usage.output_tokens,
      input_tokens:  data.usage && data.usage.input_tokens,
      sucesso: true, modelo: 'claude-sonnet-4-5', modo: 'ia'
    }).catch(function(e){ console.warn('audit mapeamento:', e.message); });
  }
  return { relatorio, programa: prog };
}

module.exports = { calcularIndices, detectarFlags, gerarMapeamento, FLAG_LABELS, sugerirPrograma, sugerirProgramaLocal, gerarResumoClinico, gerarEvolucao, sugerirCIDs, registrarAuditoria, gerarBriefingSessao, gerarIntervencoes, atualizarMemoriaTerapeutica, gerarAnaliseEstrutural, gerarHipotesesClinicas, gerarMapaIdentidade, gerarSnapshotEvolutivoLeve, calcularScoreRiscoBasico, gerarRiscoAbandonoClinico, gerarEvolucaoPreditiva, gerarProntuarioInteligente, gerarContextoInicial, gerarResumoEncaminhamento, gerarFasesTerapeuticas };

// ══════════════════════════════════════════════
// v3.0.0 — INTELIGÊNCIA CLÍNICA INTEGRATIVA
// ══════════════════════════════════════════════

const crypto = require('crypto');

// ── HELPER: Registrar auditoria de chamada IA ──
async function registrarAuditoria(db, { paciente_id, modulo, referencia_tipo, referencia_id, prompt_resumo, input_hash, output_resumo, tokens_usados, input_tokens, duracao_ms, sucesso, erro_msg, modelo, modo }) {
  try {
    // Calcular custo estimado (Sonnet 4: $3/M input, $15/M output)
    var custo = null;
    var inTok  = input_tokens  || 0;
    var outTok = tokens_usados || 0;
    if (inTok > 0 || outTok > 0) {
      custo = (inTok * 0.000003) + (outTok * 0.000015);
    }
    await db.query(
      `INSERT INTO ia_auditoria (paciente_id, modulo, referencia_tipo, referencia_id, prompt_resumo, input_hash, output_resumo, tokens_usados, input_tokens, custo_usd, duracao_ms, sucesso, erro_msg, modelo, modo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [paciente_id||null, modulo, referencia_tipo||null, referencia_id||null,
       (prompt_resumo||'').substring(0,500), input_hash||null,
       (output_resumo||'').substring(0,500), tokens_usados||null, input_tokens||null,
       custo, duracao_ms||null,
       sucesso !== false, erro_msg||null, modelo||'claude-sonnet-4-5', modo||'ia']
    );
  } catch(e) {
    console.warn('ia_auditoria insert failed:', e.message);
  }
}

// ── BRIEFING PRÉ-SESSÃO ──
async function gerarBriefingSessao({ db, paciente, sessoes, feedbacks, mapeamento, resumoAtual, riscoNivel }) {
  const inicio = Date.now();
  const ant = parseInt(paciente.sessoes_anteriores) || 0;
  const totalSessoes = ant + sessoes.length;
  const ultimaSessao = sessoes[sessoes.length - 1] || null;
  const flags = mapeamento ? (mapeamento.flags_json || []) : [];
  const proto = mapeamento ? (mapeamento.protocolo_json || {}) : {};

  const flagLabels = { risco_depressivo:'Risco Depressivo', burnout_provavel:'Burnout Provável', ansiedade_elevada:'Ansiedade Elevada', trauma_indicado:'Trauma Indicado', isolamento_social:'Isolamento Social', instabilidade_emocional:'Instabilidade Emocional', conflito_relacional:'Conflito Relacional', baixa_autoestima:'Baixa Autoestima', neurodivergencia:'Neurodivergência', crise_existencial:'Crise Existencial', ideacao_suicida:'Ideação Suicida' };

  const ultimasSessoes = sessoes.slice(-3).map(s =>
    `Sessão ${s.sessao_numero} (${new Date(s.data_sessao).toLocaleDateString('pt-BR')}): ${s.resumo_terapeuta || 'Sem resumo.'}`
  ).join('\n');

  const feedbacksRecentes = feedbacks.slice(-3).map(f =>
    `${new Date(f.data_feedback).toLocaleDateString('pt-BR')}: ${f.conteudo}`
  ).join('\n');

  const prompt = `Você é o motor de inteligência clínica integrativa do Synapse Core — Evolution Therapy.
Papel: apoiar o raciocínio clínico do terapeuta Erick Torritezi, sem diagnosticar e sem substituir julgamento profissional.

PACIENTE: ${paciente.nome_completo} | ${paciente.perfil_tipo || 'adulto'} | ${paciente.idade ? paciente.idade + ' anos' : ''}
SESSÃO ${totalSessoes + 1} será a próxima (${sessoes.length} registradas + ${ant} anteriores)
RISCO ATUAL: ${riscoNivel || 'verde'}
FLAGS CLÍNICAS: ${flags.map(f => flagLabels[f]||f).join(', ') || 'Nenhuma'}

RESUMO CLÍNICO ATUAL:
${resumoAtual || 'Não disponível'}

ÚLTIMAS SESSÕES:
${ultimasSessoes || 'Nenhuma sessão registrada ainda'}

FEEDBACKS RECENTES DO PACIENTE:
${feedbacksRecentes || 'Nenhum feedback registrado'}

OBSERVAÇÕES DO TERAPEUTA: ${proto.obs_terapeuta || 'Não informado'}

Gere um briefing clínico estratégico para preparar o terapeuta para a próxima sessão.
Use linguagem de hipótese, nunca diagnóstico. Tom: clínico, objetivo, estratégico, humano.

Retorne APENAS JSON válido:
{
  "estado_atual": "síntese do estado atual em 3-5 linhas",
  "ultima_sessao": {
    "tema": "tema predominante",
    "emocao": "emoção predominante",
    "ponto_trabalhado": "o que foi trabalhado",
    "resistencia": "resistência observada se houver",
    "tarefa": "tarefa ou combinado se houver"
  },
  "desde_ultima_sessao": "síntese dos feedbacks recentes",
  "pontos_atencao": ["ponto 1", "ponto 2"],
  "sugestoes_conducao": ["sugestão 1", "sugestão 2", "sugestão 3"],
  "risco_atual": "${riscoNivel || 'verde'}",
  "proxima_sessao_numero": ${totalSessoes + 1}
}`;

  try {
    const resp = await fetchIA(JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:2000, messages:[{role:'user',content:prompt}] }));
    const data = await resp.json();
    if (!resp.ok) {
      const apiErr = (data.error && data.error.message) || JSON.stringify(data);
      console.error('briefing/IA HTTP erro:', resp.status, apiErr);
      throw new Error('API erro ' + resp.status + ': ' + apiErr);
    }
    const text = data.content && data.content[0] && data.content[0].text || '{}';
    const clean = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    const m = clean.match(/\{[\s\S]*\}/);
    const json = m ? JSON.parse(m[0]) : {};
    if (!json || Object.keys(json).length === 0) throw new Error('IA retornou JSON vazio');
    const duracao = Date.now() - inicio;
    await registrarAuditoria(db, { paciente_id: paciente.id, modulo:'briefing', referencia_tipo:'paciente', referencia_id: paciente.id, prompt_resumo: prompt, input_hash: crypto.createHash('md5').update(prompt).digest('hex'), output_resumo: text, tokens_usados: data.usage && data.usage.output_tokens, input_tokens: data.usage && data.usage.input_tokens, duracao_ms: duracao, sucesso: true, modo:'ia' });
    return { json, texto: text, modo: 'ia' };
  } catch(e) {
    console.error('briefing/gerarBriefingSessao erro:', e.message);
    await registrarAuditoria(db, { paciente_id: paciente.id, modulo:'briefing', sucesso: false, erro_msg: e.message, modo:'fallback' });
    // Fallback local
    const fb = {
      estado_atual: `${paciente.nome_completo} está em acompanhamento com ${totalSessoes} sessões realizadas. ${flags.length ? 'Flags ativas: ' + flags.map(f=>flagLabels[f]||f).join(', ') + '.' : 'Sem flags críticas no momento.'}`,
      ultima_sessao: { tema: 'Consultar registro da última sessão', emocao: '—', ponto_trabalhado: (ultimaSessao && ultimaSessao.resumo_terapeuta) || '—', resistencia: '—', tarefa: '—' },
      desde_ultima_sessao: feedbacks.length ? feedbacks.slice(-1)[0].conteudo.substring(0,150) : 'Sem feedbacks recentes.',
      pontos_atencao: flags.slice(0,3).map(f=>flagLabels[f]||f),
      sugestoes_conducao: ['Consultar resumo clínico atualizado', 'Verificar feedbacks recentes', 'Revisar última sessão registrada'],
      risco_atual: riscoNivel || 'verde',
      proxima_sessao_numero: totalSessoes + 1
    };
    return { json: fb, texto: JSON.stringify(fb), modo: 'fallback', api_erro: e.message };
  }
}

// ── GERADOR DE INTERVENÇÕES ──
async function gerarIntervencoes({ db, paciente, mapeamento, sessoes, resumoAtual, riscoNivel }) {
  const inicio = Date.now();
  const flags = mapeamento ? (mapeamento.flags_json || []) : [];
  const indices = mapeamento ? (mapeamento.indices_json || {}) : {};
  const flagLabels = { risco_depressivo:'Risco Depressivo', burnout_provavel:'Burnout Provável', ansiedade_elevada:'Ansiedade Elevada', trauma_indicado:'Trauma Indicado', isolamento_social:'Isolamento Social', instabilidade_emocional:'Instabilidade Emocional', conflito_relacional:'Conflito Relacional', baixa_autoestima:'Baixa Autoestima', neurodivergencia:'Neurodivergência', crise_existencial:'Crise Existencial', ideacao_suicida:'Ideação Suicida' };

  // SEGURANÇA: risco alto/vermelho → alerta de manejo, sem intervenções comuns
  if (riscoNivel === 'vermelho' || riscoNivel === 'alto') {
    const alerta = [{
      titulo: '⚠️ Alerta de Manejo Clínico',
      descricao: 'Este paciente apresenta indicadores de risco elevado. Intervenções terapêuticas convencionais não são recomendadas neste momento.',
      fundamentacao: 'A presença de risco alto exige cautela clínica, avaliação de segurança e possivelmente encaminhamento ou supervisão especializada antes de qualquer intervenção técnica.',
      tipo: 'alerta_seguranca', categoria_clinica: 'segurança', status: 'alerta',
      publico_alvo: paciente.perfil_tipo || 'adulto'
    }];
    await registrarAuditoria(db, { paciente_id: paciente.id, modulo:'intervencoes', sucesso: true, modo:'seguranca', output_resumo:'Bloqueado por risco alto' });
    return { intervencoes: alerta, modo: 'alerta_seguranca' };
  }

  const prompt = `Você é o motor de inteligência clínica integrativa do Synapse Core — Evolution Therapy.
Papel: apoiar o raciocínio clínico do terapeuta Erick Torritezi, sem diagnosticar e sem substituir julgamento profissional.

PACIENTE: ${paciente.nome_completo} | ${paciente.perfil_tipo || 'adulto'}
RISCO: ${riscoNivel || 'verde'}
FLAGS: ${flags.map(f=>flagLabels[f]||f).join(', ') || 'Nenhuma'}
ÍNDICE EMOCIONAL: ${indices.D1||'N/D'} | COGNITIVO: ${indices.D2||'N/D'} | RELACIONAL: ${indices.D3||'N/D'}

RESUMO CLÍNICO ATUAL:
${resumoAtual || 'Não disponível'}

Gere 4 a 6 intervenções clínicas adequadas ao perfil deste paciente.
Tipos disponíveis: hipnotica_ericksoniana, reestruturacao_cognitiva, regulacao_emocional, relacional, tarefa_entre_sessoes, pergunta_estrategica, corporal_somatica, metafora_terapeutica.
Use linguagem de hipótese. Considere as abordagens de Erick: Psicanálise, PNL Terapêutica, Hipnose Ericksoniana, Logoterapia.

Retorne APENAS JSON válido:
{
  "intervencoes": [
    {
      "tipo": "tipo_da_intervencao",
      "categoria_clinica": "categoria ampla (ex: regulação emocional)",
      "titulo": "nome curto da intervenção",
      "descricao": "como aplicar — 2 a 4 frases",
      "fundamentacao": "por que essa intervenção para este paciente específico"
    }
  ]
}`;

  try {
    const resp = await fetchIA(JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:3000, messages:[{role:'user',content:prompt}] }));
    const data = await resp.json();
    const text = data.content && data.content[0] && data.content[0].text || '{}';
    const clean = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    const m = clean.match(/\{[\s\S]*\}/);
    const json = m ? JSON.parse(m[0]) : { intervencoes: [] };
    const duracao = Date.now() - inicio;
    await registrarAuditoria(db, { paciente_id: paciente.id, modulo:'intervencoes', referencia_tipo:'mapeamento', referencia_id: mapeamento && mapeamento.id, prompt_resumo: prompt, input_hash: crypto.createHash('md5').update(prompt).digest('hex'), output_resumo: text, tokens_usados: data.usage && data.usage.output_tokens, input_tokens: data.usage && data.usage.input_tokens, duracao_ms: duracao, sucesso: true, modo:'ia' });
    return { intervencoes: (json.intervencoes||[]).map(i=>({...i, publico_alvo: paciente.perfil_tipo||'adulto'})), modo: 'ia' };
  } catch(e) {
    await registrarAuditoria(db, { paciente_id: paciente.id, modulo:'intervencoes', sucesso:false, erro_msg:e.message, modo:'fallback' });
    throw new Error('API indisponível: ' + e.message);
  }
}

// ── MEMÓRIA TERAPÊUTICA ──
async function atualizarMemoriaTerapeutica({ db, paciente, sessoes, feedbacks, intervencoes, resumoAtual, memoriaAnterior }) {
  const inicio = Date.now();
  const ultimasSessoes = sessoes.slice(-5).map(s => `S${s.sessao_numero}: ${s.resumo_terapeuta||'sem resumo'}`).join('\n');
  const feedbacksTexto = feedbacks.slice(-5).map(f => `${new Date(f.data_feedback).toLocaleDateString('pt-BR')}: ${f.conteudo}`).join('\n');
  const intervTexto = intervencoes.filter(i=>i.avaliacao).slice(-5).map(i=>`${i.titulo} → ${i.avaliacao||''} ${i.observacao?'('+i.observacao+')':''}`).join('\n');

  const prompt = `Você é o motor de inteligência clínica integrativa do Synapse Core — Evolution Therapy.
Papel: consolidar memória terapêutica de processo, identificando padrões, temas e movimentos clínicos ao longo do tempo.

PACIENTE: ${paciente.nome_completo} | ${paciente.perfil_tipo || 'adulto'}

${memoriaAnterior ? 'MEMÓRIA ANTERIOR:\n' + memoriaAnterior + '\n\n' : ''}
RESUMO CLÍNICO ATUAL:
${resumoAtual || 'Não disponível'}

ÚLTIMAS SESSÕES:
${ultimasSessoes || 'Sem sessões'}

FEEDBACKS DO PACIENTE:
${feedbacksTexto || 'Sem feedbacks'}

INTERVENÇÕES COM AVALIAÇÃO:
${intervTexto || 'Sem avaliações'}

Consolide a memória terapêutica identificando padrões estruturais do processo.
Use linguagem de hipótese. Não diagnostique. Preserve o que estava na memória anterior e adicione o que é novo.

Retorne APENAS JSON válido:
{
  "temas_recorrentes": ["tema 1", "tema 2"],
  "padroes_identificados": ["padrão 1", "padrão 2"],
  "pontos_de_atencao": ["ponto 1"],
  "recursos_identificados": ["recurso 1", "recurso 2"],
  "movimento_terapeutico": "descrição do arco de movimento atual",
  "proximos_focos": ["foco 1", "foco 2"],
  "resumo_processo": "síntese do processo terapêutico em 3-5 linhas"
}`;

  try {
    const resp = await fetchIA(JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:2500, messages:[{role:'user',content:prompt}] }));
    const data = await resp.json();
    const text = data.content && data.content[0] && data.content[0].text || '{}';
    const clean = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    const m = clean.match(/\{[\s\S]*\}/);
    const json = m ? JSON.parse(m[0]) : {};
    const duracao = Date.now() - inicio;
    await registrarAuditoria(db, { paciente_id: paciente.id, modulo:'memoria', referencia_tipo:'paciente', referencia_id: paciente.id, prompt_resumo: prompt, input_hash: crypto.createHash('md5').update(prompt).digest('hex'), output_resumo: text, tokens_usados: data.usage && data.usage.output_tokens, input_tokens: data.usage && data.usage.input_tokens, duracao_ms: duracao, sucesso: true, modo:'ia' });
    return { json, texto: text, modo: 'ia' };
  } catch(e) {
    await registrarAuditoria(db, { paciente_id: paciente.id, modulo:'memoria', sucesso:false, erro_msg:e.message, modo:'fallback' });
    throw new Error('API indisponível: ' + e.message);
  }
}

// ── SUGERE CIDs (ICD-10) ──
async function sugerirCIDs({ db, paciente, respostas, indices, flags }) {
  const flagLabels = flags.map(f => FLAG_LABELS[f] && FLAG_LABELS[f].l || f).join(', ') || 'Nenhuma';
  const ra82 = respostas.Q82 || '';
  const ra84 = respostas.Q84 || '';
  const sent = {
    S1: respostas.S1, S2: respostas.S2, S3: respostas.S3, S4: respostas.S4,
    S5: respostas.S5, S6: respostas.S6, S7: respostas.S7, S8: respostas.S8
  };

  const prompt = `Você é um assistente clínico do Synapse Core — Evolution Therapy.
Terapeuta: Erick Torritezi — Psicanalista e Psicoterapeuta Estratégico Integrativo.

PACIENTE: ${paciente.nome_completo} | Perfil: ${paciente.perfil_tipo || 'adulto'}

ÍNDICES DIMENSIONAIS (0-100):
- Regulação Emocional: ${indices.regulacao_emocional}
- Padrão Cognitivo: ${indices.padrao_cognitivo}
- Índice Relacional: ${indices.indice_relacional}
- Índice Existencial: ${indices.indice_existencial}
- Funcionamento Corporal: ${indices.funcionamento_corporal}
- Sustentação Comportamental: ${indices.sustentacao_comportamental}
- Índice Psicossocial: ${indices.indice_psicossocial}
- Vulnerabilidade Clínica: ${indices.vulnerabilidade_clinica}

FLAGS CLÍNICAS: ${flagLabels}
SENTINELAS: ${JSON.stringify(sent)}
ESTADO EMOCIONAL RELATADO: "${ra82}"
DESEJO DE MUDANÇA: "${ra84}"

Com base nesses dados, sugira os CIDs F-code (ICD-10) mais relevantes para este paciente.
Use apenas códigos F (saúde mental e comportamento). Sugira entre 1 e 5 CIDs.
Seja conservador — prefira CIDs mais amplos a diagnósticos específicos sem evidência clara.
IMPORTANTE: Estas são SUGESTÕES para revisão do terapeuta, não diagnósticos.

Retorne APENAS JSON válido, sem texto antes ou depois:
[
  {
    "cid_codigo": "F41.1",
    "cid_nome": "Transtorno de Ansiedade Generalizada",
    "relato_paciente": "O paciente relata frequentes preocupações excessivas, dificuldade de controlar pensamentos ansiosos e sintomas físicos associados à ansiedade.",
    "significado_medico": "Ansiedade generalizada e persistente não restrita a nenhuma circunstância ambiental específica, com sintomas como nervosismo, tremores, tensão muscular, transpiração, sensação de vazio na cabeça, palpitações e tontura."
  }
]`;

  const resp = await fetchIA(JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    }));

  if (!resp.ok) throw new Error('Anthropic API error: ' + resp.status);
  const data  = await resp.json();
  const texto = data.content && data.content[0] && data.content[0].text || '[]';
  const clean = texto.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
  let cidsArr;
  try {
    const arr = JSON.parse(clean);
    cidsArr = Array.isArray(arr) ? arr : [];
  } catch (e) {
    const match = clean.match(/\[[\s\S]*\]/);
    cidsArr = match ? JSON.parse(match[0]) : [];
  }
  if (db) {
    await registrarAuditoria(db, {
      paciente_id: paciente.id, modulo: 'cids',
      referencia_tipo: 'paciente', referencia_id: paciente.id,
      output_resumo: 'Sugestao CIDs gerada (' + cidsArr.length + ' itens)',
      tokens_usados: data.usage && data.usage.output_tokens,
      input_tokens:  data.usage && data.usage.input_tokens,
      sucesso: true, modelo: 'claude-sonnet-4-5', modo: 'ia'
    }).catch(function(e){ console.warn('audit cids:', e.message); });
  }
  return cidsArr;
}

// ── GERA RELATÓRIO DE EVOLUÇÃO ──
async function gerarEvolucao({ db, paciente, mapeamento, sessoes, resumoClinico, pacote }) {
  const indicesIniciais = (mapeamento && mapeamento.dimensoes_json) || (mapeamento && mapeamento.indices_json && mapeamento.indices_json.dimensoes) || {};
  const proto = mapeamento && mapeamento.protocolo_json || {};

  const objetivosText  = proto.objetivos_iniciais || proto.objetivos || 'Não definidos';
  const protocoloText  = proto.protocolo_sugerido  || 'Não definido';
  const obsText        = proto.obs_terapeuta        || '';
  const flagsText      = ((mapeamento && mapeamento.flags_json) || []).join(', ') || 'Nenhuma';

  const sessoesStr = sessoes.map(s =>
    'Sessão ' + s.sessao_numero + ' (' + new Date(s.data_sessao).toLocaleDateString('pt-BR') + '): ' + (s.resumo_terapeuta || 'Sem resumo.')
  ).join('\n');

  const totalSessoes = sessoes.length;
  const totalPrograma = (pacote && pacote.qtd_sessoes) || null;

  const prompt = `Você é um assistente de inteligência clínica do Synapse Core — Evolution Therapy.
Terapeuta: Erick Torritezi — Psicanalista e Psicoterapeuta Estratégico Integrativo.

PACIENTE: ${paciente.nome_completo} | Perfil: ${paciente.perfil_tipo || 'adulto'}
PROGRAMA: ${pacote ? pacote.nome + (totalPrograma ? ' — ' + totalPrograma + ' sessões' : '') : 'Não definido'}
SESSÕES REALIZADAS: ${totalSessoes}${totalPrograma ? ' de ' + totalPrograma : ''}

ÍNDICES INICIAIS DO MAPEAMENTO (D1-D7, escala 0-100):
${JSON.stringify(indicesIniciais)}

FLAGS CLÍNICAS INICIAIS: ${flagsText}

OBJETIVOS TERAPÊUTICOS DEFINIDOS:
${objetivosText}

PROTOCOLO SUGERIDO:
${protocoloText}

${obsText ? 'OBSERVAÇÕES DO TERAPEUTA:\n' + obsText : ''}

HISTÓRICO DE SESSÕES:
${sessoesStr}

${resumoClinico ? 'RESUMO CLÍNICO ATUAL:\n' + resumoClinico : ''}

Analise a evolução e retorne APENAS um JSON válido, sem texto antes ou depois:
{
  "indices_atuais": {"D1": 0, "D2": 0, "D3": 0, "D4": 0, "D5": 0, "D6": 0, "D7": 0},
  "narrativa_paciente": "Texto motivador e acessível (NÃO clínico) para o paciente. 3-4 parágrafos. Use segunda pessoa (você). Celebre conquistas concretas. Linguagem positiva e encorajadora.",
  "conquistas": ["conquista 1", "conquista 2", "conquista 3"],
  "objetivos": [{"objetivo": "...", "status": "em_andamento|parcialmente_alcancado|alcancado|revisado", "evidencia": "breve observação"}],
  "proximos_focos": "O que será trabalhado nas próximas sessões — linguagem acessível para o paciente.",
  "mensagem_terapeuta": "Mensagem curta e calorosa do terapeuta para o paciente (1-2 frases)."
}
Regras: indices_atuais devem refletir a evolução observada nas sessões (podem subir ou descer). Seja realista — não infle os números sem evidência nas sessões.`;

  const resp = await fetchIA(JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    }));

  if (!resp.ok) throw new Error('Anthropic API error: ' + resp.status);
  const data  = await resp.json();
  const texto = data.content && data.content[0] && data.content[0].text || '';
  const clean = texto.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
  let conteudoEv;
  try {
    conteudoEv = JSON.parse(clean);
  } catch (e) {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) conteudoEv = JSON.parse(match[0]);
    else throw new Error('Não foi possível parsear a evolução da IA.');
  }
  if (db) {
    await registrarAuditoria(db, {
      paciente_id: paciente.id, modulo: 'evolucao',
      referencia_tipo: 'paciente', referencia_id: paciente.id,
      output_resumo: 'Relatório de evolução gerado',
      tokens_usados: data.usage && data.usage.output_tokens,
      input_tokens:  data.usage && data.usage.input_tokens,
      sucesso: true, modelo: 'claude-sonnet-4-5', modo: 'ia'
    }).catch(function(e){ console.warn('audit evolucao:', e.message); });
  }
  return conteudoEv;
}

// ── GERA RESUMO CLÍNICO PÓS-SESSÃO ──
async function gerarResumoClinico({ db, paciente, sessoes, mapeamento, pacote, isPrimeiro, novasSessoes, novosObsBlock, novosFeedbacks, resumoAtual }) {
  const indicesStr = mapeamento ? JSON.stringify(mapeamento.indices_json || {}, null, 0) : 'Não disponível';
  const flagsStr   = mapeamento ? (mapeamento.flags_json || []).join(', ') || 'Nenhuma' : 'Não disponível';

  // ── PRIMEIRO RESUMO: linha de base apenas com dados do formulário ──
  if (isPrimeiro) {
    const prompt = `Você é um assistente de inteligência clínica do Synapse Core — Evolution Therapy.
Terapeuta: Erick Torritezi — Psicanalista e Psicoterapeuta Estratégico Integrativo.

PACIENTE: ${paciente.nome_completo} | Perfil: ${paciente.perfil_tipo || 'adulto'}
PROGRAMA: ${pacote ? pacote.nome + ' (' + (pacote.qtd_sessoes || '?') + ' sessões)' : 'Não definido'}

ÍNDICES DO MAPEAMENTO INICIAL:
${indicesStr}
FLAGS CLÍNICAS: ${flagsStr}

Este é o PRIMEIRO resumo analítico — baseado exclusivamente nos dados do formulário de avaliação inicial. Gere um resumo clínico de linha de base (3-4 parágrafos) descrevendo o perfil clínico inicial, principais áreas de atenção, pontos de força e direção inicial para o trabalho terapêutico. Use linguagem técnica e clínica.`;

    const resp = await fetchIA(JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2500, messages: [{ role: 'user', content: prompt }] }));
    if (!resp.ok) throw new Error('Anthropic error: ' + resp.status);
    const d = await resp.json();
    if (db) {
      await registrarAuditoria(db, {
        paciente_id: paciente.id, modulo: 'resumo_clinico',
        referencia_tipo: 'paciente', referencia_id: paciente.id,
        output_resumo: 'Resumo clínico atualizado',
        tokens_usados: d.usage && d.usage.output_tokens,
        input_tokens:  d.usage && d.usage.input_tokens,
        sucesso: true, modelo: 'claude-sonnet-4-5', modo: 'ia'
      }).catch(function(e){ console.warn('audit resumo:', e.message); });
    }
    return (d.content && d.content[0] && d.content[0].text) || 'Resumo inicial não gerado.';
  }

  // ── REGERAÇÃO INCREMENTAL: só passa o que é novo ──
  if (resumoAtual && (novasSessoes || novosObsBlock || novosFeedbacks)) {
    const novidades = [];
    if (novosObsBlock) novidades.push('NOVA OBSERVAÇÃO DO TERAPEUTA:\n' + novosObsBlock);
    if (novasSessoes && novasSessoes.length) {
      novidades.push('NOVA(S) SESSÃO(ÕES) REGISTRADA(S):\n' +
        novasSessoes.map(s => 'Sessão ' + s.sessao_numero + ' (' + new Date(s.data_sessao).toLocaleDateString('pt-BR') + '): ' + (s.resumo_terapeuta || 'Sem resumo registrado.')).join('\n'));
    }
    if (novosFeedbacks && novosFeedbacks.length) {
      novidades.push('NOVO(S) FEEDBACK(S) DO PACIENTE:\n' +
        novosFeedbacks.map(f => new Date(f.data_feedback).toLocaleDateString('pt-BR') + ': ' + f.conteudo).join('\n\n'));
    }

    const prompt = `Você é um assistente de inteligência clínica do Synapse Core — Evolution Therapy.
Terapeuta: Erick Torritezi — Psicanalista e Psicoterapeuta Estratégico Integrativo.

PACIENTE: ${paciente.nome_completo} | Perfil: ${paciente.perfil_tipo || 'adulto'}

RESUMO CLÍNICO ATUAL:
${resumoAtual}

NOVIDADES DESDE A ÚLTIMA VERSÃO:
${novidades.join('\n\n')}

Atualize o resumo clínico incorporando essas novidades. Mantenha o que já estava correto e preciso. Acrescente e refine com base nas novas informações. Use linguagem técnica e clínica. Retorne apenas o resumo atualizado completo, sem comentários adicionais.`;

    const resp = await fetchIA(JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2500, messages: [{ role: 'user', content: prompt }] }));
    if (!resp.ok) throw new Error('Anthropic error: ' + resp.status);
    const d = await resp.json();
    if (db) {
      await registrarAuditoria(db, {
        paciente_id: paciente.id, modulo: 'resumo_clinico',
        referencia_tipo: 'paciente', referencia_id: paciente.id,
        output_resumo: 'Resumo clínico atualizado',
        tokens_usados: d.usage && d.usage.output_tokens,
        input_tokens:  d.usage && d.usage.input_tokens,
        sucesso: true, modelo: 'claude-sonnet-4-5', modo: 'ia'
      }).catch(function(e){ console.warn('audit resumo:', e.message); });
    }
    return (d.content && d.content[0] && d.content[0].text) || resumoAtual;
  }

  // ── REGERAÇÃO COMPLETA (fallback): usa tudo ──
  const proto = mapeamento && mapeamento.protocolo_json || {};
  const obsBlock = [
    proto.obs_terapeuta      ? 'Observações: ' + proto.obs_terapeuta : '',
    proto.objetivos_iniciais ? 'Objetivos: ' + proto.objetivos_iniciais : '',
    proto.protocolo_sugerido ? 'Protocolo: ' + proto.protocolo_sugerido : '',
    proto.sintese_caso        ? 'Síntese: ' + proto.sintese_caso : ''
  ].filter(Boolean).join('\n\n');

  const sessoesStr = sessoes.map(s =>
    'Sessão ' + s.sessao_numero + ' (' + new Date(s.data_sessao).toLocaleDateString('pt-BR') + '): ' + (s.resumo_terapeuta || 'Sem resumo.')
  ).join('\n');

  const prompt = `Você é um assistente de inteligência clínica do Synapse Core — Evolution Therapy.
Terapeuta: Erick Torritezi — Psicanalista e Psicoterapeuta Estratégico Integrativo.

PACIENTE: ${paciente.nome_completo} | Perfil: ${paciente.perfil_tipo || 'adulto'}
PROGRAMA: ${pacote ? pacote.nome + ' (' + (pacote.qtd_sessoes || '?') + ' sessões)' : 'Não definido'}
SESSÃO ATUAL: ${sessoes.length} sessão(ões) realizada(s)

ÍNDICES DO MAPEAMENTO INICIAL: ${indicesStr}
FLAGS CLÍNICAS: ${flagsStr}

${obsBlock ? 'OBSERVAÇÕES E DIRECIONAMENTOS DO TERAPEUTA:\n' + obsBlock : ''}

HISTÓRICO DE SESSÕES:
${sessoesStr}

Gere um Resumo Clínico Evolutivo completo em português brasileiro.
Integre o mapeamento inicial, as observações do terapeuta e a evolução observada nas sessões.
Quando o terapeuta tiver registrado objetivos ou direcionamentos específicos, referencie-os na narrativa.
Use linguagem clínica refinada. NÃO diagnostique — sugira hipóteses e padrões.
Escreva em prosa contínua, 4-6 parágrafos, cobrindo:
1. Contexto de chegada e estado inicial
2. Padrões trabalhados e evolução observada por sessão
3. O que evoluiu e o que persiste como ponto de atenção
4. Recursos terapêuticos ativados
5. Posicionamento atual no processo e próximos focos
Retorne APENAS o texto do resumo, sem JSON, sem títulos, sem marcadores.`;

  const resp = await fetchIA(JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    }));

  if (!resp.ok) throw new Error('Anthropic API error: ' + resp.status);
  const data = await resp.json();
  return data.content && data.content[0] && data.content[0].text || 'Resumo não gerado.';
}

// ══════════════════════════════════════════════
// v3.1.0 — ANÁLISE ESTRUTURAL CLÍNICA
// ══════════════════════════════════════════════

// ── MAPA ESTRUTURAL ──
async function gerarAnaliseEstrutural({ db, paciente, mapeamento, sessoes, feedbacks, resumoAtual, memoriaAtual }) {
  const inicio = Date.now();
  const flags  = mapeamento ? (mapeamento.flags_json || []) : [];
  const ind    = mapeamento ? (mapeamento.indices_json || {}) : {};
  const proto  = mapeamento ? (mapeamento.protocolo_json || {}) : {};
  const FLAG_L = { risco_depressivo:'Risco Depressivo', burnout_provavel:'Burnout Provável', ansiedade_elevada:'Ansiedade Elevada', trauma_indicado:'Trauma Indicado', isolamento_social:'Isolamento Social', instabilidade_emocional:'Instabilidade Emocional', conflito_relacional:'Conflito Relacional', baixa_autoestima:'Baixa Autoestima', neurodivergencia:'Neurodivergência', crise_existencial:'Crise Existencial', ideacao_suicida:'Ideação Suicida' };
  const sessStr = sessoes.slice(-5).map(function(s){ return 'S'+s.sessao_numero+': '+(s.resumo_terapeuta||'sem resumo'); }).join('\n');
  const feedStr = feedbacks.slice(-4).map(function(f){ return new Date(f.data_feedback).toLocaleDateString('pt-BR')+': '+f.conteudo; }).join('\n');
  // Sanitize memoriaAtual — remove control chars that could cause Anthropic 400
  var memoriaStr = '';
  if (memoriaAtual) {
    try {
      var mObj = typeof memoriaAtual === 'string' ? JSON.parse(memoriaAtual) : memoriaAtual;
      var parts = [];
      if (mObj.temas_recorrentes && mObj.temas_recorrentes.length) parts.push('Temas: '+mObj.temas_recorrentes.join(', '));
      if (mObj.padroes_identificados && mObj.padroes_identificados.length) parts.push('Padrões: '+mObj.padroes_identificados.join(', '));
      if (mObj.movimento_terapeutico) parts.push('Movimento: '+mObj.movimento_terapeutico);
      memoriaStr = parts.join('\n');
    } catch(e) { memoriaStr = ''; }
  }

  const prompt = `Você é o motor de análise clínica estrutural do Synapse Core — Evolution Therapy.
Terapeuta: Erick Torritezi — Psicanalista, Psicoterapeuta Integrativo, Master Hipnoterapeuta, especialista em PNL Terapêutica e Logoterapia.

PACIENTE: ${paciente.nome_completo} | ${paciente.perfil_tipo||'adulto'}
FLAGS CLÍNICAS: ${flags.map(f=>FLAG_L[f]||f).join(', ')||'Nenhuma'}
ÍNDICES: Emocional=${ind.D1||'N/D'} Cognitivo=${ind.D2||'N/D'} Relacional=${ind.D3||'N/D'} Existencial=${ind.D4||'N/D'} Corporal=${ind.D5||'N/D'}

RESUMO CLÍNICO ATUAL:
${resumoAtual||'Não disponível'}

ÚLTIMAS SESSÕES:
${sessStr||'Sem sessões registradas'}

FEEDBACKS RECENTES:
${feedStr||'Sem feedbacks'}

${memoriaStr ? 'MEMÓRIA TERAPÊUTICA:\n'+memoriaStr+'\n' : ''}

ABORDAGEM INTEGRATIVA:
- Psicanálise → estrutura, defesa, dinâmica inconsciente, funcionamento emocional
- Logoterapia → eixo existencial, vazio, direção, sentido, responsabilidade
- PNL → padrões cognitivos/comportamentais, metaprogramas, filtros perceptivos
- Hipnose Ericksoniana → resistência indireta, padrões de resposta emocional, flexibilidade
- Neurociência emocional → regulação, hiperativação, exaustão, funcionamento adaptativo

Gere o Mapa Estrutural deste paciente respondendo: "Como este paciente funciona emocionalmente, relacionalmente e defensivamente?"

USE LINGUAGEM DE HIPÓTESE E FUNCIONAMENTO. Nunca linguagem diagnóstica ou de verdade absoluta.
Seja clínico, sofisticado e operacionalmente útil durante uma sessão.

Retorne APENAS JSON válido:
{
  "resumo_executivo": "síntese clínica em 2-3 frases — rápida leitura antes da sessão",
  "nucleo_emocional": "emoção ou estado predominante que organiza o funcionamento",
  "conflito_central": "tensão nuclear que move o sofrimento ou resistência",
  "mecanismos_defesa": ["defesa 1 com breve descrição funcional", "defesa 2"],
  "padrao_sabotagem": "como o paciente tende a sabotar avanços ou mudanças",
  "estilo_relacional": "padrão de vinculação e funcionamento relacional",
  "eixo_existencial": "questão de sentido, vazio ou direção predominante",
  "recursos_internos": ["recurso 1", "recurso 2", "recurso 3"],
  "risco_manutencao": "o que pode manter o padrão atual e dificultar a transformação",
  "direcao_terapeutica": "direção clínica sugerida com base na leitura estrutural"
}`;

  try {
    const resp = await fetchIA(JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:3000, messages:[{role:'user',content:prompt}] }));
    if (!resp.ok) { const errTxt = await resp.text().catch(function(){return '';}); throw new Error('Anthropic 400: '+errTxt.substring(0,400)); }
    const data = await resp.json();
    const text = data.content && data.content[0] && data.content[0].text||'{}';
    const clean = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    const m = clean.match(/\{[\s\S]*\}/);
    const json = m ? JSON.parse(m[0]) : {};
    const duracao = Date.now()-inicio;
    await registrarAuditoria(db,{paciente_id:paciente.id,modulo:'analise_estrutural',referencia_tipo:'mapeamento',referencia_id:mapeamento && mapeamento.id,prompt_resumo:prompt,input_hash:crypto.createHash('md5').update(prompt).digest('hex'),output_resumo:text,tokens_usados:data.usage && data.usage.output_tokens,input_tokens:data.usage && data.usage.input_tokens,duracao_ms:duracao,sucesso:true,modelo:'claude-sonnet-4-5',modo:'ia'});
    return { json, resumo_executivo: json.resumo_executivo||'', modo:'ia', modelo:'claude-sonnet-4-5' };
  } catch(e) {
    await registrarAuditoria(db,{paciente_id:paciente.id,modulo:'analise_estrutural',sucesso:false,erro_msg:e.message,modo:'fallback'});
    throw e;
  }
}

// ── HIPÓTESES CLÍNICAS ──
async function gerarHipotesesClinicas({ db, paciente, mapeamento, sessoes, resumoAtual, analiseEstrutural }) {
  const inicio = Date.now();
  const flags  = mapeamento ? (mapeamento.flags_json||[]) : [];
  const ind    = mapeamento ? (mapeamento.indices_json||{}) : {};
  const FLAG_L = { risco_depressivo:'Risco Depressivo', burnout_provavel:'Burnout Provável', ansiedade_elevada:'Ansiedade Elevada', trauma_indicado:'Trauma Indicado', isolamento_social:'Isolamento Social', instabilidade_emocional:'Instabilidade Emocional', conflito_relacional:'Conflito Relacional', baixa_autoestima:'Baixa Autoestima', neurodivergencia:'Neurodivergência', crise_existencial:'Crise Existencial', ideacao_suicida:'Ideação Suicida' };

  const prompt = `Você é o motor de hipóteses clínicas do Synapse Core — Evolution Therapy.
Terapeuta: Erick Torritezi — Psicanalista, Psicoterapeuta Integrativo, Master Hipnoterapeuta.

PACIENTE: ${paciente.nome_completo} | ${paciente.perfil_tipo||'adulto'}
FLAGS: ${flags.map(f=>FLAG_L[f]||f).join(', ')||'Nenhuma'}
ÍNDICES: D1=${ind.D1||'N/D'} D2=${ind.D2||'N/D'} D3=${ind.D3||'N/D'} D4=${ind.D4||'N/D'} D5=${ind.D5||'N/D'}

RESUMO CLÍNICO:
${resumoAtual||'Não disponível'}

${analiseEstrutural ? 'MAPA ESTRUTURAL:\nNúcleo: '+(analiseEstrutural.nucleo_emocional||'')+'\nConflito: '+(analiseEstrutural.conflito_central||'')+'\nEstilo: '+(analiseEstrutural.estilo_relacional||'')+'\n' : ''}

ÚLTIMAS SESSÕES:
${sessoes.slice(-3).map(s=>`S${s.sessao_numero}: ${s.resumo_terapeuta||'sem resumo'}`).join('\n')||'Sem sessões'}

Gere de 4 a 7 hipóteses clínicas sobre o funcionamento deste paciente.
Tipos disponíveis: emocional, cognitiva, relacional, existencial, comportamental, defesa, identidade, risco.

REGRAS:
- Use linguagem de hipótese (provável, sugere, pode indicar, parece operar)
- Nunca diagnóstico
- Cada hipótese deve ter nível de confiança (0-10) baseado nas evidências disponíveis
- Inclua evidências favoráveis, contrárias e perguntas para validação em sessão
- As perguntas devem ser usáveis diretamente pelo terapeuta durante a sessão

Retorne APENAS JSON válido:
{
  "hipoteses": [
    {
      "tipo": "tipo da hipótese",
      "nivel_confianca": 7.5,
      "hipotese": "enunciado da hipótese em linguagem clínica de funcionamento",
      "evidencias_favoraveis": ["evidência 1", "evidência 2"],
      "evidencias_contrarias": ["possível contra-evidência"],
      "perguntas_validacao": ["pergunta direta para a sessão 1", "pergunta 2"]
    }
  ]
}`;

  try {
    const resp = await fetchIA(JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:2500, messages:[{role:'user',content:prompt}] }));
    if (!resp.ok) { const errTxt = await resp.text().catch(function(){return '';}); throw new Error('Anthropic 400: '+errTxt.substring(0,400)); }
    const data = await resp.json();
    const text = data.content && data.content[0] && data.content[0].text||'{}';
    const clean = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    const m = clean.match(/\{[\s\S]*\}/);
    const json = m ? JSON.parse(m[0]) : { hipoteses:[] };
    const duracao = Date.now()-inicio;
    await registrarAuditoria(db,{paciente_id:paciente.id,modulo:'hipoteses_clinicas',referencia_tipo:'mapeamento',referencia_id:mapeamento && mapeamento.id,prompt_resumo:prompt,input_hash:crypto.createHash('md5').update(prompt).digest('hex'),output_resumo:text,tokens_usados:data.usage && data.usage.output_tokens,input_tokens:data.usage && data.usage.input_tokens,duracao_ms:duracao,sucesso:true,modelo:'claude-sonnet-4-5',modo:'ia'});
    return { hipoteses: json.hipoteses||[], modo:'ia' };
  } catch(e) {
    await registrarAuditoria(db,{paciente_id:paciente.id,modulo:'hipoteses_clinicas',sucesso:false,erro_msg:e.message,modo:'fallback'});
    throw e;
  }
}

// ── MAPA DE IDENTIDADE ──
async function gerarMapaIdentidade({ db, paciente, mapeamento, resumoAtual, analiseEstrutural }) {
  const inicio = Date.now();
  const proto  = mapeamento ? (mapeamento.protocolo_json||{}) : {};

  const prompt = `Você é o motor de análise de identidade do Synapse Core — Evolution Therapy.
Terapeuta: Erick Torritezi — especialista em Protocolo ESSÊNCIA, metodologia 4F e reorganização identitária.

PACIENTE: ${paciente.nome_completo} | ${paciente.perfil_tipo||'adulto'}

RESUMO CLÍNICO:
${resumoAtual||'Não disponível'}

${analiseEstrutural ? 'MAPA ESTRUTURAL:\nNúcleo emocional: '+(analiseEstrutural.nucleo_emocional||'')
  +'\nConflito central: '+(analiseEstrutural.conflito_central||'')
  +'\nEstilo relacional: '+(analiseEstrutural.estilo_relacional||'')
  +'\nEixo existencial: '+(analiseEstrutural.eixo_existencial||'')+'\n' : ''}

METODOLOGIA:
O Protocolo ESSÊNCIA e a metodologia 4F trabalham com destravamento emocional, consolidação identitária e sustentação de mudança.
Este mapa deve responder: "Quem é este paciente hoje, quem ele aprendeu a ser para sobreviver, quem ele quer ser e quem ele precisa desenvolver?"

LINGUAGEM: Profundidade clínica com clareza prática. Sem linguagem motivacional ou autoajuda.

Retorne APENAS JSON válido:
{
  "identidade_atual": "como o paciente está funcionando e se apresentando hoje",
  "identidade_defensiva": "quem ele aprendeu a ser para sobreviver emocionalmente — o personagem de proteção",
  "identidade_desejada": "quem ele gostaria de ser conscientemente — o ideal declarado",
  "identidade_necessaria": "quem ele precisa desenvolver para sustentar a transformação real",
  "ruptura_necessaria": "o padrão, personagem ou funcionamento que precisa ser reconhecido e abandonado",
  "movimento_consolidacao": "atitudes, práticas e posicionamentos que sustentam a nova identidade",
  "frase_identitaria": "uma frase clínica que capture a essência do movimento identitário deste paciente — usável em sessão",
  "praticas_sustentacao": ["prática concreta 1", "prática concreta 2", "prática concreta 3"]
}`;

  try {
    const resp = await fetchIA(JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:3000, messages:[{role:'user',content:prompt}] }));
    if (!resp.ok) { const errTxt = await resp.text().catch(function(){return '';}); throw new Error('Anthropic 400: '+errTxt.substring(0,400)); }
    const data = await resp.json();
    const text = data.content && data.content[0] && data.content[0].text||'{}';
    const clean = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    const m = clean.match(/\{[\s\S]*\}/);
    const json = m ? JSON.parse(m[0]) : {};
    const duracao = Date.now()-inicio;
    await registrarAuditoria(db,{paciente_id:paciente.id,modulo:'mapa_identidade',referencia_tipo:'mapeamento',referencia_id:mapeamento && mapeamento.id,prompt_resumo:prompt,input_hash:crypto.createHash('md5').update(prompt).digest('hex'),output_resumo:text,tokens_usados:data.usage && data.usage.output_tokens,input_tokens:data.usage && data.usage.input_tokens,duracao_ms:duracao,sucesso:true,modelo:'claude-sonnet-4-5',modo:'ia'});
    return { json, frase_identitaria: json.frase_identitaria||'', praticas_sustentacao: json.praticas_sustentacao||[], modo:'ia', modelo:'claude-sonnet-4-5' };
  } catch(e) {
    await registrarAuditoria(db,{paciente_id:paciente.id,modulo:'mapa_identidade',sucesso:false,erro_msg:e.message,modo:'fallback'});
    throw e;
  }
}

// ══════════════════════════════════════════════
// v3.2.0 — EVOLUÇÃO LONGITUDINAL E PREDIÇÃO
// ══════════════════════════════════════════════

// ── SNAPSHOT LEVE — sem IA (trigger de sessão/feedback) ──
function gerarSnapshotEvolutivoLeve({ mapeamento, sessoes, feedbacks, snapshotAnterior }) {
  const ind = (mapeamento && mapeamento.indices_json) || {};
  const se = {
    D1: parseFloat(ind.D1)||0, D2: parseFloat(ind.D2)||0, D3: parseFloat(ind.D3)||0,
    D4: parseFloat(ind.D4)||0, D5: parseFloat(ind.D5)||0, D6: parseFloat(ind.D6)||0,
    D7: parseFloat(ind.D7)||0
  };
  const vals = Object.values(se).filter(v => v > 0);
  se.score_global = vals.length ? Math.round(vals.reduce(function(a,b){return a+b;},0)/vals.length) : 0;

  // Tendência por comparação com snapshot anterior
  var tendencia = 'estavel';
  if (snapshotAnterior && snapshotAnterior.scores_estruturais_json) {
    var prev = snapshotAnterior.scores_estruturais_json;
    var delta = se.score_global - (prev.score_global||0);
    if (delta >= 8) tendencia = 'melhora_sustentada';
    else if (delta >= 3) tendencia = 'melhora_leve';
    else if (delta <= -8) tendencia = 'regressao';
    else if (delta <= -3) tendencia = 'regressao_leve';
    else tendencia = 'estagnacao';
  }

  return { scores_estruturais: se, tendencia, nivel_confianca: 'quantitativo', modo: 'leve' };
}

// ── SCORE BÁSICO DE RISCO — sem IA ──
function calcularScoreRiscoBasico({ sessoes, feedbacks, paciente }) {
  var score = 0;
  var fatores = [];
  if (!sessoes || !sessoes.length) return { score: 0, nivel: 'baixo', fatores: [] };

  // 1. Espaçamento crescente entre sessões
  if (sessoes.length >= 3) {
    var datas = sessoes.slice(-4).map(function(s){return new Date(s.data_sessao);});
    var gaps = [];
    for (var i=1;i<datas.length;i++) gaps.push((datas[i]-datas[i-1])/(1000*60*60*24));
    if (gaps.length >= 2) {
      var tendGap = gaps[gaps.length-1] - gaps[0];
      if (tendGap > 14) { score += 25; fatores.push('espaçamento_crescente_significativo'); }
      else if (tendGap > 7) { score += 12; fatores.push('espaçamento_aumentando'); }
    }
  }

  // 2. Dias desde última sessão
  if (sessoes.length) {
    var diasUltima = (Date.now()-new Date(sessoes[sessoes.length-1].data_sessao))/(1000*60*60*24);
    if (diasUltima > 30) { score += 25; fatores.push('mais_30_dias_sem_sessao'); }
    else if (diasUltima > 21) { score += 12; fatores.push('mais_21_dias_sem_sessao'); }
  }

  // 3. Sessões sem resumo do terapeuta
  var semResumo = sessoes.filter(function(s){return !s.resumo_terapeuta||s.resumo_terapeuta.trim().length<15;}).length;
  if (sessoes.length > 0 && semResumo/sessoes.length > 0.6) { score += 15; fatores.push('baixo_registro_clinico'); }

  // 4. Ausência total de feedbacks externos
  if ((!feedbacks||!feedbacks.length) && sessoes.length > 4) { score += 15; fatores.push('sem_contato_externo'); }

  // 5. Vínculo em consolidação (poucas sessões)
  if (sessoes.length <= 3) { score += 8; fatores.push('vinculo_em_consolidacao'); }

  // Nível
  var nivel = score >= 60 ? 'critico' : score >= 40 ? 'alto' : score >= 20 ? 'moderado' : 'baixo';
  return { score: Math.min(100, Math.round(score)), nivel, fatores };
}

// ── RISCO DE ABANDONO CLÍNICO — com IA ──
async function gerarRiscoAbandonoClinico({ db, paciente, sessoes, feedbacks, mapeamento, analiseEstrutural, resumoAtual }) {
  const inicio = Date.now();
  const flags = (mapeamento && mapeamento.flags_json)||[];
  const FLAG_L = {risco_depressivo:'Risco Depressivo',burnout_provavel:'Burnout',ansiedade_elevada:'Ansiedade Elevada',trauma_indicado:'Trauma',isolamento_social:'Isolamento Social',instabilidade_emocional:'Instabilidade Emocional',conflito_relacional:'Conflito Relacional',baixa_autoestima:'Baixa Autoestima',crise_existencial:'Crise Existencial'};

  const sessStr = sessoes.slice(-5).map(function(s,i){
    return 'S'+s.sessao_numero+' ('+new Date(s.data_sessao).toLocaleDateString('pt-BR')+'): '+(s.resumo_terapeuta||'sem resumo registrado');
  }).join('\n');

  const feedStr = feedbacks.slice(-5).map(function(f){
    return new Date(f.data_feedback).toLocaleDateString('pt-BR')+': '+f.conteudo;
  }).join('\n');

  // Gap médio entre sessões
  var gapMedio = 0;
  if (sessoes.length >= 2) {
    var totalGap = 0;
    for (var i=1;i<sessoes.length;i++) totalGap += (new Date(sessoes[i].data_sessao)-new Date(sessoes[i-1].data_sessao))/(1000*60*60*24);
    gapMedio = Math.round(totalGap/(sessoes.length-1));
  }

  var aeStr = '';
  if (analiseEstrutural) {
    aeStr = 'Padrão de sabotagem: '+(analiseEstrutural.padrao_sabotagem||'')
      +'\nMecanismos de defesa: '+((analiseEstrutural.mecanismos_defesa||[]).slice(0,2).join(', '))
      +'\nRisco de manutenção: '+(analiseEstrutural.risco_manutencao||'');
  }

  const prompt = `Você é o motor de inteligência clínica do Synapse Core — Evolution Therapy.
Papel: detectar risco de abandono terapêutico com base em leitura clínica integrada.

PACIENTE: ${paciente.nome_completo} | ${paciente.perfil_tipo||'adulto'} | ${sessoes.length} sessões registradas
FLAGS: ${flags.map(function(f){return FLAG_L[f]||f;}).join(', ')||'Nenhuma'}
FREQUÊNCIA MÉDIA: uma sessão a cada ${gapMedio||'N/D'} dias

ÚLTIMAS SESSÕES:
${sessStr||'Sem sessões registradas'}

FEEDBACKS EXTERNOS:
${feedStr||'Nenhum feedback registrado'}

RESUMO CLÍNICO ATUAL:
${resumoAtual||'Não disponível'}

${aeStr ? 'LEITURA ESTRUTURAL:\n'+aeStr+'\n' : ''}

FATORES CLÍNICOS A ANALISAR (avalie cada um com base nos dados disponíveis):
- Oscilação entre insight e ação
- Distanciamento emocional gradual
- Queda silenciosa de engajamento
- Estagnação prolongada
- Expectativa irreal de resultado rápido
- Resistência indireta (intelectualização, concordância excessiva, mudança de foco)
- Espaçamento crescente entre sessões
- Quebra de tarefas e combinados
- Vínculo terapêutico fragilizado

IMPORTANTE: O risco é HIPÓTESE OPERACIONAL, não verdade absoluta. Use linguagem de possibilidade.

Retorne APENAS JSON válido:
{
  "score": <0-100>,
  "nivel": "baixo|moderado|alto|critico",
  "nivel_confianca": "basico|moderado|clinico",
  "fatores": ["fator identificado 1", "fator 2"],
  "explicacao": "leitura clínica integrada em 2-3 frases",
  "sugestao_estrategica": "orientação terapêutica estratégica",
  "acao_recomendada": "ação concreta sugerida para a próxima sessão"
}`;

  try {
    const resp = await fetchIA(JSON.stringify({model:'claude-sonnet-4-5',max_tokens:2500,messages:[{role:'user',content:prompt}]}));
    if (!resp.ok) { const e=await resp.text().catch(function(){return '';}); throw new Error('Anthropic 400: '+e.substring(0,300)); }
    const data = await resp.json();
    const text = (data.content&&data.content[0]&&data.content[0].text)||'{}';
    const clean = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    const m = clean.match(/\{[\s\S]*\}/);
    const json = m ? JSON.parse(m[0]) : {};
    const duracao = Date.now()-inicio;
    await registrarAuditoria(db,{paciente_id:paciente.id,modulo:'risco_abandono',referencia_tipo:'paciente',referencia_id:paciente.id,prompt_resumo:prompt,input_hash:crypto.createHash('md5').update(prompt).digest('hex'),output_resumo:text,tokens_usados:data.usage&&data.usage.output_tokens,input_tokens:data.usage&&data.usage.input_tokens,duracao_ms:duracao,sucesso:true,modelo:'claude-sonnet-4-5',modo:'clinico'});
    return { score:parseInt(json.score)||0, nivel:json.nivel||'baixo', nivel_confianca:json.nivel_confianca||'moderado', fatores:json.fatores||[], explicacao:json.explicacao||'', sugestao_estrategica:json.sugestao_estrategica||'', acao_recomendada:json.acao_recomendada||'', modo:'clinico' };
  } catch(e) {
    await registrarAuditoria(db,{paciente_id:paciente.id,modulo:'risco_abandono',sucesso:false,erro_msg:e.message,modo:'fallback'});
    throw e;
  }
}

// ── EVOLUÇÃO PREDITIVA — com IA ──
async function gerarEvolucaoPreditiva({ db, paciente, sessoes, snapshots, riscoAtual, mapeamento, analiseEstrutural, memoria, resumoAtual, feedbacks, horizonte }) {
  const inicio = Date.now();
  const numSessoes = sessoes.length + (parseInt(paciente.sessoes_anteriores)||0);
  const horizSessoes = horizonte || 6;

  // Determine confidence level
  var nivelDados, nivelConfianca;
  const temAnalise = analiseEstrutural && analiseEstrutural.nucleo_emocional;
  const temMapeamento = mapeamento && mapeamento.indices_json;

  if (numSessoes < 5 && !temAnalise) {
    nivelDados = 'insuficiente'; nivelConfianca = 'insuficiente';
  } else if (numSessoes < 5 && (temAnalise || temMapeamento)) {
    nivelDados = 'inicial_baixa_confianca'; nivelConfianca = 'baixa';
  } else {
    nivelDados = 'moderada_alta_confianca'; nivelConfianca = snapshots.length >= 5 ? 'alta' : 'moderada';
  }

  if (nivelDados === 'insuficiente') {
    return { nivel_dados: 'insuficiente', nivel_confianca: 'insuficiente', tendencia_predominante: 'Dados insuficientes para uma leitura prospectiva confiável. São necessárias pelo menos 5 sessões ou dados clínicos mais robustos.', modo:'insuficiente' };
  }

  const snapshotStr = snapshots.slice(-6).map(function(s,i){
    var se = s.scores_estruturais_json||{};
    return 'Snapshot '+(i+1)+' ('+new Date(s.gerado_em).toLocaleDateString('pt-BR')+'): global='+se.score_global+' tendência='+s.tendencia;
  }).join('\n');

  var aeStr = '';
  if (analiseEstrutural) {
    aeStr = 'Núcleo emocional: '+(analiseEstrutural.nucleo_emocional||'')
      +'\nConflito central: '+(analiseEstrutural.conflito_central||'')
      +'\nDireção terapêutica: '+(analiseEstrutural.direcao_terapeutica||'');
  }

  var memoriaStr = '';
  if (memoria) {
    try {
      var mObj = typeof memoria === 'string' ? JSON.parse(memoria) : memoria;
      if (mObj.movimento_terapeutico) memoriaStr = 'Movimento atual: '+mObj.movimento_terapeutico;
    } catch(e) {}
  }

  const riscoStr = riscoAtual ? 'Nível: '+riscoAtual.nivel+' ('+riscoAtual.score+'). '+riscoAtual.explicacao : 'Não avaliado';

  const prompt = `Você é o motor de inteligência preditiva do Synapse Core — Evolution Therapy.
Papel: leitura prospectiva clínica do processo terapêutico. Não é previsão determinística — é hipótese estratégica.

PACIENTE: ${paciente.nome_completo} | ${paciente.perfil_tipo||'adulto'} | ${numSessoes} sessões totais
NÍVEL DE CONFIANÇA DOS DADOS: ${nivelConfianca}
HORIZONTE: próximas ${horizSessoes} sessões

LINHA EVOLUTIVA (snapshots recentes):
${snapshotStr||'Sem snapshots disponíveis'}

RESUMO CLÍNICO ATUAL:
${resumoAtual||'Não disponível'}

${aeStr ? 'MAPA ESTRUTURAL:\n'+aeStr+'\n' : ''}
${memoriaStr ? 'MEMÓRIA TERAPÊUTICA:\n'+memoriaStr+'\n' : ''}
RISCO DE ABANDONO: ${riscoStr}

FEEDBACKS RECENTES: ${feedbacks.slice(-3).map(function(f){return f.conteudo.substring(0,80);}).join(' | ')||'Nenhum'}

SAÍDAS POSSÍVEIS DE TENDÊNCIA:
melhora_sustentada | melhora_parcial | oscilacao_persistente | estagnacao_provavel | regressao_emocional | dependencia_terapeutica | necessidade_ajuste_estrategico | risco_ruptura_processo | potencial_consolidacao_identitaria

LINGUAGEM OBRIGATÓRIA: hipótese, tendência provável, possibilidade clínica. NUNCA certeza ou promessa.
${nivelConfianca==='baixa'?'ATENÇÃO: dados ainda limitados — explicite incerteza na análise.':''}

Retorne APENAS JSON válido:
{
  "tendencia_predominante": "saída + explicação em 2-3 frases",
  "fatores_favoraveis": ["fator 1", "fator 2"],
  "fatores_risco": ["fator 1", "fator 2"],
  "dimensoes_frageis": ["dimensão frágil 1"],
  "dimensoes_fortalecidas": ["dimensão fortalecida 1"],
  "proximos_focos": ["foco 1", "foco 2"],
  "ajustes_recomendados": ["ajuste 1", "ajuste 2"]
}`;

  try {
    const resp = await fetchIA(JSON.stringify({model:'claude-sonnet-4-5',max_tokens:2500,messages:[{role:'user',content:prompt}]}));
    if (!resp.ok) { const e=await resp.text().catch(function(){return '';}); throw new Error('Anthropic 400: '+e.substring(0,300)); }
    const data = await resp.json();
    const text = (data.content&&data.content[0]&&data.content[0].text)||'{}';
    const clean = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    const m = clean.match(/\{[\s\S]*\}/);
    const json = m ? JSON.parse(m[0]) : {};
    const duracao = Date.now()-inicio;
    await registrarAuditoria(db,{paciente_id:paciente.id,modulo:'evolucao_preditiva',referencia_tipo:'paciente',referencia_id:paciente.id,prompt_resumo:prompt,input_hash:crypto.createHash('md5').update(prompt).digest('hex'),output_resumo:text,tokens_usados:data.usage&&data.usage.output_tokens,input_tokens:data.usage&&data.usage.input_tokens,duracao_ms:duracao,sucesso:true,modelo:'claude-sonnet-4-5',modo:'ia'});
    return { nivel_dados:nivelDados, nivel_confianca:nivelConfianca, horizonte_sessoes:horizSessoes, tendencia_predominante:json.tendencia_predominante||'', fatores_favoraveis:json.fatores_favoraveis||[], fatores_risco:json.fatores_risco||[], dimensoes_frageis:json.dimensoes_frageis||[], dimensoes_fortalecidas:json.dimensoes_fortalecidas||[], proximos_focos:json.proximos_focos||[], ajustes_recomendados:json.ajustes_recomendados||[], modo:'ia' };
  } catch(e) {
    await registrarAuditoria(db,{paciente_id:paciente.id,modulo:'evolucao_preditiva',sucesso:false,erro_msg:e.message,modo:'fallback'});
    throw e;
  }
}

// ══════════════════════════════════════════════
// PRONTUÁRIO INTELIGENTE PRÉ-SESSÃO
// ══════════════════════════════════════════════

async function gerarProntuarioInteligente({ db, paciente, mapeamento, sessoes, feedbacks, resumoAtual, analiseEstrutural, hipoteses, memoria, briefing, linhaEvolutiva, riscoAbandono, preditiva, pacote, intervencoes }) {
  const inicio = Date.now();
  const ant    = parseInt(paciente.sessoes_anteriores)||0;
  const totalSessoes = ant + sessoes.length;
  const FLAG_L = {risco_depressivo:'Risco Depressivo',burnout_provavel:'Burnout',ansiedade_elevada:'Ansiedade Elevada',trauma_indicado:'Trauma',isolamento_social:'Isolamento Social',instabilidade_emocional:'Instabilidade Emocional',conflito_relacional:'Conflito Relacional',baixa_autoestima:'Baixa Autoestima',crise_existencial:'Crise Existencial',avaliacao_psiquiatrica:'Avaliação Psiquiátrica',vulnerabilidade_relacional:'Vulnerabilidade Relacional'};
  const flags  = (mapeamento&&mapeamento.flags_json)||[];
  const proto  = (mapeamento&&mapeamento.protocolo_json)||{};
  const ae     = analiseEstrutural||{};
  const mem    = memoria||{};
  const brf    = briefing||{};
  const risco  = riscoAbandono||null;
  const pred   = preditiva||null;

  const ultimaSessao = sessoes.length ? sessoes[sessoes.length-1] : null;
  const ultimasSessoes = sessoes.slice(-3).map(function(s){
    return 'S'+s.sessao_numero+' ('+new Date(s.data_sessao).toLocaleDateString('pt-BR')+'): '+(s.resumo_terapeuta||'sem resumo');
  }).join('\n');
  const feedbacksStr = feedbacks.slice(0,5).map(function(f){
    return new Date(f.data_feedback).toLocaleDateString('pt-BR')+': '+f.conteudo;
  }).join('\n');
  const hipStr = (hipoteses||[]).slice(0,5).map(function(h,i){
    return (i+1)+'. ['+h.tipo+' / confiança '+h.nivel_confianca+'] '+h.hipotese_ia;
  }).join('\n');
  const intervStr = (intervencoes||[]).filter(function(i){return i.status==='utilizada';}).slice(0,6).map(function(i){
    return i.titulo+(i.avaliacao?' → '+i.avaliacao:'');
  }).join(', ');

  var tendenciaAtual = linhaEvolutiva.length ? linhaEvolutiva[0].tendencia : 'não avaliada';
  var scoreAtual = (linhaEvolutiva.length && linhaEvolutiva[0].scores_estruturais_json) ? linhaEvolutiva[0].scores_estruturais_json.score_global : null;

  // Risco
  var riscoStr = risco ? 'Nível: '+risco.nivel+' ('+Math.round(risco.score_clinico||risco.score_basico||0)+'/100). '+( risco.explicacao||'') : 'Não avaliado';

  // Briefing
  var brifStr = '';
  if (brf.estado_atual) brifStr += 'Estado atual: '+brf.estado_atual+'\n';
  if (brf.pontos_atencao && brf.pontos_atencao.length) brifStr += 'Pontos de atenção: '+brf.pontos_atencao.join(', ')+'\n';
  if (brf.sugestoes_conducao && brf.sugestoes_conducao.length) brifStr += 'Sugestões: '+brf.sugestoes_conducao.join(' | ');

  // Memória
  var memStr = '';
  if (mem.temas_recorrentes&&mem.temas_recorrentes.length) memStr += 'Temas: '+mem.temas_recorrentes.join(', ')+'\n';
  if (mem.padroes_identificados&&mem.padroes_identificados.length) memStr += 'Padrões: '+mem.padroes_identificados.join(', ')+'\n';
  if (mem.movimento_terapeutico) memStr += 'Movimento: '+mem.movimento_terapeutico;

  // Preditiva
  var predStr = pred ? 'Tendência: '+(pred.tendencia_predominante||'').substring(0,200) : 'Não avaliada';

  const riscoAlto = risco && (risco.nivel==='alto'||risco.nivel==='critico');
  const flagsAlto = flags.includes('ideacao_suicida')||flags.includes('risco_suicida');
  const manejo_seguranca = riscoAlto||flagsAlto;

  const prompt = `Você é o motor de Prontuário Inteligente do Synapse Core — Evolution Therapy.
Terapeuta: Erick Torritezi — Psicanalista, Psicoterapeuta Integrativo, Master Hipnoterapeuta, PNL Terapêutica, Logoterapia, Protocolo ESSÊNCIA, Metodologia 4F.

OBJETIVO: Gerar prontuário clínico pré-sessão completo, objetivo e operacional.
REGRA PRINCIPAL: NÃO reinvente o caso. Consolide o que já existe. Organize, destaque e atualize com o que é novo.

═══ DADOS DO PACIENTE ═══
Nome: ${paciente.nome_completo} | Perfil: ${paciente.perfil_tipo||'adulto'} | ${paciente.idade||''}${paciente.idade?' anos':''}
Programa: ${pacote ? pacote.nome+' ('+totalSessoes+'/'+pacote.qtd_sessoes+' sessões)' : 'Sessões avulsas — '+totalSessoes+' total'}
Data início: ${ant>0&&paciente.data_primeira_sessao ? new Date(paciente.data_primeira_sessao).toLocaleDateString('pt-BR') : (sessoes[0]?new Date(sessoes[0].data_sessao).toLocaleDateString('pt-BR'):'não registrada')}
FLAGS CLÍNICAS: ${flags.map(function(f){return FLAG_L[f]||f;}).join(', ')||'Nenhuma'}
${manejo_seguranca?'⚠️ ATENÇÃO: RISCO ELEVADO — priorize manejo de segurança\n':''}

═══ RESUMO CLÍNICO ATUAL ═══
${resumoAtual||'Não disponível'}

═══ MAPA ESTRUTURAL ═══
Núcleo emocional: ${ae.nucleo_emocional||'não mapeado'}
Conflito central: ${ae.conflito_central||proto.sintese_caso||'não mapeado'}
Mecanismos de defesa: ${(ae.mecanismos_defesa||[]).join(', ')||'não mapeados'}
Padrão de sabotagem: ${ae.padrao_sabotagem||'não mapeado'}
Estilo relacional: ${ae.estilo_relacional||'não mapeado'}
Eixo existencial: ${ae.eixo_existencial||'não mapeado'}
Recursos internos: ${(ae.recursos_internos||[]).join(', ')||'não mapeados'}
Direção terapêutica: ${ae.direcao_terapeutica||'não definida'}

═══ MEMÓRIA TERAPÊUTICA ═══
${memStr||'Não disponível'}

═══ ÚLTIMAS SESSÕES ═══
${ultimasSessoes||'Nenhuma sessão registrada'}

═══ FEEDBACKS DO PACIENTE ═══
${feedbacksStr||'Nenhum feedback registrado'}

═══ BRIEFING PRÉ-SESSÃO ATUAL ═══
${brifStr||'Briefing não gerado recentemente'}

═══ HIPÓTESES CLÍNICAS ATIVAS ═══
${hipStr||'Nenhuma hipótese registrada'}

═══ LINHA EVOLUTIVA ═══
Tendência atual: ${tendenciaAtual} | Score global: ${scoreAtual||'N/D'}
${pred ? 'Tendência prospectiva: '+predStr : ''}

═══ RISCO DE ABANDONO ═══
${riscoStr}

═══ INTERVENÇÕES JÁ UTILIZADAS ═══
${intervStr||'Nenhuma registrada'}

${proto.obs_terapeuta?'═══ OBSERVAÇÕES DO TERAPEUTA ═══\n'+proto.obs_terapeuta:''}

Gere o Prontuário Inteligente completo. Use linguagem clínica, objetiva e operacional.
NUNCA diagnostique. Use sempre linguagem de hipótese.
${manejo_seguranca?'PRIORIDADE: Blocos 9 (risco) e 12 (recomendações) devem focar em manejo de segurança antes de condução terapêutica.':''}

Retorne APENAS JSON válido com esta estrutura exata:
{
  "sintese_clinica": "síntese de 8-12 linhas sobre funcionamento atual",
  "nucleo_trabalho": {
    "motivo_inicial": "...", "conflito_central": "...",
    "travamento_principal": "...", "demanda_atual": "..."
  },
  "linha_processo": {
    "inicio": "...", "agora": "...",
    "principais_avancos": ["...", "..."],
    "pontos_estagnacao": ["..."],
    "padroes_recorrentes": ["...", "..."]
  },
  "ultima_sessao": {
    "tema": "...", "emocao": "...", "resistencia": "...",
    "movimento": "...", "tarefa": "...", "observacoes": "..."
  },
  "evolucao_emocional": {
    "dimensoes_avanco": ["..."], "dimensoes_frageis": ["..."],
    "tendencia": "...", "risco_regressao": "...", "sinais_consolidacao": "..."
  },
  "risco_atencao": {
    "nivel": "...", "fatores": ["..."],
    "sinais_evasao": ["..."], "sugestao_manejo": "..."
  },
  "hipoteses_destaque": ["hipótese relevante para hoje 1", "hipótese 2", "hipótese 3"],
  "nao_esquecer": ["ponto crítico 1", "ponto 2", "ponto 3", "ponto 4", "ponto 5"],
  "recomendacoes_sessao": {
    "foco_principal": "...",
    "tom": "acolhimento|aprofundamento|confrontacao_suave|regulacao|consolidacao",
    "prioridade": "...", "cuidado_etico": "..."
  },
  "perguntas_certeiras": ["pergunta 1", "pergunta 2", "pergunta 3", "pergunta 4", "pergunta 5"],
  "intervencoes_sugeridas": [
    { "tipo": "...", "titulo": "...", "descricao": "..." }
  ],
  "frase_direcao": "frase clínica final para orientar o terapeuta"
}`;

  try {
    const resp = await fetchIA(JSON.stringify({model:'claude-sonnet-4-5',max_tokens:5000,messages:[{role:'user',content:prompt}]}));
    if (!resp.ok) { const e=await resp.text().catch(function(){return '';}); throw new Error('Anthropic erro: '+e.substring(0,300)); }
    const data = await resp.json();
    const text = (data.content&&data.content[0]&&data.content[0].text)||'{}';
    const clean = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    const m = clean.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Prontuário: resposta da IA truncada (JSON incompleto). Tente novamente.');
    const json = JSON.parse(m[0]);
    const duracao = Date.now()-inicio;
    await registrarAuditoria(db,{paciente_id:paciente.id,modulo:'prontuario_inteligente',referencia_tipo:'paciente',referencia_id:paciente.id,prompt_resumo:prompt,input_hash:crypto.createHash('md5').update(prompt).digest('hex'),output_resumo:text,tokens_usados:data.usage&&data.usage.output_tokens,input_tokens:data.usage&&data.usage.input_tokens,duracao_ms:duracao,sucesso:true,modelo:'claude-sonnet-4-5',modo:'ia'});
    return {
      paciente: {
        nome: paciente.nome_completo, perfil: paciente.perfil_tipo||'adulto',
        idade: paciente.idade, programa: pacote ? pacote.nome : 'Sessões avulsas',
        total_sessoes: totalSessoes,
        qtd_sessoes_programa: pacote ? pacote.qtd_sessoes : null,
        data_inicio: ant>0&&paciente.data_primeira_sessao ? paciente.data_primeira_sessao : (sessoes[0]?sessoes[0].data_sessao:null),
        ultima_sessao: ultimaSessao ? ultimaSessao.data_sessao : null,
        risco_nivel: risco ? risco.nivel : 'nao_avaliado',
        tem_briefing_recente: !!briefing,
        manejo_seguranca
      },
      conteudo: json,
      gerado_em: new Date().toISOString(),
      modo: 'ia'
    };
  } catch(e) {
    await registrarAuditoria(db,{paciente_id:paciente.id,modulo:'prontuario_inteligente',sucesso:false,erro_msg:e.message,modo:'fallback'});
    throw e;
  }
}

// ══════════════════════════════════════════════
// GERAR CONTEXTO INICIAL — para o paciente
// Gerado UMA VEZ, baseado exclusivamente no mapeamento
// Linguagem acolhedora, sem jargão clínico
// ══════════════════════════════════════════════
async function gerarContextoInicial({ paciente, mapeamento, cids }) {
  const nome     = paciente.nome_completo || 'Paciente';
  const primeiro = nome.split(' ')[0];
  const relatorio= mapeamento.relatorio_json || mapeamento.protocolo_json || {};
  const indices  = mapeamento.indices_json  || {};
  const flags    = mapeamento.flags_json    || [];

  // Build dimensional scores string for AI context
  var dimStr = '';
  if (indices.global) {
    dimStr = 'Score global: ' + indices.global + '/100\n'
      + 'Regulação Emocional: ' + (indices.regulacao_emocional||'N/D') + '\n'
      + 'Padrão Cognitivo: '    + (indices.padrao_cognitivo||'N/D')    + '\n'
      + 'Índice Relacional: '   + (indices.indice_relacional||'N/D')   + '\n'
      + 'Índice Existencial: '  + (indices.indice_existencial||'N/D')  + '\n'
      + 'Funcionamento Corporal: '      + (indices.funcionamento_corporal||'N/D')      + '\n'
      + 'Sustentação Comportamental: '  + (indices.sustentacao_comportamental||'N/D')  + '\n'
      + 'Índice Psicossocial: '         + (indices.indice_psicossocial||'N/D')         + '\n'
      + 'Vulnerabilidade Clínica: '     + (indices.vulnerabilidade_clinica||'N/D');
  }

  var sintese    = relatorio.sintese_caso || '';
  var recursos   = relatorio.recursos_paciente || '';
  var flagsStr   = Array.isArray(flags) ? flags.join(', ') : String(flags);
  var cidsArr    = Array.isArray(cids) ? cids : [];
  var cidsStr    = cidsArr.length
    ? cidsArr.map(function(c){ return c.cid_codigo + ' — ' + c.cid_nome; }).join(', ')
    : '';

  const prompt = 'Você é um especialista em comunicação terapêutica humanizada. Transforme os dados clínicos abaixo em um texto acolhedor para o paciente — sem jargão técnico pesado, sem diagnósticos, linguagem empática e esperançosa.\n\n'
    + 'DADOS DO PACIENTE:\n'
    + 'Nome: ' + nome + '\n'
    + 'Perfil: ' + (paciente.perfil_tipo || 'adulto') + '\n'
    + 'Motivo da busca: ' + (paciente.motivo_busca || '').substring(0, 300) + '\n\n'
    + (sintese ? 'Síntese clínica (use como base, reescreva em linguagem acessível):\n' + sintese.substring(0,500) + '\n\n' : '')
    + (recursos ? 'Recursos e forças do paciente:\n' + recursos.substring(0,300) + '\n\n' : '')
    + (cidsStr  ? 'CIDs identificados (mencione de forma acessível, sem código, sem diagnóstico direto):\n' + cidsStr + '\n\n' : '')
    + (flagsStr ? 'Indicadores clínicos identificados (referencie de forma acolhedora):\n' + flagsStr + '\n\n' : '')
    + 'INSTRUÇÕES: Escreva o texto do contexto inicial de ' + primeiro + ' em português brasileiro, tom caloroso, empático e esperançoso. Estruture em 5 parágrafos separados por linha em branco:\n'
    + '1. Saudação personalizada — acolha a decisão de buscar autoconhecimento\n'
    + '2. O que você trouxe — espelhe os temas que a pessoa trouxe, sem diagnósticos\n'
    + '3. O que identificamos juntos — pontos de força e recursos internos\n'
    + '4. O caminho que se abre — processo terapêutico de forma motivadora\n'
    + '5. Encerramento — deixe a pessoa sentindo que está no lugar certo\n\n'
    + 'REGRAS: NUNCA mencione score, percentual, CID, risco ou termos clínicos técnicos. '
    + 'Use "identificamos", "percebemos", "notamos" (plural). Máximo 380 palavras. '
    + 'Retorne APENAS o texto dos 5 parágrafos, sem títulos, sem numeração, sem markdown.';

  const resp = await fetchIA(JSON.stringify({
      model:      'claude-sonnet-4-5',
      max_tokens: 900,
      messages:   [{ role: 'user', content: prompt }]
    }));

  if (!resp.ok) throw new Error('Anthropic API error: ' + resp.status);
  const data  = await resp.json();
  const texto = data.content[0].text.trim();

  // Return text + structured data for the patient page
  return {
    texto,
    nome,
    indices,
    flags:   Array.isArray(flags) ? flags : [],
    cids:    Array.isArray(cids)  ? cids  : [],
    sintese: sintese || '',
    risco:   mapeamento.risco_nivel || 'verde',
    _usage:  data.usage || null
  };
}

// ══════════════════════════════════════════════
// GERAR RESUMO ENCAMINHAMENTO PSIQUIÁTRICO
// Sugere campos do encaminhamento com base no histórico
// Linguagem ética, interdisciplinar, não diagnósticante
// ══════════════════════════════════════════════
async function gerarResumoEncaminhamento({ paciente, sessoes, mapeamento, analise, hipoteses, memoria, cids }) {
  var nome     = paciente.nome_completo || 'Paciente';
  var primeiro = nome.split(' ')[0];
  var proto    = mapeamento && (mapeamento.relatorio_json || mapeamento.protocolo_json) || {};
  var indices  = mapeamento && mapeamento.indices_json || {};
  var flags    = mapeamento && mapeamento.flags_json   || [];

  var totalSessoes = (sessoes || []).length;
  var dataPrimeira = sessoes && sessoes[0] ? sessoes[0].data_sessao : null;
  var dataUltima   = sessoes && sessoes[sessoes.length-1] ? sessoes[sessoes.length-1].data_sessao : null;

  var context = 'Paciente: ' + nome + '\n'
    + 'Motivo da busca: ' + (paciente.motivo_busca || '').substring(0, 200) + '\n'
    + 'Total de sessões: ' + totalSessoes + '\n'
    + (proto.sintese_caso ? 'Síntese clínica: ' + proto.sintese_caso.substring(0, 400) + '\n' : '')
    + (analise && analise.mapa_estrutural ? 'Mapa estrutural: ' + analise.mapa_estrutural.substring(0, 300) + '\n' : '')
    + (hipoteses && hipoteses.length ? 'Hipóteses: ' + hipoteses.slice(0,3).map(function(h){ return h.hipotese_ia||''; }).join('; ').substring(0,300) + '\n' : '')
    + (memoria ? 'Memória terapêutica: ' + String(memoria).substring(0, 300) + '\n' : '')
    + (flags && flags.length ? 'Indicadores: ' + flags.join(', ') + '\n' : '')
    + (indices.global ? 'Score global: ' + indices.global + '/100\n' : '');

  var prompt = 'Você é um assistente de documentação clínica para psicoterapeutas. Com base no histórico do paciente abaixo, sugira o preenchimento ético e técnico dos campos de um encaminhamento para avaliação psiquiátrica complementar.\n\n'
    + 'IMPORTANTE:\n'
    + '- Linguagem interdisciplinar e ética\n'
    + '- NUNCA fechar diagnóstico definitivo\n'
    + '- NUNCA usar termos como "é bipolar", "tem depressão severa", "transtorno X"\n'
    + '- Usar: "sugere", "observou-se", "apresenta", "indica necessidade de"\n'
    + '- Máximo 2 frases por campo\n'
    + '- Retornar APENAS JSON válido, sem markdown, sem explicações\n\n'
    + 'HISTÓRICO:\n' + context + '\n\n'
    + 'Retorne EXATAMENTE este JSON:\n'
    + '{"motivo":"...","sintomas":"...","objetivo":"...","resumo":"..."}';

  var resp = await fetchIA(JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    }));

  if (!resp.ok) throw new Error('Anthropic API error: ' + resp.status);
  var data = await resp.json();
  var text = data.content[0].text.trim();

  var resultado;
  try {
    resultado = JSON.parse(text);
  } catch(e) {
    var match = text.match(/\{[\s\S]*\}/);
    resultado = match ? JSON.parse(match[0]) : { motivo:'', sintomas:'', objetivo:'', resumo:'' };
  }
  resultado._usage = data.usage || null;
  return resultado;
}

// ══════════════════════════════════════════════
// GERAR FASES TERAPÊUTICAS — Timeline Evolutiva
// ══════════════════════════════════════════════
async function gerarFasesTerapeuticas({ db, paciente, sessoes, mapeamentos, evolucao_historico }) {
  var nome    = paciente.nome_completo || 'Paciente';
  var nSessoes = (sessoes || []).length;
  var nMaps    = (mapeamentos || []).length;

  // Build context
  var ctx = 'Paciente: ' + nome + '\n'
    + 'Total de sessões realizadas: ' + nSessoes + '\n'
    + 'Total de mapeamentos: ' + nMaps + '\n';

  if (evolucao_historico && evolucao_historico.length) {
    var primeiro = evolucao_historico[0];
    var ultimo   = evolucao_historico[evolucao_historico.length - 1];
    ctx += 'Score inicial: ' + (primeiro.score_global || '?') + '\n';
    ctx += 'Score atual: '   + (ultimo.score_global   || '?') + '\n';
    ctx += 'Variação: ' + (ultimo.score_global - primeiro.score_global > 0 ? '+' : '') + (ultimo.score_global - primeiro.score_global) + ' pontos\n';
  }

  if (mapeamentos && mapeamentos.length) {
    var m = mapeamentos[mapeamentos.length - 1];
    var flags = m.flags_json || [];
    if (flags.length) ctx += 'Indicadores clínicos: ' + flags.join(', ') + '\n';
  }

  var prompt = 'Você é um assistente clínico especializado em psicoterapia. Com base no histórico abaixo, '
    + 'identifique de 2 a 4 fases terapêuticas distintas da jornada deste paciente.\n\n'
    + 'Cada fase deve:\n'
    + '- ter um nome clínico elegante e descritivo (máx 5 palavras)\n'
    + '- ter uma descrição curta do que caracteriza essa fase (1 frase)\n'
    + '- indicar o índice aproximado de início e fim nos eventos (0 a 100%)\n\n'
    + 'IMPORTANTE: Linguagem técnica, respeitosa, não diagnósticante.\n\n'
    + 'HISTÓRICO:\n' + ctx + '\n\n'
    + 'Retorne SOMENTE JSON válido, sem markdown:\n'
    + '[{"nome":"...","descricao":"...","emoji":"...","inicio_pct":0,"fim_pct":40}]';

  var resposta = await fetchIA({
    model: 'claude-sonnet-4-5',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }]
  });

  if (!resposta.ok) throw new Error('Anthropic API error: ' + resposta.status);
  var data  = await resposta.json();
  var texto = data.content && data.content[0] && data.content[0].text || '[]';
  var clean = texto.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();

  var fases;
  try {
    fases = JSON.parse(clean);
    if (!Array.isArray(fases)) fases = [];
  } catch(e) {
    var match = clean.match(/\[[\s\S]*\]/);
    fases = match ? JSON.parse(match[0]) : [];
  }

  // Audit
  if (db) {
    await registrarAuditoria(db, {
      paciente_id:    paciente.id,
      modulo:         'timeline_fases',
      referencia_tipo:'paciente',
      referencia_id:  paciente.id,
      output_resumo:  fases.length + ' fases terapêuticas geradas',
      tokens_usados:  data.usage && data.usage.output_tokens,
      input_tokens:   data.usage && data.usage.input_tokens,
      sucesso:        true,
      modelo:         'claude-sonnet-4-5',
      modo:           'ia'
    }).catch(function(e){ console.warn('audit timeline:', e.message); });
  }

  return fases;
}
