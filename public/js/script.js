/* ================================================================
   Painel do Consórcio — front-end
   Estrutura com barra lateral (Dashboard / Pipeline / Leads / Tarefas),
   inspirada no CRM Foco, mantendo tudo que já existia (MongoDB via
   API REST, modo noturno, cor de destaque, WhatsApp, arraste de cards).
================================================================ */

const API_BASE = '/api';

/* ---------- helpers ---------- */
const fmtBRL = (n) => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:2, maximumFractionDigits:2 }).format(n || 0);
const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_CHEIO = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const currentMonthKey = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const monthLabel = (key, full=false) => {
  if(!key) return '';
  const [y,m] = key.split('-').map(Number);
  const arr = full ? MESES_CHEIO : MESES_ABREV;
  return full ? `${arr[m-1]} de ${y}` : `${arr[m-1]}/${y}`;
};
const maskInteiro = (raw) => {
  const digits = String(raw).replace(/\D/g,'');
  if(!digits) return { numero:0, texto:'' };
  const numero = parseInt(digits,10);
  return { numero, texto: numero.toLocaleString('pt-BR') };
};
const esc = (s='') => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function formatDate(iso){
  if(!iso) return '';
  const d = new Date(iso);
  if(isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { timeZone:'UTC' });
}

// Monta o link wa.me a partir do telefone digitado (aceita com ou sem DDI 55)
function waLink(telefone){
  let digitos = String(telefone||'').replace(/\D/g,'');
  if(!digitos) return null;
  if(digitos.length <= 11) digitos = '55' + digitos; // assume Brasil se não veio com DDI
  return `https://wa.me/${digitos}`;
}
function abrirWhatsapp(telefone){
  const link = waLink(telefone);
  if(link) window.open(link, '_blank', 'noopener');
}
const WA_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.36 2 11.75c0 1.87.52 3.62 1.42 5.12L2 22l5.3-1.38a10.4 10.4 0 0 0 4.7 1.13c5.52 0 10-4.36 10-9.75S17.52 2 12 2Zm5.3 13.88c-.23.62-1.32 1.2-1.82 1.24-.47.05-.9.22-3.02-.63-2.56-1.03-4.2-3.63-4.33-3.8-.13-.17-1.03-1.34-1.03-2.56 0-1.21.65-1.8.88-2.05.23-.24.5-.3.67-.3.17 0 .33 0 .48.01.16.01.36-.06.56.42.23.55.77 1.9.84 2.04.07.14.11.3.02.48-.09.17-.14.28-.27.43-.13.15-.28.33-.4.45-.13.13-.27.27-.12.53.16.27.7 1.13 1.5 1.83 1.03.9 1.9 1.18 2.17 1.31.27.13.43.11.59-.07.16-.18.68-.77.87-1.03.18-.27.36-.22.6-.13.24.09 1.55.72 1.82.85.27.13.45.2.51.31.07.12.07.65-.16 1.27Z"/></svg>`;

/* ---------- ícones da interface (genéricos, estilo linha) ---------- */
const ICON_DASHBOARD = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`;
const ICON_PIPELINE = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="4.5" height="16" rx="1"/><rect x="9.75" y="4" width="4.5" height="10" rx="1"/><rect x="16.5" y="4" width="4.5" height="13" rx="1"/></svg>`;
const ICON_LEADS = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
const ICON_TASKS = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
const ICON_COMISSOES = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="16" r="3"/><line x1="19" y1="5" x2="5" y2="19"/></svg>`;
const ICON_SETTINGS = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`;
const ICON_SPARKLE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2Z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"/><path d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z"/></svg>`;
const ICON_BELL = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
const ICON_CONVERSAS = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const ICON_DISPAROS = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
const ICON_RELATORIOS = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
const ICON_SUPORTE = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const ICON_CHAT_INTERNO = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;
const ICON_SUPERVISAO = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_AUTOMACOES = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
const ICON_FLUXOS = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="12" r="2"/><path d="M5 8v8"/><path d="M7 6h6a4 4 0 0 1 4 4"/><path d="M7 18h6a4 4 0 0 0 4-4"/></svg>`;
const ICON_LOGOUT = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
const ICON_EDIT = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>`;
const ICON_TRASH = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
const ICON_CHECK = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_USERS = ICON_LEADS;
const ICON_DOLLAR = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
const ICON_TROPHY = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 6h2a2 2 0 0 1 0 4h-2"/><path d="M7 6H5a2 2 0 0 0 0 4h2"/></svg>`;
const ICON_TREND = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`;

const TEMPS = {
  quente: { label:'Quente', emoji:'🔥', color:'var(--gold-text)', bg:'var(--gold)' },
  morno:  { label:'Morno',  emoji:'☀️', color:'var(--warm)',      bg:'var(--warm-soft)' },
  frio:   { label:'Frio',   emoji:'❄️', color:'var(--cold)',      bg:'var(--cold-soft)' },
};
const TIPOS = {
  aberto:  { label:'Em aberto', color:'var(--ink-soft)', bg:'var(--badge-neutral-bg)' },
  ganho:   { label:'Ganho',     color:'#FFFFFF',         bg:'var(--accent)' },
  perdido: { label:'Perdido',   color:'var(--ink-soft)', bg:'var(--badge-neutral-bg)', strike:true },
};
const PRIORIDADES = {
  alta:  { label:'Alta',  color:'var(--gold-text)', bg:'var(--gold)' },
  media: { label:'Média', color:'var(--warm)',       bg:'var(--warm-soft)' },
  baixa: { label:'Baixa', color:'var(--cold)',       bg:'var(--cold-soft)' },
};

/* ---------- cor de destaque personalizável ---------- */
const ACCENT_PRESETS = ['#141414', '#1D4E89', '#1F4D3A', '#6E1E2B', '#9C6B12', '#4A2E6F'];
function getAccentColor(){ return localStorage.getItem('accentColor') || ACCENT_PRESETS[0]; }
function setAccentColor(cor){
  localStorage.setItem('accentColor', cor);
  document.documentElement.style.setProperty('--accent', cor);
}
document.documentElement.style.setProperty('--accent', getAccentColor());

/* ---------- modo noturno ---------- */
function getDarkMode(){ return localStorage.getItem('darkMode') === '1'; }
function setDarkMode(ligado){
  localStorage.setItem('darkMode', ligado ? '1' : '0');
  document.documentElement.setAttribute('data-theme', ligado ? 'dark' : 'light');
}
setDarkMode(getDarkMode());

/* ---------- nome do site (fixo) e saudação (editável) ---------- */
document.title = 'Painel CRM';
function getGreetingName(){
  const custom = localStorage.getItem('greetingName');
  if(custom) return custom;
  return (currentUser && currentUser.nome) ? currentUser.nome : '';
}
function setGreetingName(nome){
  const final = (nome || '').trim();
  if(final) localStorage.setItem('greetingName', final);
  else localStorage.removeItem('greetingName');
}

/* ---------- sessão / login ---------- */
function getToken(){ return localStorage.getItem('token'); }
function getCurrentUser(){
  try{ return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch(e){ return null; }
}
function logout(){
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

/* Sem token, nem tenta carregar o painel — manda direto pro login */
if(!getToken()){
  window.location.href = 'login.html';
}

/* ---------- estado ---------- */
let currentUser = getCurrentUser();
let board = { columns: [], cards: [] };
let tasks = [];
let loaded = false;
let tasksLoaded = false;
let errorMsg = null;
let currentPage = 'dashboard';   // 'dashboard' | 'pipeline' | 'leads' | 'tarefas'
let filterMonth = null;          // null = Geral (página Pipeline)
let dashboardPeriod = 'mes';     // '7dias' | 'mes' | 'trimestre' | 'ano'
let addingCol = false;
let newColNameVal = '';
let editingColId = null;
let editingColName = '';
let openMenuColId = null;
let editingGreeting = false;
let greetingDraft = '';
let dateMenuOpen = false;
let leadsSearch = '';
let leadsStatusFilter = '';
let tarefasShowConcluidas = false;
let calendarConnected = false;
let calendarSyncing = false;
let calendarSyncedOnce = false;
let whatsappConnected = false;
let whatsappSalvando = false;
let whatsappConfigMsg = null;
let agenteIaAtivo = false;
let instagramConnected = false;
let instagramSalvando = false;
let instagramConfigMsg = null;
let conversas = [];
let conversasLoaded = false;
let notifOpen = false;
let disparoFiltroColuna = '';
let disparoFiltroTemp = '';
let disparoSelecionados = new Set();
let disparoTexto = '';
let disparoEnviando = false;
let disparoResultado = null;
let disparoUsarTemplate = false;
let disparoTemplateNome = '';
let disparoTemplateIdioma = 'pt_BR';
let disparoTemplateVariaveis = '';
let disparoTemplatesDisponiveis = [];
let funis = [];
let funisLoaded = false;
let funilAtualId = null;
let editingFunilId = null;
let editingFunilName = '';
let relatorioFunilId = '';
let equipe = null;
let equipeLoaded = false;
let equipeNomeNovo = '';
let equipeCodigoEntrar = '';
let equipeMsg = null;
let chatMensagens = [];
let chatLoaded = false;
let chatTexto = '';
let chatEnviando = false;
let supervisaoMembros = [];
let supervisaoLoaded = false;
let automacoes = [];
let automacoesLoaded = false;
let automacaoModalForm = null;
let fluxos = [];
let fluxosLoaded = false;
let fluxoModalForm = null;
let contratos = [];
let contratosLoaded = false;
let comissoesMonth = currentMonthKey();
let contratoModalForm = null;
let senhaAtualVal = '';
let senhaNovaVal = '';
let senhaMsg = null; // { tipo:'ok'|'erro', texto }
let senhaSalvando = false;
let importColumnId = null;
let importResultado = null; // { sucesso, falha }
let importando = false;
let aiInsights = [];
let sidebarOpen = false;
let insightsCarregando = false;
let modalForm = null;            // objeto do cliente sendo editado/criado
let taskModalForm = null;        // objeto da tarefa sendo editada/criada
let confirmState = null;         // { message, onConfirm }

/* ---------- comunicação com a API ---------- */
async function apiRequest(method, path, body){
  const opts = { method, headers: {} };
  const token = getToken();
  if(token) opts.headers['Authorization'] = 'Bearer ' + token;
  if(body !== undefined){
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(API_BASE + path, opts);
  if(res.status === 401){
    logout();
    throw new Error('Sessão expirada.');
  }
  if(!res.ok){
    let msg = 'Erro na requisição ao servidor';
    try{ const data = await res.json(); if(data && data.error) msg = data.error; }catch(e){}
    throw new Error(msg);
  }
  if(res.status === 204) return null;
  return res.json();
}

/* ---------- carregamento inicial ---------- */
async function loadBoard(){
  try{
    const data = await apiRequest('GET', '/board');
    board = { columns: data.columns, cards: data.cards };
    errorMsg = null;
  }catch(e){
    board = { columns: [], cards: [] };
    errorMsg = 'Não foi possível carregar os dados do servidor. Verifique se a API e o MongoDB estão rodando.';
  }
  loaded = true;
  renderApp();
}

/* ---------- funis (múltiplos pipelines) ---------- */
async function loadFunis(){
  try{
    const data = await apiRequest('GET', '/funis');
    funis = data.funis || [];
    if((!funilAtualId || !funis.some(f=>f.id===funilAtualId)) && funis.length){
      funilAtualId = funis[0].id;
    }
  }catch(e){
    funis = [];
  }
  funisLoaded = true;
  renderApp();
}
async function criarNovoFunil(){
  try{
    const novo = await apiRequest('POST', '/funis', { nome: 'Novo funil' });
    funis.push(novo);
    funilAtualId = novo.id;
  }catch(e){
    errorMsg = 'Não foi possível criar o funil.';
  }
  renderApp();
}
async function renomearFunil(id, nome){
  const f = funis.find(x=>x.id===id);
  if(!f) return;
  const nomeFinal = nome.trim() || f.nome;
  const anterior = f.nome;
  f.nome = nomeFinal;
  renderApp();
  try{
    await apiRequest('PUT', `/funis/${id}`, { nome: nomeFinal });
  }catch(e){
    f.nome = anterior;
    errorMsg = 'Não foi possível renomear o funil.';
    renderApp();
  }
}
async function excluirFunil(id){
  const idx = funis.findIndex(f=>f.id===id);
  if(idx===-1) return;
  const [removido] = funis.splice(idx,1);
  const colunasRemovidas = board.columns.filter(c=>c.funilId===id);
  const colunaIds = new Set(colunasRemovidas.map(c=>c.id));
  const cardsRemovidos = board.cards.filter(c=>colunaIds.has(c.columnId));
  board.columns = board.columns.filter(c=>c.funilId!==id);
  board.cards = board.cards.filter(c=>!colunaIds.has(c.columnId));
  if(funilAtualId === id) funilAtualId = funis.length ? funis[0].id : null;
  renderApp();
  try{
    await apiRequest('DELETE', `/funis/${id}`);
  }catch(e){
    funis.splice(idx,0,removido);
    board.columns.push(...colunasRemovidas);
    board.cards.push(...cardsRemovidos);
    if(!funis.some(f=>f.id===funilAtualId)) funilAtualId = removido.id;
    errorMsg = 'Não foi possível excluir o funil.';
    renderApp();
  }
}

async function loadTasks(){
  try{
    const data = await apiRequest('GET', '/tasks');
    tasks = data.tasks;
  }catch(e){
    tasks = [];
  }
  tasksLoaded = true;
  renderApp();
}
async function loadContratos(){
  try{
    const data = await apiRequest('GET', '/comissoes');
    contratos = data.contratos;
  }catch(e){
    contratos = [];
  }
  contratosLoaded = true;
  renderApp();
}

/* ---------- Google Agenda ---------- */
async function loadCalendarStatus(){
  try{
    const data = await apiRequest('GET', '/calendar/status');
    calendarConnected = !!data.connected;
  }catch(e){
    calendarConnected = false;
  }
  renderApp();
}

/* ---------- WhatsApp Business API ---------- */
async function loadWhatsappStatus(){
  try{
    const data = await apiRequest('GET', '/whatsapp/status');
    whatsappConnected = !!data.connected;
    agenteIaAtivo = !!data.agenteIaAtivo;
  }catch(e){
    whatsappConnected = false;
  }
  renderApp();
}
async function definirAgenteIa(ativo){
  try{
    await apiRequest('POST', '/whatsapp/agente-ia', { ativo });
    agenteIaAtivo = ativo;
  }catch(e){
    errorMsg = e.message || 'Não foi possível atualizar o agente de IA.';
  }
  renderApp();
}
async function salvarWhatsappConfig(){
  const phoneEl = document.getElementById('wa-phone-id');
  const tokenEl = document.getElementById('wa-token');
  const wabaEl = document.getElementById('wa-waba-id');
  const phoneNumberId = phoneEl ? phoneEl.value.trim() : '';
  const accessToken = tokenEl ? tokenEl.value.trim() : '';
  const wabaId = wabaEl ? wabaEl.value.trim() : '';
  if(!phoneNumberId || !accessToken){
    whatsappConfigMsg = { tipo:'erro', texto:'Preencha o Phone Number ID e o Access Token.' };
    renderApp();
    return;
  }
  whatsappSalvando = true;
  whatsappConfigMsg = null;
  renderApp();
  try{
    await apiRequest('POST', '/whatsapp/configurar', { phoneNumberId, accessToken, wabaId });
    whatsappConnected = true;
    whatsappConfigMsg = { tipo:'ok', texto:'Conectado com sucesso.' };
  }catch(e){
    whatsappConfigMsg = { tipo:'erro', texto: e.message || 'Não foi possível salvar a configuração.' };
  }
  whatsappSalvando = false;
  renderApp();
}
async function desconectarWhatsapp(){
  try{
    await apiRequest('POST', '/whatsapp/desconectar');
    whatsappConnected = false;
  }catch(e){
    errorMsg = 'Não foi possível desconectar o WhatsApp Business.';
  }
  renderApp();
}

/* ---------- Instagram (captação de leads) ---------- */
async function loadInstagramStatus(){
  try{
    const data = await apiRequest('GET', '/instagram/status');
    instagramConnected = !!data.connected;
  }catch(e){
    instagramConnected = false;
  }
  renderApp();
}
async function salvarInstagramConfig(){
  const pageIdEl = document.getElementById('ig-page-id');
  const tokenEl = document.getElementById('ig-page-token');
  const pageId = pageIdEl ? pageIdEl.value.trim() : '';
  const pageAccessToken = tokenEl ? tokenEl.value.trim() : '';
  if(!pageId || !pageAccessToken){
    instagramConfigMsg = { tipo:'erro', texto:'Preencha o Page ID e o Access Token da página.' };
    renderApp();
    return;
  }
  instagramSalvando = true;
  instagramConfigMsg = null;
  renderApp();
  try{
    await apiRequest('POST', '/instagram/configurar', { pageId, pageAccessToken });
    instagramConnected = true;
    instagramConfigMsg = { tipo:'ok', texto:'Conectado com sucesso.' };
  }catch(e){
    instagramConfigMsg = { tipo:'erro', texto: e.message || 'Não foi possível salvar a configuração.' };
  }
  instagramSalvando = false;
  renderApp();
}
async function desconectarInstagram(){
  try{
    await apiRequest('POST', '/instagram/desconectar');
    instagramConnected = false;
  }catch(e){
    errorMsg = 'Não foi possível desconectar o Instagram.';
  }
  renderApp();
}

async function abrirConversaWhatsapp(){
  const box = document.getElementById('f-wa-conversa');
  if(!box || !modalForm || modalForm.__isNew) return;
  box.style.display = 'block';
  box.innerHTML = '<p class="settings-page-note">Carregando conversa…</p>';
  try{
    const data = await apiRequest('GET', `/whatsapp/conversas/${modalForm.id}`);
    renderConversaWhatsapp(data.mensagens || []);
  }catch(e){
    box.innerHTML = `<p class="settings-page-msg erro">${esc(e.message || 'Não foi possível carregar a conversa.')}</p>`;
  }
}
function statusMensagemIcone(status){
  if(status === 'read') return `<span class="wa-status wa-status-read" title="Lida">✓✓</span>`;
  if(status === 'delivered') return `<span class="wa-status" title="Entregue">✓✓</span>`;
  if(status === 'failed') return `<span class="wa-status wa-status-failed" title="Falhou">⚠</span>`;
  if(status === 'sent') return `<span class="wa-status" title="Enviada">✓</span>`;
  return '';
}
function renderConversaWhatsapp(mensagens){
  const box = document.getElementById('f-wa-conversa');
  if(!box) return;
  box.innerHTML = `
    <div class="wa-conversa-lista">
      ${mensagens.length ? mensagens.map(m=>`
        <div class="wa-msg wa-msg-${m.direction}">
          <p>${esc(m.texto)}</p>
          <span>${new Date(m.timestamp).toLocaleString('pt-BR')} ${m.direction==='out' ? statusMensagemIcone(m.status) : ''}</span>
        </div>
      `).join('') : '<p class="settings-page-note">Nenhuma mensagem ainda.</p>'}
    </div>
    <div class="wa-conversa-input-row">
      <input type="text" id="wa-nova-msg" placeholder="Digite uma mensagem..." />
      <button type="button" class="btn-primary" id="wa-enviar-btn">Enviar</button>
    </div>
  `;
  const lista = box.querySelector('.wa-conversa-lista');
  if(lista) lista.scrollTop = lista.scrollHeight;
  const input = document.getElementById('wa-nova-msg');
  const enviarBtn = document.getElementById('wa-enviar-btn');
  const enviar = async ()=>{
    const texto = input.value.trim();
    if(!texto || !modalForm) return;
    enviarBtn.disabled = true;
    try{
      await apiRequest('POST', '/whatsapp/enviar', { cardId: modalForm.id, texto });
      input.value = '';
      await abrirConversaWhatsapp();
    }catch(e){
      errorMsg = e.message || 'Não foi possível enviar a mensagem.';
      renderApp();
    }
    if(enviarBtn) enviarBtn.disabled = false;
  };
  enviarBtn.addEventListener('click', enviar);
  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') enviar(); });
}

function formatDateHora(iso){
  if(!iso) return '';
  const d = new Date(iso);
  if(isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
}

async function loadConversas(){
  try{
    const data = await apiRequest('GET', '/whatsapp/conversas');
    conversas = data.conversas || [];
  }catch(e){
    conversas = [];
  }
  conversasLoaded = true;
  renderApp();
}

/* ---------- Equipe (Chat Interno + Supervisão) ---------- */
async function loadEquipe(){
  try{
    const data = await apiRequest('GET', '/equipe');
    equipe = data.equipe;
  }catch(e){
    equipe = null;
  }
  equipeLoaded = true;
  renderApp();
  if(equipe){
    if(currentPage === 'chat-interno' && !chatLoaded) loadChat();
    if(currentPage === 'supervisao' && equipe.souSupervisor && !supervisaoLoaded) loadSupervisao();
  }
}
async function loadChat(){
  if(!equipe){ chatLoaded = true; renderApp(); return; }
  try{
    const data = await apiRequest('GET', '/equipe/chat');
    chatMensagens = data.mensagens || [];
  }catch(e){
    chatMensagens = [];
  }
  chatLoaded = true;
  renderApp();
}
async function loadSupervisao(){
  if(!equipe || !equipe.souSupervisor){ supervisaoLoaded = true; renderApp(); return; }
  try{
    const data = await apiRequest('GET', '/equipe/supervisao');
    supervisaoMembros = data.membros || [];
  }catch(e){
    supervisaoMembros = [];
  }
  supervisaoLoaded = true;
  renderApp();
}

/* ---------- Automações ---------- */
async function loadAutomacoes(){
  try{
    const data = await apiRequest('GET', '/automacoes');
    automacoes = data.automacoes || [];
  }catch(e){
    automacoes = [];
  }
  automacoesLoaded = true;
  renderApp();
}
async function salvarAutomacao(){
  const f = automacaoModalForm;
  if(!f.nome.trim() || !f.colunaGatilhoId) return;
  const dados = { nome: f.nome, colunaGatilhoId: f.colunaGatilhoId, gatilhoTipo: f.gatilhoTipo, acaoTipo: f.acaoTipo, acaoParams: f.acaoParams };
  try{
    if(f.__isNew){
      const nova = await apiRequest('POST', '/automacoes', dados);
      automacoes.unshift(nova);
    } else {
      const atualizada = await apiRequest('PUT', `/automacoes/${f.id}`, dados);
      const idx = automacoes.findIndex(a=>a.id===f.id);
      if(idx>-1) automacoes[idx] = atualizada;
    }
    closeAutomacaoModal();
  }catch(e){
    errorMsg = e.message || 'Não foi possível salvar a automação.';
  }
  renderApp();
}
async function toggleAutomacaoAtiva(id){
  const a = automacoes.find(x=>x.id===id);
  if(!a) return;
  const anterior = a.ativa;
  a.ativa = !a.ativa;
  renderApp();
  try{
    await apiRequest('PUT', `/automacoes/${id}`, { ativa: a.ativa });
  }catch(e){
    a.ativa = anterior;
    errorMsg = 'Não foi possível atualizar a automação.';
    renderApp();
  }
}
async function excluirAutomacao(id){
  const idx = automacoes.findIndex(a=>a.id===id);
  if(idx===-1) return;
  const [removida] = automacoes.splice(idx,1);
  renderApp();
  try{
    await apiRequest('DELETE', `/automacoes/${id}`);
  }catch(e){
    automacoes.splice(idx,0,removida);
    errorMsg = 'Não foi possível excluir a automação.';
    renderApp();
  }
}

/* ---------- Fluxos ---------- */
async function loadFluxos(){
  try{
    const data = await apiRequest('GET', '/fluxos');
    fluxos = data.fluxos || [];
  }catch(e){
    fluxos = [];
  }
  fluxosLoaded = true;
  renderApp();
}
async function salvarFluxo(){
  const f = fluxoModalForm;
  if(!f.nome.trim() || !f.colunaGatilhoId || !f.etapas.length) return;
  const dados = { nome: f.nome, colunaGatilhoId: f.colunaGatilhoId, etapas: f.etapas };
  try{
    if(f.__isNew){
      const novo = await apiRequest('POST', '/fluxos', dados);
      novo.emAndamento = 0;
      fluxos.unshift(novo);
    } else {
      const atualizado = await apiRequest('PUT', `/fluxos/${f.id}`, dados);
      const idx = fluxos.findIndex(x=>x.id===f.id);
      if(idx>-1) fluxos[idx] = { ...fluxos[idx], ...atualizado };
    }
    closeFluxoModal();
  }catch(e){
    errorMsg = e.message || 'Não foi possível salvar o fluxo.';
  }
  renderApp();
}
async function toggleFluxoAtivo(id){
  const f = fluxos.find(x=>x.id===id);
  if(!f) return;
  const anterior = f.ativo;
  f.ativo = !f.ativo;
  renderApp();
  try{
    await apiRequest('PUT', `/fluxos/${id}`, { ativo: f.ativo });
  }catch(e){
    f.ativo = anterior;
    errorMsg = 'Não foi possível atualizar o fluxo.';
    renderApp();
  }
}
async function excluirFluxo(id){
  const idx = fluxos.findIndex(f=>f.id===id);
  if(idx===-1) return;
  const [removido] = fluxos.splice(idx,1);
  renderApp();
  try{
    await apiRequest('DELETE', `/fluxos/${id}`);
  }catch(e){
    fluxos.splice(idx,0,removido);
    errorMsg = 'Não foi possível excluir o fluxo.';
    renderApp();
  }
}

async function criarEquipe(){
  const nome = equipeNomeNovo.trim();
  if(!nome){ equipeMsg = { tipo:'erro', texto:'Digite um nome para a equipe.' }; renderApp(); return; }
  try{
    await apiRequest('POST', '/equipe', { nome });
    equipeNomeNovo = '';
    equipeMsg = null;
    await loadEquipe();
  }catch(e){
    equipeMsg = { tipo:'erro', texto: e.message || 'Não foi possível criar a equipe.' };
    renderApp();
  }
}
async function entrarNaEquipe(){
  const codigo = equipeCodigoEntrar.trim();
  if(!codigo){ equipeMsg = { tipo:'erro', texto:'Digite o código de convite.' }; renderApp(); return; }
  try{
    await apiRequest('POST', '/equipe/entrar', { codigo });
    equipeCodigoEntrar = '';
    equipeMsg = null;
    await loadEquipe();
  }catch(e){
    equipeMsg = { tipo:'erro', texto: e.message || 'Não foi possível entrar na equipe.' };
    renderApp();
  }
}
async function sairDaEquipe(){
  try{
    await apiRequest('POST', '/equipe/sair');
    equipe = null;
    chatMensagens = [];
    chatLoaded = false;
    supervisaoMembros = [];
    supervisaoLoaded = false;
    renderApp();
  }catch(e){
    errorMsg = 'Não foi possível sair da equipe.';
    renderApp();
  }
}
async function regenerarCodigoEquipe(){
  try{
    const data = await apiRequest('POST', '/equipe/regenerar-codigo');
    if(equipe) equipe.codigoConvite = data.codigoConvite;
  }catch(e){
    errorMsg = 'Não foi possível gerar um novo código.';
  }
  renderApp();
}
async function alterarPapelMembro(userId, papel){
  try{
    await apiRequest('PUT', `/equipe/membro/${userId}/papel`, { papel });
    await loadEquipe();
  }catch(e){
    errorMsg = 'Não foi possível alterar o papel do membro.';
    renderApp();
  }
}
async function removerMembro(userId){
  try{
    await apiRequest('DELETE', `/equipe/membro/${userId}`);
    await loadEquipe();
  }catch(e){
    errorMsg = 'Não foi possível remover o membro.';
    renderApp();
  }
}
async function enviarMensagemChat(){
  if(!chatTexto.trim()) return;
  chatEnviando = true;
  renderApp();
  try{
    await apiRequest('POST', '/equipe/chat', { texto: chatTexto });
    chatTexto = '';
    await loadChat();
  }catch(e){
    errorMsg = e.message || 'Não foi possível enviar a mensagem.';
  }
  chatEnviando = false;
  renderApp();
}

// Notificações são calculadas na hora, a partir do que já está carregado
// (tarefas, leads e conversas) — não existe uma tabela própria pra isso.
function computarNotificacoes(){
  const notifs = [];
  const fimHoje = new Date(); fimHoje.setHours(23,59,59,999);
  tasks.forEach(t=>{
    if(!t.concluida && t.vencimento && new Date(t.vencimento) <= fimHoje){
      notifs.push({ texto:`Tarefa: ${t.titulo}`, timestamp: t.vencimento, cardId: t.leadId || null });
    }
  });
  const ontem = new Date(Date.now() - 24*60*60*1000);
  board.cards.forEach(c=>{
    if(c.createdAt && new Date(c.createdAt) >= ontem){
      notifs.push({ texto:`Novo lead: ${c.cliente}`, timestamp:c.createdAt, cardId:c.id });
    }
  });
  const doisDias = new Date(Date.now() - 48*60*60*1000);
  conversas.forEach(cv=>{
    if(cv.direcaoUltima==='in' && cv.ultimaMensagemEm && new Date(cv.ultimaMensagemEm) >= doisDias){
      notifs.push({ texto:`${cv.card.cliente}: ${(cv.ultimaMensagem||'').slice(0,60)}`, timestamp:cv.ultimaMensagemEm, cardId:cv.card.id });
    }
  });
  return notifs.sort((a,b)=> new Date(b.timestamp) - new Date(a.timestamp));
}

/* ---------- Disparos (mensagem em massa) ---------- */
async function enviarDisparo(){
  if(disparoSelecionados.size===0) return;
  if(disparoUsarTemplate){
    if(!disparoTemplateNome.trim()) return;
  } else if(!disparoTexto.trim()){
    return;
  }
  disparoEnviando = true;
  disparoResultado = null;
  renderApp();
  try{
    const corpo = { cardIds: Array.from(disparoSelecionados) };
    if(disparoUsarTemplate){
      corpo.usarTemplate = true;
      corpo.templateName = disparoTemplateNome.trim();
      corpo.idioma = disparoTemplateIdioma.trim() || 'pt_BR';
      corpo.variaveis = disparoTemplateVariaveis.trim() ? disparoTemplateVariaveis.split(',').map(v=>v.trim()) : [];
    } else {
      corpo.texto = disparoTexto;
    }
    const data = await apiRequest('POST', '/whatsapp/disparo', corpo);
    disparoResultado = data;
  }catch(e){
    errorMsg = e.message || 'Não foi possível enviar os disparos.';
  }
  disparoEnviando = false;
  renderApp();
}
async function carregarTemplatesDisponiveis(){
  try{
    const data = await apiRequest('GET', '/whatsapp/templates');
    disparoTemplatesDisponiveis = data.templates || [];
  }catch(e){
    errorMsg = e.message || 'Não foi possível carregar os modelos.';
  }
  renderApp();
}

/* ---------- Relatórios ---------- */
function relatoriosDadosMensais(mesesAtras, cardsBase){
  const cards = cardsBase || board.cards;
  const buckets = [];
  const agora = new Date();
  for(let i=mesesAtras-1;i>=0;i--){
    const d = new Date(agora.getFullYear(), agora.getMonth()-i, 1);
    buckets.push({ key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, novos:0 });
  }
  const porKey = new Map(buckets.map(b=>[b.key,b]));
  cards.forEach(c=>{
    if(!c.createdAt) return;
    const bucket = porKey.get(c.createdAt.slice(0,7));
    if(bucket) bucket.novos++;
  });
  return buckets;
}
function exportarCsv(){
  const linhas = [['Nome','Telefone','Valor','Coluna','Temperatura','Mês'].join(',')];
  cardsParaRelatorio().forEach(c=>{
    const col = board.columns.find(k=>k.id===c.columnId);
    linhas.push([
      `"${(c.cliente||'').replace(/"/g,'""')}"`,
      `"${(c.telefone||'').replace(/"/g,'""')}"`,
      c.valor||0,
      `"${col?col.nome.replace(/"/g,'""'):''}"`,
      c.temperatura||'',
      c.mes||'',
    ].join(','));
  });
  const blob = new Blob([linhas.join('\n')], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads_${currentMonthKey()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
async function connectGoogleCalendar(){
  try{
    const data = await apiRequest('GET', '/calendar/connect-url');
    window.location.href = data.url;
  }catch(e){
    errorMsg = 'Não foi possível iniciar a conexão com a Google Agenda.';
    renderApp();
  }
}
async function disconnectGoogleCalendar(){
  try{
    await apiRequest('POST', '/calendar/disconnect');
    calendarConnected = false;
  }catch(e){
    errorMsg = 'Não foi possível desconectar da Google Agenda.';
  }
  renderApp();
}
async function syncCalendarNow(){
  if(calendarSyncing) return;
  calendarSyncing = true;
  renderApp();
  try{
    await apiRequest('POST', '/tasks/sync-calendar');
    await loadTasks();
  }catch(e){
    errorMsg = 'Não foi possível sincronizar com a Google Agenda agora.';
  }
  calendarSyncing = false;
  renderApp();
}
function tratarRetornoDoGoogle(){
  const params = new URLSearchParams(window.location.search);
  const status = params.get('calendar');
  if(!status) return;
  if(status === 'conectado'){ calendarConnected = true; }
  else if(status === 'erro'){ errorMsg = 'Não foi possível conectar com a Google Agenda. Tente novamente.'; }
  window.history.replaceState({}, '', window.location.pathname);
}

/* ---------- derivações (Pipeline) ---------- */
function monthsList(){
  const set = new Set([currentMonthKey(), ...board.cards.map(c=>c.mes).filter(Boolean)]);
  return Array.from(set).sort((a,b)=> a<b?1:-1);
}
function visibleCards(){
  return filterMonth ? board.cards.filter(c=>c.mes===filterMonth) : board.cards;
}
function cardsOf(colId){ return visibleCards().filter(c=>c.columnId===colId); }
function sumByTipo(tipo){
  return visibleCards().reduce((s,c)=>{
    const col = board.columns.find(k=>k.id===c.columnId);
    return (col && col.tipo===tipo && col.funilId===funilAtualId) ? s + (Number(c.valor)||0) : s;
  },0);
}
function countByTipo(tipo){
  return visibleCards().filter(c=>{
    const col = board.columns.find(k=>k.id===c.columnId);
    return col && col.tipo===tipo && col.funilId===funilAtualId;
  }).length;
}
function quentesAtivos(){
  return visibleCards().filter(c=>{
    const col = board.columns.find(k=>k.id===c.columnId);
    return col && col.tipo==='aberto' && col.funilId===funilAtualId && c.temperatura==='quente';
  }).length;
}

/* ---------- derivações (Dashboard) ---------- */
function periodRange(period){
  const end = new Date();
  const start = new Date();
  if(period === '7dias') start.setDate(start.getDate() - 6);
  else if(period === 'mes') start.setDate(start.getDate() - 29);
  else if(period === 'trimestre') start.setDate(start.getDate() - 89);
  else start.setDate(start.getDate() - 364); // ano
  start.setHours(0,0,0,0);
  return { start, end };
}
function cardsInPeriod(){
  const { start, end } = periodRange(dashboardPeriod);
  return board.cards.filter(c=>{
    if(!c.createdAt) return false;
    const d = new Date(c.createdAt);
    return d >= start && d <= end;
  });
}
function dashMetrics(){
  const cards = cardsInPeriod();
  let emNegociacaoValor=0, emNegociacaoCount=0, ganhoValor=0, ganhoCount=0, perdidoCount=0;
  cards.forEach(c=>{
    const col = board.columns.find(k=>k.id===c.columnId);
    if(!col) return;
    if(col.tipo === 'aberto'){ emNegociacaoValor += Number(c.valor)||0; emNegociacaoCount++; }
    else if(col.tipo === 'ganho'){ ganhoValor += Number(c.valor)||0; ganhoCount++; }
    else if(col.tipo === 'perdido'){ perdidoCount++; }
  });
  const fechados = ganhoCount + perdidoCount;
  const conversao = fechados > 0 ? Math.round((ganhoCount/fechados)*100) : 0;
  return { novosLeads: cards.length, emNegociacaoValor, emNegociacaoCount, ganhoValor, ganhoCount, conversao };
}
function stageTotals(){
  return board.columns.map(col=>{
    const total = board.cards.filter(c=>c.columnId===col.id).reduce((s,c)=> s+(Number(c.valor)||0), 0);
    return { col, total };
  });
}
function leadsPorPeriodoBuckets(){
  const { start, end } = periodRange(dashboardPeriod);
  const cards = cardsInPeriod();
  const totalDays = Math.max(1, Math.round((end-start)/86400000)+1);
  const bucketDays = totalDays > 40 ? 7 : 1;
  const buckets = [];
  for(let t=new Date(start); t<=end; t.setDate(t.getDate()+bucketDays)){
    buckets.push({ date:new Date(t), count:0 });
  }
  if(!buckets.length) buckets.push({ date:new Date(start), count:0 });
  cards.forEach(c=>{
    const d = new Date(c.createdAt);
    for(let i=buckets.length-1;i>=0;i--){
      if(d >= buckets[i].date){ buckets[i].count++; break; }
    }
  });
  return buckets;
}
function renderLeadsChart(){
  const buckets = leadsPorPeriodoBuckets();
  if(!buckets.some(b=>b.count>0)){
    return `<p class="chart-empty">Nenhum lead captado nesse período ainda.</p>`;
  }
  const w=720, h=220, padL=32, padR=12, padT=12, padB=26;
  const innerW = w-padL-padR, innerH = h-padT-padB;
  const maxCount = Math.max(4, ...buckets.map(b=>b.count));
  const stepX = buckets.length>1 ? innerW/(buckets.length-1) : 0;
  const points = buckets.map((b,i)=>({
    x: padL + stepX*i,
    y: padT + innerH - (b.count/maxCount)*innerH,
    b,
  }));
  const path = points.map((p,i)=> (i===0?'M':'L')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
  const yTicks = 4;
  const yLabels = Array.from({length:yTicks+1}, (_,i)=> Math.round(maxCount - (maxCount/yTicks)*i));
  const xLabelEvery = Math.max(1, Math.ceil(buckets.length/8));
  return `
    <div class="chart-wrap">
      <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
        ${yLabels.map((v,i)=>{
          const y = padT + (innerH/yTicks)*i;
          return `<line x1="${padL}" y1="${y}" x2="${w-padR}" y2="${y}" stroke="var(--line)" stroke-width="1"/><text x="${padL-8}" y="${y+4}" font-size="10" fill="var(--ink-soft)" text-anchor="end">${v}</text>`;
        }).join('')}
        <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2"/>
        ${points.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="var(--accent)"/>`).join('')}
        ${points.map((p,i)=> i % xLabelEvery === 0 ? `<text x="${p.x.toFixed(1)}" y="${h-6}" font-size="9" fill="var(--ink-soft)" text-anchor="middle">${p.b.date.getDate()}/${p.b.date.getMonth()+1}</text>` : '').join('')}
      </svg>
    </div>
  `;
}

/* ---------- comissões: cálculo e derivações ---------- */
const ESCOPOS = {
  Pessoal: { label:'Pessoal', color:'var(--ink-soft)', bg:'var(--badge-neutral-bg)' },
  Empresa: { label:'Empresa', color:'#FFFFFF',         bg:'var(--accent)' },
};
// mesma regra fixa do widget original: 10 parcelas a 0,00103388 + 3 parcelas a 0,00190561
function calcComissaoPreview(creditoValor){
  const credito = parseFloat(creditoValor) || 0;
  const value1 = Math.round(credito * (1033.88/1000000) * 100) / 100;
  const value2 = Math.round(credito * (1905.61/1000000) * 100) / 100;
  return { value1, value2 };
}
function monthsBetween(anchorYM, targetYM){
  const [ay,am] = anchorYM.split('-').map(Number);
  const [ty,tm] = targetYM.split('-').map(Number);
  return (ty-ay)*12 + (tm-am);
}
function addMonthsKey(ym, delta){
  const [y,m] = ym.split('-').map(Number);
  const d = new Date(y, m-1+delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function parcelaValue(c, idx){
  return idx < c.parcelas1 ? c.value : c.value2;
}
function contratoTotal(c){
  let total = 0;
  for(let i=0;i<c.parcelas;i++) total += parcelaValue(c,i);
  return total;
}
function contratoRestante(c, fromIdx){
  let total = 0;
  for(let i=Math.max(0,fromIdx);i<c.parcelas;i++) total += parcelaValue(c,i);
  return total;
}
function comissoesStats(){
  const rowsMes = contratos.map(c=>{
    const anchor = (c.date||'').slice(0,7);
    const idx = monthsBetween(anchor, comissoesMonth);
    return (idx < 0 || idx >= c.parcelas) ? null : { c, idx, value: parcelaValue(c, idx) };
  }).filter(Boolean);
  const previstoMes = rowsMes.reduce((a,r)=> a+r.value, 0);
  const totalAtivo = contratos.reduce((a,c)=>{
    const anchor = (c.date||'').slice(0,7);
    const idx = monthsBetween(anchor, comissoesMonth);
    return a + contratoRestante(c, idx);
  }, 0);
  return { previstoMes, totalAtivo, total: contratos.length };
}

/* ---------- derivações (Leads) ---------- */
function filteredLeads(){
  let list = board.cards;
  if(leadsStatusFilter) list = list.filter(c=>c.columnId===leadsStatusFilter);
  if(leadsSearch.trim()){
    const q = leadsSearch.trim().toLowerCase();
    list = list.filter(c=> (c.cliente||'').toLowerCase().includes(q) || (c.telefone||'').toLowerCase().includes(q));
  }
  return list;
}

/* ---------- navegação entre páginas ---------- */
function goToPage(page){
  if(currentPage === page) return;
  currentPage = page;
  dateMenuOpen = false;
  openMenuColId = null;
  addingCol = false;
  editingColId = null;
  sidebarOpen = false;
  renderApp();
  if(page === 'tarefas' && calendarConnected && !calendarSyncedOnce){
    calendarSyncedOnce = true;
    syncCalendarNow();
  }
  if(page === 'configuracoes'){
    senhaMsg = null; senhaAtualVal = ''; senhaNovaVal = '';
    importResultado = null;
    refreshCurrentUser();
  }
  if(page === 'chat-interno'){
    equipeMsg = null;
    if(equipe && !chatLoaded) loadChat();
  }
  if(page === 'supervisao'){
    equipeMsg = null;
    if(equipe && equipe.souSupervisor && !supervisaoLoaded) loadSupervisao();
  }
}
async function refreshCurrentUser(){
  try{
    const data = await apiRequest('GET', '/auth/me');
    currentUser = data.user;
    localStorage.setItem('user', JSON.stringify(currentUser));
    renderApp();
  }catch(e){ /* mantém os dados já em cache */ }
}

/* ---------- mutações: colunas e cards (cada uma fala com a API) ---------- */
async function moveCard(cardId, columnId){
  const card = board.cards.find(c=>c.id===cardId);
  if(!card || card.columnId===columnId) return;
  const anterior = card.columnId;
  card.columnId = columnId; // otimista
  renderApp();
  try{
    await apiRequest('PUT', `/cards/${cardId}/move`, { columnId });
  }catch(e){
    card.columnId = anterior;
    errorMsg = 'Não foi possível mover o cliente. Tente novamente.';
    renderApp();
  }
}

async function deleteCardById(id){
  const idx = board.cards.findIndex(c=>c.id===id);
  if(idx===-1) return;
  const [removido] = board.cards.splice(idx,1);
  renderApp();
  try{
    await apiRequest('DELETE', `/cards/${id}`);
  }catch(e){
    board.cards.splice(idx,0,removido);
    errorMsg = 'Não foi possível excluir o cliente.';
    renderApp();
  }
}

async function renameColumn(id, nome){
  const col = board.columns.find(c=>c.id===id);
  if(!col) return;
  const nomeFinal = nome.trim() || col.nome;
  const anterior = col.nome;
  col.nome = nomeFinal;
  renderApp();
  try{
    await apiRequest('PUT', `/columns/${id}`, { nome: nomeFinal });
  }catch(e){
    col.nome = anterior;
    errorMsg = 'Não foi possível renomear a coluna.';
    renderApp();
  }
}

async function changeTipo(id, tipo){
  const col = board.columns.find(c=>c.id===id);
  if(!col) return;
  const anterior = col.tipo;
  col.tipo = tipo;
  openMenuColId = null;
  renderApp();
  try{
    await apiRequest('PUT', `/columns/${id}`, { tipo });
  }catch(e){
    col.tipo = anterior;
    errorMsg = 'Não foi possível alterar o tipo da coluna.';
    renderApp();
  }
}

async function deleteColumnById(id){
  const colIdx = board.columns.findIndex(c=>c.id===id);
  if(colIdx===-1) return;
  const [colRemovida] = board.columns.splice(colIdx,1);
  const cardsRemovidos = board.cards.filter(c=>c.columnId===id);
  board.cards = board.cards.filter(c=>c.columnId!==id);
  openMenuColId = null;
  renderApp();
  try{
    await apiRequest('DELETE', `/columns/${id}`);
  }catch(e){
    board.columns.splice(colIdx,0,colRemovida);
    board.cards.push(...cardsRemovidos);
    errorMsg = 'Não foi possível excluir a coluna.';
    renderApp();
  }
}

async function reorderColumns(draggedId, targetId){
  if(draggedId === targetId) return;
  const doFunil = board.columns.filter(c=>c.funilId===funilAtualId);
  const outras = board.columns.filter(c=>c.funilId!==funilAtualId);
  const fromIdx = doFunil.findIndex(c=>c.id===draggedId);
  const toIdx = doFunil.findIndex(c=>c.id===targetId);
  if(fromIdx===-1 || toIdx===-1) return;
  const anterior = [...board.columns];
  const [movida] = doFunil.splice(fromIdx,1);
  doFunil.splice(toIdx,0,movida);
  board.columns = [...outras, ...doFunil];
  renderApp();
  try{
    await Promise.all(doFunil.map((col,idx)=> apiRequest('PUT', `/columns/${col.id}`, { ordem: idx })));
  }catch(e){
    board.columns = anterior;
    errorMsg = 'Não foi possível reordenar as colunas.';
    renderApp();
  }
}

async function addColumn(){
  const nome = newColNameVal.trim();
  addingCol = false;
  newColNameVal = '';
  if(!nome || !funilAtualId){ renderApp(); return; }
  try{
    const novaCol = await apiRequest('POST', '/columns', { nome, tipo:'aberto', funilId: funilAtualId });
    board.columns.push(novaCol);
  }catch(e){
    errorMsg = 'Não foi possível criar a coluna.';
  }
  renderApp();
}

async function saveCardFromModal(){
  if(!modalForm.cliente.trim()) return;
  const { __isNew, id, ...dados } = modalForm;
  try{
    if(__isNew){
      const novoCard = await apiRequest('POST', '/cards', dados);
      board.cards.push(novoCard);
    } else {
      const atualizado = await apiRequest('PUT', `/cards/${id}`, dados);
      const idx = board.cards.findIndex(c=>c.id===id);
      if(idx>-1) board.cards[idx] = atualizado;
    }
    closeModal();
  }catch(e){
    errorMsg = 'Não foi possível salvar o cliente.';
  }
  renderApp();
}

/* ---------- mutações: tarefas ---------- */
async function saveTaskFromModal(){
  if(!taskModalForm.titulo.trim()) return;
  const { __isNew, id, ...dados } = taskModalForm;
  if(!dados.leadId) dados.leadId = null;
  try{
    if(__isNew){
      const nova = await apiRequest('POST', '/tasks', dados);
      tasks.push(nova);
    } else {
      const atualizada = await apiRequest('PUT', `/tasks/${id}`, dados);
      const idx = tasks.findIndex(t=>t.id===id);
      if(idx>-1) tasks[idx] = atualizada;
    }
    closeTaskModal();
  }catch(e){
    errorMsg = 'Não foi possível salvar a tarefa.';
  }
  renderApp();
}

async function deleteTaskById(id){
  const idx = tasks.findIndex(t=>t.id===id);
  if(idx===-1) return;
  const [removida] = tasks.splice(idx,1);
  renderApp();
  try{
    await apiRequest('DELETE', `/tasks/${id}`);
  }catch(e){
    tasks.splice(idx,0,removida);
    errorMsg = 'Não foi possível excluir a tarefa.';
    renderApp();
  }
}

async function toggleTaskConcluida(id){
  const task = tasks.find(t=>t.id===id);
  if(!task) return;
  task.concluida = !task.concluida; // otimista
  renderApp();
  try{
    const atualizada = await apiRequest('PUT', `/tasks/${id}/toggle`);
    const idx = tasks.findIndex(t=>t.id===id);
    if(idx>-1) tasks[idx] = atualizada;
  }catch(e){
    task.concluida = !task.concluida;
    errorMsg = 'Não foi possível atualizar a tarefa.';
    renderApp();
  }
}

/* ---------- mutações: comissões ---------- */
async function saveContratoFromModal(){
  const f = contratoModalForm;
  if(!f.desc.trim() || !f.creditoValor) return;
  const dados = { desc: f.desc, scope: f.scope, date: f.date, creditoValor: f.creditoValor };
  try{
    if(f.__isNew){
      const novo = await apiRequest('POST', '/comissoes', dados);
      contratos.unshift(novo);
    } else {
      const atualizado = await apiRequest('PUT', `/comissoes/${f.id}`, dados);
      const idx = contratos.findIndex(c=>c.id===f.id);
      if(idx>-1) contratos[idx] = atualizado;
    }
    closeContratoModal();
  }catch(e){
    errorMsg = 'Não foi possível salvar o contrato.';
  }
  renderApp();
}
async function deleteContratoById(id){
  const idx = contratos.findIndex(c=>c.id===id);
  if(idx===-1) return;
  const [removido] = contratos.splice(idx,1);
  renderApp();
  try{
    await apiRequest('DELETE', `/comissoes/${id}`);
  }catch(e){
    contratos.splice(idx,0,removido);
    errorMsg = 'Não foi possível excluir o contrato.';
    renderApp();
  }
}

/* ---------- mutações: senha e importação de leads ---------- */
async function salvarSenha(){
  if(!senhaNovaVal || senhaNovaVal.length < 6){
    senhaMsg = { tipo:'erro', texto:'A nova senha precisa ter ao menos 6 caracteres.' };
    renderApp();
    return;
  }
  senhaSalvando = true;
  senhaMsg = null;
  renderApp();
  try{
    await apiRequest('PUT', '/auth/password', { senhaAtual: senhaAtualVal, senhaNova: senhaNovaVal });
    senhaMsg = { tipo:'ok', texto:'Senha salva com sucesso.' };
    senhaAtualVal = ''; senhaNovaVal = '';
    await refreshCurrentUser();
  }catch(e){
    senhaMsg = { tipo:'erro', texto: e.message || 'Não foi possível salvar a senha.' };
  }
  senhaSalvando = false;
  renderApp();
}

// Parser simples de CSV: "Nome,Telefone,Valor", uma linha por lead.
// Não lida com campos entre aspas contendo vírgulas — suficiente pro uso esperado.
function parseCsvLeads(texto){
  const linhas = texto.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if(!linhas.length) return [];
  const inicio = /nome/i.test(linhas[0]) ? 1 : 0;
  const out = [];
  for(let i=inicio;i<linhas.length;i++){
    const partes = linhas[i].split(',').map(p=>p.trim().replace(/^"|"$/g,''));
    if(!partes[0]) continue;
    const valorTexto = (partes[2]||'0').replace(/[^\d,.-]/g,'').replace(/\.(?=\d{3})/g,'').replace(',','.');
    out.push({ nome: partes[0], telefone: partes[1]||'', valor: parseFloat(valorTexto) || 0 });
  }
  return out;
}
async function importarLeadsCsv(){
  const fileInput = document.getElementById('import-arquivo');
  const file = fileInput && fileInput.files && fileInput.files[0];
  if(!file){ errorMsg = 'Escolha um arquivo CSV primeiro.'; renderApp(); return; }
  const columnId = importColumnId || (document.getElementById('import-coluna') || {}).value;
  if(!columnId){ errorMsg = 'Escolha a coluna de destino.'; renderApp(); return; }

  importando = true;
  importResultado = null;
  renderApp();

  const texto = await file.text();
  const linhas = parseCsvLeads(texto);
  let sucesso = 0, falha = 0;
  for(const linha of linhas){
    try{
      const novo = await apiRequest('POST', '/cards', {
        columnId, cliente: linha.nome, telefone: linha.telefone, valor: linha.valor,
        temperatura: 'morno', obs: '', mes: currentMonthKey(),
      });
      board.cards.push(novo);
      sucesso++;
    }catch(e){ falha++; }
  }
  importResultado = { sucesso, falha };
  importando = false;
  renderApp();
}

/* ---------- IA ---------- */
async function gerarInsightsIA(){
  insightsCarregando = true;
  renderApp();
  try{
    const data = await apiRequest('POST', '/ai/insights');
    aiInsights = data.insights || [];
  }catch(e){
    errorMsg = e.message || 'Não foi possível gerar os insights.';
  }
  insightsCarregando = false;
  renderApp();
}

async function sugerirMensagemIA(){
  if(!modalForm || modalForm.__isNew) return;
  const btn = document.getElementById('f-ai-mensagem');
  const resultBox = document.getElementById('f-ai-mensagem-result');
  if(btn){ btn.disabled = true; btn.innerHTML = `${ICON_SPARKLE} Gerando…`; }
  try{
    const data = await apiRequest('POST', '/ai/mensagem', { cardId: modalForm.id });
    if(resultBox){
      resultBox.style.display = 'block';
      resultBox.innerHTML = `
        <p>${esc(data.mensagem)}</p>
        <div class="ai-result-actions">
          <button type="button" class="btn-outline" id="f-ai-copiar">Copiar</button>
          <button type="button" class="wa-btn" id="f-ai-abrir-wa">${WA_ICON} Abrir com essa mensagem</button>
        </div>
      `;
      const copiarBtn = document.getElementById('f-ai-copiar');
      if(copiarBtn) copiarBtn.addEventListener('click', ()=>{
        navigator.clipboard.writeText(data.mensagem).catch(()=>{});
      });
      const abrirBtn = document.getElementById('f-ai-abrir-wa');
      if(abrirBtn) abrirBtn.addEventListener('click', ()=>{
        const link = waLink(modalForm.telefone);
        if(link) window.open(link + '?text=' + encodeURIComponent(data.mensagem), '_blank', 'noopener');
      });
    }
  }catch(e){
    errorMsg = e.message || 'Não foi possível gerar a mensagem.';
    renderApp();
  }
  if(btn){ btn.disabled = false; btn.innerHTML = `${ICON_SPARKLE} Sugerir mensagem`; }
}

async function sugerirTarefaIA(){
  if(!modalForm || modalForm.__isNew) return;
  const btn = document.getElementById('f-ai-tarefa');
  const resultBox = document.getElementById('f-ai-tarefa-result');
  if(btn){ btn.disabled = true; btn.innerHTML = `${ICON_SPARKLE} Pensando…`; }
  try{
    const data = await apiRequest('POST', '/ai/sugerir-tarefa', { cardId: modalForm.id });
    const dataVenc = new Date();
    dataVenc.setDate(dataVenc.getDate() + data.dias);
    const vencISO = dataVenc.toISOString().slice(0,10);
    if(resultBox){
      resultBox.style.display = 'block';
      resultBox.innerHTML = `
        <p><b>${esc(data.titulo)}</b> — vencimento sugerido: ${formatDate(vencISO)}</p>
        <div class="ai-result-actions">
          <button type="button" class="btn-outline" id="f-ai-criar-tarefa">Criar essa tarefa</button>
        </div>
      `;
      const criarBtn = document.getElementById('f-ai-criar-tarefa');
      if(criarBtn) criarBtn.addEventListener('click', async ()=>{
        criarBtn.disabled = true;
        try{
          const nova = await apiRequest('POST', '/tasks', {
            titulo: data.titulo, vencimento: vencISO, prioridade:'media', leadId: modalForm.id, descricao:'',
          });
          tasks.push(nova);
          resultBox.innerHTML = '<p>✓ Tarefa criada.</p>';
        }catch(e){
          errorMsg = 'Não foi possível criar a tarefa.';
          renderApp();
        }
      });
    }
  }catch(e){
    errorMsg = e.message || 'Não foi possível sugerir uma tarefa.';
    renderApp();
  }
  if(btn){ btn.disabled = false; btn.innerHTML = `${ICON_SPARKLE} Sugerir tarefa de acompanhamento`; }
}

/* ---------- render: shell (barra lateral + página atual) ---------- */
function renderApp(){
  const app = document.getElementById('app');
  if(!loaded){ app.innerHTML = '<div class="loading">Carregando painel…</div>'; return; }

  let pageHtml = '';
  if(currentPage === 'dashboard') pageHtml = renderDashboardPage();
  else if(currentPage === 'pipeline') pageHtml = renderPipelinePage();
  else if(currentPage === 'leads') pageHtml = renderLeadsPage();
  else if(currentPage === 'conversas') pageHtml = renderConversasPage();
  else if(currentPage === 'comissoes') pageHtml = renderComissoesPage();
  else if(currentPage === 'relatorios') pageHtml = renderRelatoriosPage();
  else if(currentPage === 'disparos') pageHtml = renderDisparosPage();
  else if(currentPage === 'automacoes') pageHtml = renderAutomacoesPage();
  else if(currentPage === 'fluxos') pageHtml = renderFluxosPage();
  else if(currentPage === 'configuracoes') pageHtml = renderConfiguracoesPage();
  else if(currentPage === 'suporte') pageHtml = renderSuportePage();
  else if(currentPage === 'chat-interno') pageHtml = renderChatInternoPage();
  else if(currentPage === 'supervisao') pageHtml = renderSupervisaoPage();
  else if(currentPage === 'tarefas') pageHtml = renderTarefasPage();

  const notificacoes = computarNotificacoes();

  app.innerHTML = `
    <div class="app-shell ${sidebarOpen ? 'sidebar-open' : ''}">
      ${renderSidebar()}
      <div class="sidebar-backdrop" data-action="close-sidebar"></div>
      <div class="main-area">
        <div class="main-topbar">
          <button class="hamburger-btn" data-action="toggle-sidebar" title="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div class="notif-wrap">
            <button class="notif-btn" data-action="toggle-notif" title="Notificações">
              ${ICON_BELL}
              ${notificacoes.length ? `<span class="notif-badge">${notificacoes.length > 9 ? '9+' : notificacoes.length}</span>` : ''}
            </button>
            ${notifOpen ? `
              <div class="notif-panel">
                <div class="notif-panel-title">Notificações</div>
                ${notificacoes.length ? notificacoes.slice(0,8).map(n=>`
                  <div class="notif-item" ${n.cardId ? `data-action="open-edit-card" data-card-id="${n.cardId}"` : ''}>
                    <p>${esc(n.texto)}</p>
                    <span>${formatDateHora(n.timestamp)}</span>
                  </div>
                `).join('') : '<p class="settings-page-note" style="padding:12px;">Nenhuma notificação por enquanto.</p>'}
              </div>
            ` : ''}
          </div>
        </div>
        ${errorMsg ? `<div class="error-banner" data-action="dismiss-error" title="Clique para fechar">⚠ ${esc(errorMsg)}</div>` : ''}
        ${pageHtml}
      </div>
    </div>
  `;

  bindAppEvents();
}

function renderSidebar(){
  const NAV = [
    ['dashboard', 'Dashboard', ICON_DASHBOARD],
    ['pipeline', 'Pipeline', ICON_PIPELINE],
    ['leads', 'Leads', ICON_LEADS],
    ['conversas', 'Conversas', ICON_CONVERSAS],
    ['comissoes', 'Comissões', ICON_COMISSOES],
    ['relatorios', 'Relatórios', ICON_RELATORIOS],
    ['disparos', 'Disparos', ICON_DISPAROS],
    ['automacoes', 'Automações', ICON_AUTOMACOES],
    ['fluxos', 'Fluxos', ICON_FLUXOS],
    ['tarefas', 'Tarefas', ICON_TASKS],
    ['chat-interno', 'Chat Interno', ICON_CHAT_INTERNO],
    ['supervisao', 'Supervisão', ICON_SUPERVISAO],
  ];
  return `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="sidebar-logo">◎</span>
        ${editingGreeting
          ? `<span class="sidebar-greeting">Olá, <input class="sidebar-greeting-input" id="greeting-input" value="${esc(greetingDraft)}" placeholder="seu nome" /></span>`
          : `<span class="sidebar-greeting">Olá, <span class="sidebar-brand-name" data-action="edit-greeting" title="Clique para editar">${esc(getGreetingName() || 'visitante')}</span><button class="edit-greeting-icon" data-action="edit-greeting" title="Editar nome">${ICON_EDIT}</button></span>`
        }
      </div>
      <nav class="sidebar-nav">
        ${NAV.map(([key,label,icon])=>`
          <button class="nav-item ${currentPage===key?'active':''}" data-action="nav" data-page="${key}">${icon}<span>${label}</span></button>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <button class="nav-item ${currentPage==='suporte'?'active':''}" data-action="nav" data-page="suporte">${ICON_SUPORTE}<span>Suporte</span></button>
        <button class="nav-item ${currentPage==='configuracoes'?'active':''}" data-action="nav" data-page="configuracoes">${ICON_SETTINGS}<span>Configurações</span></button>
        <button class="nav-item logout-item" data-action="logout">${ICON_LOGOUT}<span>Sair</span></button>
      </div>
    </aside>
  `;
}

/* ---------- página: Dashboard ---------- */
function renderDashboardPage(){
  const m = dashMetrics();
  const stages = stageTotals();
  const maxStage = Math.max(1, ...stages.map(s=>s.total));
  const recentes = [...cardsInPeriod()].sort((a,b)=> new Date(b.createdAt||0) - new Date(a.createdAt||0)).slice(0,5);
  const abertas = tasksLoaded ? tasks.filter(t=>!t.concluida).sort((a,b)=> new Date(a.vencimento||'2999-01-01') - new Date(b.vencimento||'2999-01-01')).slice(0,5) : [];

  return `
    <div class="page-head">
      <div>
        <h1>Dashboard</h1>
        <p>Visão geral do seu funil de vendas</p>
      </div>
      <div class="period-toggle">
        ${[['7dias','7 dias'],['mes','Mês'],['trimestre','Trimestre'],['ano','Ano']].map(([key,label])=>`
          <button class="tab-btn ${dashboardPeriod===key?'active':''}" data-action="set-dash-period" data-period="${key}">${label}</button>
        `).join('')}
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-card-top"><span>Novos leads</span><span class="metric-icon">${ICON_USERS}</span></div>
        <div class="metric-value">${m.novosLeads}</div>
        <div class="metric-sub">no período</div>
      </div>
      <div class="metric-card">
        <div class="metric-card-top"><span>Em negociação</span><span class="metric-icon">${ICON_DOLLAR}</span></div>
        <div class="metric-value">${fmtBRL(m.emNegociacaoValor)}</div>
        <div class="metric-sub">${m.emNegociacaoCount} ${m.emNegociacaoCount===1?'negócio':'negócios'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-card-top"><span>Ganho</span><span class="metric-icon">${ICON_TROPHY}</span></div>
        <div class="metric-value">${fmtBRL(m.ganhoValor)}</div>
        <div class="metric-sub">${m.ganhoCount} fechados</div>
      </div>
      <div class="metric-card">
        <div class="metric-card-top"><span>Conversão</span><span class="metric-icon">${ICON_TREND}</span></div>
        <div class="metric-value">${m.conversao}%</div>
        <div class="metric-sub">ganhos / fechados</div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="dash-panel">
        <div class="dash-panel-title">Leads captados</div>
        ${renderLeadsChart()}
      </div>
      <div class="dash-panel">
        <div class="dash-panel-title">Pipeline por etapa</div>
        <div class="stage-list">
          ${stages.length ? stages.map(s=>`
            <div class="stage-row">
              <div class="stage-row-top"><span>${esc(s.col.nome)}</span><span>${fmtBRL(s.total)}</span></div>
              <div class="stage-bar-track"><div class="stage-bar-fill" style="width:${maxStage ? (s.total/maxStage*100) : 0}%"></div></div>
            </div>
          `).join('') : '<p class="dash-empty">Nenhuma coluna criada ainda.</p>'}
        </div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="dash-panel">
        <div class="dash-panel-title">Últimos leads</div>
        ${recentes.length ? `<div class="recent-list">${recentes.map(c=>`
          <div class="recent-item"><span class="recent-name">${esc(c.cliente) || 'Sem nome'}</span><span class="recent-value">${fmtBRL(c.valor)}</span></div>
        `).join('')}</div>` : '<p class="dash-empty">Nenhum lead neste período.</p>'}
      </div>
      <div class="dash-panel">
        <div class="dash-panel-title">Tarefas abertas</div>
        ${abertas.length ? `<div class="recent-list">${abertas.map(t=>`
          <div class="task-mini-item">
            <span class="check-circle" data-action="toggle-task" data-task-id="${t.id}"></span>
            <span class="task-mini-title">${esc(t.titulo)}</span>
            ${t.vencimento ? `<span class="metric-sub">${formatDate(t.vencimento)}</span>` : ''}
          </div>
        `).join('')}</div>` : '<p class="dash-empty">Tudo em dia por aqui.</p>'}
      </div>
    </div>

    <div class="dash-panel">
      <div class="dash-panel-title-row">
        <div class="dash-panel-title">${ICON_SPARKLE} Insights da IA</div>
        <button class="btn-outline" data-action="gerar-insights" ${insightsCarregando?'disabled':''}>${insightsCarregando?'Gerando…':'Gerar'}</button>
      </div>
      ${aiInsights.length
        ? `<ul class="ai-insights-list">${aiInsights.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`
        : `<p class="dash-empty">Clique em "Gerar" para receber alertas sobre o seu funil.</p>`
      }
    </div>
  `;
}

/* ---------- página: Pipeline (o quadro kanban, como já era) ---------- */
function renderPipelinePage(){
  if(!funisLoaded){
    return `<div class="page-head"><div><h1>Pipeline</h1><p>Carregando…</p></div></div>`;
  }
  const months = monthsList();
  const funilAtual = funis.find(f=>f.id===funilAtualId);
  const columnsDoFunil = board.columns.filter(c=>c.funilId===funilAtualId);
  return `
    <div class="page-head">
      <div>
        <h1>Pipeline</h1>
        <p>Arraste os clientes para mudar de coluna</p>
      </div>
    </div>

    <div class="funil-tabs">
      ${funis.map(f=>{
        if(editingFunilId===f.id){
          return `<input class="funil-name-input" id="funil-rename-${f.id}" value="${esc(editingFunilName)}" />`;
        }
        return `<button class="tab-btn ${funilAtualId===f.id?'active':''}" data-action="set-funil" data-funil-id="${f.id}">${esc(f.nome)}</button>`;
      }).join('')}
      ${funilAtual ? `
        <button class="icon-btn" data-action="edit-funil-name" data-funil-id="${funilAtual.id}" title="Renomear funil">${ICON_EDIT}</button>
        ${funis.length > 1 ? `<button class="icon-btn" data-action="delete-funil" data-funil-id="${funilAtual.id}" title="Excluir funil">${ICON_TRASH}</button>` : ''}
      ` : ''}
      <button class="tab-btn" data-action="open-new-funil" title="Criar novo funil">+ Funil</button>
    </div>

    <div class="tabs">
      <button class="tab-btn ${filterMonth===null?'active':''}" data-action="set-month" data-month="">Geral</button>
      <div class="date-wrap">
        <button class="tab-btn ${filterMonth?'active':''}" data-action="toggle-date-menu">
          📅 ${filterMonth ? monthLabel(filterMonth) : 'Escolher data'}
        </button>
        ${dateMenuOpen ? `
          <div class="date-menu">
            <div class="date-menu-title">Meses com dados</div>
            ${months.length ? `
              <div class="date-menu-list">
                ${months.map(m=>`<button class="date-menu-item ${filterMonth===m?'active':''}" data-action="set-month" data-month="${m}">${monthLabel(m, true)}</button>`).join('')}
              </div>
            ` : `<p class="date-menu-empty">Nenhum mês com dados ainda.</p>`}
            <div class="date-menu-sep"></div>
            <label class="date-menu-custom-label">
              Ir para outro mês
              <input type="month" id="goto-month-input" value="${filterMonth||''}" />
            </label>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="stats-wrap">
      <div class="stats">
        <div class="stats-label">Resumo · ${filterMonth ? monthLabel(filterMonth, true) : 'Geral (todos os meses)'}</div>
        <div class="stats-row">
          <div class="stat"><span class="lbl">Em negociação</span><span class="val">${fmtBRL(sumByTipo('aberto'))}</span><span class="cnt">${countByTipo('aberto')} ${countByTipo('aberto')===1?'cliente':'clientes'}</span></div>
          <div class="stat"><span class="lbl">Vendido</span><span class="val">${fmtBRL(sumByTipo('ganho'))}</span><span class="cnt">${countByTipo('ganho')} ${countByTipo('ganho')===1?'cliente':'clientes'}</span></div>
          <div class="stat"><span class="lbl">Perdido</span><span class="val" style="color:rgba(255,255,255,.45)">${fmtBRL(sumByTipo('perdido'))}</span><span class="cnt">${countByTipo('perdido')} ${countByTipo('perdido')===1?'cliente':'clientes'}</span></div>
          <div class="stat"><span class="lbl">Leads quentes</span><span class="val">${quentesAtivos()}</span></div>
        </div>
      </div>
    </div>

    <main>
      <div class="board">
        ${columnsDoFunil.map(col => renderColumn(col)).join('')}
        <div class="add-col-wrap">
          ${addingCol ? `
            <div class="add-col-form">
              <input type="text" id="new-col-input" placeholder="Nome da coluna" value="${esc(newColNameVal)}" />
              <div class="add-col-actions">
                <button class="btn-primary" data-action="confirm-add-col">Adicionar</button>
                <button class="btn-ghost" data-action="cancel-add-col">Cancelar</button>
              </div>
            </div>
          ` : `
            <button class="add-col-btn" data-action="start-add-col">+ Nova coluna</button>
          `}
        </div>
      </div>
    </main>
  `;
}

function renderColumn(col){
  const cards = cardsOf(col.id);
  const tipo = TIPOS[col.tipo] || TIPOS.aberto;
  const total = cards.reduce((s,c)=> s + (Number(c.valor)||0), 0);
  const isEditing = editingColId === col.id;
  const menuOpen = openMenuColId === col.id;

  return `
    <div class="column" data-col-id="${col.id}" data-action="col-dropzone">
      <div class="col-head">
        <div class="col-head-top">
          <span class="grip" draggable="true" data-action="drag-col-handle" data-col-id="${col.id}" title="Arraste para reordenar">⠿</span>
          ${isEditing
            ? `<input class="col-name-input" id="col-rename-${col.id}" value="${esc(editingColName)}" />`
            : `<span class="col-name" data-action="edit-col-name" data-col-id="${col.id}" title="Clique para renomear">${esc(col.nome)}</span>`
          }
          <button class="col-add-btn" data-action="open-new-card" data-col-id="${col.id}" title="Adicionar cliente">+</button>
          <button class="col-menu-btn" data-action="toggle-col-menu" data-col-id="${col.id}">▾</button>
        </div>
        <div class="col-meta">
          <span class="badge" style="color:${tipo.color};background:${tipo.bg};${tipo.strike ? 'text-decoration:line-through;' : ''}">${tipo.label}</span>
          <span class="col-total">${fmtBRL(total)}</span>
        </div>
        ${menuOpen ? `
          <div class="col-menu">
            <div class="col-menu-title">Marcar coluna como</div>
            ${Object.entries(TIPOS).map(([key,t])=>`
              <button class="col-menu-item" data-action="set-col-tipo" data-col-id="${col.id}" data-tipo="${key}">
                <span class="dot" style="background:${t.color}"></span>${t.label} ${col.tipo===key?'✓':''}
              </button>
            `).join('')}
            <div class="col-menu-sep">
              <button class="col-menu-item danger" data-action="delete-col" data-col-id="${col.id}">🗑 Excluir coluna</button>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="cards">
        ${cards.length===0 ? '<p class="empty-col">Nenhum cliente aqui ainda</p>' : cards.map(card=>renderCard(card)).join('')}
      </div>
    </div>
  `;
}

function renderCard(card){
  const temp = TEMPS[card.temperatura] || TEMPS.frio;
  const showMonth = filterMonth === null && card.mes;
  return `
    <div class="card" draggable="true" data-action="drag-card" data-card-id="${card.id}">
      <div class="card-drag-handle" title="Arraste para mover">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="3" r="1.4"/><circle cx="11" cy="3" r="1.4"/>
          <circle cx="5" cy="8" r="1.4"/><circle cx="11" cy="8" r="1.4"/>
          <circle cx="5" cy="13" r="1.4"/><circle cx="11" cy="13" r="1.4"/>
        </svg>
      </div>
      <div class="card-main">
        <div class="card-perf"></div>
        <div class="card-body" data-action="open-edit-card" data-card-id="${card.id}">
          <div class="card-top">
            <span class="card-name">${esc(card.cliente) || 'Sem nome'}</span>
            <span class="temp-badge" style="color:${temp.color};background:${temp.bg}">${temp.emoji} ${temp.label}</span>
          </div>
          <div class="card-value-row">
            <span class="card-value">${fmtBRL(card.valor)}</span>
            ${showMonth ? `<span class="month-badge">${monthLabel(card.mes)}</span>` : ''}
          </div>
          ${(card.telefone || card.obs) ? `
            <div class="card-extra">
              ${card.telefone ? `
                <div class="card-phone-row">
                  <span class="phone-text">☎ ${esc(card.telefone)}</span>
                  <button class="wa-btn" data-action="open-whatsapp" data-phone="${esc(card.telefone)}" title="Abrir conversa no WhatsApp">
                    ${WA_ICON} WhatsApp
                  </button>
                </div>
              ` : ''}
              ${card.obs ? `<p>${esc(card.obs)}</p>` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/* ---------- página: Leads ---------- */
function renderLeadsPage(){
  const leads = filteredLeads();
  return `
    <div class="page-head">
      <div>
        <h1>Leads</h1>
        <p>${board.cards.length} ${board.cards.length===1?'contato':'contatos'} na sua base</p>
      </div>
      <button class="btn-primary" data-action="open-new-lead">+ Novo lead</button>
    </div>

    <div class="leads-toolbar">
      <input type="text" class="leads-search" id="leads-search-input" placeholder="Buscar por nome ou telefone" value="${esc(leadsSearch)}" />
      <select class="leads-filter" id="leads-status-filter">
        <option value="">Todos os status</option>
        ${board.columns.map(c=>`<option value="${c.id}" ${leadsStatusFilter===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}
      </select>
    </div>

    <div class="leads-table-wrap">
      <table class="leads-table">
        <thead>
          <tr><th>Nome</th><th>Contato</th><th>Etapa</th><th>Valor</th><th></th></tr>
        </thead>
        <tbody>
          ${leads.length ? leads.map(c=>{
            const col = board.columns.find(k=>k.id===c.columnId);
            const tipo = col ? (TIPOS[col.tipo] || TIPOS.aberto) : TIPOS.aberto;
            return `
              <tr class="clickable" data-action="open-edit-card" data-card-id="${c.id}">
                <td>${esc(c.cliente) || 'Sem nome'}</td>
                <td>${c.telefone ? esc(c.telefone) : '—'}</td>
                <td><span class="badge" style="color:${tipo.color};background:${tipo.bg};${tipo.strike?'text-decoration:line-through;':''}">${col ? esc(col.nome) : '—'}</span></td>
                <td>${fmtBRL(c.valor)}</td>
                <td>
                  <div class="leads-row-actions">
                    ${c.telefone ? `<button class="icon-btn" data-action="open-whatsapp" data-phone="${esc(c.telefone)}" title="WhatsApp">${WA_ICON}</button>` : ''}
                  </div>
                </td>
              </tr>
            `;
          }).join('') : `<tr class="leads-empty-row"><td colspan="5">Nenhum lead encontrado. Cadastre o primeiro no botão "Novo lead".</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

/* ---------- página: Tarefas ---------- */
function renderTarefasPage(){
  if(!tasksLoaded){
    return `<div class="page-head"><div><h1>Tarefas</h1><p>Carregando…</p></div></div>`;
  }
  const list = tasks
    .filter(t=> tarefasShowConcluidas ? true : !t.concluida)
    .sort((a,b)=>{
      if(a.concluida !== b.concluida) return a.concluida ? 1 : -1;
      return new Date(a.vencimento||'2999-01-01') - new Date(b.vencimento||'2999-01-01');
    });
  const pendentes = tasks.filter(t=>!t.concluida).length;
  return `
    <div class="page-head">
      <div>
        <h1>Tarefas</h1>
        <p>${pendentes} pendente${pendentes===1?'':'s'}</p>
      </div>
      <div class="page-head-actions">
        ${calendarConnected ? `<button class="btn-outline" data-action="sync-calendar-now" ${calendarSyncing?'disabled':''}>${calendarSyncing?'Sincronizando…':'📅 Sincronizar Agenda'}</button>` : ''}
        <button class="btn-primary" data-action="open-new-task">+ Nova tarefa</button>
      </div>
    </div>

    <label class="tasks-toolbar">
      <span class="check-circle ${tarefasShowConcluidas?'checked':''}" data-action="toggle-show-concluidas">${tarefasShowConcluidas?ICON_CHECK:''}</span>
      Mostrar concluídas
    </label>

    ${list.length ? `
      <div class="tasks-list">
        ${list.map(t=>{
          const p = PRIORIDADES[t.prioridade] || PRIORIDADES.media;
          const lead = t.leadId ? board.cards.find(c=>c.id===t.leadId) : null;
          return `
            <div class="task-row ${t.concluida?'done':''}">
              <span class="check-circle ${t.concluida?'checked':''}" data-action="toggle-task" data-task-id="${t.id}">${t.concluida?ICON_CHECK:''}</span>
              <div class="task-row-body">
                <div class="task-row-top">
                  <span class="task-row-title">${esc(t.titulo)}</span>
                  <span class="badge" style="color:${p.color};background:${p.bg}">${p.label}</span>
                </div>
                <div class="task-row-meta">
                  ${t.vencimento ? `<span>📅 ${formatDate(t.vencimento)}</span>` : ''}
                  ${lead ? `<span>👤 ${esc(lead.cliente)}</span>` : ''}
                </div>
                ${t.descricao ? `<div class="task-row-desc">${esc(t.descricao)}</div>` : ''}
              </div>
              <div class="task-row-actions">
                <button class="icon-btn" data-action="open-edit-task" data-task-id="${t.id}" title="Editar">${ICON_EDIT}</button>
                <button class="icon-btn" data-action="delete-task" data-task-id="${t.id}" title="Excluir">${ICON_TRASH}</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    ` : `<div class="tasks-empty">Nenhuma tarefa por aqui.</div>`}
  `;
}

/* ---------- página: Comissões ---------- */
function renderComissoesPage(){
  if(!contratosLoaded){
    return `<div class="page-head"><div><h1>Comissões</h1><p>Carregando…</p></div></div>`;
  }
  const stats = comissoesStats();
  return `
    <div class="page-head">
      <div>
        <h1>Comissões</h1>
        <p>Previsão de recebimento por mês · ${monthLabel(comissoesMonth, true)}</p>
      </div>
      <div class="page-head-actions">
        <div class="month-step-nav">
          <button class="icon-btn" data-action="comissoes-mes" data-delta="-1" title="Mês anterior">‹</button>
          <span>${monthLabel(comissoesMonth, true)}</span>
          <button class="icon-btn" data-action="comissoes-mes" data-delta="1" title="Próximo mês">›</button>
        </div>
        <button class="btn-primary" data-action="open-new-contrato">+ Novo contrato</button>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-card-top"><span>Previsto este mês</span></div>
        <div class="metric-value">${fmtBRL(stats.previstoMes)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-card-top"><span>Total ativo a receber</span></div>
        <div class="metric-value">${fmtBRL(stats.totalAtivo)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-card-top"><span>Contratos cadastrados</span></div>
        <div class="metric-value">${stats.total}</div>
      </div>
    </div>

    ${contratos.length ? `
      <div class="contratos-list">
        ${contratos.map(c=>renderContratoCard(c)).join('')}
      </div>
    ` : `<div class="tasks-empty">Nenhum contrato de comissão cadastrado ainda.</div>`}
  `;
}

function renderContratoCard(c){
  const anchor = (c.date||'').slice(0,7);
  const idx = monthsBetween(anchor, comissoesMonth);
  const parcelaAtual = Math.min(Math.max(idx+1, 0), c.parcelas);
  const pct = Math.max(0, Math.min(1, idx / c.parcelas));
  const status = idx >= c.parcelas ? 'Contrato quitado' : idx < 0 ? 'Ainda não iniciado' : `Parcela ${parcelaAtual}/${c.parcelas} este mês`;
  const escopo = ESCOPOS[c.scope] || ESCOPOS.Pessoal;
  const p2 = c.parcelas - c.parcelas1;
  const blocosHtml = p2 > 0
    ? `<div>🔹 ${c.parcelas1} parcela${c.parcelas1===1?'':'s'} de ${fmtBRL(c.value)} cada</div><div>🔹 ${p2} parcela${p2===1?'':'s'} de ${fmtBRL(c.value2)} cada</div>`
    : `<div>🔹 ${c.parcelas1} parcela${c.parcelas1===1?'':'s'} de ${fmtBRL(c.value)} cada</div>`;
  return `
    <div class="contrato-card">
      <div class="contrato-card-head">
        <div>
          <h3 class="contrato-card-title">${esc(c.desc)}</h3>
          <p class="contrato-card-note">
            <span class="badge" style="color:${escopo.color};background:${escopo.bg}">${escopo.label}</span>
            <span>· ${c.parcelas}x parcelas · Carta de crédito: ${fmtBRL(c.creditoValor)}</span>
          </p>
        </div>
        <div class="contrato-card-actions">
          <button class="icon-btn" data-action="open-edit-contrato" data-contrato-id="${c.id}" title="Editar">${ICON_EDIT}</button>
          <button class="icon-btn" data-action="delete-contrato" data-contrato-id="${c.id}" title="Excluir">${ICON_TRASH}</button>
        </div>
      </div>
      <div class="contrato-card-blocks">
        ${blocosHtml}
        <div class="contrato-card-total">Total líquido da comissão: ${fmtBRL(contratoTotal(c))}</div>
      </div>
      <div class="stage-bar-track"><div class="stage-bar-fill" style="width:${pct*100}%"></div></div>
      <div class="contrato-card-status">
        <span>${status}</span>
        <span>Início: ${monthLabel(anchor, true)}</span>
      </div>
    </div>
  `;
}

/* ---------- página: Configurações ---------- */
function renderConfiguracoesPage(){
  return `
    <div class="page-head">
      <div>
        <h1>Configurações</h1>
        <p>Sua conta, integrações e dados</p>
      </div>
    </div>

    <div class="config-tabs">
      <button class="tab-btn" data-action="scroll-to-config" data-target="config-perfil">Perfil</button>
      <button class="tab-btn" data-action="scroll-to-config" data-target="config-integracoes">Integrações</button>
      <button class="tab-btn" data-action="scroll-to-config" data-target="config-aparencia">Aparência</button>
    </div>

    <section id="config-perfil" class="config-group">
      <h2 class="config-group-title">Perfil</h2>
      <div class="settings-page-grid">
        <div class="settings-page-section">
          <h3>Seu perfil</h3>
          <div class="settings-page-row"><span>Nome</span><span>${esc((currentUser && currentUser.nome) || '—')}</span></div>
          <div class="settings-page-row"><span>E-mail</span><span>${esc((currentUser && currentUser.email) || '—')}</span></div>
        </div>

        <div class="settings-page-section">
          <h3>Login e segurança</h3>
          ${currentUser && !currentUser.temSenha ? `
            <p class="settings-page-note">Esta conta ainda não tem senha (entra só com o Google). Você pode definir uma agora, se quiser.</p>
          ` : ''}
          <div class="field">
            <label>Senha atual</label>
            <input type="password" id="s-senha-atual" placeholder="Deixe em branco se ainda não tem senha" />
          </div>
          <div class="field">
            <label>Nova senha</label>
            <input type="password" id="s-senha-nova" placeholder="Mínimo 6 caracteres" />
          </div>
          ${senhaMsg ? `<p class="settings-page-msg ${senhaMsg.tipo}">${esc(senhaMsg.texto)}</p>` : ''}
          <button class="btn-primary" id="s-senha-salvar" ${senhaSalvando?'disabled':''}>${senhaSalvando?'Salvando…':'Salvar senha'}</button>
        </div>
      </div>
    </section>

    <section id="config-integracoes" class="config-group">
      <h2 class="config-group-title">Integrações</h2>
      <div class="settings-page-grid">
        <div class="settings-page-section">
          <h3>Google Agenda</h3>
          <div class="settings-page-row">
            <span>Status</span>
            <span>${calendarConnected ? '✓ Conectada' : 'Não conectada'}</span>
          </div>
          ${calendarConnected
            ? `
              <div class="settings-btn-row">
                <button class="btn-outline" data-action="sync-calendar-now" ${calendarSyncing?'disabled':''}>${calendarSyncing?'Sincronizando…':'Sincronizar agora'}</button>
                <button class="btn-outline" data-action="disconnect-calendar">Desconectar</button>
              </div>
            `
            : `<button class="btn-primary" data-action="connect-calendar">Conectar Google Agenda</button>`
          }
          <p class="settings-page-note">O botão do WhatsApp de abrir conversa já funciona em todos os clientes com telefone cadastrado, sem precisar conectar nada.</p>
        </div>

        <div class="settings-page-section">
          <h3>WhatsApp Business API</h3>
          <div class="settings-page-row">
            <span>Status</span>
            <span>${whatsappConnected ? '✓ Conectado' : 'Não conectado'}</span>
          </div>
          ${whatsappConnected ? `
            <p class="settings-page-note">Conversas ficam registradas dentro do card de cada cliente. Pra reconfigurar, desconecte e conecte de novo com os dados atualizados.</p>
            <div class="settings-page-row">
              <span>Agente IA (responde clientes sozinho)</span>
              <span class="switch ${agenteIaAtivo?'on':''}" data-action="toggle-agente-ia" title="${agenteIaAtivo?'Ativado':'Desativado'}"><span class="switch-knob"></span></span>
            </div>
            ${agenteIaAtivo ? `<p class="settings-page-msg erro">⚠️ O agente está respondendo mensagens automaticamente, sem revisão sua. Ele fica em silêncio por 30 min sempre que você responder um cliente manualmente. Desative quando quiser assumir de vez.</p>` : `<p class="settings-page-note">Quando ativado, a IA responde sozinha as mensagens novas do WhatsApp — sem você revisar antes de enviar.</p>`}
            <button class="btn-outline" data-action="desconectar-whatsapp">Desconectar</button>
          ` : `
            <div class="field">
              <label>Phone Number ID</label>
              <input type="text" id="wa-phone-id" placeholder="Ex: 109xxxxxxxxxxxx" />
            </div>
            <div class="field">
              <label>Access Token</label>
              <input type="password" id="wa-token" placeholder="Token permanente gerado no Meta" />
            </div>
            <div class="field">
              <label>WABA ID (opcional)</label>
              <input type="text" id="wa-waba-id" placeholder="ID da conta comercial do WhatsApp" />
            </div>
            ${whatsappConfigMsg ? `<p class="settings-page-msg ${whatsappConfigMsg.tipo}">${esc(whatsappConfigMsg.texto)}</p>` : ''}
            <button class="btn-primary" data-action="salvar-whatsapp-config" ${whatsappSalvando?'disabled':''}>${whatsappSalvando?'Salvando…':'Conectar'}</button>
          `}
          <p class="settings-page-note">Requer conta comercial no Meta com o produto WhatsApp ativado. Passo a passo completo no README.</p>
        </div>

        <div class="settings-page-section">
          <h3>Instagram (captação de leads)</h3>
          <div class="settings-page-row">
            <span>Status</span>
            <span>${instagramConnected ? '✓ Conectado' : 'Não conectado'}</span>
          </div>
          ${instagramConnected ? `
            <p class="settings-page-note">Toda vez que alguém preencher um formulário de anúncio do Instagram/Facebook, um lead novo é criado automaticamente na primeira coluna "em aberto".</p>
            <button class="btn-outline" data-action="desconectar-instagram">Desconectar</button>
          ` : `
            <div class="field">
              <label>Page ID</label>
              <input type="text" id="ig-page-id" placeholder="ID da sua Página do Facebook" />
            </div>
            <div class="field">
              <label>Access Token da página</label>
              <input type="password" id="ig-page-token" placeholder="Token com permissão leads_retrieval" />
            </div>
            ${instagramConfigMsg ? `<p class="settings-page-msg ${instagramConfigMsg.tipo}">${esc(instagramConfigMsg.texto)}</p>` : ''}
            <button class="btn-primary" data-action="salvar-instagram-config" ${instagramSalvando?'disabled':''}>${instagramSalvando?'Salvando…':'Conectar'}</button>
          `}
          <p class="settings-page-note">Requer o produto Marketing API no mesmo App do Meta usado no WhatsApp, com sua Página (e Instagram profissional vinculado) conectados. Passo a passo completo no README.</p>
        </div>

        <div class="settings-page-section">
          <h3>Importar leads</h3>
          <p class="settings-page-note">Envie um arquivo CSV com as colunas <b>Nome, Telefone, Valor</b> (nessa ordem, cabeçalho na primeira linha).</p>
          <div class="field">
            <label>Coluna de destino</label>
            <select id="import-coluna">
              ${board.columns.map(c=>`<option value="${c.id}" ${importColumnId===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Arquivo CSV</label>
            <input type="file" id="import-arquivo" accept=".csv,text/csv" />
          </div>
          ${importResultado ? `<p class="settings-page-msg ok">${importResultado.sucesso} lead(s) importado(s)${importResultado.falha ? `, ${importResultado.falha} falharam` : ''}.</p>` : ''}
          <button class="btn-primary" id="import-btn" ${importando?'disabled':''}>${importando?'Importando…':'Importar'}</button>
        </div>
      </div>
    </section>

    <section id="config-aparencia" class="config-group">
      <h2 class="config-group-title">Aparência</h2>
      <div class="settings-page-grid">
        <div class="settings-page-section">
          <h3>Modo noturno e cor de destaque</h3>
          <label class="settings-toggle-row">
            <span>Modo noturno</span>
            <span class="switch ${getDarkMode()?'on':''}" data-action="toggle-dark-mode">
              <span class="switch-knob"></span>
            </span>
          </label>
          <div class="settings-page-subtitle">Cor de destaque</div>
          <div class="theme-swatches">
            ${ACCENT_PRESETS.map(cor=>`<button class="theme-swatch ${getAccentColor().toLowerCase()===cor.toLowerCase()?'active':''}" data-action="set-accent" data-color="${cor}" style="background:${cor}" title="${cor}"></button>`).join('')}
          </div>
          <label class="theme-custom-label">
            Outra cor
            <input type="color" id="theme-custom-input" value="${getAccentColor()}" />
          </label>
        </div>
      </div>
    </section>
  `;
}

/* ---------- eventos ---------- */
function bindAppEvents(){
  const app = document.getElementById('app');

  const hamburgerBtn = app.querySelector('[data-action="toggle-sidebar"]');
  if(hamburgerBtn) hamburgerBtn.addEventListener('click', ()=>{ sidebarOpen = !sidebarOpen; renderApp(); });
  const closeSidebarEl = app.querySelector('[data-action="close-sidebar"]');
  if(closeSidebarEl) closeSidebarEl.addEventListener('click', ()=>{ sidebarOpen = false; renderApp(); });
  const notifBtn = app.querySelector('[data-action="toggle-notif"]');
  if(notifBtn) notifBtn.addEventListener('click', (e)=>{ e.stopPropagation(); notifOpen = !notifOpen; renderApp(); });

  const errorBanner = app.querySelector('[data-action="dismiss-error"]');
  if(errorBanner) errorBanner.addEventListener('click', ()=>{ errorMsg=null; renderApp(); });

  const logoutBtn = app.querySelector('[data-action="logout"]');
  if(logoutBtn) logoutBtn.addEventListener('click', logout);

  app.querySelectorAll('[data-action="nav"]').forEach(btn=>{
    btn.addEventListener('click', ()=> goToPage(btn.dataset.page));
  });

  app.querySelectorAll('[data-action="edit-greeting"]').forEach(el=>{
    el.addEventListener('click', ()=>{
      editingGreeting = true;
      greetingDraft = getGreetingName();
      renderApp();
      const input = document.getElementById('greeting-input');
      if(input){ input.focus(); input.select(); }
    });
  });
  const greetingInput = document.getElementById('greeting-input');
  if(greetingInput){
    greetingInput.addEventListener('input', (e)=>{ greetingDraft = e.target.value; });
    const commitGreeting = ()=>{ editingGreeting = false; setGreetingName(greetingDraft); renderApp(); };
    greetingInput.addEventListener('blur', commitGreeting);
    greetingInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') e.target.blur(); });
  }

  const darkModeSwitch = app.querySelector('[data-action="toggle-dark-mode"]');
  if(darkModeSwitch) darkModeSwitch.addEventListener('click', ()=>{
    setDarkMode(!getDarkMode());
    renderApp();
  });
  app.querySelectorAll('[data-action="set-accent"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      setAccentColor(btn.dataset.color);
      renderApp();
    });
  });
  const themeCustomInput = document.getElementById('theme-custom-input');
  if(themeCustomInput) themeCustomInput.addEventListener('input', (e)=> setAccentColor(e.target.value));

  const connectCalBtn = app.querySelector('[data-action="connect-calendar"]');
  if(connectCalBtn) connectCalBtn.addEventListener('click', connectGoogleCalendar);
  const disconnectCalBtn = app.querySelector('[data-action="disconnect-calendar"]');
  if(disconnectCalBtn) disconnectCalBtn.addEventListener('click', disconnectGoogleCalendar);
  app.querySelectorAll('[data-action="sync-calendar-now"]').forEach(btn=>{
    btn.addEventListener('click', syncCalendarNow);
  });

  /* -- Dashboard -- */
  app.querySelectorAll('[data-action="set-dash-period"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ dashboardPeriod = btn.dataset.period; renderApp(); });
  });
  const gerarInsightsBtn = app.querySelector('[data-action="gerar-insights"]');
  if(gerarInsightsBtn) gerarInsightsBtn.addEventListener('click', gerarInsightsIA);

  /* -- tarefas (usado no Dashboard e na página Tarefas) -- */
  app.querySelectorAll('[data-action="toggle-task"]').forEach(el=>{
    el.addEventListener('click', ()=> toggleTaskConcluida(el.dataset.taskId));
  });
  const openNewTaskBtn = app.querySelector('[data-action="open-new-task"]');
  if(openNewTaskBtn) openNewTaskBtn.addEventListener('click', openNewTask);
  app.querySelectorAll('[data-action="open-edit-task"]').forEach(btn=>{
    btn.addEventListener('click', ()=> openEditTask(btn.dataset.taskId));
  });
  app.querySelectorAll('[data-action="delete-task"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.taskId;
      showConfirm({
        message: 'Excluir esta tarefa? Essa ação não pode ser desfeita.',
        onConfirm: ()=>{ deleteTaskById(id); closeConfirm(); },
      });
    });
  });
  const toggleConcluidasEl = app.querySelector('[data-action="toggle-show-concluidas"]');
  if(toggleConcluidasEl) toggleConcluidasEl.addEventListener('click', ()=>{ tarefasShowConcluidas = !tarefasShowConcluidas; renderApp(); });

  /* -- Disparos -- */
  const disparoColunaSelect = document.getElementById('disparo-coluna');
  if(disparoColunaSelect) disparoColunaSelect.addEventListener('change', (e)=>{ disparoFiltroColuna = e.target.value; renderApp(); });
  const disparoTempSelect = document.getElementById('disparo-temp');
  if(disparoTempSelect) disparoTempSelect.addEventListener('change', (e)=>{ disparoFiltroTemp = e.target.value; renderApp(); });
  app.querySelectorAll('.disparo-lead-checkbox').forEach(cb=>{
    cb.addEventListener('change', ()=>{
      if(cb.checked) disparoSelecionados.add(cb.dataset.cardId);
      else disparoSelecionados.delete(cb.dataset.cardId);
      renderApp();
    });
  });
  const disparoTextoEl = document.getElementById('disparo-texto');
  if(disparoTextoEl) disparoTextoEl.addEventListener('input', (e)=> disparoTexto = e.target.value);
  const toggleDisparoTemplateEl = app.querySelector('[data-action="toggle-disparo-template"]');
  if(toggleDisparoTemplateEl) toggleDisparoTemplateEl.addEventListener('click', ()=>{ disparoUsarTemplate = !disparoUsarTemplate; renderApp(); });
  const disparoTemplateNomeEl = document.getElementById('disparo-template-nome');
  if(disparoTemplateNomeEl) disparoTemplateNomeEl.addEventListener('input', (e)=> disparoTemplateNome = e.target.value);
  const disparoTemplateIdiomaEl = document.getElementById('disparo-template-idioma');
  if(disparoTemplateIdiomaEl) disparoTemplateIdiomaEl.addEventListener('input', (e)=> disparoTemplateIdioma = e.target.value);
  const disparoTemplateVariaveisEl = document.getElementById('disparo-template-variaveis');
  if(disparoTemplateVariaveisEl) disparoTemplateVariaveisEl.addEventListener('input', (e)=> disparoTemplateVariaveis = e.target.value);
  const carregarTemplatesBtn = app.querySelector('[data-action="carregar-templates"]');
  if(carregarTemplatesBtn) carregarTemplatesBtn.addEventListener('click', carregarTemplatesDisponiveis);
  const disparoSelTodosBtn = app.querySelector('[data-action="disparo-selecionar-todos"]');
  if(disparoSelTodosBtn) disparoSelTodosBtn.addEventListener('click', ()=>{
    board.cards.forEach(c=>{
      const bateColuna = !disparoFiltroColuna || c.columnId===disparoFiltroColuna;
      const bateTemp = !disparoFiltroTemp || c.temperatura===disparoFiltroTemp;
      if(bateColuna && bateTemp && c.telefone) disparoSelecionados.add(c.id);
    });
    renderApp();
  });
  const disparoLimparBtn = app.querySelector('[data-action="disparo-limpar-selecao"]');
  if(disparoLimparBtn) disparoLimparBtn.addEventListener('click', ()=>{ disparoSelecionados.clear(); renderApp(); });
  const enviarDisparoBtn = app.querySelector('[data-action="enviar-disparo"]');
  if(enviarDisparoBtn) enviarDisparoBtn.addEventListener('click', enviarDisparo);

  /* -- Automações -- */
  const openNewAutomacaoBtn = app.querySelector('[data-action="open-new-automacao"]');
  if(openNewAutomacaoBtn) openNewAutomacaoBtn.addEventListener('click', openNewAutomacao);
  app.querySelectorAll('[data-action="open-edit-automacao"]').forEach(btn=>{
    btn.addEventListener('click', ()=> openEditAutomacao(btn.dataset.automacaoId));
  });
  app.querySelectorAll('[data-action="toggle-automacao"]').forEach(el=>{
    el.addEventListener('click', ()=> toggleAutomacaoAtiva(el.dataset.automacaoId));
  });
  app.querySelectorAll('[data-action="delete-automacao"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.automacaoId;
      showConfirm({
        message: 'Excluir esta automação? Ela para de rodar imediatamente.',
        onConfirm: ()=>{ excluirAutomacao(id); closeConfirm(); },
      });
    });
  });

  /* -- Fluxos -- */
  const openNewFluxoBtn = app.querySelector('[data-action="open-new-fluxo"]');
  if(openNewFluxoBtn) openNewFluxoBtn.addEventListener('click', openNewFluxo);
  app.querySelectorAll('[data-action="open-edit-fluxo"]').forEach(btn=>{
    btn.addEventListener('click', ()=> openEditFluxo(btn.dataset.fluxoId));
  });
  app.querySelectorAll('[data-action="toggle-fluxo"]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const id = el.dataset.fluxoId;
      const f = fluxos.find(x=>x.id===id);
      const temMensagem = f && (f.etapas||[]).some(e=>e.tipo==='mensagem');
      if(f && !f.ativo && temMensagem){
        showConfirm({
          message: `Ativar o fluxo "${f.nome}"? Ele tem etapa(s) de envio de WhatsApp automático, sem revisão sua antes de mandar.`,
          onConfirm: ()=>{ toggleFluxoAtivo(id); closeConfirm(); },
        });
      } else {
        toggleFluxoAtivo(id);
      }
    });
  });
  app.querySelectorAll('[data-action="delete-fluxo"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.fluxoId;
      showConfirm({
        message: 'Excluir este fluxo? As execuções em andamento pra clientes atuais são interrompidas.',
        onConfirm: ()=>{ excluirFluxo(id); closeConfirm(); },
      });
    });
  });

  /* -- Relatórios -- */
  const relatorioFunilSelect = document.getElementById('relatorio-funil-select');
  if(relatorioFunilSelect) relatorioFunilSelect.addEventListener('change', (e)=>{ relatorioFunilId = e.target.value; renderApp(); });
  const exportarCsvBtn = app.querySelector('[data-action="exportar-csv"]');
  if(exportarCsvBtn) exportarCsvBtn.addEventListener('click', exportarCsv);

  /* -- Equipe / Chat Interno / Supervisão -- */
  const equipeNomeInput = document.getElementById('equipe-nome-novo');
  if(equipeNomeInput) equipeNomeInput.addEventListener('input', (e)=> equipeNomeNovo = e.target.value);
  const criarEquipeBtn = app.querySelector('[data-action="criar-equipe"]');
  if(criarEquipeBtn) criarEquipeBtn.addEventListener('click', criarEquipe);
  const equipeCodigoInput = document.getElementById('equipe-codigo-entrar');
  if(equipeCodigoInput) equipeCodigoInput.addEventListener('input', (e)=> equipeCodigoEntrar = e.target.value);
  const entrarEquipeBtn = app.querySelector('[data-action="entrar-equipe"]');
  if(entrarEquipeBtn) entrarEquipeBtn.addEventListener('click', entrarNaEquipe);
  const sairEquipeBtn = app.querySelector('[data-action="sair-equipe"]');
  if(sairEquipeBtn) sairEquipeBtn.addEventListener('click', ()=>{
    showConfirm({
      message: 'Sair dessa equipe? Você perde acesso ao chat interno e à supervisão dela — seu funil continua intocado.',
      onConfirm: ()=>{ sairDaEquipe(); closeConfirm(); },
    });
  });
  const regenerarCodigoBtn = app.querySelector('[data-action="regenerar-codigo-equipe"]');
  if(regenerarCodigoBtn) regenerarCodigoBtn.addEventListener('click', regenerarCodigoEquipe);
  app.querySelectorAll('[data-action="alterar-papel-membro"]').forEach(btn=>{
    btn.addEventListener('click', ()=> alterarPapelMembro(btn.dataset.userId, btn.dataset.papel));
  });
  app.querySelectorAll('[data-action="remover-membro"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      showConfirm({
        message: 'Remover esse membro da equipe? O funil dele continua intocado, só perde acesso ao chat e à supervisão.',
        onConfirm: ()=>{ removerMembro(btn.dataset.userId); closeConfirm(); },
      });
    });
  });
  const chatInternoInput = document.getElementById('chat-interno-input');
  if(chatInternoInput){
    chatInternoInput.addEventListener('input', (e)=> chatTexto = e.target.value);
    chatInternoInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') enviarMensagemChat(); });
  }
  const enviarChatBtn = app.querySelector('[data-action="enviar-chat-interno"]');
  if(enviarChatBtn) enviarChatBtn.addEventListener('click', enviarMensagemChat);
  const chatMsgsEl = document.getElementById('chat-interno-mensagens');
  if(chatMsgsEl) chatMsgsEl.scrollTop = chatMsgsEl.scrollHeight;

  /* -- Comissões -- */
  app.querySelectorAll('[data-action="comissoes-mes"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ comissoesMonth = addMonthsKey(comissoesMonth, parseInt(btn.dataset.delta,10)); renderApp(); });
  });
  const openNewContratoBtn = app.querySelector('[data-action="open-new-contrato"]');
  if(openNewContratoBtn) openNewContratoBtn.addEventListener('click', openNewContrato);
  app.querySelectorAll('[data-action="open-edit-contrato"]').forEach(btn=>{
    btn.addEventListener('click', ()=> openEditContrato(btn.dataset.contratoId));
  });
  app.querySelectorAll('[data-action="delete-contrato"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.contratoId;
      showConfirm({
        message: 'Excluir este contrato de comissão? Essa ação não pode ser desfeita.',
        onConfirm: ()=>{ deleteContratoById(id); closeConfirm(); },
      });
    });
  });

  /* -- Configurações -- */
  app.querySelectorAll('[data-action="scroll-to-config"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const alvo = document.getElementById(btn.dataset.target);
      if(alvo) alvo.scrollIntoView({ behavior:'smooth', block:'start' });
    });
  });
  const senhaAtualInput = document.getElementById('s-senha-atual');
  if(senhaAtualInput) senhaAtualInput.addEventListener('input', (e)=> senhaAtualVal = e.target.value);
  const senhaNovaInput = document.getElementById('s-senha-nova');
  if(senhaNovaInput) senhaNovaInput.addEventListener('input', (e)=> senhaNovaVal = e.target.value);
  const senhaSalvarBtn = document.getElementById('s-senha-salvar');
  if(senhaSalvarBtn) senhaSalvarBtn.addEventListener('click', salvarSenha);

  const importColunaSelect = document.getElementById('import-coluna');
  if(importColunaSelect) importColunaSelect.addEventListener('change', (e)=> importColumnId = e.target.value);
  const importBtn = document.getElementById('import-btn');
  if(importBtn) importBtn.addEventListener('click', importarLeadsCsv);

  const salvarWaBtn = app.querySelector('[data-action="salvar-whatsapp-config"]');
  if(salvarWaBtn) salvarWaBtn.addEventListener('click', salvarWhatsappConfig);
  const desconectarWaBtn = app.querySelector('[data-action="desconectar-whatsapp"]');
  if(desconectarWaBtn) desconectarWaBtn.addEventListener('click', desconectarWhatsapp);

  const toggleAgenteIaEl = app.querySelector('[data-action="toggle-agente-ia"]');
  if(toggleAgenteIaEl) toggleAgenteIaEl.addEventListener('click', ()=>{
    if(!agenteIaAtivo){
      showConfirm({
        message: 'Ativar o agente de IA? Ele vai responder mensagens de WhatsApp automaticamente, sem você revisar antes de enviar. Sempre que você responder um cliente manualmente, o agente fica em silêncio por 30 minutos naquela conversa. Pode desativar a qualquer momento.',
        onConfirm: ()=>{ definirAgenteIa(true); closeConfirm(); },
      });
    } else {
      definirAgenteIa(false);
    }
  });

  const salvarIgBtn = app.querySelector('[data-action="salvar-instagram-config"]');
  if(salvarIgBtn) salvarIgBtn.addEventListener('click', salvarInstagramConfig);
  const desconectarIgBtn = app.querySelector('[data-action="desconectar-instagram"]');
  if(desconectarIgBtn) desconectarIgBtn.addEventListener('click', desconectarInstagram);

  /* -- Leads -- */
  const openNewLeadBtn = app.querySelector('[data-action="open-new-lead"]');
  if(openNewLeadBtn) openNewLeadBtn.addEventListener('click', ()=> openNewCard());
  const leadsSearchInput = document.getElementById('leads-search-input');
  if(leadsSearchInput) leadsSearchInput.addEventListener('input', (e)=>{
    const cursorPos = e.target.selectionStart;
    leadsSearch = e.target.value;
    renderApp();
    const novoInput = document.getElementById('leads-search-input');
    if(novoInput){ novoInput.focus(); novoInput.setSelectionRange(cursorPos, cursorPos); }
  });
  const leadsFilterSelect = document.getElementById('leads-status-filter');
  if(leadsFilterSelect) leadsFilterSelect.addEventListener('change', (e)=>{ leadsStatusFilter = e.target.value; renderApp(); });

  /* -- Pipeline: funis -- */
  app.querySelectorAll('[data-action="set-funil"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ funilAtualId = btn.dataset.funilId; renderApp(); });
  });
  const novoFunilBtn = app.querySelector('[data-action="open-new-funil"]');
  if(novoFunilBtn) novoFunilBtn.addEventListener('click', criarNovoFunil);
  const editFunilBtn = app.querySelector('[data-action="edit-funil-name"]');
  if(editFunilBtn) editFunilBtn.addEventListener('click', ()=>{
    editingFunilId = editFunilBtn.dataset.funilId;
    const f = funis.find(x=>x.id===editingFunilId);
    editingFunilName = f ? f.nome : '';
    renderApp();
    const input = document.getElementById('funil-rename-'+editingFunilId);
    if(input){ input.focus(); input.select(); }
  });
  document.querySelectorAll('[id^="funil-rename-"]').forEach(input=>{
    input.addEventListener('input', (e)=>{ editingFunilName = e.target.value; });
    const commitFunil = ()=>{ const id = editingFunilId; editingFunilId = null; renomearFunil(id, editingFunilName); };
    input.addEventListener('blur', commitFunil);
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') e.target.blur(); });
  });
  const deleteFunilBtn = app.querySelector('[data-action="delete-funil"]');
  if(deleteFunilBtn) deleteFunilBtn.addEventListener('click', ()=>{
    const id = deleteFunilBtn.dataset.funilId;
    const f = funis.find(x=>x.id===id);
    showConfirm({
      message: `Excluir o funil "${f.nome}"? Todas as colunas e clientes dele também serão excluídos.`,
      onConfirm: ()=>{ excluirFunil(id); closeConfirm(); },
    });
  });

  /* -- Pipeline: filtro de data -- */
  const dateMenuBtn = app.querySelector('[data-action="toggle-date-menu"]');
  if(dateMenuBtn) dateMenuBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    dateMenuOpen = !dateMenuOpen;
    renderApp();
  });
  app.querySelectorAll('[data-action="set-month"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ filterMonth = btn.dataset.month || null; dateMenuOpen = false; renderApp(); });
  });
  const gotoInput = document.getElementById('goto-month-input');
  if(gotoInput) gotoInput.addEventListener('change', (e)=>{ if(e.target.value){ filterMonth = e.target.value; dateMenuOpen = false; renderApp(); } });

  /* -- Pipeline: colunas -- */
  app.querySelectorAll('[data-action="edit-col-name"]').forEach(el=>{
    el.addEventListener('click', ()=>{
      editingColId = el.dataset.colId;
      const col = board.columns.find(c=>c.id===editingColId);
      editingColName = col ? col.nome : '';
      renderApp();
      const input = document.getElementById('col-rename-'+editingColId);
      if(input){ input.focus(); input.select(); }
    });
  });
  app.querySelectorAll('[id^="col-rename-"]').forEach(input=>{
    input.addEventListener('input', (e)=>{ editingColName = e.target.value; });
    const commit = ()=>{ const id = editingColId; editingColId=null; renameColumn(id, editingColName); };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') e.target.blur(); });
  });

  app.querySelectorAll('[data-action="toggle-col-menu"]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      openMenuColId = (openMenuColId===btn.dataset.colId) ? null : btn.dataset.colId;
      renderApp();
    });
  });
  app.querySelectorAll('[data-action="set-col-tipo"]').forEach(btn=>{
    btn.addEventListener('click', ()=> changeTipo(btn.dataset.colId, btn.dataset.tipo));
  });
  app.querySelectorAll('[data-action="delete-col"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.colId;
      const col = board.columns.find(c=>c.id===id);
      const n = cardsOf(id).length;
      openMenuColId = null;
      renderApp();
      showConfirm({
        message: n ? `Excluir a coluna "${col.nome}"? Os ${n} cliente(s) dela também serão removidos.` : `Excluir a coluna "${col.nome}"?`,
        onConfirm: ()=>{ deleteColumnById(id); closeConfirm(); },
      });
    });
  });

  /* -- Pipeline / Leads: cards -- */
  app.querySelectorAll('[data-action="open-new-card"]').forEach(btn=>{
    btn.addEventListener('click', ()=> openNewCard(btn.dataset.colId));
  });
  app.querySelectorAll('[data-action="open-edit-card"]').forEach(el=>{
    el.addEventListener('click', ()=> openEditCard(el.dataset.cardId));
  });
  app.querySelectorAll('[data-action="open-whatsapp"]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      abrirWhatsapp(btn.dataset.phone);
    });
  });

  app.querySelectorAll('[data-action="start-add-col"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ addingCol=true; newColNameVal=''; renderApp();
      const inp = document.getElementById('new-col-input'); if(inp) inp.focus();
    });
  });
  const newColInput = document.getElementById('new-col-input');
  if(newColInput){
    newColInput.addEventListener('input', (e)=>{ newColNameVal = e.target.value; });
    newColInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') addColumn(); });
  }
  app.querySelectorAll('[data-action="confirm-add-col"]').forEach(btn=> btn.addEventListener('click', addColumn));
  app.querySelectorAll('[data-action="cancel-add-col"]').forEach(btn=> btn.addEventListener('click', ()=>{ addingCol=false; newColNameVal=''; renderApp(); }));

  /* drag and drop */
  app.querySelectorAll('.card').forEach(cardEl=>{
    cardEl.addEventListener('dragstart', (e)=>{
      e.dataTransfer.setData('text/x-crm-card', cardEl.dataset.cardId);
      cardEl.classList.add('dragging');
    });
    cardEl.addEventListener('dragend', ()=> cardEl.classList.remove('dragging'));
  });
  app.querySelectorAll('[data-action="drag-col-handle"]').forEach(gripEl=>{
    gripEl.addEventListener('dragstart', (e)=>{
      e.stopPropagation();
      e.dataTransfer.setData('text/x-crm-column', gripEl.dataset.colId);
      const colEl = gripEl.closest('.column');
      if(colEl) colEl.classList.add('dragging-col');
    });
    gripEl.addEventListener('dragend', (e)=>{
      e.stopPropagation();
      const colEl = gripEl.closest('.column');
      if(colEl) colEl.classList.remove('dragging-col');
    });
  });
  app.querySelectorAll('.column').forEach(colEl=>{
    colEl.addEventListener('dragover', (e)=> e.preventDefault());
    colEl.addEventListener('drop', (e)=>{
      e.preventDefault();
      const colId = e.dataTransfer.getData('text/x-crm-column');
      const cardId = e.dataTransfer.getData('text/x-crm-card');
      if(colId) reorderColumns(colId, colEl.dataset.colId);
      else if(cardId) moveCard(cardId, colEl.dataset.colId);
    });
  });

  document.addEventListener('click', closeMenusOnOutsideClick);
}
function closeMenusOnOutsideClick(e){
  if(openMenuColId && !e.target.closest('.col-menu') && !e.target.closest('[data-action="toggle-col-menu"]')){
    openMenuColId = null; renderApp();
  }
  if(dateMenuOpen && !e.target.closest('.date-menu') && !e.target.closest('[data-action="toggle-date-menu"]')){
    dateMenuOpen = false; renderApp();
  }
  if(notifOpen && !e.target.closest('.notif-panel') && !e.target.closest('[data-action="toggle-notif"]')){
    notifOpen = false; renderApp();
  }
}

/* ---------- modal do cliente ---------- */
function openNewCard(columnId){
  const colId = columnId || ((board.columns.find(c=>c.tipo==='aberto') || board.columns[0] || {}).id);
  modalForm = {
    __isNew: true, id:null, columnId: colId,
    cliente:'', valor:0, temperatura:'morno', telefone:'', obs:'',
    mes: filterMonth || currentMonthKey(),
  };
  renderModal();
}
function openEditCard(id){
  const card = board.cards.find(c=>c.id===id);
  if(!card) return;
  modalForm = { ...card, __isNew:false };
  notifOpen = false;
  renderModal();
}
function closeModal(){ modalForm = null; document.getElementById('modal-root').innerHTML=''; }

function renderModal(){
  const root = document.getElementById('modal-root');
  if(!modalForm){ root.innerHTML=''; return; }
  const f = modalForm;

  root.innerHTML = `
    <div class="overlay" id="modal-overlay">
      <div class="modal">
        <div class="modal-head">
          <h3>${f.__isNew ? 'Novo cliente' : 'Editar cliente'}</h3>
          <button id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Nome do cliente</label>
            <input type="text" id="f-cliente" value="${esc(f.cliente)}" placeholder="Ex: Ana Souza" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>Valor de crédito</label>
              <div class="money-wrap">
                <span>R$</span>
                <input type="text" inputmode="numeric" id="f-valor" value="${f.valor ? Number(f.valor).toLocaleString('pt-BR') : ''}" placeholder="0" />
              </div>
            </div>
            <div class="field">
              <label>Coluna</label>
              <select id="f-coluna">
                ${board.columns.map(c=>`<option value="${c.id}" ${c.id===f.columnId?'selected':''}>${esc(c.nome)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="field">
            <label>Mês de referência</label>
            <input type="month" id="f-mes" value="${f.mes || currentMonthKey()}" />
          </div>
          <div class="field">
            <label>Qualificação</label>
            <div class="temp-toggle" id="f-temp-toggle">
              ${Object.entries(TEMPS).map(([key,t])=>`
                <div class="temp-btn ${f.temperatura===key ? 'active-'+key : ''}" data-temp="${key}">${t.emoji} ${t.label}</div>
              `).join('')}
            </div>
          </div>
          <div class="field">
            <label>Telefone (opcional)</label>
            <input type="text" id="f-telefone" value="${esc(f.telefone||'')}" placeholder="(11) 90000-0000" />
            <div class="wa-actions-row">
              <button type="button" class="wa-btn wa-btn-modal" id="f-whatsapp" style="${f.telefone ? '' : 'display:none;'}">
                ${WA_ICON} Abrir WhatsApp
              </button>
              ${!f.__isNew ? `<button type="button" class="ai-btn" id="f-ai-mensagem">${ICON_SPARKLE} Sugerir mensagem</button>` : ''}
              ${!f.__isNew && whatsappConnected ? `<button type="button" class="ai-btn" id="f-ver-conversa">${WA_ICON} Ver conversa</button>` : ''}
            </div>
            <div class="ai-result" id="f-ai-mensagem-result" style="display:none;"></div>
            <div class="wa-conversa" id="f-wa-conversa" style="display:none;"></div>
          </div>
          <div class="field">
            <label>Observações (opcional)</label>
            <textarea id="f-obs" rows="3" placeholder="Detalhes da negociação...">${esc(f.obs||'')}</textarea>
            ${!f.__isNew ? `<button type="button" class="ai-btn" id="f-ai-tarefa">${ICON_SPARKLE} Sugerir tarefa de acompanhamento</button>` : ''}
            <div class="ai-result" id="f-ai-tarefa-result" style="display:none;"></div>
          </div>
        </div>
        <div class="modal-foot">
          ${!f.__isNew ? `<button class="delete-link" id="f-delete">🗑 Excluir</button>` : '<span></span>'}
          <div class="modal-foot-actions">
            <button class="btn-outline" id="f-cancel">Cancelar</button>
            <button class="btn-save" id="f-save">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('f-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e)=>{ if(e.target.id==='modal-overlay') closeModal(); });

  document.getElementById('f-cliente').addEventListener('input', (e)=> modalForm.cliente = e.target.value);
  const telefoneInput = document.getElementById('f-telefone');
  const waModalBtn = document.getElementById('f-whatsapp');
  telefoneInput.addEventListener('input', (e)=>{
    modalForm.telefone = e.target.value;
    waModalBtn.style.display = e.target.value.trim() ? 'inline-flex' : 'none';
  });
  waModalBtn.addEventListener('click', ()=> abrirWhatsapp(modalForm.telefone));
  document.getElementById('f-obs').addEventListener('input', (e)=> modalForm.obs = e.target.value);
  const aiMensagemBtn = document.getElementById('f-ai-mensagem');
  if(aiMensagemBtn) aiMensagemBtn.addEventListener('click', sugerirMensagemIA);
  const aiTarefaBtn = document.getElementById('f-ai-tarefa');
  if(aiTarefaBtn) aiTarefaBtn.addEventListener('click', sugerirTarefaIA);
  const verConversaBtn = document.getElementById('f-ver-conversa');
  if(verConversaBtn) verConversaBtn.addEventListener('click', abrirConversaWhatsapp);
  document.getElementById('f-coluna').addEventListener('change', (e)=> modalForm.columnId = e.target.value);
  document.getElementById('f-mes').addEventListener('change', (e)=> modalForm.mes = e.target.value);

  const valorInput = document.getElementById('f-valor');
  valorInput.addEventListener('input', (e)=>{
    const { numero, texto } = maskInteiro(e.target.value);
    modalForm.valor = numero;
    e.target.value = texto;
  });

  document.querySelectorAll('#f-temp-toggle .temp-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      modalForm.temperatura = btn.dataset.temp;
      document.querySelectorAll('#f-temp-toggle .temp-btn').forEach(b=>{
        b.className = 'temp-btn' + (b.dataset.temp===modalForm.temperatura ? ' active-'+b.dataset.temp : '');
      });
    });
  });

  document.getElementById('f-save').addEventListener('click', saveCardFromModal);
  if(!f.__isNew){
    document.getElementById('f-delete').addEventListener('click', ()=>{
      showConfirm({
        message: 'Excluir este cliente do funil? Essa ação não pode ser desfeita.',
        onConfirm: ()=>{ deleteCardById(f.id); closeModal(); closeConfirm(); },
      });
    });
  }
}

/* ---------- modal da tarefa ---------- */
function openNewTask(){
  taskModalForm = { __isNew:true, id:null, titulo:'', vencimento:'', prioridade:'media', leadId:'', descricao:'' };
  renderTaskModal();
}
function openEditTask(id){
  const t = tasks.find(x=>x.id===id);
  if(!t) return;
  taskModalForm = { ...t, __isNew:false, vencimento: t.vencimento ? t.vencimento.slice(0,10) : '', leadId: t.leadId || '' };
  renderTaskModal();
}
function closeTaskModal(){ taskModalForm = null; document.getElementById('modal-root').innerHTML=''; }

function renderTaskModal(){
  const root = document.getElementById('modal-root');
  if(!taskModalForm){ root.innerHTML=''; return; }
  const f = taskModalForm;

  root.innerHTML = `
    <div class="overlay" id="task-modal-overlay">
      <div class="modal">
        <div class="modal-head">
          <h3>${f.__isNew ? 'Nova tarefa' : 'Editar tarefa'}</h3>
          <button id="task-modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Título</label>
            <input type="text" id="t-titulo" value="${esc(f.titulo)}" placeholder="Ex: Ligar para cliente" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>Vencimento</label>
              <input type="date" id="t-vencimento" value="${f.vencimento||''}" />
            </div>
            <div class="field">
              <label>Prioridade</label>
              <select id="t-prioridade">
                ${Object.entries(PRIORIDADES).map(([key,p])=>`<option value="${key}" ${f.prioridade===key?'selected':''}>${p.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="field">
            <label>Lead relacionado</label>
            <select id="t-lead">
              <option value="">Sem lead</option>
              ${board.cards.map(c=>`<option value="${c.id}" ${f.leadId===c.id?'selected':''}>${esc(c.cliente) || 'Sem nome'}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Descrição</label>
            <textarea id="t-descricao" rows="3" placeholder="Detalhes da tarefa...">${esc(f.descricao||'')}</textarea>
          </div>
        </div>
        <div class="modal-foot">
          ${!f.__isNew ? `<button class="delete-link" id="t-delete">🗑 Excluir</button>` : '<span></span>'}
          <div class="modal-foot-actions">
            <button class="btn-outline" id="t-cancel">Cancelar</button>
            <button class="btn-save" id="t-save">Salvar tarefa</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('task-modal-close').addEventListener('click', closeTaskModal);
  document.getElementById('t-cancel').addEventListener('click', closeTaskModal);
  document.getElementById('task-modal-overlay').addEventListener('click', (e)=>{ if(e.target.id==='task-modal-overlay') closeTaskModal(); });

  document.getElementById('t-titulo').addEventListener('input', (e)=> taskModalForm.titulo = e.target.value);
  document.getElementById('t-vencimento').addEventListener('change', (e)=> taskModalForm.vencimento = e.target.value);
  document.getElementById('t-prioridade').addEventListener('change', (e)=> taskModalForm.prioridade = e.target.value);
  document.getElementById('t-lead').addEventListener('change', (e)=> taskModalForm.leadId = e.target.value);
  document.getElementById('t-descricao').addEventListener('input', (e)=> taskModalForm.descricao = e.target.value);

  document.getElementById('t-save').addEventListener('click', saveTaskFromModal);
  if(!f.__isNew){
    document.getElementById('t-delete').addEventListener('click', ()=>{
      showConfirm({
        message: 'Excluir esta tarefa? Essa ação não pode ser desfeita.',
        onConfirm: ()=>{ deleteTaskById(f.id); closeTaskModal(); closeConfirm(); },
      });
    });
  }
}

/* ---------- página: Conversas ---------- */
function renderConversasPage(){
  if(!conversasLoaded){
    return `<div class="page-head"><div><h1>Conversas</h1><p>Carregando…</p></div></div>`;
  }
  return `
    <div class="page-head">
      <div>
        <h1>Conversas</h1>
        <p>${conversas.length} conversa${conversas.length===1?'':'s'} no WhatsApp</p>
      </div>
    </div>
    ${!whatsappConnected ? `<div class="tasks-empty">Conecte o WhatsApp Business em Configurações → Integrações para ver as conversas aqui.</div>` : (
      conversas.length ? `
        <div class="conversas-list">
          ${conversas.map(cv=>`
            <div class="conversa-item" data-action="open-edit-card" data-card-id="${cv.card.id}">
              <div class="conversa-item-main">
                <span class="conversa-item-nome">${esc(cv.card.cliente) || 'Sem nome'}</span>
                <span class="conversa-item-preview">${cv.direcaoUltima==='out' ? 'Você: ' : ''}${esc((cv.ultimaMensagem||'').slice(0,90))}</span>
              </div>
              <span class="conversa-item-hora">${formatDateHora(cv.ultimaMensagemEm)}</span>
            </div>
          `).join('')}
        </div>
      ` : `<div class="tasks-empty">Nenhuma conversa ainda.</div>`
    )}
  `;
}

/* ---------- página: Disparos ---------- */
function renderDisparosPage(){
  const filtrados = board.cards.filter(c=>{
    if(disparoFiltroColuna && c.columnId !== disparoFiltroColuna) return false;
    if(disparoFiltroTemp && c.temperatura !== disparoFiltroTemp) return false;
    return !!c.telefone;
  });
  return `
    <div class="page-head">
      <div>
        <h1>Disparos</h1>
        <p>Envie a mesma mensagem para vários leads de uma vez</p>
      </div>
    </div>
    ${!whatsappConnected ? `<div class="tasks-empty">Conecte o WhatsApp Business em Configurações → Integrações para usar os disparos.</div>` : `
      <div class="settings-page-section" style="margin-bottom:20px;">
        <h3>Filtrar leads</h3>
        <div class="field-row">
          <div class="field">
            <label>Coluna</label>
            <select id="disparo-coluna">
              <option value="">Todas</option>
              ${board.columns.map(c=>`<option value="${c.id}" ${disparoFiltroColuna===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Qualificação</label>
            <select id="disparo-temp">
              <option value="">Todas</option>
              <option value="quente" ${disparoFiltroTemp==='quente'?'selected':''}>Quente</option>
              <option value="morno" ${disparoFiltroTemp==='morno'?'selected':''}>Morno</option>
              <option value="frio" ${disparoFiltroTemp==='frio'?'selected':''}>Frio</option>
            </select>
          </div>
        </div>
        <p class="settings-page-note">${filtrados.length} lead(s) com telefone encontrados. Marque quem vai receber:</p>
        <div class="disparo-lista-leads">
          ${filtrados.length ? filtrados.map(c=>`
            <label class="disparo-lead-item">
              <input type="checkbox" class="disparo-lead-checkbox" data-card-id="${c.id}" ${disparoSelecionados.has(c.id)?'checked':''} />
              <span>${esc(c.cliente)} <span class="settings-page-note">${esc(c.telefone)}</span></span>
            </label>
          `).join('') : '<p class="dash-empty">Nenhum lead encontrado com esse filtro.</p>'}
        </div>
        <div class="settings-btn-row" style="margin-top:10px;">
          <button class="btn-outline" data-action="disparo-selecionar-todos">Selecionar todos</button>
          <button class="btn-outline" data-action="disparo-limpar-selecao">Limpar seleção</button>
        </div>
      </div>

      <div class="settings-page-section">
        <h3>Mensagem</h3>
        <label class="settings-toggle-row">
          <span>Usar modelo de mensagem (alcança leads frios)</span>
          <span class="switch ${disparoUsarTemplate?'on':''}" data-action="toggle-disparo-template">
            <span class="switch-knob"></span>
          </span>
        </label>
        ${disparoUsarTemplate ? `
          <div class="field-row">
            <div class="field">
              <label>Nome do modelo</label>
              <input type="text" id="disparo-template-nome" value="${esc(disparoTemplateNome)}" placeholder="ex: boas_vindas" />
            </div>
            <div class="field">
              <label>Idioma</label>
              <input type="text" id="disparo-template-idioma" value="${esc(disparoTemplateIdioma)}" placeholder="pt_BR" />
            </div>
          </div>
          <div class="field">
            <label>Variáveis do modelo (opcional, separadas por vírgula, na ordem certa)</label>
            <input type="text" id="disparo-template-variaveis" value="${esc(disparoTemplateVariaveis)}" placeholder="Ex: João, 15/08" />
          </div>
          <button class="btn-outline" data-action="carregar-templates">Carregar modelos aprovados</button>
          ${disparoTemplatesDisponiveis.length ? `<p class="settings-page-note">Modelos encontrados: ${disparoTemplatesDisponiveis.map(t=>esc(t.nome)).join(', ')}</p>` : ''}
        ` : `
          <div class="field">
            <textarea id="disparo-texto" rows="4" placeholder="Escreva a mensagem que será enviada...">${esc(disparoTexto)}</textarea>
          </div>
        `}
        <p class="settings-page-note">⚠️ Texto livre só chega pra quem te escreveu nas últimas 24h — regra da própria Meta. Modelo de mensagem funciona pra qualquer lead, inclusive frio, mas precisa estar aprovado no Meta Business Manager antes.</p>
        ${disparoResultado ? `<p class="settings-page-msg ${disparoResultado.falha ? 'erro' : 'ok'}">${disparoResultado.sucesso} enviada(s)${disparoResultado.falha ? `, ${disparoResultado.falha} falharam` : ''}.</p>` : ''}
        <button class="btn-primary" data-action="enviar-disparo" ${disparoEnviando?'disabled':''}>${disparoEnviando ? 'Enviando…' : `Enviar para ${disparoSelecionados.size} lead(s)`}</button>
      </div>
    `}
  `;
}

/* ---------- página: Relatórios ---------- */
function cardsParaRelatorio(){
  if(!relatorioFunilId) return board.cards;
  const colunaIds = new Set(board.columns.filter(c=>c.funilId===relatorioFunilId).map(c=>c.id));
  return board.cards.filter(c=>colunaIds.has(c.columnId));
}
function renderRelatoriosPage(){
  const cardsRel = cardsParaRelatorio();
  const dados = relatoriosDadosMensais(6, cardsRel);
  const maxNovos = Math.max(1, ...dados.map(d=>d.novos));
  const totalGanho = cardsRel.reduce((s,c)=>{ const col=board.columns.find(k=>k.id===c.columnId); return col&&col.tipo==='ganho' ? s+(Number(c.valor)||0) : s; },0);
  const totalPerdido = cardsRel.reduce((s,c)=>{ const col=board.columns.find(k=>k.id===c.columnId); return col&&col.tipo==='perdido' ? s+(Number(c.valor)||0) : s; },0);
  const porTemp = ['quente','morno','frio'].map(t=>({ temp:t, count: cardsRel.filter(c=>c.temperatura===t).length }));

  return `
    <div class="page-head">
      <div>
        <h1>Relatórios</h1>
        <p>Visão consolidada dos últimos 6 meses</p>
      </div>
      <div class="page-head-actions">
        <select id="relatorio-funil-select" class="leads-filter">
          <option value="">Todos os funis</option>
          ${funis.map(f=>`<option value="${f.id}" ${relatorioFunilId===f.id?'selected':''}>${esc(f.nome)}</option>`).join('')}
        </select>
        <button class="btn-outline" data-action="exportar-csv">Exportar CSV</button>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric-card"><div class="metric-card-top"><span>Total ganho</span></div><div class="metric-value">${fmtBRL(totalGanho)}</div></div>
      <div class="metric-card"><div class="metric-card-top"><span>Total perdido</span></div><div class="metric-value">${fmtBRL(totalPerdido)}</div></div>
      <div class="metric-card"><div class="metric-card-top"><span>Total de leads</span></div><div class="metric-value">${cardsRel.length}</div></div>
    </div>

    <div class="dash-panel">
      <div class="dash-panel-title">Novos leads por mês</div>
      <div class="stage-list">
        ${dados.map(d=>`
          <div class="stage-row">
            <div class="stage-row-top"><span>${monthLabel(d.key)}</span><span>${d.novos}</span></div>
            <div class="stage-bar-track"><div class="stage-bar-fill" style="width:${d.novos/maxNovos*100}%"></div></div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="dash-panel">
      <div class="dash-panel-title">Leads por qualificação</div>
      <div class="stage-list">
        ${porTemp.map(t=>`
          <div class="stage-row">
            <div class="stage-row-top"><span>${TEMPS[t.temp].label}</span><span>${t.count}</span></div>
            <div class="stage-bar-track"><div class="stage-bar-fill" style="width:${cardsRel.length ? (t.count/cardsRel.length*100) : 0}%"></div></div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* ---------- tela compartilhada: criar/entrar numa equipe ---------- */
function renderEquipeSetup(tituloPagina, subtitulo){
  return `
    <div class="page-head">
      <div>
        <h1>${tituloPagina}</h1>
        <p>${subtitulo}</p>
      </div>
    </div>
    <div class="settings-page-grid">
      <div class="settings-page-section">
        <h3>Criar uma equipe</h3>
        <p class="settings-page-note">Você vira supervisor(a) automaticamente e ganha um código pra convidar outras pessoas. O funil de cada um continua separado — só o chat e a supervisão são compartilhados.</p>
        <div class="field">
          <input type="text" id="equipe-nome-novo" placeholder="Nome da equipe" value="${esc(equipeNomeNovo)}" />
        </div>
        <button class="btn-primary" data-action="criar-equipe">Criar equipe</button>
      </div>
      <div class="settings-page-section">
        <h3>Entrar numa equipe existente</h3>
        <p class="settings-page-note">Peça o código de convite pra quem já criou a equipe.</p>
        <div class="field">
          <input type="text" id="equipe-codigo-entrar" placeholder="Código de convite" value="${esc(equipeCodigoEntrar)}" />
        </div>
        <button class="btn-outline" data-action="entrar-equipe">Entrar</button>
      </div>
    </div>
    ${equipeMsg ? `<p class="settings-page-msg ${equipeMsg.tipo}" style="margin-top:14px;">${esc(equipeMsg.texto)}</p>` : ''}
  `;
}

/* ---------- página: Chat Interno ---------- */
function renderChatInternoPage(){
  if(!equipeLoaded){
    return `<div class="page-head"><div><h1>Chat Interno</h1><p>Carregando…</p></div></div>`;
  }
  if(!equipe){
    return renderEquipeSetup('Chat Interno', 'Você ainda não faz parte de uma equipe');
  }
  return `
    <div class="page-head">
      <div>
        <h1>Chat Interno</h1>
        <p>${esc(equipe.nome)} · ${equipe.membros.length} membro${equipe.membros.length===1?'':'s'}</p>
      </div>
    </div>
    <div class="chat-interno-wrap">
      <div class="chat-interno-membros">
        <div class="settings-page-subtitle">Membros</div>
        ${equipe.membros.map(m=>`
          <div class="chat-membro-item">${esc(m.nome||m.email)} ${m.papel==='supervisor'?'⭐':''}${m.souEu?' (você)':''}</div>
        `).join('')}
      </div>
      <div class="chat-interno-main">
        ${!chatLoaded ? `<p class="settings-page-note">Carregando conversa…</p>` : `
          <div class="chat-interno-mensagens" id="chat-interno-mensagens">
            ${chatMensagens.length ? chatMensagens.map(m=>`
              <div class="wa-msg ${m.remetenteId===(currentUser&&currentUser.id)?'wa-msg-out':'wa-msg-in'}">
                <p><b>${m.remetenteId===(currentUser&&currentUser.id)?'Você':esc(m.remetenteNome)}:</b> ${esc(m.texto)}</p>
                <span>${formatDateHora(m.timestamp)}</span>
              </div>
            `).join('') : '<p class="settings-page-note">Nenhuma mensagem ainda. Diga oi pra equipe!</p>'}
          </div>
          <div class="wa-conversa-input-row">
            <input type="text" id="chat-interno-input" placeholder="Escreva uma mensagem..." value="${esc(chatTexto)}" />
            <button class="btn-primary" data-action="enviar-chat-interno" ${chatEnviando?'disabled':''}>Enviar</button>
          </div>
        `}
      </div>
    </div>
  `;
}

/* ---------- página: Supervisão ---------- */
function renderSupervisaoPage(){
  if(!equipeLoaded){
    return `<div class="page-head"><div><h1>Supervisão</h1><p>Carregando…</p></div></div>`;
  }
  if(!equipe){
    return renderEquipeSetup('Supervisão', 'Você ainda não faz parte de uma equipe');
  }
  if(!equipe.souSupervisor){
    return `
      <div class="page-head"><div><h1>Supervisão</h1><p>${esc(equipe.nome)}</p></div></div>
      <div class="tasks-empty">Só supervisores da equipe podem ver essa página. Se precisar de acesso, fale com quem administra a equipe "${esc(equipe.nome)}".</div>
      <button class="btn-outline" data-action="sair-equipe" style="margin-top:14px;">Sair da equipe</button>
    `;
  }
  return `
    <div class="page-head">
      <div>
        <h1>Supervisão</h1>
        <p>${esc(equipe.nome)}</p>
      </div>
    </div>

    <div class="settings-page-section" style="margin-bottom:20px;">
      <h3>Convidar pessoas</h3>
      <p class="settings-page-note">Compartilhe esse código — quem entrar com ele vira membro da equipe, mantendo o funil próprio dele:</p>
      <div class="settings-page-row"><span>Código de convite</span><span style="font-family:'IBM Plex Mono',monospace; font-weight:700; letter-spacing:.05em;">${esc(equipe.codigoConvite||'')}</span></div>
      <button class="btn-outline" data-action="regenerar-codigo-equipe">Gerar novo código</button>
    </div>

    <div class="settings-page-section" style="margin-bottom:20px;">
      <h3>Membros</h3>
      <div class="disparo-lista-leads" style="max-height:none;">
        ${equipe.membros.map(m=>`
          <div class="disparo-lead-item" style="cursor:default; justify-content:space-between;">
            <span>${esc(m.nome||m.email)} — ${m.papel==='supervisor'?'⭐ Supervisor':'Membro'}${m.souEu?' (você)':''}</span>
            ${!m.souEu ? `
              <div class="settings-btn-row">
                <button class="btn-outline" data-action="alterar-papel-membro" data-user-id="${m.id}" data-papel="${m.papel==='supervisor'?'membro':'supervisor'}">${m.papel==='supervisor'?'Rebaixar':'Promover'}</button>
                <button class="btn-outline" data-action="remover-membro" data-user-id="${m.id}">Remover</button>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      <button class="btn-outline" data-action="sair-equipe" style="margin-top:10px;">Sair da equipe</button>
    </div>

    <div class="settings-page-section">
      <h3>Desempenho por membro</h3>
      ${!supervisaoLoaded ? `<p class="settings-page-note">Carregando…</p>` : `
        <div class="leads-table-wrap" style="border:none;">
          <table class="leads-table">
            <thead><tr><th>Nome</th><th>Leads</th><th>Em negociação</th><th>Ganho</th><th>Perdido</th></tr></thead>
            <tbody>
              ${supervisaoMembros.map(m=>`
                <tr>
                  <td>${esc(m.nome)} ${m.papel==='supervisor'?'⭐':''}</td>
                  <td>${m.totalLeads}</td>
                  <td>${fmtBRL(m.abertoValor)}</td>
                  <td>${fmtBRL(m.ganhoValor)}</td>
                  <td>${fmtBRL(m.perdidoValor)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

/* ---------- página: Automações ---------- */
function renderAutomacoesPage(){
  if(!automacoesLoaded){
    return `<div class="page-head"><div><h1>Automações</h1><p>Carregando…</p></div></div>`;
  }
  return `
    <div class="page-head">
      <div>
        <h1>Automações</h1>
        <p>Ações automáticas quando um cliente entra numa coluna</p>
      </div>
      <button class="btn-primary" data-action="open-new-automacao">+ Nova automação</button>
    </div>
    ${automacoes.length ? `
      <div class="automacoes-list">
        ${automacoes.map(a=>{
          const coluna = board.columns.find(c=>c.id===a.colunaGatilhoId);
          const gatilhoTexto = a.gatilhoTipo === 'tempo_parado'
            ? `fica <b>${(a.acaoParams&&a.acaoParams.diasParado)||5}+ dias parado</b> em`
            : `entra em`;
          const acaoTexto = a.acaoTipo === 'criar_tarefa'
            ? `cria a tarefa "${esc((a.acaoParams&&a.acaoParams.titulo)||'Follow-up automático')}"`
            : `move pra "${esc((board.columns.find(c=>c.id===(a.acaoParams&&a.acaoParams.colunaDestinoId))||{}).nome || '—')}"`;
          return `
            <div class="automacao-card ${a.ativa?'':'automacao-inativa'}">
              <div class="contrato-card-head">
                <div>
                  <h3 class="contrato-card-title">${esc(a.nome)}</h3>
                  <p class="contrato-card-note">Quando o cliente ${gatilhoTexto} <b>${esc(coluna?coluna.nome:'coluna removida')}</b> → ${acaoTexto}</p>
                </div>
                <div class="contrato-card-actions">
                  <span class="switch ${a.ativa?'on':''}" data-action="toggle-automacao" data-automacao-id="${a.id}" title="${a.ativa?'Ativa':'Inativa'}"><span class="switch-knob"></span></span>
                  <button class="icon-btn" data-action="open-edit-automacao" data-automacao-id="${a.id}" title="Editar">${ICON_EDIT}</button>
                  <button class="icon-btn" data-action="delete-automacao" data-automacao-id="${a.id}" title="Excluir">${ICON_TRASH}</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    ` : `<div class="tasks-empty">Nenhuma automação criada ainda.</div>`}
  `;
}

/* ---------- página: Fluxos ---------- */
function renderFluxosPage(){
  if(!fluxosLoaded){
    return `<div class="page-head"><div><h1>Fluxos</h1><p>Carregando…</p></div></div>`;
  }
  return `
    <div class="page-head">
      <div>
        <h1>Fluxos</h1>
        <p>Sequências de etapas ao longo do tempo, a partir de quando o cliente entra numa coluna</p>
      </div>
      <button class="btn-primary" data-action="open-new-fluxo">+ Novo fluxo</button>
    </div>
    ${fluxos.length ? `
      <div class="automacoes-list">
        ${fluxos.map(f=>{
          const coluna = board.columns.find(c=>c.id===f.colunaGatilhoId);
          const temMensagem = (f.etapas||[]).some(e=>e.tipo==='mensagem');
          return `
            <div class="automacao-card ${f.ativo?'':'automacao-inativa'}">
              <div class="contrato-card-head">
                <div>
                  <h3 class="contrato-card-title">${esc(f.nome)}</h3>
                  <p class="contrato-card-note">
                    Começa quando entra em <b>${esc(coluna?coluna.nome:'coluna removida')}</b> ·
                    ${(f.etapas||[]).length} etapa${(f.etapas||[]).length===1?'':'s'} ·
                    ${f.emAndamento||0} cliente${(f.emAndamento||0)===1?'':'s'} em andamento
                    ${temMensagem ? ' · <span style="color:var(--danger)">envia WhatsApp</span>' : ''}
                  </p>
                </div>
                <div class="contrato-card-actions">
                  <span class="switch ${f.ativo?'on':''}" data-action="toggle-fluxo" data-fluxo-id="${f.id}" title="${f.ativo?'Ativo':'Inativo'}"><span class="switch-knob"></span></span>
                  <button class="icon-btn" data-action="open-edit-fluxo" data-fluxo-id="${f.id}" title="Editar">${ICON_EDIT}</button>
                  <button class="icon-btn" data-action="delete-fluxo" data-fluxo-id="${f.id}" title="Excluir">${ICON_TRASH}</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    ` : `<div class="tasks-empty">Nenhum fluxo criado ainda.</div>`}
  `;
}

/* ---------- página: Suporte ---------- */
function renderSuportePage(){
  return `
    <div class="page-head">
      <div>
        <h1>Suporte</h1>
        <p>Dúvidas e contato</p>
      </div>
    </div>
    <div class="settings-page-grid">
      <div class="settings-page-section">
        <h3>Perguntas frequentes</h3>
        <p class="settings-page-note"><b>Como conecto o WhatsApp Business?</b><br/>Configurações → Integrações → WhatsApp Business API, seguindo o passo a passo do README do projeto.</p>
        <p class="settings-page-note"><b>Por que uma mensagem de Disparo não chegou?</b><br/>A API do WhatsApp só permite texto livre pra quem te escreveu nas últimas 24h.</p>
        <p class="settings-page-note"><b>Como mudo a cor do painel?</b><br/>Configurações → Aparência.</p>
        <p class="settings-page-note"><b>Como conecto a Google Agenda?</b><br/>Configurações → Integrações → Google Agenda.</p>
      </div>
      <div class="settings-page-section">
        <h3>Contato</h3>
        <p class="settings-page-note">Encontrou um problema ou tem uma sugestão pro painel? Fale com quem administra esse CRM.</p>
        <a class="btn-primary" href="mailto:?subject=Painel%20CRM%20-%20Suporte" style="display:inline-block; text-decoration:none; text-align:center;">Enviar e-mail</a>
      </div>
    </div>
  `;
}

/* ---------- modal do contrato de comissão ---------- */
function openNewContrato(){
  contratoModalForm = { __isNew:true, id:null, desc:'', scope:'Pessoal', creditoValor:0, date: comissoesMonth + '-01' };
  renderContratoModal();
}
function openEditContrato(id){
  const c = contratos.find(x=>x.id===id);
  if(!c) return;
  contratoModalForm = { __isNew:false, id:c.id, desc:c.desc, scope:c.scope, creditoValor:c.creditoValor, date:c.date };
  renderContratoModal();
}
function closeContratoModal(){ contratoModalForm = null; document.getElementById('modal-root').innerHTML=''; }

function renderContratoModal(){
  const root = document.getElementById('modal-root');
  if(!contratoModalForm){ root.innerHTML=''; return; }
  const f = contratoModalForm;
  const preview = calcComissaoPreview(f.creditoValor);
  const previewTotal = preview.value1*10 + preview.value2*3;

  root.innerHTML = `
    <div class="overlay" id="contrato-modal-overlay">
      <div class="modal">
        <div class="modal-head">
          <h3>${f.__isNew ? 'Novo contrato de comissão' : 'Editar contrato'}</h3>
          <button id="contrato-modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Cliente / contrato</label>
            <input type="text" id="c-desc" value="${esc(f.desc)}" placeholder="Ex: Consórcio — Contrato Imóvel 118" />
          </div>
          <div class="field">
            <label>Escopo</label>
            <div class="scope-toggle" id="c-scope-toggle">
              <div class="scope-btn ${f.scope==='Pessoal'?'active':''}" data-scope="Pessoal">Pessoal</div>
              <div class="scope-btn ${f.scope==='Empresa'?'active':''}" data-scope="Empresa">Empresa</div>
            </div>
          </div>
          <div class="field">
            <label>Valor da carta de crédito vendida</label>
            <div class="money-wrap">
              <span>R$</span>
              <input type="text" inputmode="numeric" id="c-credito" value="${f.creditoValor ? Number(f.creditoValor).toLocaleString('pt-BR') : ''}" placeholder="0" />
            </div>
          </div>
          <div class="field">
            <label>Mês da 1ª parcela</label>
            <input type="month" id="c-mes" value="${(f.date||'').slice(0,7)}" />
          </div>
          <div class="calc-preview" id="c-preview">
            🔹 10 primeiras parcelas: <b>${fmtBRL(preview.value1)}</b> cada<br/>
            🔹 3 últimas parcelas: <b>${fmtBRL(preview.value2)}</b> cada<br/>
            Total: 13x parcelas · Total líquido da comissão: <b>${fmtBRL(previewTotal)}</b>
          </div>
          <p class="calc-preview-note">O valor de cada parcela é calculado automaticamente a partir da carta de crédito, já líquido.</p>
        </div>
        <div class="modal-foot">
          ${!f.__isNew ? `<button class="delete-link" id="c-delete">🗑 Excluir</button>` : '<span></span>'}
          <div class="modal-foot-actions">
            <button class="btn-outline" id="c-cancel">Cancelar</button>
            <button class="btn-save" id="c-save">${f.__isNew ? 'Criar contrato' : 'Salvar alterações'}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('contrato-modal-close').addEventListener('click', closeContratoModal);
  document.getElementById('c-cancel').addEventListener('click', closeContratoModal);
  document.getElementById('contrato-modal-overlay').addEventListener('click', (e)=>{ if(e.target.id==='contrato-modal-overlay') closeContratoModal(); });

  document.getElementById('c-desc').addEventListener('input', (e)=> contratoModalForm.desc = e.target.value);
  document.getElementById('c-mes').addEventListener('change', (e)=> contratoModalForm.date = e.target.value + '-01');

  document.querySelectorAll('#c-scope-toggle .scope-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      contratoModalForm.scope = btn.dataset.scope;
      document.querySelectorAll('#c-scope-toggle .scope-btn').forEach(b=>{
        b.classList.toggle('active', b.dataset.scope===contratoModalForm.scope);
      });
    });
  });

  const creditoInput = document.getElementById('c-credito');
  creditoInput.addEventListener('input', (e)=>{
    const { numero, texto } = maskInteiro(e.target.value);
    contratoModalForm.creditoValor = numero;
    e.target.value = texto;
    const prev = calcComissaoPreview(numero);
    const total = prev.value1*10 + prev.value2*3;
    const previewEl = document.getElementById('c-preview');
    if(previewEl){
      previewEl.innerHTML = `
        🔹 10 primeiras parcelas: <b>${fmtBRL(prev.value1)}</b> cada<br/>
        🔹 3 últimas parcelas: <b>${fmtBRL(prev.value2)}</b> cada<br/>
        Total: 13x parcelas · Total líquido da comissão: <b>${fmtBRL(total)}</b>
      `;
    }
  });

  document.getElementById('c-save').addEventListener('click', saveContratoFromModal);
  if(!f.__isNew){
    document.getElementById('c-delete').addEventListener('click', ()=>{
      showConfirm({
        message: 'Excluir este contrato de comissão? Essa ação não pode ser desfeita.',
        onConfirm: ()=>{ deleteContratoById(f.id); closeContratoModal(); closeConfirm(); },
      });
    });
  }
}

/* ---------- modal de automação ---------- */
function openNewAutomacao(){
  automacaoModalForm = {
    __isNew:true, id:null, nome:'',
    colunaGatilhoId: (board.columns[0]||{}).id || '',
    gatilhoTipo:'entrada_coluna',
    acaoTipo:'criar_tarefa',
    acaoParams:{ titulo:'', diasParaVencimento:3, diasParado:5, colunaDestinoId:(board.columns[0]||{}).id || '' },
  };
  renderAutomacaoModal();
}
function openEditAutomacao(id){
  const a = automacoes.find(x=>x.id===id);
  if(!a) return;
  automacaoModalForm = {
    __isNew:false, id:a.id, nome:a.nome, colunaGatilhoId:a.colunaGatilhoId,
    gatilhoTipo: a.gatilhoTipo || 'entrada_coluna', acaoTipo:a.acaoTipo,
    acaoParams:{ titulo:'', diasParaVencimento:3, diasParado:5, colunaDestinoId:'', ...(a.acaoParams||{}) },
  };
  renderAutomacaoModal();
}
function closeAutomacaoModal(){ automacaoModalForm = null; document.getElementById('modal-root').innerHTML=''; }

function renderAutomacaoAcaoParams(f){
  if(f.acaoTipo === 'criar_tarefa'){
    return `
      <div class="field">
        <label>Título da tarefa</label>
        <input type="text" id="am-tarefa-titulo" value="${esc(f.acaoParams.titulo||'')}" placeholder="Ex: Ligar pra confirmar interesse" />
      </div>
      <div class="field">
        <label>Vencimento (dias a partir de quando a tarefa é criada)</label>
        <input type="number" id="am-tarefa-dias" value="${f.acaoParams.diasParaVencimento||3}" min="1" />
      </div>
    `;
  }
  return `
    <div class="field">
      <label>Coluna de destino</label>
      <select id="am-coluna-destino">
        ${board.columns.map(c=>`<option value="${c.id}" ${f.acaoParams.colunaDestinoId===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}
      </select>
    </div>
  `;
}
function bindAutomacaoAcaoParams(){
  const tituloEl = document.getElementById('am-tarefa-titulo');
  if(tituloEl) tituloEl.addEventListener('input', (e)=> automacaoModalForm.acaoParams.titulo = e.target.value);
  const diasEl = document.getElementById('am-tarefa-dias');
  if(diasEl) diasEl.addEventListener('input', (e)=> automacaoModalForm.acaoParams.diasParaVencimento = parseInt(e.target.value,10)||3);
  const destinoEl = document.getElementById('am-coluna-destino');
  if(destinoEl) destinoEl.addEventListener('change', (e)=> automacaoModalForm.acaoParams.colunaDestinoId = e.target.value);
}

function renderAutomacaoModal(){
  const root = document.getElementById('modal-root');
  if(!automacaoModalForm){ root.innerHTML=''; return; }
  const f = automacaoModalForm;

  root.innerHTML = `
    <div class="overlay" id="automacao-modal-overlay">
      <div class="modal">
        <div class="modal-head">
          <h3>${f.__isNew ? 'Nova automação' : 'Editar automação'}</h3>
          <button id="automacao-modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Nome</label>
            <input type="text" id="am-nome" value="${esc(f.nome)}" placeholder="Ex: Agendar follow-up de propostas" />
          </div>
          <div class="field">
            <label>Coluna</label>
            <select id="am-coluna-gatilho">
              ${board.columns.map(c=>`<option value="${c.id}" ${f.colunaGatilhoId===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Disparar quando</label>
            <select id="am-gatilho-tipo">
              <option value="entrada_coluna" ${f.gatilhoTipo==='entrada_coluna'?'selected':''}>O cliente entrar nessa coluna</option>
              <option value="tempo_parado" ${f.gatilhoTipo==='tempo_parado'?'selected':''}>O cliente ficar parado nessa coluna por X dias</option>
            </select>
          </div>
          <div id="am-dias-parado-wrap" style="${f.gatilhoTipo==='tempo_parado'?'':'display:none;'}">
            <div class="field">
              <label>Depois de quantos dias parado</label>
              <input type="number" id="am-dias-parado" value="${f.acaoParams.diasParado||5}" min="1" />
            </div>
            <p class="settings-page-note">Checado a cada hora pelo servidor — não é em tempo real.</p>
          </div>
          <div class="field">
            <label>Ação</label>
            <select id="am-acao-tipo">
              <option value="criar_tarefa" ${f.acaoTipo==='criar_tarefa'?'selected':''}>Criar uma tarefa</option>
              <option value="mover_coluna" ${f.acaoTipo==='mover_coluna'?'selected':''}>Mover pra outra coluna</option>
            </select>
          </div>
          <div id="am-acao-params">${renderAutomacaoAcaoParams(f)}</div>
        </div>
        <div class="modal-foot">
          ${!f.__isNew ? `<button class="delete-link" id="am-delete">🗑 Excluir</button>` : '<span></span>'}
          <div class="modal-foot-actions">
            <button class="btn-outline" id="am-cancel">Cancelar</button>
            <button class="btn-save" id="am-save">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('automacao-modal-close').addEventListener('click', closeAutomacaoModal);
  document.getElementById('am-cancel').addEventListener('click', closeAutomacaoModal);
  document.getElementById('automacao-modal-overlay').addEventListener('click', (e)=>{ if(e.target.id==='automacao-modal-overlay') closeAutomacaoModal(); });

  document.getElementById('am-nome').addEventListener('input', (e)=> automacaoModalForm.nome = e.target.value);
  document.getElementById('am-coluna-gatilho').addEventListener('change', (e)=> automacaoModalForm.colunaGatilhoId = e.target.value);
  document.getElementById('am-gatilho-tipo').addEventListener('change', (e)=>{
    automacaoModalForm.gatilhoTipo = e.target.value;
    const wrap = document.getElementById('am-dias-parado-wrap');
    if(wrap) wrap.style.display = e.target.value === 'tempo_parado' ? '' : 'none';
  });
  const diasParadoEl = document.getElementById('am-dias-parado');
  if(diasParadoEl) diasParadoEl.addEventListener('input', (e)=> automacaoModalForm.acaoParams.diasParado = parseInt(e.target.value,10)||5);
  document.getElementById('am-acao-tipo').addEventListener('change', (e)=>{
    automacaoModalForm.acaoTipo = e.target.value;
    document.getElementById('am-acao-params').innerHTML = renderAutomacaoAcaoParams(automacaoModalForm);
    bindAutomacaoAcaoParams();
  });
  bindAutomacaoAcaoParams();

  document.getElementById('am-save').addEventListener('click', salvarAutomacao);
  if(!f.__isNew){
    document.getElementById('am-delete').addEventListener('click', ()=>{
      showConfirm({
        message: 'Excluir esta automação? Ela para de rodar imediatamente.',
        onConfirm: ()=>{ excluirAutomacao(f.id); closeAutomacaoModal(); closeConfirm(); },
      });
    });
  }
}

/* ---------- modal de fluxo ---------- */
function openNewFluxo(){
  fluxoModalForm = {
    __isNew:true, id:null, nome:'',
    colunaGatilhoId: (board.columns[0]||{}).id || '',
    etapas: [{ diasAposInicio:0, tipo:'mensagem', params:{ texto:'' } }],
  };
  renderFluxoModal();
}
function openEditFluxo(id){
  const f = fluxos.find(x=>x.id===id);
  if(!f) return;
  fluxoModalForm = {
    __isNew:false, id:f.id, nome:f.nome, colunaGatilhoId:f.colunaGatilhoId,
    etapas: (f.etapas||[]).map(e=>({ diasAposInicio:e.diasAposInicio, tipo:e.tipo, params:{...(e.params||{})} })),
  };
  renderFluxoModal();
}
function closeFluxoModal(){ fluxoModalForm = null; document.getElementById('modal-root').innerHTML=''; }

function renderFluxoEtapaParams(etapa, idx){
  if(etapa.tipo === 'mensagem'){
    return `<div class="field"><label>Mensagem</label><textarea class="fx-etapa-texto" data-idx="${idx}" rows="2" placeholder="Texto que será enviado pelo WhatsApp...">${esc((etapa.params&&etapa.params.texto)||'')}</textarea></div>`;
  }
  if(etapa.tipo === 'tarefa'){
    return `
      <div class="field-row">
        <div class="field"><label>Título da tarefa</label><input type="text" class="fx-etapa-titulo" data-idx="${idx}" value="${esc((etapa.params&&etapa.params.titulo)||'')}" placeholder="Ex: Ligar pra confirmar" /></div>
        <div class="field"><label>Vencimento (dias)</label><input type="number" class="fx-etapa-dias-venc" data-idx="${idx}" value="${(etapa.params&&etapa.params.diasParaVencimento)||1}" min="1" /></div>
      </div>
    `;
  }
  return `
    <div class="field">
      <label>Coluna de destino</label>
      <select class="fx-etapa-coluna-destino" data-idx="${idx}">
        ${board.columns.map(c=>`<option value="${c.id}" ${(etapa.params&&etapa.params.colunaDestinoId)===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}
      </select>
    </div>
  `;
}
function renderFluxoEtapa(etapa, idx){
  return `
    <div class="fluxo-etapa-card">
      <div class="fluxo-etapa-head">
        <span class="fluxo-etapa-numero">${idx+1}</span>
        <div class="field fluxo-etapa-dias-field">
          <label>Dias após o início</label>
          <input type="number" class="fx-etapa-dias" data-idx="${idx}" value="${etapa.diasAposInicio}" min="0" />
        </div>
        <div class="field" style="flex:1;">
          <label>O que fazer</label>
          <select class="fx-etapa-tipo" data-idx="${idx}">
            <option value="mensagem" ${etapa.tipo==='mensagem'?'selected':''}>Enviar mensagem de WhatsApp</option>
            <option value="tarefa" ${etapa.tipo==='tarefa'?'selected':''}>Criar tarefa</option>
            <option value="mover_coluna" ${etapa.tipo==='mover_coluna'?'selected':''}>Mover pra outra coluna</option>
          </select>
        </div>
        <button type="button" class="icon-btn fx-etapa-remover" data-idx="${idx}" title="Remover etapa">${ICON_TRASH}</button>
      </div>
      ${renderFluxoEtapaParams(etapa, idx)}
    </div>
  `;
}

function bindFluxoModalEvents(){
  document.getElementById('fluxo-modal-close').addEventListener('click', closeFluxoModal);
  document.getElementById('fx-cancel').addEventListener('click', closeFluxoModal);
  document.getElementById('fluxo-modal-overlay').addEventListener('click', (e)=>{ if(e.target.id==='fluxo-modal-overlay') closeFluxoModal(); });

  document.getElementById('fx-nome').addEventListener('input', (e)=> fluxoModalForm.nome = e.target.value);
  document.getElementById('fx-coluna-gatilho').addEventListener('change', (e)=> fluxoModalForm.colunaGatilhoId = e.target.value);

  document.getElementById('fx-add-etapa').addEventListener('click', ()=>{
    fluxoModalForm.etapas.push({ diasAposInicio:1, tipo:'mensagem', params:{ texto:'' } });
    renderFluxoModal();
  });
  document.querySelectorAll('.fx-etapa-remover').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      fluxoModalForm.etapas.splice(parseInt(btn.dataset.idx,10),1);
      renderFluxoModal();
    });
  });
  document.querySelectorAll('.fx-etapa-dias').forEach(el=>{
    el.addEventListener('input', (e)=>{ fluxoModalForm.etapas[parseInt(el.dataset.idx,10)].diasAposInicio = parseInt(e.target.value,10)||0; });
  });
  document.querySelectorAll('.fx-etapa-tipo').forEach(el=>{
    el.addEventListener('change', (e)=>{
      const idx = parseInt(el.dataset.idx,10);
      fluxoModalForm.etapas[idx].tipo = e.target.value;
      fluxoModalForm.etapas[idx].params = {};
      renderFluxoModal();
    });
  });
  document.querySelectorAll('.fx-etapa-texto').forEach(el=>{
    el.addEventListener('input', (e)=>{
      const idx = parseInt(el.dataset.idx,10);
      fluxoModalForm.etapas[idx].params.texto = e.target.value;
    });
  });
  document.querySelectorAll('.fx-etapa-titulo').forEach(el=>{
    el.addEventListener('input', (e)=>{
      const idx = parseInt(el.dataset.idx,10);
      fluxoModalForm.etapas[idx].params.titulo = e.target.value;
    });
  });
  document.querySelectorAll('.fx-etapa-dias-venc').forEach(el=>{
    el.addEventListener('input', (e)=>{
      const idx = parseInt(el.dataset.idx,10);
      fluxoModalForm.etapas[idx].params.diasParaVencimento = parseInt(e.target.value,10)||1;
    });
  });
  document.querySelectorAll('.fx-etapa-coluna-destino').forEach(el=>{
    el.addEventListener('change', (e)=>{
      const idx = parseInt(el.dataset.idx,10);
      fluxoModalForm.etapas[idx].params.colunaDestinoId = e.target.value;
    });
  });

  document.getElementById('fx-save').addEventListener('click', ()=>{
    const temMensagem = fluxoModalForm.etapas.some(e=>e.tipo==='mensagem');
    if(fluxoModalForm.__isNew && temMensagem){
      showConfirm({
        message: 'Este fluxo já nasce ativo e tem etapa(s) de envio de WhatsApp automático, sem revisão sua antes de mandar. Quer criar mesmo assim?',
        onConfirm: ()=>{ salvarFluxo(); closeConfirm(); },
      });
    } else {
      salvarFluxo();
    }
  });
  if(!fluxoModalForm.__isNew){
    document.getElementById('fx-delete').addEventListener('click', ()=>{
      showConfirm({
        message: 'Excluir este fluxo? As execuções em andamento pra clientes atuais são interrompidas.',
        onConfirm: ()=>{ excluirFluxo(fluxoModalForm.id); closeFluxoModal(); closeConfirm(); },
      });
    });
  }
}

function renderFluxoModal(){
  const root = document.getElementById('modal-root');
  if(!fluxoModalForm){ root.innerHTML=''; return; }
  const f = fluxoModalForm;

  root.innerHTML = `
    <div class="overlay" id="fluxo-modal-overlay">
      <div class="modal modal-lg">
        <div class="modal-head">
          <h3>${f.__isNew ? 'Novo fluxo' : 'Editar fluxo'}</h3>
          <button id="fluxo-modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Nome</label>
            <input type="text" id="fx-nome" value="${esc(f.nome)}" placeholder="Ex: Sequência de boas-vindas" />
          </div>
          <div class="field">
            <label>Começa quando o cliente entra nesta coluna</label>
            <select id="fx-coluna-gatilho">
              ${board.columns.map(c=>`<option value="${c.id}" ${f.colunaGatilhoId===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}
            </select>
          </div>
          <p class="settings-page-msg erro">⚠️ Etapas de "Enviar mensagem" mandam pelo WhatsApp automaticamente, sem você revisar antes. Se você responder o cliente manualmente, o fluxo fica em silêncio por 30 min naquela conversa.</p>
          <div class="fluxo-etapas-lista">
            ${f.etapas.map((etapa, idx)=>renderFluxoEtapa(etapa, idx)).join('')}
          </div>
          <button type="button" class="btn-outline" id="fx-add-etapa">+ Adicionar etapa</button>
        </div>
        <div class="modal-foot">
          ${!f.__isNew ? `<button class="delete-link" id="fx-delete">🗑 Excluir</button>` : '<span></span>'}
          <div class="modal-foot-actions">
            <button class="btn-outline" id="fx-cancel">Cancelar</button>
            <button class="btn-save" id="fx-save">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  `;
  bindFluxoModalEvents();
}

/* ---------- confirmação genérica ---------- */
function showConfirm({ message, onConfirm }){
  confirmState = { message, onConfirm };
  const root = document.getElementById('confirm-root');
  root.innerHTML = `
    <div class="overlay" id="confirm-overlay" style="z-index:50">
      <div class="confirm-box">
        <p>${esc(message)}</p>
        <div class="confirm-actions">
          <button class="btn-outline" id="confirm-cancel">Cancelar</button>
          <button class="btn-danger" id="confirm-ok">Excluir</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('confirm-cancel').addEventListener('click', closeConfirm);
  document.getElementById('confirm-overlay').addEventListener('click', (e)=>{ if(e.target.id==='confirm-overlay') closeConfirm(); });
  document.getElementById('confirm-ok').addEventListener('click', ()=> confirmState.onConfirm());
}
function closeConfirm(){ confirmState = null; document.getElementById('confirm-root').innerHTML=''; }

/* ---------- start ---------- */
if(getToken()){
  tratarRetornoDoGoogle();
  loadBoard();
  loadFunis();
  loadTasks();
  loadCalendarStatus();
  loadContratos();
  loadWhatsappStatus();
  loadInstagramStatus();
  loadConversas();
  loadEquipe();
  loadAutomacoes();
  loadFluxos();
}
