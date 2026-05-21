// ══════════════════════════════════════════════
// PACIENTE NAV — Barra de Contexto do Paciente
// Uso: renderPacienteNav(PACIENTE_ID, 'mapeamento')
// Páginas: mapeamento, sessoes, documentos, analise
// ══════════════════════════════════════════════

var PACIENTE_NAV_ITENS = [
  { id:'mapeamento', label:'Mapeamento', icon:'M4 4h16v12H4zM8 20h8', emoji:'🧠', url:function(pid){ return '/mapeamento/'+pid; } },
  { id:'sessoes',    label:'Sessões',    icon:'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', emoji:'📅', url:function(pid){ return '/sessoes/'+pid; } },
  { id:'documentos', label:'Docs',       icon:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6', emoji:'📄', url:function(pid){ return '/documentos/'+pid; } },
  { id:'analise',    label:'Análise',    icon:'M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9M9 3l6 6M9 3v6h6', emoji:'🔬', url:function(pid){ return '/analise/'+pid; } }
];

function renderPacienteNav(pacienteId, paginaAtiva) {
  if (!pacienteId) return;

  // Inject CSS once
  if (!document.getElementById('paciente-nav-style')) {
    var style = document.createElement('style');
    style.id = 'paciente-nav-style';
    style.textContent = [
      '#pac-nav-bar{',
        'position:fixed;left:0;right:0;z-index:45;',
        'background:#151f3a;',
        'border-bottom:1px solid rgba(201,209,217,.1);',
        'height:48px;display:flex;align-items:center;',
        'padding:0 16px;gap:10px;',
        'transition:top .2s;',
      '}',
      '#pac-nav-bar .pnav-back{',
        'font-size:12px;color:rgba(201,209,217,.5);text-decoration:none;',
        'display:flex;align-items:center;gap:4px;flex-shrink:0;',
        'white-space:nowrap;',
      '}',
      '#pac-nav-bar .pnav-back:hover{color:rgba(201,209,217,.8)}',
      '#pac-nav-bar .pnav-div{width:1px;height:18px;background:rgba(201,209,217,.1);flex-shrink:0}',
      '#pac-nav-bar .pnav-av{',
        'width:26px;height:26px;border-radius:50%;flex-shrink:0;',
        'background:linear-gradient(135deg,#D4AF7F,#8B5E1A);',
        'display:flex;align-items:center;justify-content:center;',
        'font-family:\'Satoshi\',sans-serif;font-size:9px;font-weight:700;color:#0B132B;',
      '}',
      '#pac-nav-bar .pnav-name{',
        'font-size:13px;font-weight:700;color:#F5F7FA;',
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
        'flex:1;min-width:0;max-width:140px;',
      '}',
      /* Desktop pills */
      '#pac-nav-pills{display:none;gap:3px;align-items:center;flex-shrink:0}',
      '#pac-nav-pills a{',
        'font-family:\'Satoshi\',sans-serif;font-size:12px;font-weight:600;',
        'padding:5px 12px;border-radius:20px;cursor:pointer;text-decoration:none;',
        'color:rgba(201,209,217,.5);border:1px solid transparent;',
        'display:flex;align-items:center;gap:5px;white-space:nowrap;',
        'transition:all .15s;',
      '}',
      '#pac-nav-pills a:hover{background:rgba(255,255,255,.04);color:#C9D1D9;border-color:rgba(201,209,217,.1)}',
      '#pac-nav-pills a.active{background:rgba(212,175,127,.1);color:#D4AF7F;border-color:rgba(212,175,127,.25)}',
      /* Mobile menu button */
      '#pac-nav-menu-btn{',
        'background:rgba(212,175,127,.1);border:1px solid rgba(212,175,127,.25);',
        'color:#D4AF7F;border-radius:8px;padding:5px 10px;',
        'font-family:\'Satoshi\',sans-serif;font-size:11.5px;font-weight:700;',
        'cursor:pointer;display:flex;align-items:center;gap:5px;',
        'white-space:nowrap;flex-shrink:0;transition:all .15s;',
      '}',
      '#pac-nav-menu-btn svg{transition:transform .2s}',
      '#pac-nav-menu-btn.open svg{transform:rotate(180deg)}',
      /* Mobile dropdown */
      '#pac-nav-dropdown{',
        'display:none;position:fixed;left:0;right:0;z-index:44;',
        'background:rgba(11,19,43,.97);backdrop-filter:blur(16px);',
        'border-bottom:1px solid rgba(201,209,217,.1);',
        'padding:10px 16px 14px;',
        'grid-template-columns:1fr 1fr;gap:8px;',
      '}',
      '#pac-nav-dropdown.open{display:grid}',
      '#pac-nav-dropdown a{',
        'background:rgba(28,37,65,.75);border:1px solid rgba(201,209,217,.1);',
        'border-radius:10px;padding:12px 14px;cursor:pointer;text-decoration:none;',
        'display:flex;align-items:center;gap:10px;transition:all .15s;',
      '}',
      '#pac-nav-dropdown a:hover{background:rgba(255,255,255,.05)}',
      '#pac-nav-dropdown a.active{background:rgba(212,175,127,.1);border-color:rgba(212,175,127,.25)}',
      '#pac-nav-dropdown a span.dn-icon{font-size:18px;width:26px;text-align:center;flex-shrink:0}',
      '#pac-nav-dropdown a span.dn-label{font-size:13px;font-weight:600;color:#C9D1D9}',
      '#pac-nav-dropdown a.active span.dn-label{color:#D4AF7F}',
      /* Overlay */
      '#pac-nav-overlay{display:none;position:fixed;inset:0;z-index:43}',
      '#pac-nav-overlay.open{display:block}',
      /* Responsive */
      '@media(min-width:700px){',
        '#pac-nav-pills{display:flex}',
        '#pac-nav-menu-btn{display:none}',
        '#pac-nav-bar .pnav-name{max-width:200px}',
      '}',
      '@media(min-width:960px){',
        '#pac-nav-bar{left:260px;top:0 !important}',
        '#pac-nav-dropdown{left:260px;top:48px !important}',
        '#pac-nav-bar .pnav-name{max-width:220px}',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  // Build bar HTML
  var bar = document.getElementById('pac-nav-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'pac-nav-bar';
    document.body.appendChild(bar);
  }

  // Fetch patient name
  var token = localStorage.getItem('sc_token');
  fetch('/api/pacientes/'+pacienteId, { headers:{ 'Authorization':'Bearer '+token } })
    .then(function(r){ return r.json(); })
    .then(function(p) {
      var nome = p.nome_completo || 'Paciente';
      var iniciais = nome.split(' ').filter(function(n){ return n.length>0; }).slice(0,2).map(function(n){ return n[0].toUpperCase(); }).join('');

      // Pills HTML
      var pillsHTML = PACIENTE_NAV_ITENS.map(function(item) {
        var ativo = item.id === paginaAtiva ? ' class="active"' : '';
        return '<a href="'+item.url(pacienteId)+'"'+ativo+'>'
          + '<span>'+item.emoji+'</span>'
          + item.label
          + '</a>';
      }).join('');

      // Dropdown HTML
      var dropHTML = PACIENTE_NAV_ITENS.map(function(item) {
        var ativo = item.id === paginaAtiva ? ' class="active"' : '';
        return '<a href="'+item.url(pacienteId)+'"'+ativo+'>'
          + '<span class="dn-icon">'+item.emoji+'</span>'
          + '<span class="dn-label">'+item.label+'</span>'
          + '</a>';
      }).join('');

      bar.innerHTML =
        '<a href="/pacientes" class="pnav-back">'
          + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>'
          + 'Pacientes'
        + '</a>'
        + '<div class="pnav-div"></div>'
        + '<div class="pnav-av">'+iniciais+'</div>'
        + '<span class="pnav-name">'+escapeHtml(nome)+'</span>'
        + '<div id="pac-nav-pills">'+pillsHTML+'</div>'
        + '<button id="pac-nav-menu-btn" onclick="pacNavToggle()">'
          + 'Navegar'
          + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>'
        + '</button>';

      // Compute top position — below topbar
      var th = 60;
      var safeTop = 'calc(' + th + 'px + env(safe-area-inset-top,0px))';
      bar.style.top = safeTop;

      // Inject dropdown
      var dd = document.getElementById('pac-nav-dropdown');
      if (!dd) {
        dd = document.createElement('div');
        dd.id = 'pac-nav-dropdown';
        document.body.appendChild(dd);
      }
      dd.style.top = 'calc('+th+'px + 48px + env(safe-area-inset-top,0px))';
      dd.innerHTML = dropHTML;

      // Overlay
      var ov = document.getElementById('pac-nav-overlay');
      if (!ov) {
        ov = document.createElement('div');
        ov.id = 'pac-nav-overlay';
        ov.onclick = pacNavClose;
        document.body.appendChild(ov);
      }

      // Adjust .main padding-top to account for 48px bar
      var main = document.querySelector('.main');
      if (main) {
        var curPad = window.getComputedStyle(main).paddingTop;
        var curPx  = parseFloat(curPad)||0;
        main.style.paddingTop = (curPx + 48) + 'px';
      }
    })
    .catch(function(e){ console.warn('paciente-nav:', e.message); });
}

function pacNavToggle() {
  var dd  = document.getElementById('pac-nav-dropdown');
  var ov  = document.getElementById('pac-nav-overlay');
  var btn = document.getElementById('pac-nav-menu-btn');
  if (!dd) return;
  var open = dd.classList.contains('open');
  dd.classList.toggle('open', !open);
  ov.classList.toggle('open', !open);
  if (btn) btn.classList.toggle('open', !open);
}

function pacNavClose() {
  var dd  = document.getElementById('pac-nav-dropdown');
  var ov  = document.getElementById('pac-nav-overlay');
  var btn = document.getElementById('pac-nav-menu-btn');
  if (dd)  dd.classList.remove('open');
  if (ov)  ov.classList.remove('open');
  if (btn) btn.classList.remove('open');
}

function escapeHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
