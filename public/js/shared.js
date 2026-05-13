// SYNAPSE CORE — Shared Utilities v1.2.0

// ── AUTH ──
function checkAuth() {
  const token = localStorage.getItem('sc_token');
  if (!token) { window.location.href = '/'; return null; }
  return token;
}
function getUser() {
  return JSON.parse(localStorage.getItem('sc_terapeuta') || 'null');
}
function logout() {
  localStorage.removeItem('sc_token');
  localStorage.removeItem('sc_terapeuta');
  window.location.href = '/';
}

// ── API ──
async function api(url, method = 'GET', data = null) {
  const token = localStorage.getItem('sc_token');
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  };
  if (data) opts.body = JSON.stringify(data);
  const res  = await fetch(url, opts);
  const json = await res.json();
  if (!res.ok) throw { status: res.status, message: json.message || 'Erro' };
  return json;
}

// ── TOAST ──
function showToast(msg, type = 'success') {
  const old = document.getElementById('sc-toast');
  if (old) old.remove();
  const colors = {
    success: { bg:'#0d2b1f', border:'rgba(16,185,129,0.3)', text:'#6ee7b7' },
    error:   { bg:'#2b0d0d', border:'rgba(239,68,68,0.3)',  text:'#fca5a5' },
    info:    { bg:'#1a2010', border:'rgba(212,175,127,0.3)',text:'#D4AF7F' }
  };
  const c = colors[type] || colors.info;
  const el = document.createElement('div');
  el.id = 'sc-toast';
  el.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(0);
    background:${c.bg};border:1px solid ${c.border};color:${c.text};
    padding:12px 20px;border-radius:10px;font-family:'Inter',sans-serif;
    font-size:13px;z-index:9999;max-width:320px;text-align:center;
    box-shadow:0 8px 24px rgba(0,0,0,0.4);white-space:nowrap;
    animation:scToastIn 0.3s ease;
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.animation='scToastOut 0.3s ease forwards'; setTimeout(()=>el.remove(),300); }, 3000);
}

// ── SIDEBAR ──
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('overlay')?.classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('overlay')?.classList.remove('open');
}

// ── ACTIVE NAV ──
function setActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item[href]').forEach(item => {
    const h = item.getAttribute('href');
    const active = h && h !== '#' && h !== '/' && path.startsWith(h);
    item.classList.toggle('active', active);
  });
}

// ── USER PILL ──
function renderUserPill(avId = 'userAvatar', nameId = 'userName') {
  const u = getUser();
  if (!u) return;
  const initials = u.nome.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
  const av   = document.getElementById(avId);
  const name = document.getElementById(nameId);
  if (name) name.textContent = u.nome.split(' ').slice(0,2).join(' ');
  if (av) av.innerHTML = u.foto_url
    ? `<img src="${u.foto_url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : initials;
}

// ── GREETING ──
function renderGreeting(titleId = 'greetingTitle', dateId = 'greetingDate') {
  const u = getUser();
  const now = new Date();
  const h   = now.getHours();
  const greet = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const nome  = u ? u.nome.split(' ')[0] : '';
  const dias  = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const titleEl = document.getElementById(titleId);
  const dateEl  = document.getElementById(dateId);
  if (titleEl) titleEl.textContent = `${greet}, ${nome} 👋`;
  if (dateEl)  dateEl.textContent  = `${dias[now.getDay()]}, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;
}

// ── DATE UTILS ──
function calcIdade(dataNasc) {
  if (!dataNasc) return null;
  const dob = new Date(dataNasc);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) age--;
  return age;
}
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
}
function formatPhone(tel) {
  if (!tel) return '';
  return tel.replace(/\D/g,'').replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
}
function waLink(tel) {
  if (!tel) return null;
  const n = tel.replace(/\D/g,'');
  return `https://wa.me/55${n}`;
}

// ── COPY TO CLIPBOARD ──
async function copyText(text, btnEl) {
  try {
    await navigator.clipboard.writeText(text);
    if (btnEl) {
      const orig = btnEl.textContent;
      btnEl.textContent = '✓ Copiado!';
      setTimeout(() => btnEl.textContent = orig, 2000);
    }
    showToast('Link copiado!', 'success');
  } catch {
    showToast('Não foi possível copiar. Selecione e copie manualmente.', 'error');
  }
}

// ── PROFILE TYPE CONFIG ──
const PERFIL_CONFIG = {
  adulto:        { label:'Adulto',        color:'#3b82f6', bg:'rgba(59,130,246,0.12)',  icon:'👤' },
  casal:         { label:'Casal',         color:'#8b5cf6', bg:'rgba(139,92,246,0.12)',  icon:'💑' },
  adolescente:   { label:'Adolescente',   color:'#06b6d4', bg:'rgba(6,182,212,0.12)',   icon:'🧒' },
  neurodivergente:{ label:'Neurodiv.',    color:'#D4AF7F', bg:'rgba(212,175,127,0.12)', icon:'🧬' },
  atleta:        { label:'Atleta',        color:'#f97316', bg:'rgba(249,115,22,0.12)',  icon:'⚡' }
};

// ── TOPBAR PADDING FIX (mobile/PWA cross-platform) ──
// env(safe-area-inset-top) is unreliable on Android — dynamic measurement is safer
function fixTopPadding() {
  var tb = document.getElementById('topbar') || document.querySelector('.topbar');
  var main = document.querySelector('.main');
  if (!tb || !main) return;
  var h = tb.getBoundingClientRect().height;
  if (h > 0) main.style.paddingTop = (h + 24) + 'px';
}
window.addEventListener('load', fixTopPadding);
window.addEventListener('resize', fixTopPadding);

// Inject animation styles once
const _s = document.createElement('style');
_s.textContent = `
  @keyframes scToastIn  { from{opacity:0;transform:translateX(-50%) translateY(12px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
  @keyframes scToastOut { from{opacity:1;transform:translateX(-50%) translateY(0)} to{opacity:0;transform:translateX(-50%) translateY(12px)} }
`;
document.head.appendChild(_s);
