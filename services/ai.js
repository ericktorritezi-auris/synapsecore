// SYNAPSE CORE — AI Service v1.4.0
// Índices · Flags · Prompt · Anthropic API

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

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
    body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:600, messages:[{role:'user',content:prompt}] })
  });
  if (!resp.ok) throw new Error('Anthropic API error: ' + resp.status);
  const data  = await resp.json();
  const text  = data.content?.[0]?.text || '{}';
  const clean = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
  const json  = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] || '{}');

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
async function gerarMapeamento({ paciente, respostas, indices, flags, pacotes, riscoNivel }) {
  const prog = sugerirPrograma(paciente.perfil_tipo, indices, flags, pacotes);
  const flagLabels = flags.map(f => FLAG_LABELS[f]?.l || f).join(', ') || 'Nenhuma';

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

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error('Anthropic API error: ' + err);
  }

  const data  = await resp.json();
  const texto = data.content?.[0]?.text || '';

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

  return { relatorio, programa: prog };
}

module.exports = { calcularIndices, detectarFlags, gerarMapeamento, FLAG_LABELS, sugerirPrograma, sugerirProgramaLocal, gerarResumoClinico, gerarEvolucao, sugerirCIDs };

// ── SUGERE CIDs (ICD-10) ──
async function sugerirCIDs({ paciente, respostas, indices, flags }) {
  const flagLabels = flags.map(f => FLAG_LABELS[f]?.l || f).join(', ') || 'Nenhuma';
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

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!resp.ok) throw new Error('Anthropic API error: ' + resp.status);
  const data  = await resp.json();
  const texto = data.content?.[0]?.text || '[]';
  const clean = texto.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
  try {
    const arr = JSON.parse(clean);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    const match = clean.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return [];
  }
}

// ── GERA RELATÓRIO DE EVOLUÇÃO ──
async function gerarEvolucao({ paciente, mapeamento, sessoes, resumoClinico, pacote }) {
  const indicesIniciais = mapeamento?.dimensoes_json || mapeamento?.indices_json?.dimensoes || {};
  const proto = mapeamento?.protocolo_json || {};

  const objetivosText  = proto.objetivos_iniciais || proto.objetivos || 'Não definidos';
  const protocoloText  = proto.protocolo_sugerido  || 'Não definido';
  const obsText        = proto.obs_terapeuta        || '';
  const flagsText      = (mapeamento?.flags_json || []).join(', ') || 'Nenhuma';

  const sessoesStr = sessoes.map(s =>
    'Sessão ' + s.sessao_numero + ' (' + new Date(s.data_sessao).toLocaleDateString('pt-BR') + '): ' + (s.resumo_terapeuta || 'Sem resumo.')
  ).join('\n');

  const totalSessoes = sessoes.length;
  const totalPrograma = pacote?.qtd_sessoes || null;

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

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!resp.ok) throw new Error('Anthropic API error: ' + resp.status);
  const data  = await resp.json();
  const texto = data.content?.[0]?.text || '';
  const clean = texto.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Não foi possível parsear a evolução da IA.');
  }
}

// ── GERA RESUMO CLÍNICO PÓS-SESSÃO ──
async function gerarResumoClinico({ paciente, sessoes, mapeamento, pacote, isPrimeiro }) {
  const indicesStr = mapeamento ? JSON.stringify(mapeamento.indices_json || {}, null, 0) : 'Não disponível';
  const flagsStr   = mapeamento ? (mapeamento.flags_json || []).join(', ') || 'Nenhuma' : 'Não disponível';

  // PRIMEIRO RESUMO: usa apenas dados do formulário (linha de base clínica)
  if (isPrimeiro) {
    const prompt = `Você é um assistente de inteligência clínica do Synapse Core — Evolution Therapy.
Terapeuta: Erick Torritezi — Psicanalista e Psicoterapeuta Estratégico Integrativo.

PACIENTE: ${paciente.nome_completo} | Perfil: ${paciente.perfil_tipo || 'adulto'}
PROGRAMA: ${pacote ? pacote.nome + ' (' + (pacote.qtd_sessoes || '?') + ' sessões)' : 'Não definido'}

ÍNDICES DO MAPEAMENTO INICIAL (baseados no formulário preenchido pelo paciente):
${indicesStr}

FLAGS CLÍNICAS IDENTIFICADAS: ${flagsStr}

Este é o PRIMEIRO resumo analítico do paciente — baseado exclusivamente nos dados do formulário de avaliação inicial. Não há sessões ou observações do terapeuta para considerar.

Gere um resumo clínico de linha de base (3-4 parágrafos) descrevendo:
1. O perfil clínico inicial do paciente com base nos índices e flags identificados
2. As principais áreas de atenção clínica
3. O potencial terapêutico e pontos de força identificados
4. Uma direção inicial para o trabalho terapêutico

Use linguagem técnica e clínica. Este resumo servirá como referência de ponto de partida para acompanhar a evolução do paciente.`;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
    });
    if (!resp.ok) throw new Error('Anthropic error: ' + resp.status);
    const d = await resp.json();
    return d.content?.[0]?.text || 'Resumo inicial não gerado.';
  }

  // REGERAÇÃO: usa tudo — observações, sessões, protocolo
  const proto = mapeamento?.protocolo_json || {};
  const obsText      = proto.obs_terapeuta     || '';
  const objText      = proto.objetivos_iniciais || '';
  const protocolText = proto.protocolo_sugerido || '';
  const sinteseText  = proto.sintese_caso       || '';

  const obsBlock = [
    obsText      ? 'Observações do terapeuta: ' + obsText : '',
    objText      ? 'Objetivos iniciais definidos: ' + objText : '',
    protocolText ? 'Protocolo sugerido (editado): ' + protocolText : '',
    sinteseText  ? 'Síntese inicial do caso: ' + sinteseText : ''
  ].filter(Boolean).join('\n\n');

  const sessoesStr = sessoes.map(s =>
    'Sessão ' + s.sessao_numero + ' (' + new Date(s.data_sessao).toLocaleDateString('pt-BR') + '): ' + (s.resumo_terapeuta || 'Sem resumo registrado.')
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

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!resp.ok) throw new Error('Anthropic API error: ' + resp.status);
  const data = await resp.json();
  return data.content?.[0]?.text || 'Resumo não gerado.';
}
