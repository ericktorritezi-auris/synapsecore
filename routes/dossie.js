'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');

// ── GET /api/pacientes/:id/dossie ── Dossiê Clínico Completo
router.get('/:id/dossie', async (req, res) => {
  try {
    // Aceitar token via query param (abertura em nova aba) ou header
    var token = req.query.token || (req.headers.authorization && req.headers.authorization.replace('Bearer ',''));
    if (!token) return res.status(401).json({ message: 'Acesso não autorizado.' });
    try {
      var jwt = require('jsonwebtoken');
      jwt.verify(token, process.env.JWT_SECRET);
    } catch(e) {
      return res.status(401).json({ message: 'Token inválido.' });
    }
    var pid = parseInt(req.params.id);

    // ── Buscar todos os dados em paralelo ──
    var [
      pacRes, sessRes, mapRes, resumoRes, memoriaRes,
      analiseRes, hipRes, mapaIdRes, cidsRes, docsRes,
      feedRes, evolRes, interRes
    ] = await Promise.all([
      db.query(`SELECT p.*, pk.nome AS pacote_nome,
        CASE WHEN p.data_nascimento IS NOT NULL
          THEN DATE_PART('year', AGE(p.data_nascimento))::int ELSE NULL END AS idade,
        c.nome_completo AS conjuge_nome
        FROM pacientes p
        LEFT JOIN pacotes pk ON pk.id = p.pacote_id
        LEFT JOIN pacientes c ON c.id = p.conjuge_id
        WHERE p.id=$1`, [pid]),
      db.query(`SELECT * FROM sessoes WHERE paciente_id=$1 ORDER BY data_sessao ASC`, [pid]),
      db.query(`SELECT * FROM mapeamentos WHERE paciente_id=$1 ORDER BY versao DESC LIMIT 1`, [pid]),
      db.query(`SELECT * FROM resumos_clinicos WHERE paciente_id=$1 AND ativo=true ORDER BY versao DESC LIMIT 1`, [pid]),
      db.query(`SELECT * FROM memoria_terapeutica WHERE paciente_id=$1 AND ativa=true ORDER BY versao DESC LIMIT 1`, [pid]),
      db.query(`SELECT * FROM analise_estrutural WHERE paciente_id=$1 AND ativa=true ORDER BY versao DESC LIMIT 1`, [pid]),
      db.query(`SELECT * FROM hipoteses_clinicas WHERE paciente_id=$1 AND ativa=true ORDER BY nivel_confianca DESC NULLS LAST`, [pid]),
      db.query(`SELECT * FROM mapa_identidade WHERE paciente_id=$1 AND ativo=true ORDER BY versao DESC LIMIT 1`, [pid]),
      db.query(`SELECT * FROM cids_paciente WHERE paciente_id=$1 ORDER BY created_at ASC`, [pid]),
      db.query(`SELECT * FROM documentos WHERE paciente_id=$1 ORDER BY created_at ASC`, [pid]),
      db.query(`SELECT * FROM feedbacks_paciente WHERE paciente_id=$1 ORDER BY created_at ASC`, [pid]),
      db.query(`SELECT * FROM evolucao_historico WHERE paciente_id=$1 ORDER BY gerado_em ASC`, [pid]),
      db.query(`SELECT * FROM intervencoes WHERE paciente_id=$1 ORDER BY criado_em DESC LIMIT 10`, [pid]),
    ]);

    if (!pacRes.rows.length) return res.status(404).json({ message: 'Paciente não encontrado.' });

    var pac      = pacRes.rows[0];
    var sessoes  = sessRes.rows;
    var map      = mapRes.rows[0] || null;
    var resumo   = resumoRes.rows[0] || null;
    var memoria  = memoriaRes.rows[0] || null;
    var analise  = analiseRes.rows[0] || null;
    var hipoteses = hipRes.rows;
    var mapaId   = mapaIdRes.rows[0] || null;
    var cids     = cidsRes.rows;
    var docs     = docsRes.rows;
    var feedbacks = feedRes.rows;
    var evolucao = evolRes.rows;
    var intervencoes = interRes.rows;

    // ── Helpers ──
    function fmtData(d) {
      if (!d) return '—';
      return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'UTC' });
    }
    function escH(s) {
      return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function parseJson(v) {
      if (!v) return {};
      if (typeof v === 'object') return v;
      try { return JSON.parse(v); } catch(e) { return {}; }
    }
    function barScore(val, max) {
      var pct = Math.min(100, Math.round((val||0) / max * 100));
      var cor = val >= 70 ? '#6ee7b7' : val >= 45 ? '#D4AF7F' : '#fca5a5';
      return `<div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1;height:6px;background:rgba(255,255,255,.08);border-radius:3px">
          <div style="width:${pct}%;height:100%;background:${cor};border-radius:3px"></div>
        </div>
        <span style="font-size:11px;color:${cor};font-weight:700;min-width:24px">${val||0}</span>
      </div>`;
    }

    // ── Dados calculados ──
    var sessoesRealizadas = sessoes.filter(function(s){ return s.status==='realizada'; });
    var primeiraData = sessoes.length ? sessoes[0].data_sessao : null;
    var ultimaData   = sessoes.length ? sessoes[sessoes.length-1].data_sessao : null;
    var totalAberto  = sessoes.filter(function(s){ return !s.pago && s.status==='realizada'; })
                              .reduce(function(acc,s){ return acc + parseFloat(s.valor_cobrado||0); }, 0);
    var mapJson     = map ? parseJson(map.indices_json) : {};
    var mapFlags    = map ? (parseJson(map.flags_json)||[]) : [];
    var memJson     = memoria ? parseJson(memoria.conteudo_json) : {};
    var analJson    = analise ? parseJson(analise.conteudo_json) : {};
    var mapaIdJson  = mapaId ? parseJson(mapaId.conteudo_json) : {};

    var FLAG_LABELS = {
      risco_depressivo:'Risco Depressivo', burnout_provavel:'Burnout Provável',
      ansiedade_elevada:'Ansiedade Elevada', trauma_indicado:'Trauma Indicado',
      isolamento_social:'Isolamento Social', instabilidade_emocional:'Instabilidade Emocional',
      conflito_relacional:'Conflito Relacional', baixa_autoestima:'Baixa Autoestima',
      neurodivergencia:'Neurodivergência', crise_existencial:'Crise Existencial',
      ideacao_suicida:'Ideação Suicida', risco_suicida:'Risco Suicida',
      avaliacao_psiquiatrica:'Avaliação Psiquiátrica'
    };

    var dimLabels = { D1:'Emocional', D2:'Cognitivo', D3:'Relacional', D4:'Funcional', D5:'Existencial', D6:'Físico', D7:'Autoestima' };

    var geradoEm = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

    // ── HTML DO DOSSIÊ ──
    var html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dossiê Clínico — ${escH(pac.nome_completo)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  *{ box-sizing:border-box; margin:0; padding:0; }

  body {
    font-family:'Inter',sans-serif;
    background:#fff;
    color:#1a1a2e;
    font-size:11pt;
    line-height:1.6;
  }

  /* ── Impressão A4 ── */
  @page {
    size: A4;
    margin: 20mm 18mm 20mm 18mm;
  }
  @media print {
    body { font-size:10pt; }
    .no-print { display:none!important; }
    .page-break { page-break-before: always; }
    .no-break { page-break-inside: avoid; }
    .capa { page-break-after: always; }
    h2.secao-titulo { page-break-after: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
    a { text-decoration:none; color:inherit; }
  }

  /* ── Capa ── */
  .capa {
    min-height: 100vh;
    background: linear-gradient(160deg, #0B132B 0%, #1C2541 60%, #0B132B 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 40px;
    text-align: center;
    color: #F5F7FA;
    position: relative;
  }
  .capa-logo {
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(212,175,127,.6);
    margin-bottom: 60px;
  }
  .capa-icon {
    width: 72px;
    height: 72px;
    background: rgba(212,175,127,.12);
    border: 2px solid rgba(212,175,127,.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    margin: 0 auto 28px;
  }
  .capa-subtitulo {
    font-size: 12px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #D4AF7F;
    margin-bottom: 16px;
  }
  .capa-nome {
    font-size: 28px;
    font-weight: 700;
    color: #F5F7FA;
    margin-bottom: 8px;
    line-height: 1.3;
  }
  .capa-tipo {
    font-size: 13px;
    color: rgba(201,209,217,.6);
    margin-bottom: 48px;
  }
  .capa-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
    width: 100%;
    max-width: 480px;
    margin: 0 auto 60px;
  }
  .capa-stat {
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(212,175,127,.15);
    border-radius: 10px;
    padding: 14px 10px;
  }
  .capa-stat-val {
    font-size: 22px;
    font-weight: 700;
    color: #D4AF7F;
  }
  .capa-stat-label {
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(201,209,217,.5);
    margin-top: 2px;
  }
  .capa-periodo {
    font-size: 11px;
    color: rgba(201,209,217,.4);
    margin-bottom: 8px;
  }
  .capa-rodape {
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(212,175,127,.3);
    position: absolute;
    bottom: 32px;
    left: 0; right: 0;
    text-align: center;
  }

  /* ── Corpo ── */
  .corpo { max-width: 720px; margin: 0 auto; padding: 20px 0; }

  h2.secao-titulo {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #D4AF7F;
    border-bottom: 1.5px solid rgba(212,175,127,.25);
    padding-bottom: 6px;
    margin: 32px 0 16px;
  }

  .card {
    background: #f8f9fc;
    border: 1px solid #e8eaf0;
    border-radius: 8px;
    padding: 16px 18px;
    margin-bottom: 12px;
  }
  .card-titulo {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #8b95a8;
    margin-bottom: 6px;
  }
  .card-valor {
    font-size: 13px;
    color: #1a1a2e;
    line-height: 1.6;
  }

  /* Grid 2 colunas */
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }

  /* Tabela */
  table { width:100%; border-collapse:collapse; margin-bottom:16px; }
  th {
    background:#f0f2f8;
    padding:7px 10px;
    text-align:left;
    font-size:9px;
    font-weight:700;
    letter-spacing:1px;
    text-transform:uppercase;
    color:#5a6380;
  }
  td { padding:7px 10px; font-size:11px; border-bottom:1px solid #f0f2f8; color:#2a2a3e; }
  tr:last-child td { border-bottom:none; }
  tr:hover td { background:#f8f9fc; }

  /* Badge */
  .badge {
    display:inline-block;
    font-size:9px;
    font-weight:700;
    padding:2px 8px;
    border-radius:20px;
    letter-spacing:.5px;
  }
  .badge-green { background:#d1fae5; color:#065f46; }
  .badge-red   { background:#fee2e2; color:#991b1b; }
  .badge-gold  { background:#fef3c7; color:#92400e; }
  .badge-blue  { background:#dbeafe; color:#1e40af; }
  .badge-gray  { background:#f0f2f8; color:#4b5563; }

  /* Índice barra */
  .dim-row { display:grid; grid-template-columns:100px 1fr 36px; align-items:center; gap:10px; margin-bottom:6px; }
  .dim-label { font-size:10px; color:#5a6380; font-weight:600; }
  .dim-bar { height:6px; background:#e8eaf0; border-radius:3px; overflow:hidden; }
  .dim-bar-fill { height:100%; border-radius:3px; }
  .dim-val { font-size:10px; font-weight:700; text-align:right; }

  /* Hipótese */
  .hip-card {
    border:1px solid #e8eaf0;
    border-radius:8px;
    padding:14px 16px;
    margin-bottom:10px;
    page-break-inside:avoid;
  }
  .hip-confianca {
    display:inline-block;
    font-size:9px;
    font-weight:700;
    padding:2px 8px;
    border-radius:20px;
    margin-bottom:6px;
  }
  .hip-texto { font-size:11.5px; color:#1a1a2e; font-weight:500; margin-bottom:8px; line-height:1.5; }
  .hip-sub { font-size:9px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#8b95a8; margin-bottom:4px; }
  .hip-item { font-size:10.5px; color:#3a3a5e; margin-bottom:2px; padding-left:12px; position:relative; }
  .hip-item::before { content:'•'; position:absolute; left:2px; color:#8b95a8; }

  /* Tag */
  .tag {
    display:inline-block;
    font-size:10px;
    padding:3px 10px;
    border-radius:20px;
    margin:2px;
    background:#f0f2f8;
    color:#3a3a5e;
  }

  /* Sessão resumo */
  .sess-card {
    border-left:3px solid #D4AF7F;
    padding:8px 12px;
    margin-bottom:8px;
    background:#f8f9fc;
    border-radius:0 6px 6px 0;
    page-break-inside:avoid;
  }
  .sess-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
  .sess-num { font-size:11px; font-weight:700; color:#1a1a2e; }
  .sess-data { font-size:10px; color:#8b95a8; }
  .sess-resumo { font-size:10.5px; color:#3a3a5e; line-height:1.5; }

  /* Print button */
  .btn-print {
    position:fixed;
    top:20px;
    right:20px;
    background:#D4AF7F;
    color:#0B132B;
    border:none;
    padding:10px 20px;
    border-radius:8px;
    font-size:13px;
    font-weight:700;
    cursor:pointer;
    z-index:999;
    box-shadow:0 4px 12px rgba(212,175,127,.4);
  }
  .btn-print:hover { background:#c49b6a; }
</style>
</head>
<body>

<!-- Botão imprimir (não aparece na impressão) -->
<button class="btn-print no-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>

<!-- ══════════════════════════════════════════════ -->
<!-- CAPA                                          -->
<!-- ══════════════════════════════════════════════ -->
<div class="capa">
  <div class="capa-logo">Synapse Core · Evolution Therapy · Erick Torritezi</div>
  <div class="capa-icon">🧠</div>
  <div class="capa-subtitulo">Dossiê Clínico Completo</div>
  <div class="capa-nome">${escH(pac.nome_completo)}</div>
  <div class="capa-tipo">${escH(pac.perfil_tipo||'Adulto')} · ${escH(pac.tipo_sessao||'Sessão Individual')}${pac.conjuge_nome ? ' · Cônjuge: '+escH(pac.conjuge_nome) : ''}</div>

  <div class="capa-grid">
    <div class="capa-stat">
      <div class="capa-stat-val">${sessoesRealizadas.length}</div>
      <div class="capa-stat-label">Sessões</div>
    </div>
    <div class="capa-stat">
      <div class="capa-stat-val">${map ? (parseJson(map.indices_json).global||'—') : '—'}</div>
      <div class="capa-stat-label">Score Global</div>
    </div>
    <div class="capa-stat">
      <div class="capa-stat-val">${hipoteses.length}</div>
      <div class="capa-stat-label">Hipóteses</div>
    </div>
  </div>

  <div class="capa-periodo">
    ${primeiraData ? 'Início: '+fmtData(primeiraData) : ''}
    ${primeiraData && ultimaData ? '  ·  ' : ''}
    ${ultimaData ? 'Última sessão: '+fmtData(ultimaData) : ''}
  </div>

  <div class="capa-rodape">Gerado em ${geradoEm} · Uso interno clínico exclusivo · Confidencial</div>
</div>

<!-- ══════════════════════════════════════════════ -->
<!-- CORPO                                         -->
<!-- ══════════════════════════════════════════════ -->
<div class="corpo">

<!-- ── SEÇÃO 1: DADOS CADASTRAIS ── -->
<h2 class="secao-titulo">1. Dados Cadastrais</h2>
<div class="grid2 no-break">
  <div class="card">
    <div class="card-titulo">Nome Completo</div>
    <div class="card-valor">${escH(pac.nome_completo)}</div>
  </div>
  <div class="card">
    <div class="card-titulo">Idade</div>
    <div class="card-valor">${pac.idade ? pac.idade+' anos' : '—'}${pac.data_nascimento ? ' · '+fmtData(pac.data_nascimento) : ''}</div>
  </div>
  <div class="card">
    <div class="card-titulo">Email</div>
    <div class="card-valor">${escH(pac.email||'—')}</div>
  </div>
  <div class="card">
    <div class="card-titulo">Telefone</div>
    <div class="card-valor">${escH(pac.telefone||'—')}</div>
  </div>
  <div class="card">
    <div class="card-titulo">Perfil</div>
    <div class="card-valor">${escH(pac.perfil_tipo||'Adulto')} · ${escH(pac.tipo_sessao||'Individual')}</div>
  </div>
  <div class="card">
    <div class="card-titulo">Pacote</div>
    <div class="card-valor">${escH(pac.pacote_nome||'Sem pacote')}</div>
  </div>
  ${pac.conjuge_nome ? `<div class="card">
    <div class="card-titulo">Cônjuge Vinculado</div>
    <div class="card-valor">💑 ${escH(pac.conjuge_nome)}</div>
  </div>` : ''}
</div>

<!-- ── SEÇÃO 2: MAPEAMENTO CLÍNICO ── -->
<h2 class="secao-titulo">2. Mapeamento Clínico</h2>
${map ? `
<div class="no-break">
  <div class="grid2" style="margin-bottom:12px">
    <div class="card">
      <div class="card-titulo">Versão do Mapeamento</div>
      <div class="card-valor">v${map.versao} · Gerado em ${fmtData(map.created_at)}</div>
    </div>
    <div class="card">
      <div class="card-titulo">Score Global</div>
      <div class="card-valor" style="font-size:20px;font-weight:700;color:#D4AF7F">${mapJson.global||'—'}<span style="font-size:11px;color:#8b95a8;font-weight:400"> / 100</span></div>
    </div>
  </div>

  <!-- Dimensões -->
  <div class="card" style="margin-bottom:12px">
    <div class="card-titulo" style="margin-bottom:10px">Índices por Dimensão</div>
    ${Object.entries(dimLabels).map(function(entry) {
      var key = entry[0], label = entry[1];
      var dims = mapJson.dimensoes || mapJson;
      var val = dims[key] || 0;
      var cor = val >= 70 ? '#22c55e' : val >= 45 ? '#D4AF7F' : '#ef4444';
      return `<div class="dim-row">
        <div class="dim-label">${label}</div>
        <div class="dim-bar"><div class="dim-bar-fill" style="width:${val}%;background:${cor}"></div></div>
        <div class="dim-val" style="color:${cor}">${val}</div>
      </div>`;
    }).join('')}
  </div>

  <!-- Flags -->
  ${mapFlags.length ? `<div class="card no-break">
    <div class="card-titulo">Flags Identificadas</div>
    <div style="margin-top:6px">${mapFlags.map(function(f){ return `<span class="badge badge-red" style="margin:2px">${escH(FLAG_LABELS[f]||f)}</span>`; }).join('')}</div>
  </div>` : ''}
</div>` : '<div class="card"><div class="card-valor" style="color:#8b95a8">Mapeamento não realizado ainda.</div></div>'}

<!-- ── SEÇÃO 3: RESUMO CLÍNICO ── -->
<h2 class="secao-titulo">3. Resumo Clínico</h2>
${resumo ? `<div class="card no-break">
  <div class="card-titulo">v${resumo.versao} · Gerado em ${fmtData(resumo.gerado_em)}</div>
  <div class="card-valor" style="white-space:pre-wrap;line-height:1.7">${escH(resumo.conteudo_texto||'—')}</div>
</div>` : '<div class="card"><div class="card-valor" style="color:#8b95a8">Resumo clínico não gerado ainda.</div></div>'}

<!-- ── SEÇÃO 4: MEMÓRIA TERAPÊUTICA ── -->
<h2 class="secao-titulo">4. Memória Terapêutica</h2>
${memoria && Object.keys(memJson).length ? `
<div class="no-break" style="margin-bottom:12px">
  <div class="card" style="margin-bottom:8px">
    <div class="card-titulo">v${memoria.versao} · Gerado em ${fmtData(memoria.gerado_em)}</div>
  </div>
  ${memJson.resumo_processo ? `<div class="card no-break">
    <div class="card-titulo">Resumo do Processo</div>
    <div class="card-valor">${escH(memJson.resumo_processo)}</div>
  </div>` : ''}
  ${memJson.temas_recorrentes && memJson.temas_recorrentes.length ? `<div class="card no-break">
    <div class="card-titulo">Temas Recorrentes</div>
    <div style="margin-top:6px">${memJson.temas_recorrentes.map(function(t){ return `<span class="tag">${escH(t)}</span>`; }).join('')}</div>
  </div>` : ''}
  ${memJson.padroes_identificados && memJson.padroes_identificados.length ? `<div class="card no-break">
    <div class="card-titulo">Padrões Identificados</div>
    <ul style="padding-left:16px;margin-top:4px">${memJson.padroes_identificados.map(function(p){ return `<li style="font-size:10.5px;color:#3a3a5e;margin-bottom:4px">${escH(p)}</li>`; }).join('')}</ul>
  </div>` : ''}
  ${memJson.pontos_de_atencao && memJson.pontos_de_atencao.length ? `<div class="card no-break">
    <div class="card-titulo" style="color:#ef4444">Pontos de Atenção</div>
    <ul style="padding-left:16px;margin-top:4px">${memJson.pontos_de_atencao.map(function(p){ return `<li style="font-size:10.5px;color:#991b1b;margin-bottom:4px">⚑ ${escH(p)}</li>`; }).join('')}</ul>
  </div>` : ''}
  ${memJson.recursos_identificados && memJson.recursos_identificados.length ? `<div class="card no-break">
    <div class="card-titulo">Recursos Identificados</div>
    <div style="margin-top:6px">${memJson.recursos_identificados.map(function(r){ return `<span class="tag" style="background:#d1fae5;color:#065f46">${escH(r)}</span>`; }).join('')}</div>
  </div>` : ''}
  ${memJson.movimento_terapeutico ? `<div class="card no-break">
    <div class="card-titulo">Movimento Terapêutico</div>
    <div class="card-valor">${escH(memJson.movimento_terapeutico)}</div>
  </div>` : ''}
  ${memJson.proximos_focos && memJson.proximos_focos.length ? `<div class="card no-break">
    <div class="card-titulo">Próximos Focos</div>
    <ol style="padding-left:16px;margin-top:4px">${memJson.proximos_focos.map(function(f){ return `<li style="font-size:10.5px;color:#3a3a5e;margin-bottom:4px">${escH(f)}</li>`; }).join('')}</ol>
  </div>` : ''}
</div>` : '<div class="card"><div class="card-valor" style="color:#8b95a8">Memória terapêutica não gerada ainda.</div></div>'}

<!-- ── SEÇÃO 5: HISTÓRICO DE SESSÕES ── -->
<h2 class="secao-titulo">5. Histórico de Sessões</h2>
${sessoes.length ? `
<div class="no-break" style="margin-bottom:16px">
  <table>
    <thead><tr>
      <th>#</th><th>Data</th><th>Tipo</th><th>Status</th><th>Pago</th><th>Valor</th>
    </tr></thead>
    <tbody>
    ${sessoes.map(function(s) {
      var pago = s.pago ? '<span class="badge badge-green">Pago</span>' : '<span class="badge badge-red">Em aberto</span>';
      var tipo = s.tipo_sessao === 'casal' ? '<span class="badge badge-blue">Casal</span>' : s.tipo_sessao === 'familiar' ? '<span class="badge badge-gold">Familiar</span>' : '<span class="badge badge-gray">Individual</span>';
      var status = s.status === 'realizada' ? '<span class="badge badge-green">Realizada</span>' : '<span class="badge badge-gray">'+escH(s.status)+'</span>';
      return `<tr>
        <td><strong>S${s.sessao_numero}</strong></td>
        <td>${fmtData(s.data_sessao)}</td>
        <td>${tipo}</td>
        <td>${status}</td>
        <td>${pago}</td>
        <td>${s.valor_cobrado ? 'R$ '+parseFloat(s.valor_cobrado).toFixed(2).replace('.',',') : '—'}</td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>
  ${totalAberto > 0 ? `<div style="text-align:right;font-size:11px;color:#991b1b;font-weight:600;margin-top:-8px;margin-bottom:8px">Total em aberto: R$ ${totalAberto.toFixed(2).replace('.',',')}</div>` : ''}
</div>

<!-- Resumos das sessões -->
${sessoesRealizadas.some(function(s){ return s.resumo_terapeuta && s.resumo_terapeuta.trim(); }) ? `
<div style="margin-bottom:16px">
  <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#8b95a8;margin-bottom:10px">Resumos por Sessão</div>
  ${sessoesRealizadas.filter(function(s){ return s.resumo_terapeuta && s.resumo_terapeuta.trim(); }).map(function(s) {
    return `<div class="sess-card">
      <div class="sess-header">
        <div class="sess-num">Sessão ${s.sessao_numero}</div>
        <div class="sess-data">${fmtData(s.data_sessao)}</div>
      </div>
      <div class="sess-resumo">${escH(s.resumo_terapeuta)}</div>
    </div>`;
  }).join('')}
</div>` : ''}` : '<div class="card"><div class="card-valor" style="color:#8b95a8">Nenhuma sessão registrada.</div></div>'}

<!-- ── SEÇÃO 6: ANÁLISE ESTRUTURAL ── -->
${analise ? `<h2 class="secao-titulo">6. Análise Estrutural</h2>
<div class="no-break">
  <div class="card" style="margin-bottom:8px">
    <div class="card-titulo">v${analise.versao} · Gerado em ${fmtData(analise.created_at)}</div>
  </div>
  ${analise.resumo_executivo ? `<div class="card no-break">
    <div class="card-titulo">Resumo Executivo</div>
    <div class="card-valor">${escH(analise.resumo_executivo)}</div>
  </div>` : ''}
  <div class="grid3 no-break">
    ${analJson.nucleo_emocional ? `<div class="card"><div class="card-titulo">Núcleo Emocional</div><div class="card-valor">${escH(analJson.nucleo_emocional)}</div></div>` : ''}
    ${analJson.conflito_central ? `<div class="card"><div class="card-titulo">Conflito Central</div><div class="card-valor">${escH(analJson.conflito_central)}</div></div>` : ''}
    ${analJson.estilo_relacional ? `<div class="card"><div class="card-titulo">Estilo Relacional</div><div class="card-valor">${escH(analJson.estilo_relacional)}</div></div>` : ''}
  </div>
</div>` : ''}

<!-- ── SEÇÃO 7: HIPÓTESES CLÍNICAS ── -->
${hipoteses.length ? `<h2 class="secao-titulo">7. Hipóteses Clínicas</h2>
<div>
${hipoteses.map(function(h) {
  var conf = parseFloat(h.nivel_confianca||0);
  var corConf = conf >= 7 ? '#065f46' : conf >= 5 ? '#92400e' : '#1e40af';
  var bgConf  = conf >= 7 ? '#d1fae5' : conf >= 5 ? '#fef3c7' : '#dbeafe';
  var evFav  = Array.isArray(h.evidencias_favoraveis) ? h.evidencias_favoraveis : (typeof h.evidencias_favoraveis === 'string' ? JSON.parse(h.evidencias_favoraveis||'[]') : []);
  var evContr = Array.isArray(h.evidencias_contrarias) ? h.evidencias_contrarias : (typeof h.evidencias_contrarias === 'string' ? JSON.parse(h.evidencias_contrarias||'[]') : []);
  var pergs  = Array.isArray(h.perguntas_validacao) ? h.perguntas_validacao : (typeof h.perguntas_validacao === 'string' ? JSON.parse(h.perguntas_validacao||'[]') : []);
  return `<div class="hip-card">
    <span class="hip-confianca" style="background:${bgConf};color:${corConf}">${escH(h.tipo||'—')} · Confiança ${conf.toFixed(1)}</span>
    <div class="hip-texto">${escH(h.hipotese||h.origem||'—')}</div>
    ${evFav.length ? `<div class="hip-sub">Evidências Favoráveis</div>${evFav.map(function(e){ return `<div class="hip-item">${escH(e)}</div>`; }).join('')}` : ''}
    ${evContr.length ? `<div class="hip-sub" style="margin-top:6px">Evidências Contrárias</div>${evContr.map(function(e){ return `<div class="hip-item">${escH(e)}</div>`; }).join('')}` : ''}
    ${pergs.length ? `<div class="hip-sub" style="margin-top:6px;color:#1e40af">Perguntas para Validação</div>${pergs.map(function(p){ return `<div class="hip-item" style="color:#1e40af">${escH(p)}</div>`; }).join('')}` : ''}
  </div>`;
}).join('')}
</div>` : ''}

<!-- ── SEÇÃO 8: EVOLUÇÃO DOS ÍNDICES ── -->
${evolucao.length >= 2 ? `<h2 class="secao-titulo">8. Evolução dos Índices</h2>
<div class="no-break">
  <table>
    <thead><tr>
      <th>Data</th><th>Score</th><th>Emocional</th><th>Cognitivo</th><th>Relacional</th><th>Funcional</th><th>Existencial</th><th>Físico</th><th>Autoestima</th>
    </tr></thead>
    <tbody>
    ${evolucao.map(function(e) {
      var idx = parseJson(e.indices_json);
      var dims = idx.dimensoes || idx;
      return `<tr>
        <td>${fmtData(e.gerado_em)}</td>
        <td><strong>${idx.global||e.score_global||'—'}</strong></td>
        <td>${dims.D1||'—'}</td><td>${dims.D2||'—'}</td><td>${dims.D3||'—'}</td>
        <td>${dims.D4||'—'}</td><td>${dims.D5||'—'}</td><td>${dims.D6||'—'}</td><td>${dims.D7||'—'}</td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>
</div>` : ''}

<!-- ── SEÇÃO 9: CIDs ── -->
${cids.length ? `<h2 class="secao-titulo">9. CIDs Identificados</h2>
<div class="no-break">
  <table>
    <thead><tr><th>Código</th><th>Descrição</th><th>Confirmado</th><th>Data</th></tr></thead>
    <tbody>
    ${cids.map(function(c) {
      return `<tr>
        <td><strong>${escH(c.cid_codigo)}</strong></td>
        <td>${escH(c.cid_nome)}</td>
        <td>${c.confirmado ? '<span class="badge badge-green">Confirmado</span>' : '<span class="badge badge-gold">Sugerido</span>'}</td>
        <td>${fmtData(c.created_at)}</td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>
</div>` : ''}

<!-- ── SEÇÃO 10: DOCUMENTOS ── -->
${docs.length ? `<h2 class="secao-titulo">10. Documentos Gerados</h2>
<div class="no-break">
  <table>
    <thead><tr><th>Tipo</th><th>Título</th><th>Data</th></tr></thead>
    <tbody>
    ${docs.map(function(d) {
      return `<tr>
        <td><span class="badge badge-gray">${escH(d.tipo||'—')}</span></td>
        <td>${escH(d.titulo||'—')}</td>
        <td>${fmtData(d.created_at)}</td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>
</div>` : ''}

<!-- ── SEÇÃO 11: FEEDBACKS ── -->
${feedbacks.length ? `<h2 class="secao-titulo">11. Feedbacks do Paciente</h2>
<div>
${feedbacks.map(function(f) {
  return `<div class="card no-break" style="margin-bottom:8px">
    <div class="card-titulo">${fmtData(f.created_at)} · ${escH(f.tipo_feedback||'Feedback')}</div>
    <div class="card-valor">${escH(f.conteudo||'—')}</div>
    ${f.nota ? `<div style="margin-top:4px;font-size:10px;color:#D4AF7F;font-weight:700">Nota: ${f.nota}/10</div>` : ''}
  </div>`;
}).join('')}
</div>` : ''}

<!-- ── RODAPÉ ── -->
<div style="margin-top:40px;padding-top:16px;border-top:1.5px solid #e8eaf0;text-align:center">
  <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#8b95a8">
    Evolution Therapy · Erick Torritezi · Synapse Core<br>
    Documento de uso interno clínico exclusivo · Confidencial · Gerado em ${geradoEm}
  </div>
</div>

</div><!-- /corpo -->

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (err) {
    console.error('dossie/gerar:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
