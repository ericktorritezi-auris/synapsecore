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
function sugerirPrograma(perfilTipo, indices, flags, pacotes) {
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

  // Score de compatibilidade
  const melhor = candidatos.map(p => {
    let compat = 70;
    if (flags.includes('risco_depressivo') && p.nome.includes('Destravamento')) compat += 15;
    if (flags.includes('burnout_provavel') && p.nome.includes('Destravamento')) compat += 10;
    if (flags.includes('ansiedade_funcional') && p.nome.includes('Destravamento')) compat += 8;
    if (flags.includes('neurodivergencia_provavel') && p.nome.includes('Regulação')) compat += 20;
    if (flags.includes('apego_ansioso') && p.nome.includes('Casal')) compat += 5;
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

module.exports = { calcularIndices, detectarFlags, gerarMapeamento, FLAG_LABELS, sugerirPrograma };
