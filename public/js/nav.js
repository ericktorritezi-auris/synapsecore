// ══════════════════════════════════════════════
// SYNAPSE CORE — Menu de Navegação Centralizado
// Versão 1.0 — chamado por todos os HTMLs autenticados
// Para alterar o menu: edite APENAS este arquivo
// ══════════════════════════════════════════════

function renderNav() {
  var path = window.location.pathname;

  // Detecta qual item está ativo com base na URL atual
  function isActive(href) {
    if (href === '/dashboard') return path === '/dashboard' || path === '/';
    if (href === '/pacientes') return path === '/pacientes'
      || path.startsWith('/sessoes/')
      || path.startsWith('/mapeamento/')
      || path.startsWith('/analise/');
    return path === href || path.startsWith(href + '/');
  }

  // ── ESTRUTURA DO MENU ──
  // Para adicionar, remover ou reorganizar itens: edite apenas aqui
  var navDefs = [
    { type: 'section', label: 'Principal' },
    { type: 'item', href: '/dashboard',              icon: '&#9672;',  label: 'Dashboard' },
    { type: 'item', href: '/pacientes',              icon: '&#9675;',  label: 'Pacientes' },
    { type: 'section', label: 'Clínico' },
    { type: 'item', href: '/prontuario-inteligente', icon: '&#128196;', label: 'Prontuário' },
    { type: 'item', href: '/paciente-novo',          icon: '&#9703;',  label: 'Nova Avaliação' },
    { type: 'item', href: '/radar',                  icon: '&#128225;', label: 'Radar Clínico' },
    { type: 'item', href: '/programas',              icon: '&#128203;', label: 'Programas' },
    { type: 'section', label: 'Gestão' },
    { type: 'item', href: '/financeiro',             icon: '&#128176;', label: 'Financeiro' },
    { type: 'section', label: 'Sistema' },
    { type: 'item', href: '/consumo',  icon: '&#9889;',  label: 'Consumo API' },
    { type: 'item', href: '/perfil',   icon: '&#9715;',  label: 'Configurações' },
  ];

  var navHTML = navDefs.map(function(item) {
    if (item.type === 'section') {
      return '<div class="nav-section">' + item.label + '</div>';
    }
    var active = isActive(item.href) ? ' active' : '';
    return '<a href="' + item.href + '" class="nav-item' + active + '">'
      + '<span class="ni">' + item.icon + '</span> ' + item.label
      + '</a>';
  }).join('\n');

  // ── TOPBAR ──
  // For pages with empty topbar (documentos, analise) — fill logo + hamburger
  var topbar = document.getElementById('topbar');
  if (topbar && topbar.children.length === 0) {
    topbar.innerHTML =
      '<img src="/img/logo-horizontal.png" alt="Synapse Core" style="height:26px;width:auto">'
      + '<button class="hamburger" onclick="toggleSidebar()">&#9776;</button>';
  }

  // Mobile bell: position:fixed — works on ANY topbar structure
  if (!document.getElementById('alertasBtnWrap')) {
    var bellBtn = document.createElement('div');
    bellBtn.id = 'alertasBtnWrap';
    bellBtn.style.cssText = [
      'position:fixed',
      'top:env(safe-area-inset-top,0px)',
      'right:52px',
      'width:44px',
      'height:60px',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'z-index:60'
    ].join(';');
    bellBtn.innerHTML =
      '<button onclick="toggleAlertas(event)" id="alertasBtn" style="background:none;border:none;cursor:pointer;padding:10px;position:relative;display:flex;align-items:center;justify-content:center">'
        + '<span id="alertasSino" style="display:flex;align-items:center;color:rgba(201,209,217,.6);transition:color .2s"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></span>'
        + '<span id="alertasBadge" style="display:none;position:absolute;top:6px;right:6px;background:#ef4444;color:white;border-radius:50%;min-width:15px;height:15px;font-size:9px;font-weight:700;align-items:center;justify-content:center;line-height:1;padding:0 2px"></span>'
      + '</button>';
    document.body.appendChild(bellBtn);
  }
  // Inject CSS for mobile bell visibility
  if (!document.getElementById('alertasBellStyle')) {
    var style = document.createElement('style');
    style.id = 'alertasBellStyle';
    style.textContent = '@media(min-width:960px){#alertasBtnWrap{display:none!important}}';
    document.head.appendChild(style);
  }

  // ── SIDEBAR ──
  var sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.innerHTML =
      '<div class="sb-logo" style="display:flex;align-items:center;justify-content:space-between;padding-right:12px">'
        + '<img src="/img/logo-horizontal.png" alt="Synapse Core">'
        + '<div style="position:relative" id="alertasBtnWrapDesktop">'
          + '<button onclick="toggleAlertas(event)" id="alertasBtnDesktop" style="background:none;border:none;cursor:pointer;padding:4px;position:relative;display:flex;align-items:center">'
            + '<span id="alertasSinoDesktop" style="display:flex;align-items:center;color:rgba(201,209,217,.55);transition:color .2s"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d=\"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9\"/><path d=\"M13.73 21a2 2 0 0 1-3.46 0\"/></svg></span>'
            + '<span id="alertasBadgeDesktop" style="display:none;position:absolute;top:0;right:0;background:#ef4444;color:white;border-radius:50%;width:15px;height:15px;font-size:9px;font-weight:700;align-items:center;justify-content:center;line-height:1"></span>'
          + '</button>'
        + '</div>'
      + '</div>'
      + '<nav class="sb-nav">' + navHTML + '</nav>'
      + '<div class="sb-footer">'
        + '<div class="user-pill">'
          + '<div class="user-av" id="userAvatar">ET</div>'
          + '<div style="overflow:hidden;flex:1">'
            + '<div class="user-name" id="userName">--</div>'
            + '<div class="user-role">Evolution Therapy</div>'
          + '</div>'
          + '<button class="logout-btn" onclick="logout()">Sair</button>'
        + '</div>'
      + '</div>';
  }

  // Inject alert dropdown into body
  if (!document.getElementById('alertasDropdown')) {
    var drop = document.createElement('div');
    drop.id = 'alertasDropdown';
    drop.style.cssText = 'display:none;position:fixed;top:0;right:0;width:100%;max-width:380px;max-height:100vh;background:#1a2540;border-left:1px solid rgba(201,209,217,.1);border-bottom:1px solid rgba(201,209,217,.1);z-index:200;box-shadow:-4px 4px 32px rgba(0,0,0,.5);border-bottom-left-radius:16px;overflow:hidden;flex-direction:column';
    drop.innerHTML =
      '<div style="padding:16px 16px 10px;border-bottom:1px solid rgba(201,209,217,.08);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'
        + '<div style="font-family:\'Satoshi\',sans-serif;font-size:15px;font-weight:700;display:flex;align-items:center;gap:7px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4AF7F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> Alertas</div>'
        + '<div style="display:flex;gap:8px;align-items:center">'
          + '<button onclick="marcarTodosLidos()" style="font-size:11px;background:rgba(212,175,127,.08);color:#D4AF7F;border:1px solid rgba(212,175,127,.2);border-radius:6px;padding:4px 8px;cursor:pointer">&#10003; Todos lidos</button>'
          + '<button onclick="fecharAlertas()" style="background:none;border:none;color:rgba(201,209,217,.4);cursor:pointer;font-size:16px;padding:2px 4px">&#10005;</button>'
        + '</div>'
      + '</div>'
      + '<div id="alertasLista" style="overflow-y:auto;flex:1;padding:8px 0"></div>';
    document.body.appendChild(drop);

    // Close on outside click
    document.addEventListener('click', function(e) {
      var d = document.getElementById('alertasDropdown');
      if (d && d.style.display !== 'none') {
        var btn1 = document.getElementById('alertasBtnWrap');
        var btn2 = document.getElementById('alertasBtnWrapDesktop');
        if (!d.contains(e.target) && !(btn1 && btn1.contains(e.target)) && !(btn2 && btn2.contains(e.target))) {
          fecharAlertas();
        }
      }
    });
  }

  // Load count on init
  setTimeout(carregarContadorAlertas, 800);
  // Refresh every 5 minutes
  setInterval(carregarContadorAlertas, 5 * 60 * 1000);
}

// ── ALERTAS: funções globais ──
function toggleAlertas(e) {
  if (e) e.stopPropagation();
  var d = document.getElementById('alertasDropdown');
  if (!d) return;
  if (d.style.display === 'flex') {
    fecharAlertas();
  } else {
    d.style.display = 'flex';
    carregarAlertas();
  }
}

function fecharAlertas() {
  var d = document.getElementById('alertasDropdown');
  if (d) d.style.display = 'none';
}

function carregarContadorAlertas() {
  var token = localStorage.getItem('sc_token');
  if (!token) return;
  fetch('/api/alertas/count', { headers: { 'Authorization': 'Bearer '+token } })
    .then(function(r){ return r.json(); })
    .then(function(d) { atualizarBadge(d.count||0); })
    .catch(function(){});
}

function atualizarBadge(count) {
  ['alertasSino','alertasSinoDesktop'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.color = count > 0 ? '#D4AF7F' : 'rgba(201,209,217,.55)';
  });
  ['alertasBadge','alertasBadgeDesktop'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (count > 0) {
      el.style.display = 'inline-flex';
      el.textContent = count > 99 ? '99+' : String(count);
    } else {
      el.style.display = 'none';
    }
  });
}

function carregarAlertas() {
  var lista = document.getElementById('alertasLista');
  if (!lista) return;
  lista.innerHTML = '<div style="padding:20px;text-align:center;color:rgba(201,209,217,.4);font-size:13px">Carregando...</div>';
  var token = localStorage.getItem('sc_token');
  fetch('/api/alertas', { headers: { 'Authorization': 'Bearer '+token } })
    .then(function(r){ return r.json(); })
    .then(function(data) { renderAlertas(data); })
    .catch(function(){ lista.innerHTML='<div style="padding:20px;text-align:center;color:#fca5a5;font-size:13px">Erro ao carregar alertas.</div>'; });
}

var ALERTA_CORES = {
  critico:     { bg:'rgba(239,68,68,.08)',    brd:'rgba(239,68,68,.2)',    txt:'#fca5a5',  dot:'#ef4444' },
  atencao:     { bg:'rgba(249,115,22,.06)',   brd:'rgba(249,115,22,.18)', txt:'#fdba74',  dot:'#f97316' },
  operacional: { bg:'rgba(245,158,11,.06)',   brd:'rgba(245,158,11,.15)', txt:'#fcd34d',  dot:'#f59e0b' },
  informativo: { bg:'rgba(16,185,129,.05)',   brd:'rgba(16,185,129,.15)', txt:'#6ee7b7',  dot:'#10b981' }
};

function renderAlertas(data) {
  var lista = document.getElementById('alertasLista');
  if (!lista) return;
  if (!data.length) {
    lista.innerHTML = '<div style="padding:32px 20px;text-align:center"><div style="font-size:28px;margin-bottom:8px">&#10003;</div><div style="color:rgba(201,209,217,.4);font-size:13px">Nenhum alerta no momento</div></div>';
    return;
  }
  lista.innerHTML = data.map(function(a) {
    var cor = ALERTA_CORES[a.prioridade] || ALERTA_CORES.informativo;
    var ago = tempoAtrasAlerta(a.gerado_em);
    var acoes = '';

    if (a.acao_tipo === 'paciente' && a.acao_url) {
      acoes += '<a href="'+escH(a.acao_url)+'" onclick="fecharAlertas()" style="font-size:11px;padding:3px 8px;border-radius:5px;background:rgba(255,255,255,.06);color:rgba(201,209,217,.7);border:1px solid rgba(255,255,255,.08);text-decoration:none;cursor:pointer">Abrir</a>';
    }
    if (a.acao_tipo === 'financeiro') {
      acoes += '<a href="/financeiro" onclick="fecharAlertas()" style="font-size:11px;padding:3px 8px;border-radius:5px;background:rgba(255,255,255,.06);color:rgba(201,209,217,.7);border:1px solid rgba(255,255,255,.08);text-decoration:none;cursor:pointer">Financeiro</a>';
    }
    if (a.acao_whatsapp) {
      var msgWpp = 'Olá ' + (a.nome_completo ? a.nome_completo.split(' ')[0] : '') + '! Tudo bem?';
      acoes += '<a href="https://wa.me/'+escH(a.acao_whatsapp)+'?text='+encodeURIComponent(msgWpp)+'" target="_blank" style="font-size:11px;padding:3px 8px;border-radius:5px;background:rgba(37,211,102,.08);color:#25d366;border:1px solid rgba(37,211,102,.2);text-decoration:none;cursor:pointer">WhatsApp</a>';
    }
    acoes += '<button onclick="lerAlerta('+a.id+')" style="font-size:11px;padding:3px 8px;border-radius:5px;background:rgba(255,255,255,.04);color:rgba(201,209,217,.5);border:1px solid rgba(255,255,255,.06);cursor:pointer" title="Marcar como lido">&#10003;</button>';
    acoes += '<button onclick="lembrarAlerta('+a.id+')" style="font-size:11px;padding:3px 8px;border-radius:5px;background:rgba(255,255,255,.04);color:rgba(201,209,217,.5);border:1px solid rgba(255,255,255,.06);cursor:pointer" title="Lembrar em 24h">&#9201;</button>';

    return '<div style="margin:4px 8px;padding:10px 12px;background:'+cor.bg+';border:1px solid '+cor.brd+';border-radius:10px">'
      + '<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px">'
        + '<span style="width:7px;height:7px;border-radius:50%;background:'+cor.dot+';flex-shrink:0;margin-top:5px"></span>'
        + '<div style="flex:1;font-size:13px;font-weight:600;color:#F5F7FA;line-height:1.4">'+escH(a.titulo)+'</div>'
      + '</div>'
      + (a.corpo ? '<div style="font-size:12px;color:rgba(201,209,217,.6);line-height:1.5;margin-bottom:7px;padding-left:15px">'+escH(a.corpo)+'</div>' : '')
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding-left:15px">'
        + '<span style="font-size:10.5px;color:rgba(201,209,217,.35)">'+ago+'</span>'
        + '<div style="display:flex;gap:4px">'+acoes+'</div>'
      + '</div>'
    + '</div>';
  }).join('');
}

function lerAlerta(id) {
  var token = localStorage.getItem('sc_token');
  fetch('/api/alertas/'+id+'/lido', { method:'PUT', headers:{'Authorization':'Bearer '+token} })
    .then(function(){ carregarAlertas(); carregarContadorAlertas(); })
    .catch(function(){});
}

function lembrarAlerta(id) {
  var token = localStorage.getItem('sc_token');
  fetch('/api/alertas/'+id+'/lembrar', { method:'PUT', headers:{'Authorization':'Bearer '+token} })
    .then(function(){ carregarAlertas(); carregarContadorAlertas(); })
    .catch(function(){});
}

function marcarTodosLidos() {
  var token = localStorage.getItem('sc_token');
  fetch('/api/alertas/lidos-todos', { method:'PUT', headers:{'Authorization':'Bearer '+token} })
    .then(function(){ carregarAlertas(); carregarContadorAlertas(); })
    .catch(function(){});
}

function tempoAtrasAlerta(ts) {
  if (!ts) return '';
  var diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return Math.floor(diff/60) + 'min atrás';
  if (diff < 86400) return Math.floor(diff/3600) + 'h atrás';
  return Math.floor(diff/86400) + 'd atrás';
}

function escH(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
