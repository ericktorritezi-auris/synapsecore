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
    { type: 'item', href: '/perfil',                 icon: '&#9715;',  label: 'Configurações' },
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
  var topbar = document.getElementById('topbar');
  if (topbar) {
    topbar.innerHTML =
      '<img src="/img/logo-horizontal.png" alt="Synapse Core">'
      + '<button class="hamburger" onclick="toggleSidebar()">&#9776;</button>';
  }

  // ── SIDEBAR ──
  var sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.innerHTML =
      '<div class="sb-logo"><img src="/img/logo-horizontal.png" alt="Synapse Core"></div>'
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
}
