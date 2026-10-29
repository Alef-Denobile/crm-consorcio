#!/usr/bin/env node
/* ================================================================
   Teste automático de telas (Playwright + API simulada)
   ================================================================
   Abre o painel num Chromium sem cabeça, serve a pasta public/ e
   responde às chamadas /api/* com dados de mentira. Confere que:
     - o painel carrega sem erro de JavaScript (inclui a divisão em
       vários arquivos de js/app/);
     - todas as páginas abrem sem estourar erro;
     - o gestor vê rodízio, metas por pessoa e remoção de membro;
     - o convite recebido (sem equipe) aparece;
     - sessão inválida (401) volta pro login, mas erro 503 não.
   Uso:  node scripts/testar-telas.js
   Precisa do pacote "playwright" e do Chromium (variáveis opcionais:
   PLAYWRIGHT_PATH, CHROMIUM_PATH).
================================================================ */
const fs = require('fs');
const path = require('path');
const http = require('http');

function carregarPlaywright() {
  const candidatos = [process.env.PLAYWRIGHT_PATH, 'playwright', '/opt/node-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright'].filter(Boolean);
  for (const c of candidatos) { try { return require(c); } catch (_) { /* tenta o próximo */ } }
  console.log('⚠ Playwright não encontrado — teste de telas pulado.');
  process.exit(0);
}
const { chromium } = carregarPlaywright();
const PUBLIC = path.join(__dirname, '..', 'public');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function servidor() {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]);
      const arq = path.join(PUBLIC, rel === '/' ? 'index.html' : rel);
      if (!arq.startsWith(PUBLIC) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); return res.end('nao'); }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
      fs.createReadStream(arq).pipe(res);
    }).listen(0, () => ok({ s, url: `http://127.0.0.1:${s.address().port}` }));
  });
}

const mes = new Date().toISOString().slice(0, 7);
const colunas = [
  { id: 'c1', nome: 'Novos', tipo: 'aberto', ordem: 0, cor: '#888' },
  { id: 'c2', nome: 'Ganho', tipo: 'ganho', ordem: 1, cor: '#2a2' },
  { id: 'c3', nome: 'Perdido', tipo: 'perdido', ordem: 2, cor: '#a22' },
];
const cards = [
  { id: 'k1', columnId: 'c1', cliente: 'Maria Teste', telefone: '15988053447', valor: 50000, temperatura: 'morno', mes: '', mesInicioContato: mes, ordem: 0 },
  { id: 'k2', columnId: 'c2', cliente: 'João Ganho', telefone: '15911112222', valor: 80000, temperatura: 'quente', mes, mesInicioContato: mes, ordem: 0 },
];

function respostas(cenario) {
  const equipeGestor = {
    id: 'eq1', nome: 'Equipe Teste', codigoConvite: 'ABC123', souSupervisor: true, souSupervisorDeDados: false,
    membros: [
      { id: 'u1', nome: 'Gestor Teste', email: 'g@x.com', papel: 'supervisor', souEu: true },
      { id: 'u2', nome: 'Ana Vendas', email: 'ana@x.com', papel: 'membro', souEu: false },
    ],
    rodizio: { ativo: false, membros: [] },
    convitesPendentes: [{ id: 'cv1', email: 'novo@x.com' }],
  };
  const semEquipe = { equipe: null, convitesRecebidos: [{ id: 'cv9', equipeNome: 'Equipe X', convidadoPor: 'Chefe' }] };
  return {
    'GET /api/auth/me': { user: { id: 'u1', nome: 'Gestor Teste', email: 'g@x.com', perfil: cenario === 'rh' ? 'rh' : 'consorcio' } },
    'GET /api/board': cenario === 'mobile'
      ? { columns: colunas.map((c) => ({ ...c, funilId: 'f1' })), cards: [...cards, { id: 'k3', columnId: 'c1', cliente: 'Pedro Lima', telefone: '15922223333', valor: 60000, temperatura: 'frio', mes: '', mesInicioContato: mes, ordem: 1000 }] }
      : { columns: colunas, cards },
    'GET /api/funis': cenario === 'mobile' ? { funis: [{ id: 'f1', nome: 'Funil Principal' }] } : { funis: [] },
    'GET /api/tasks': { tasks: [] },
    'GET /api/calendar/status': { connected: false },
    'GET /api/equipe': cenario === 'semEquipe' ? semEquipe : { equipe: cenario === 'membro' ? { ...equipeGestor, souSupervisor: false, rodizio: null, convitesPendentes: [], codigoConvite: null } : equipeGestor, minhasEquipes: [{ id: 'e1', nome: 'Equipe Teste', papel: cenario === 'membro' ? 'membro' : 'supervisor', ativa: true, membros: 2 }, { id: 'e2', nome: 'Equipe do Norte', papel: cenario === 'membro' ? 'membro' : 'supervisor', ativa: false, membros: 4 }], convitesRecebidos: [] },
    'POST /api/equipe/criar-membro': { ok: true, emailEnviado: true },
    'GET /api/equipe/supervisao': { mes, membros: [
      { userId: 'u1', nome: 'Gestor Teste', papel: 'supervisor', totalLeads: 2, ganhoValor: 80000, perdidoValor: 0, abertoValor: 50000, vendidoNoMes: 80000, metaMes: 0 },
      { userId: 'u2', nome: 'Ana Vendas', papel: 'membro', totalLeads: 5, ganhoValor: 30000, perdidoValor: 1000, abertoValor: 9000, vendidoNoMes: 30000, metaMes: 60000 },
    ] },
    'GET /api/equipe/membro/u2/leads': { total: 5 },
    'GET /api/possiveis-leads': { leads: [{ id: 'p1', nome: 'Pedro', telefone: '1511', tipoServico: 'auto' }, { id: 'p2', nome: 'Paula', telefone: '1522', tipoServico: '' }] },
    'GET /api/resumo-diario': { ativo: false, emailDisponivel: true, email: 'g@x.com' },
    'GET /api/tasks/config/email': { ativo: true, emailDisponivel: true, email: 'g@x.com' },
    'GET /api/backup/automatico': { disponivel: true, ativo: false, ultimoEnvio: null, email: 'g@x.com' },
    'GET /api/cards/duplicados': { grupos: [{ telefone: '5515988295905', cards: [{ id: 'k1', cliente: 'Willian Almeida', telefone: '5515988295905' }, { id: 'k9', cliente: 'Novo contato (WhatsApp)', telefone: '551588295905' }] }] },
    'GET /api/whatsapp/status': { connected: false, provedor: 'meta' },
    'GET /api/metas/': { valorMeta: 0 },
    'GET /api/equipe/meta-vendas/': { valorMeta: 100000, vendidoNoMes: 80000, souGestor: true },
  };
}

let falhas = 0, total = 0;
function checar(nome, cond, detalhe) {
  total++;
  if (cond) console.log('  ✔', nome);
  else { falhas++; console.log('  ✘', nome, detalhe ? `— ${detalhe}` : ''); }
}

async function abrir(browser, url, cenario, extra = {}) {
  const ctx = await browser.newContext(extra.mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const erros = [];
  const chamadas = [];
  page.on('pageerror', (e) => erros.push(e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' ').trim()));
  if (extra.perfil) await page.addInitScript((p) => { window.__perfilTeste = p; }, extra.perfil);
  await page.addInitScript(() => { if (sessionStorage.getItem('semeado')) return; sessionStorage.setItem('semeado', '1'); localStorage.setItem('token', 'tok'); localStorage.setItem('user', JSON.stringify({ nome: 'Gestor Teste', email: 'g@x.com', perfil: window.__perfilTeste || 'consorcio' })); });
  const mapa = respostas(cenario);
  // a biblioteca de planilhas vem de um CDN; no teste entra uma versão mínima
  await page.route('**/xlsx.full.min.js', (route) => route.fulfill({ contentType: 'text/javascript', body: "window.XLSX={read:()=>({SheetNames:['A'],Sheets:{A:1}}),utils:{sheet_to_json:()=>[{Nome:'Ana',Telefone:'1511',Serviço:'imóvel'},{Nome:'Beto',Telefone:'1522',Serviço:'auto'}],aoa_to_sheet:()=>({}),book_new:()=>({}),book_append_sheet:()=>{}},writeFile:(wb,n)=>{window.__baixou=n;}};" }));
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const chave = `${req.method()} ${u.pathname}`;
    chamadas.push({ metodo: req.method(), caminho: u.pathname, corpo: req.postData(), atuarComo: req.headers()['x-atuar-como'] });
    if (extra.interceptar) { const r = extra.interceptar(req.method(), u.pathname); if (r) return route.fulfill(r); }
    let corpo = mapa[chave];
    if (corpo === undefined) { const k = Object.keys(mapa).find((x) => x.endsWith('/') && chave.startsWith(x)); if (k) corpo = mapa[k]; }
    if (req.method() === 'PUT' && /meta-vendas$/.test(u.pathname)) corpo = { mes, valorMeta: JSON.parse(req.postData() || '{}').valorMeta };
    if (req.method() === 'PUT' && /\/equipe\/rodizio$/.test(u.pathname)) corpo = JSON.parse(req.postData() || '{}');
    if (corpo === undefined) {
      // resposta genérica: toda lista que o painel espera vem vazia
      corpo = {};
      for (const k of ['anexos', 'automacoes', 'blocos', 'campos', 'contratos', 'conversas', 'erros', 'eventos', 'eventosGoogle', 'fluxos', 'funis', 'insights', 'itens', 'leads', 'membros', 'mensagens', 'regras', 'tarefas', 'tasks', 'templates', 'webhooks', 'agendamentos', 'possiveisLeads']) corpo[k] = [];
    }
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) });
  });
  await page.goto(url + '/index.html');
  await page.waitForTimeout(700);
  return { ctx, page, erros, chamadas };
}

(async () => {
  const { s, url } = await servidor();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  try {
    console.log('Painel carrega e todas as páginas abrem');
    let t = await abrir(browser, url, 'gestor');
    checar('carregou sem erro de JavaScript', t.erros.length === 0, t.erros[0]);
    checar('menu lateral apareceu', (await t.page.locator('[data-action="nav"]').count()) > 3);
    const paginas = await t.page.$$eval('[data-action="nav"]', (els) => els.map((e) => e.dataset.page));
    for (const pg of paginas) {
      await t.page.click(`[data-action="nav"][data-page="${pg}"]`);
      await t.page.waitForTimeout(250);
      if (process.env.CAPTURAS) await t.page.screenshot({ path: `/tmp/pg-${pg}.png` });
      checar(`página "${pg}" abre sem erro`, t.erros.length === 0, t.erros[t.erros.length - 1]);
    }

    await t.page.click('[data-action="nav"][data-page="relatorios"]');
    await t.page.waitForTimeout(250);
    checar('relatórios: gráficos de barras dos 12 meses', (await t.page.locator('.rel-graficos .dash-panel').count()) === 2 && (await t.page.locator('.rel-coluna').count()) % 12 === 0);
    await t.page.click('[data-action="rel-visao"][data-visao="lista"]');
    await t.page.waitForTimeout(200);
    checar('relatórios: botão Lista mostra os 12 meses em linhas (sem gráfico)', (await t.page.locator('.rel-grafico').count()) === 0 && (await t.page.locator('.stage-row').count()) >= 24);
    await t.page.click('[data-action="rel-visao"][data-visao="grafico"]');
    await t.page.waitForTimeout(200);
    checar('relatórios: botão Gráfico volta aos gráficos', (await t.page.locator('.rel-graficos').count()) === 1);
    await t.page.click('[data-action="nav"][data-page="pipeline"]');
    await t.page.waitForTimeout(250);
    checar('pipeline: filtro de ordenar fica na linha das abas', (await t.page.locator('.tabs .pipeline-ordenar-row').count()) === 1);

    console.log('Animações de transição');
    await t.page.click('[data-action="nav"][data-page="dashboard"]');
    await t.page.waitForTimeout(500);
    await t.page.click('[data-action="nav"][data-page="leads"]');
    await t.page.waitForTimeout(40);
    checar('animação: trocar de tela faz o conteúdo entrar com fade/deslize', (await t.page.locator('.main-area > .tela-entra').count()) >= 1);
    await t.page.waitForTimeout(600);
    checar('animação: a classe de entrada é removida ao terminar', (await t.page.locator('.tela-entra').count()) === 0);
    await t.page.click('[data-action="open-new-lead"]').catch(() => {});
    await t.page.waitForTimeout(40);
    checar('animação: janela abre com fade (classe anim-entra)', (await t.page.locator('#modal-root .overlay.anim-entra').count()) === 1);
    await t.page.waitForTimeout(400);
    await t.page.evaluate(() => { document.getElementById('modal-root').innerHTML = ''; });
    await t.page.waitForTimeout(40);
    checar('animação: ao fechar, uma cópia some com fade', (await t.page.locator('body > .overlay.anim-saida').count()) === 1);
    await t.page.waitForTimeout(400);
    checar('animação: a cópia que some é removida depois', (await t.page.locator('.anim-saida').count()) === 0);
    await t.page.click('[data-action="toggle-notif"]');
    await t.page.waitForTimeout(40);
    checar('animação: menu de notificações abre com fade', (await t.page.locator('.notif-panel.anim-popup-entra').count()) === 1);
    await t.page.waitForTimeout(400);
    await t.page.click('[data-action="toggle-notif"]');
    await t.page.waitForTimeout(40);
    checar('animação: ao fechar o menu, a cópia antiga some com fade (e o menu novo não existe)', (await t.page.locator('.notif-panel').count()) === 1 && (await t.page.locator('.notif-panel[aria-hidden="true"]').count()) === 1);
    await t.page.waitForTimeout(400);
    checar('animação: a cópia do menu é removida depois', (await t.page.locator('.notif-panel').count()) === 0);
    console.log('Equipe: lista de equipes (várias equipes)');
    await t.page.click('[data-action="nav"][data-page="equipe"]').catch(() => {});
    await t.page.waitForTimeout(400);
    checar('Equipe abre na tela "Equipes" com o botão +', (await t.page.locator('h1', { hasText: 'Equipes' }).count()) === 1 && (await t.page.locator('[data-action="toggle-equipe-novo"]').count()) === 1);
    checar('lista mostra as duas equipes como botões grandes', (await t.page.locator('.equipe-cartao', { hasText: 'Equipe do Norte' }).count()) === 1 && (await t.page.locator('.equipe-cartao', { hasText: 'Equipe Teste' }).count()) === 1);
    checar('cada equipe tem "Sair" no canto', (await t.page.locator('.equipe-cartao [data-action="sair-equipe-lista"]').count()) === 2);
    checar('criar/entrar ficam recolhidos até clicar no +', (await t.page.locator('#equipe-novo.aberto').count()) === 0 && (await t.page.locator('#equipe-novo').evaluate((el) => el.getBoundingClientRect().height)) < 2);
    await t.page.click('[data-action="toggle-equipe-novo"]');
    await t.page.waitForTimeout(500);
    checar('o + desliza o bloco para baixo e gira vira ×', (await t.page.locator('#equipe-novo.aberto [data-action="criar-equipe"]').count()) === 1 && (await t.page.locator('#equipe-novo').evaluate((el) => el.getBoundingClientRect().height)) > 80 && (await t.page.locator('.equipe-mais-icone').evaluate((el) => getComputedStyle(el).transform)) !== 'none');
    await t.page.click('[data-action="toggle-equipe-novo"]');
    await t.page.waitForTimeout(500);
    checar('clicar no × recolhe o bloco de novo', (await t.page.locator('#equipe-novo').evaluate((el) => el.getBoundingClientRect().height)) < 2);
    checar('Monitoramento não está mais na tela de Equipe', (await t.page.locator('text=Monitoramento').count()) === 0);
    await t.page.click('.equipe-cartao >> text=Equipe Teste');
    await t.page.waitForTimeout(400);
    checar('clicar numa equipe entra nela (voltar + abas)', (await t.page.locator('[data-action="equipe-voltar-lista"]').count()) === 1);
    await t.page.click('[data-action="equipe-voltar-lista"]');
    checar('"‹ Equipes" volta para a lista', (await t.page.locator('.equipe-cartao').count()) === 2);
    await t.page.click('.equipe-cartao:not(:has-text("Equipe Teste")) >> text=Equipe do Norte');
    await t.page.waitForTimeout(400);
    const abrirEq = t.chamadas.find((c) => c.metodo === 'POST' && c.caminho === '/api/equipe/abrir');
    checar('Abrir envia a equipe escolhida', !!abrirEq && JSON.parse(abrirEq.corpo).equipeId === 'e2', abrirEq && abrirEq.corpo);

    console.log('Gestor: novo lead (Padrão ou Gestor, depois física ou jurídica)');
    await t.page.click('[data-action="nav"][data-page="leads"]');
    await t.page.waitForTimeout(300);
    await t.page.click('[data-action="open-new-lead"] >> nth=0');
    checar('gestor escolhe primeiro Padrão ou Gestor', (await t.page.locator('[data-modo-novo]').count()) === 2);
    await t.page.click('[data-modo-novo="1"]');
    await t.page.waitForTimeout(60);
    checar('animação: de uma janela para a outra a nova entra deslizando e a antiga sai', (await t.page.locator('#modal-root .overlay.anim-troca-entra').count()) === 1 && (await t.page.locator('body > .overlay.anim-troca-saida').count()) === 1);
    await t.page.waitForTimeout(350);
    checar('animação: a janela antiga é removida depois da saída', (await t.page.locator('.anim-troca-saida').count()) === 0);
    checar('depois escolhe pessoa física ou jurídica', (await t.page.locator('.tipo-pessoa-escolha-btn[data-tipo]').count()) === 2);
    await t.page.click('.tipo-pessoa-escolha-btn[data-tipo="juridica"]');
    checar('o formulário abre com as duas caixas lado a lado (Gestor + jurídica)', (await t.page.locator('.field-row-modo #f-modo-gestor-select').count()) === 1 && (await t.page.locator('.field-row-modo #f-tipo-pessoa-select').count()) === 1 && (await t.page.locator('#f-modo-gestor-select').innerText()).includes('Gestor') && (await t.page.locator('#f-tipo-pessoa-select').innerText()).includes('jurídica'));
    checar('modo Gestor mostra para quem vai o lead', (await t.page.locator('#f-atribuir-para').count()) === 1);
    await t.page.click('#f-modo-gestor-select');
    await t.page.click('[data-modo-gestor="0"]');
    await t.page.click('#f-modo-gestor-select');
    const antes = await t.page.locator('#f-cliente').boundingBox();
    await t.page.click('#f-tipo-pessoa-select');
    const depois = await t.page.locator('#f-cliente').boundingBox();
    await t.page.waitForTimeout(350); // a lista que fechou some com fade
    if (process.env.CAPTURAS) await t.page.screenshot({ path: '/tmp/lead-dropdown.png' });
    checar('a lista aberta fica por cima: o resto da tela não desce', !!antes && !!depois && Math.abs(antes.y - depois.y) < 2 && (await t.page.locator('.field-dropdown .tipo-pessoa-dropdown').count()) === 1);
    await t.page.click('#f-tipo-pessoa-select');
    await t.page.click('#f-modo-gestor-select');
    checar('trocar a caixa para Padrão esconde a escolha de pessoa', (await t.page.locator('#f-atribuir-para').count()) === 0);
    await t.page.click('#modal-close');
    await t.page.click('[data-action="nav"][data-page="equipe"]').catch(() => {});
    await t.page.waitForTimeout(200);
    await t.page.click('.equipe-cartao >> text=Equipe Teste');
    await t.page.waitForTimeout(300);

    console.log('Janelas: acessibilidade e Esc');
    await t.page.click('[data-action="nav"][data-page="leads"]');
    await t.page.waitForTimeout(200);
    await t.page.click('[data-action="open-new-lead"] >> nth=0');
    await t.page.click('[data-modo-novo="0"]');
    await t.page.click('.tipo-pessoa-escolha-btn[data-tipo="fisica"]');
    await t.page.waitForTimeout(100);
    checar('a janela do lead tem role="dialog" e aria-modal', (await t.page.locator('#modal-root .modal[role="dialog"][aria-modal="true"]').count()) === 1);
    await t.page.keyboard.press('Escape');
    await t.page.waitForTimeout(100);
    checar('Esc fecha a janela', (await t.page.locator('#modal-root .overlay').count()) === 0);
    await t.page.click('[data-action="nav"][data-page="equipe"]').catch(() => {});
    await t.page.waitForTimeout(200);
    await t.page.click('.equipe-cartao >> text=Equipe Teste');
    await t.page.waitForTimeout(300);

    console.log('Gestor: rodízio, metas e remoção de membro');
    await t.page.click('[data-action="nav"][data-page="equipe"]').catch(() => {});
    await t.page.waitForTimeout(300);
    await t.page.click('[data-action="set-equipe-subtab"][data-subtab="supervisao"]').catch(() => {});
    await t.page.waitForTimeout(500);
    checar('Gestão tem lista de seções como nas Configurações (Pessoas, Desempenho, Distribuição)', (await t.page.locator('.config-sidebar-item[data-action="set-gestao-secao"]').count()) === 6);
    checar('Gestão abre mostrando uma seção só (Membros)', (await t.page.locator('#rodizio-ativo').count()) === 0 && (await t.page.locator('[data-action="abrir-opcoes-membro"]').count()) >= 1);
    await t.page.click('[data-action="set-gestao-secao"][data-secao="rodizio"]'); await t.page.waitForTimeout(150);
    const temEquipe = await t.page.locator('#rodizio-ativo').count();
    checar('seção de rodízio aparece na página Equipe', temEquipe === 1);
    if (temEquipe) {
      await t.page.check('#rodizio-ativo');
      await t.page.check('.rodizio-membro >> nth=1');
      await t.page.click('[data-action="salvar-rodizio"]');
      await t.page.waitForTimeout(300);
      const put = t.chamadas.find((c) => c.metodo === 'PUT' && c.caminho === '/api/equipe/rodizio');
      checar('salvar rodízio envia ativo + membro escolhido', !!put && JSON.parse(put.corpo).ativo === true && JSON.parse(put.corpo).membros.includes('u2'), put && put.corpo);
    }
    await t.page.click('[data-action="set-gestao-secao"][data-secao="criar-conta"]'); await t.page.waitForTimeout(150);
    if (process.env.CAPTURAS) await t.page.screenshot({ path: '/tmp/gestao-criar-conta.png' });
    await t.page.fill('#conta-nova-nome', 'Beto Novo');
    await t.page.fill('#conta-nova-email', 'beto@x.com');
    await t.page.click('[data-action="criar-conta-membro"]');
    await t.page.waitForTimeout(400);
    const criar = t.chamadas.find((c) => c.metodo === 'POST' && c.caminho === '/api/equipe/criar-membro');
    checar('gestor cria a conta da pessoa na aba Gestão (nome + e-mail, sem senha)', !!criar && JSON.parse(criar.corpo).email === 'beto@x.com' && JSON.parse(criar.corpo).nome === 'Beto Novo' && !('senha' in JSON.parse(criar.corpo)), criar && criar.corpo);
    checar('avisa que o e-mail com o link de senha foi enviado', (await t.page.locator('.settings-page-msg.ok', { hasText: 'link para ela escolher a senha' }).count()) >= 1);
    await t.page.click('[data-action="set-gestao-secao"][data-secao="desempenho"]'); await t.page.waitForTimeout(150);
    checar('tabela mostra coluna "Meta do mês"', (await t.page.locator('th', { hasText: 'Meta do mês' }).count()) >= 1);
    const defMeta = t.page.locator('[data-action="definir-meta-membro"]').first();
    if (await defMeta.count()) {
      await defMeta.click();
      checar('modal de meta abre', (await t.page.locator('#meta-membro-valor').count()) === 1);
      await t.page.fill('#meta-membro-valor', '45000');
      await t.page.click('#meta-membro-salvar');
      await t.page.waitForTimeout(300);
      const putMeta = t.chamadas.find((c) => c.metodo === 'PUT' && /\/equipe\/membro\/.+\/meta-vendas$/.test(c.caminho));
      checar('salvar meta envia o valor digitado', !!putMeta && JSON.parse(putMeta.corpo).valorMeta === 45000, putMeta && putMeta.corpo);
      checar('modal de meta fecha', (await t.page.locator('#meta-membro-valor').count()) === 0);
    } else checar('botão Definir meta existe', false);
    await t.page.click('[data-action="set-gestao-secao"][data-secao="membros"]'); await t.page.waitForTimeout(150);
    const opc = t.page.locator('[data-action="abrir-opcoes-membro"]').first();
    if (await opc.count()) {
      await opc.click();
      await t.page.waitForTimeout(250);
      checar('Opções do membro abre janela com as 3 ações', (await t.page.locator('#opcoes-membro-overlay .opcao-membro').count()) === 3);
      if (process.env.CAPTURAS) await t.page.screenshot({ path: '/tmp/membro-opcoes.png' });
      await t.page.click('#opcao-remover');
      await t.page.waitForTimeout(400);
      checar('janela de remover membro abre (manter / passar leads)', (await t.page.locator('#rm-destino').count()) >= 1 || (await t.page.locator('input[type=radio]').count()) >= 2);
    } else checar('botão Remover existe', false);
    checar('sem erro de JavaScript na página Equipe', t.erros.length === 0, t.erros[t.erros.length - 1]);

    console.log('Gestor: atuar no funil de um consultor');
    await t.page.evaluate(() => { document.getElementById('modal-root').innerHTML = ''; });
    await t.page.click('[data-action="set-gestao-secao"][data-secao="ranking"]'); await t.page.waitForTimeout(150);
    const abrirFunil = t.page.locator('[data-action="atuar-como-membro"]').first();
    checar('ranking tem o botão "Abrir funil"', (await abrirFunil.count()) === 1);
    if (await abrirFunil.count()) {
      const antes = t.chamadas.length;
      await abrirFunil.click();
      await t.page.waitForTimeout(600);
      checar('faixa avisa que está no funil da Ana', (await t.page.locator('.atuando-banner', { hasText: 'Ana Vendas' }).count()) === 1);
      const novas = t.chamadas.slice(antes);
      checar('pedidos de board/funis/tarefas levam X-Atuar-Como', ['/api/board', '/api/funis', '/api/tasks'].every((c) => novas.some((n) => n.caminho === c && n.atuarComo === 'u2')), JSON.stringify(novas.map((n) => [n.caminho, n.atuarComo])));
      checar('pedidos de /auth e /equipe NÃO levam o header', novas.filter((n) => /^\/api\/(auth|equipe)/.test(n.caminho)).every((n) => !n.atuarComo));
      checar('menu só mostra páginas liberadas', (await t.page.locator('[data-action="nav"][data-page="comissoes"]').count()) === 0 && (await t.page.locator('.sidebar [data-action="nav"][data-page="pipeline"]').count()) === 1);
      const marca = t.chamadas.length;
      await t.page.click('[data-action="sair-funil-de"]');
      await t.page.waitForTimeout(600);
      checar('sair do funil remove a faixa e volta à Equipe', (await t.page.locator('.atuando-banner').count()) === 0);
      const depois = t.chamadas.slice(marca);
      checar('depois de sair, os pedidos voltam sem o header', depois.some((n) => n.caminho === '/api/board') && depois.filter((n) => n.caminho === '/api/board').every((n) => !n.atuarComo));
    }

    console.log('Importar/Exportar: possíveis leads em lote');
    await t.page.evaluate(() => { document.getElementById('modal-root').innerHTML = ''; });
    await t.page.click('[data-action="nav"][data-page="import-export"]');
    await t.page.waitForTimeout(500);
    checar('gestor vê "Passar todos para Leads"', (await t.page.locator('[data-action="possiveis-passar-todos"]').count()) === 1);
    checar('gestor escolhe o destino (Para mim / pessoa)', (await t.page.locator('#possiveis-destino').count()) === 1);
    await t.page.check('[data-action="possiveis-select-um"] >> nth=0');
    await t.page.waitForTimeout(150);
    checar('selecionar habilita "Passar selecionados (1)"', (await t.page.locator('[data-action="possiveis-passar-selecionados"]').innerText()).includes('(1)'));
    await t.page.selectOption('#possiveis-destino', 'u2');
    await t.page.click('[data-action="possiveis-passar-selecionados"]');
    await t.page.waitForTimeout(400);
    const lote = t.chamadas.find((c) => c.caminho === '/api/possiveis-leads/promover-lote');
    checar('envia ids selecionados e a pessoa escolhida', !!lote && JSON.parse(lote.corpo).ids.length === 1 && JSON.parse(lote.corpo).atribuirParaId === 'u2', lote && lote.corpo);
    console.log('Configurações: aba E-mail em Integrações');
    await t.page.click('[data-action="nav"][data-page="configuracoes"]');
    await t.page.waitForTimeout(300);
    await t.page.click('[data-action="set-config-categoria"][data-categoria="email"]');
    await t.page.waitForTimeout(700);
    checar('aba "E-mail" existe no grupo Integrações', (await t.page.locator('[data-action="set-config-categoria"][data-categoria="email"]').count()) === 1);
    checar('aba E-mail traz resumo diário, tarefas e backup por e-mail', (await t.page.locator('[data-action="resumo-diario-alternar"]').count()) === 1 && (await t.page.locator('[data-action="email-tarefas-alternar"]').count()) === 1 && (await t.page.locator('[data-action="backup-auto-alternar"]').count()) === 1);
    await t.page.click('[data-action="resumo-diario-alternar"]');
    await t.page.waitForTimeout(300);
    checar('ligar resumo diário chama a API', t.chamadas.some((c) => c.metodo === 'PUT' && c.caminho === '/api/resumo-diario'));
    console.log('Configurações: aba Acessibilidade');
    await t.page.click('[data-action="set-config-categoria"][data-categoria="acessibilidade"]');
    await t.page.waitForTimeout(300);
    checar('aba Acessibilidade tem 3 tamanhos e 3 opções', (await t.page.locator('[data-action="a11y-tamanho"]').count()) === 3 && (await t.page.locator('[data-action="a11y-toggle"]').count()) >= 3);
    if (await t.page.locator('[data-action="a11y-toggle"][data-chave="visaoComputador"]').count()) {
      await t.page.click('[data-action="a11y-toggle"][data-chave="visaoComputador"]');
      checar('"Ver como no computador" muda o viewport para 1100px', (await t.page.evaluate(() => document.querySelector('meta[name=viewport]').content)) === 'width=1100');
      await t.page.click('[data-action="a11y-toggle"][data-chave="visaoComputador"]');
      checar('desligar volta ao viewport do celular', (await t.page.evaluate(() => document.querySelector('meta[name=viewport]').content)).includes('device-width'));
    }
    await t.page.click('[data-action="a11y-tamanho"][data-tamanho="muito"]');
    checar('"Muito grande" aumenta a letra (--fs) e guarda a escolha', (await t.page.evaluate(() => document.documentElement.style.getPropertyValue('--fs'))) === '1.3' && (await t.page.evaluate(() => JSON.parse(localStorage.getItem('acessibilidade')).tamanho)) === 'muito');
    await t.page.click('[data-action="a11y-toggle"][data-chave="contraste"]');
    await t.page.click('[data-action="a11y-toggle"][data-chave="semAnimacao"]');
    await t.page.click('[data-action="a11y-toggle"][data-chave="destaque"]');
    checar('alto contraste, menos animação e destaque ligam as classes', await t.page.evaluate(() => ['a11y-contraste', 'a11y-sem-animacao', 'a11y-destaque'].every((c) => document.documentElement.classList.contains(c))));
    checar('o texto de fato fica maior com "Muito grande"', (await t.page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.a11y-desc')).fontSize))) > 15);
    await t.page.screenshot({ path: '/tmp/a11y-tela.png' });
    await t.page.click('[data-action="a11y-tamanho"][data-tamanho="normal"]');
    for (const c of ['contraste', 'semAnimacao', 'destaque']) await t.page.click(`[data-action="a11y-toggle"][data-chave="${c}"]`);
    checar('voltar ao normal desliga tudo', await t.page.evaluate(() => document.documentElement.style.getPropertyValue('--fs') === '1' && !document.documentElement.className.includes('a11y-')));
    await t.page.click('[data-action="set-config-categoria"][data-categoria="manutencao"]');
    await t.page.waitForTimeout(300);
    await t.page.click('[data-action="duplicados-procurar"]');
    await t.page.waitForTimeout(300);
    checar('Manutenção lista os contatos duplicados e oferece unificar', (await t.page.locator('[data-action="duplicados-unificar"]').count()) === 1 && (await t.page.locator('.disparo-lead-item', { hasText: 'Willian Almeida' }).count()) === 1);
    checar('Manutenção não tem mais os blocos de e-mail', (await t.page.locator('[data-action="resumo-diario-alternar"]').count()) === 0 && (await t.page.locator('[data-action="backup-auto-alternar"]').count()) === 0);
    await t.page.evaluate(() => { document.getElementById('modal-root').innerHTML = ''; });
    await t.page.click('[data-action="nav"][data-page="import-export"]');
    await t.page.waitForTimeout(400);
    console.log('Importar planilha: painel desce, X faz subir e volta ao original');
    checar('botão "Baixar planilha modelo" fica no canto direito', await t.page.evaluate(() => { const b = document.querySelector('.import-modelo').getBoundingClientRect(); const e = document.querySelector('[data-action="escolher-planilha"]').getBoundingClientRect(); return b.left > e.right + 200; }));
    await t.page.click('[data-action="baixar-modelo-planilha"]');
    checar('baixar modelo gera o arquivo .xlsx', (await t.page.evaluate(() => window.__baixou)) === 'planilha-modelo-leads.xlsx');
    await t.page.setInputFiles('#planilha-input', { name: 'contatos.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('x') });
    await t.page.waitForSelector('.import-painel');
    const altIni = await t.page.evaluate(() => document.querySelector('.import-painel').getBoundingClientRect().height);
    await t.page.waitForTimeout(600);
    const altFim = await t.page.evaluate(() => document.querySelector('.import-painel').getBoundingClientRect().height);
    checar('painel da planilha desce (altura cresce com animação)', altFim > 150 && altIni < altFim, `${altIni} -> ${altFim}`);
    checar('nome do arquivo e X aparecem', (await t.page.locator('.import-nome').innerText()) === 'contatos.xlsx' && (await t.page.locator('[data-action="fechar-planilha"]').count()) === 1);
    checar('prévia mostra as linhas da planilha', (await t.page.locator('.import-previa tbody tr').count()) === 2);
    await t.page.click('[data-action="fechar-planilha"]');
    await t.page.waitForTimeout(120);
    const altMeio = await t.page.evaluate(() => (document.querySelector('.import-painel') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height);
    checar('ao clicar no X o painel começa a subir', altMeio < altFim, `${altMeio} < ${altFim}`);
    await t.page.waitForTimeout(600);
    checar('página volta ao estado original', (await t.page.locator('.import-painel').count()) === 0 && (await t.page.locator('.import-arquivo').innerText()).includes('Nenhum arquivo escolhido'));
    await t.page.screenshot({ path: '/tmp/import-final.png' });
    console.log('Leads: gestor passa em lote e exclui; membro não exclui');
    await t.page.click('[data-action="nav"][data-page="leads"]');
    await t.page.waitForTimeout(300);
    await t.page.click('[data-action="leads-select-um"] >> nth=0');
    await t.page.waitForTimeout(150);
    checar('gestor tem "Passar para…" e Excluir na barra', (await t.page.locator('#leads-bulk-gestor-destino').count()) === 1 && (await t.page.locator('[data-action="leads-bulk-excluir"]').count()) === 1);
    await t.ctx.close();
    console.log('Celular: barra inferior, Pipeline por etapa, Leads em cartões, Configurações em lista');
    t = await abrir(browser, url, 'mobile', { mobile: true });
    await t.page.waitForTimeout(700);
    checar('celular: sem barra embaixo; o menu abre pelos três pontinhos do topo', !(await t.page.locator('.bottom-nav').isVisible()) && await t.page.locator('.main-topbar .hamburger-btn').isVisible());
    const irMobile = async (pg) => { await t.page.click('.main-topbar .hamburger-btn'); await t.page.waitForTimeout(350); await t.page.click(`.sidebar [data-page="${pg}"]`); await t.page.waitForTimeout(350); };
    checar('celular: o menu lateral fechado não deixa sombra nem aparece', await t.page.evaluate(() => { const e = document.querySelector('.sidebar'); const c = getComputedStyle(e); return c.visibility === 'hidden' && c.boxShadow === 'none'; }));
    await irMobile('pipeline');
    checar('celular: cartão com uma faixa só (arrastar + trocar etapa)', (await t.page.locator('.card .card-faixa .card-drag-handle').count()) > 0 && (await t.page.locator('.card .card-faixa .card-move-btn').count()) > 0);
    await t.page.waitForTimeout(400);
    if (process.env.CAPTURAS) await t.page.screenshot({ path: '/tmp/cel-pipeline.png' });
    checar('celular: Pipeline tem uma aba por etapa', (await t.page.locator('#etapas-chips-mobile .etapa-chip-mobile').count()) === 3);
    checar('celular: só a etapa aberta aparece', (await t.page.locator('.column:visible').count()) === 1 && (await t.page.locator('.column.col-ativa-mobile .card').count()) === 2);
    await t.page.click('.etapa-chip-mobile[data-col-id="c2"]');
    await t.page.waitForTimeout(300);
    checar('celular: tocar na aba troca a etapa', (await t.page.locator('.column.col-ativa-mobile .card-name', { hasText: 'João Ganho' }).count()) === 1);
    await t.page.click('.etapa-chip-mobile[data-col-id="c1"]');
    await t.page.waitForTimeout(300);

    // arrastar por toque: segura o cliente, passa sobre a aba "Ganho" (abre sozinha) e solta acima do outro cliente
    const cdp = await t.page.context().newCDPSession(t.page);
    const centro = async (sel) => { const b = await t.page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
    const toque = (tipo, x, y) => cdp.send('Input.dispatchTouchEvent', { type: tipo, touchPoints: tipo === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const orig = await centro('.card[data-card-id="k1"] .card-name');
    await toque('touchStart', orig.x, orig.y);
    await t.page.waitForTimeout(450);
    const chip = await centro('.etapa-chip-mobile[data-col-id="c2"]');
    for (let i = 1; i <= 8; i++) { await toque('touchMove', orig.x + (chip.x - orig.x) * i / 8, orig.y + (chip.y - orig.y) * i / 8); await t.page.waitForTimeout(30); }
    await t.page.waitForTimeout(700);
    checar('celular: segurar sobre a aba abre a etapa com o cliente ainda na mão', (await t.page.locator('.column.col-ativa-mobile .card-name', { hasText: 'João Ganho' }).count()) === 1 && (await t.page.locator('#card-touch-fantasma').count()) === 1);
    const alvo = await t.page.locator('.column.col-ativa-mobile .card[data-card-id="k2"]').boundingBox();
    for (let i = 1; i <= 6; i++) { await toque('touchMove', chip.x, chip.y + (alvo.y + 6 - chip.y) * i / 6); await t.page.waitForTimeout(30); }
    await t.page.waitForTimeout(150);
    checar('celular: mostra onde o cliente vai entrar na lista', (await t.page.locator('.card-indicador-antes').count()) === 1);
    await toque('touchEnd');
    await t.page.waitForTimeout(600);
    const mover = t.chamadas.find((c) => c.metodo === 'PUT' && c.caminho === '/api/cards/k1/move');
    const dadosMover = mover && JSON.parse(mover.corpo);
    checar('celular: soltar acima do outro cliente manda a etapa nova e a ordem antes dele', !!dadosMover && dadosMover.columnId === 'c2' && dadosMover.ordem < 0, mover && mover.corpo);

    await irMobile('leads');
    await t.page.waitForTimeout(400);
    if (process.env.CAPTURAS) await t.page.screenshot({ path: '/tmp/cel-leads.png' });
    checar('celular: Leads vira lista de cartões (sem tabela)', (await t.page.locator('.lead-card-mobile').count()) === 3 && !(await t.page.locator('.leads-table-wrap').isVisible()));
    checar('celular: botão "Novo lead" fica à mão', await t.page.locator('.fab-novo-lead').isVisible());
    await t.page.click('.lead-card-mobile >> nth=0');
    await t.page.waitForTimeout(300);
    checar('celular: a janela do lead ocupa a tela toda', await t.page.evaluate(() => { const m = document.querySelector('#modal-root .modal'); return !!m && Math.round(m.getBoundingClientRect().width) === window.innerWidth; }));
    await t.page.evaluate(() => { document.getElementById('modal-root').innerHTML = ''; });

    await irMobile('configuracoes');
    if (process.env.CAPTURAS) await t.page.screenshot({ path: '/tmp/cel-config.png' });
    checar('celular: Configurações abre em lista', (await t.page.locator('.config-layout.mostrando-lista').count()) === 1 && !(await t.page.locator('.config-content').isVisible()) && await t.page.locator('.config-sidebar').isVisible());
    await t.page.click('.config-sidebar-item[data-categoria="acessibilidade"]');
    await t.page.waitForTimeout(300);
    checar('celular: tocar numa linha abre a tela, com botão de voltar', (await t.page.locator('.a11y-tamanho').count()) === 3 && await t.page.locator('.config-voltar-mobile').isVisible() && !(await t.page.locator('.config-sidebar').isVisible()));
    await t.page.click('.config-voltar-mobile');
    await t.page.waitForTimeout(250);
    checar('celular: voltar mostra a lista de novo', await t.page.locator('.config-sidebar').isVisible());
    for (const pg of ['dashboard', 'pipeline', 'leads', 'conversas']) {
      await irMobile(pg);
      const l = await t.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      checar(`celular: "${pg}" não estoura a largura da tela`, l.sw <= l.cw + 1, JSON.stringify(l));
    }
    checar('celular: sem erro de JavaScript', t.erros.length === 0, t.erros[t.erros.length - 1]);
    await t.ctx.close();

    t = await abrir(browser, url, 'membro');
    await t.page.click('[data-action="nav"][data-page="leads"]');
    await t.page.waitForTimeout(400);
    await t.page.click('[data-action="leads-select-um"] >> nth=0');
    await t.page.waitForTimeout(150);
    checar('membro de equipe NÃO vê Excluir nem Passar para…', (await t.page.locator('[data-action="leads-bulk-excluir"]').count()) === 0 && (await t.page.locator('#leads-bulk-gestor-destino').count()) === 0);
    checar('membro ainda vê Arquivar', (await t.page.locator('[data-action="leads-bulk-arquivar"]').count()) === 1);
    checar('sem erro de JavaScript (membro)', t.erros.length === 0, t.erros[0]);
    await t.ctx.close();

    console.log('Versão administrativa (/adm): vocabulário de recrutamento');
    t = await abrir(browser, url, 'rh', { perfil: 'rh' });
    const nav = await t.page.locator('.sidebar-nav').innerText();
    checar('menu fala "Candidatos" e "Processo seletivo"', /Candidatos/.test(nav) && /Processo seletivo/.test(nav), nav.replace(/\n/g, ' | '));
    checar('menu não tem Comissões nem "Leads"', !/Comiss/.test(nav) && !/\bLeads\b/.test(nav), nav.replace(/\n/g, ' | '));
    await t.page.click('[data-action="nav"][data-page="dashboard"]');
    await t.page.waitForTimeout(400);
    const dash = await t.page.locator('main, .main-area').first().innerText();
    checar('dashboard sem meta de vendas e sem "leads"', !/Meta de vendas/.test(dash) && !/\bNovos leads\b/.test(dash), dash.slice(0, 200).replace(/\n/g, ' | '));
    await t.page.click('[data-action="nav"][data-page="leads"]');
    await t.page.waitForTimeout(400);
    await t.page.click('[data-action="add-lead"], .btn-primary >> nth=0').catch(() => {});
    checar('sem erro de JavaScript (rh)', t.erros.length === 0, t.erros[0]);
    await t.ctx.close();

    console.log('Sem equipe: convite recebido');
    t = await abrir(browser, url, 'semEquipe');
    await t.page.click('[data-action="nav"][data-page="equipe"]').catch(() => {});
    await t.page.waitForTimeout(400);
    checar('convite recebido aparece com aceitar/recusar', (await t.page.locator('[data-action="aceitar-convite-equipe"]').count()) === 1 && (await t.page.locator('[data-action="recusar-convite-equipe"]').count()) === 1);
    checar('sem erro de JavaScript', t.erros.length === 0, t.erros[0]);
    await t.ctx.close();

    console.log('Sessão: 401 volta pro login, 503 não');
    t = await abrir(browser, url, 'gestor', { interceptar: (m, p) => p === '/api/board' ? { status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Sessão inválida.', codigo: 'sessao_invalida' }) } : null });
    await t.page.waitForTimeout(1500);
    checar('401 com sessao_invalida vai para o login', /login\.html/.test(t.page.url()), t.page.url());
    await t.ctx.close();
    t = await abrir(browser, url, 'gestor', { interceptar: (m, p) => p === '/api/board' ? { status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'O servidor está acordando.' }) } : null });
    await t.page.waitForTimeout(8000);
    checar('503 NÃO derruba a sessão', /index\.html/.test(t.page.url()), t.page.url());
    await t.ctx.close();
  } catch (e) {
    falhas++; console.log('  ✘ erro inesperado no teste:', e.message);
  } finally {
    await browser.close(); s.close();
  }
  console.log(falhas ? `\n✘ ${falhas} de ${total} checagens falharam.` : `\n✔ ${total}/${total} checagens de tela passaram.`);
  process.exit(falhas ? 1 : 0);
})();
