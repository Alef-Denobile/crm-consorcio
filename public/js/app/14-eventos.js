/* ---------- eventos ---------- */
function bindAppEvents(){
  const app = document.getElementById('app');

  app.querySelectorAll('[data-action="toggle-sidebar"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ sidebarOpen = !sidebarOpen; renderApp(); });
  });
  const closeSidebarEl = app.querySelector('[data-action="close-sidebar"]');
  if(closeSidebarEl) closeSidebarEl.addEventListener('click', ()=>{ sidebarOpen = false; renderApp(); });
  const buscaGlobalBtn = app.querySelector('[data-action="abrir-busca-global"]');
  if(buscaGlobalBtn) buscaGlobalBtn.addEventListener('click', abrirBuscaGlobal);
  const notifBtn = app.querySelector('[data-action="toggle-notif"]');
  if(notifBtn) notifBtn.addEventListener('click', (e)=>{ e.stopPropagation(); notifOpen = !notifOpen; renderApp(); });

  const errorBanner = app.querySelector('[data-action="dismiss-error"]');
  if(errorBanner) errorBanner.addEventListener('click', ()=>{ dispensarErro(); renderApp(); });

  const logoutBtn = app.querySelector('[data-action="logout"]');
  if(logoutBtn) logoutBtn.addEventListener('click', logout);

  const reordenarNavBtn = app.querySelector('[data-action="abrir-reordenar-nav"]');
  if(reordenarNavBtn) reordenarNavBtn.addEventListener('click', abrirReordenarNav);

  app.querySelectorAll('[data-action="nav"]').forEach(btn=>{
    btn.addEventListener('click', ()=> goToPage(btn.dataset.page));
  });

  app.querySelectorAll('[data-action="a11y-tamanho"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ setAcessibilidade({ tamanho: btn.dataset.tamanho }); renderApp(); });
  });
  app.querySelectorAll('[data-action="a11y-toggle"]').forEach(sw=>{
    const alternar = ()=>{ setAcessibilidade({ [sw.dataset.chave]: !getAcessibilidade()[sw.dataset.chave] }); renderApp(); };
    sw.addEventListener('click', (e)=>{ e.preventDefault(); alternar(); });
    sw.addEventListener('keydown', (e)=>{ if(e.key===' ' || e.key==='Enter'){ e.preventDefault(); alternar(); } });
  });
  const darkModeSwitch = app.querySelector('[data-action="toggle-dark-mode"]');
  if(darkModeSwitch) darkModeSwitch.addEventListener('click', ()=>{
    setDarkMode(!getDarkMode());
    renderApp();
  });
  const pushAtivarBtn = app.querySelector('[data-action="push-ativar"]');
  if(pushAtivarBtn) pushAtivarBtn.addEventListener('click', ativarPush);
  const pushDesativarBtn = app.querySelector('[data-action="push-desativar"]');
  if(pushDesativarBtn) pushDesativarBtn.addEventListener('click', desativarPush);
  const pushTestarBtn = app.querySelector('[data-action="push-testar"]');
  if(pushTestarBtn) pushTestarBtn.addEventListener('click', testarPush);
  const dupProcurarBtn = app.querySelector('[data-action="duplicados-procurar"]');
  if(dupProcurarBtn) dupProcurarBtn.addEventListener('click', procurarDuplicados);
  const dupUnificarBtn = app.querySelector('[data-action="duplicados-unificar"]');
  if(dupUnificarBtn) dupUnificarBtn.addEventListener('click', ()=>{
    showConfirm({
      message: `Juntar ${duplicados.grupos.length} grupo(s) de contatos repetidos? As conversas, anexos e tarefas vão para o contato mais antigo e os repetidos serão apagados. Isso não pode ser desfeito.`,
      confirmLabel: 'Unificar',
      onConfirm: ()=>{ closeConfirm(); unificarContatosDuplicados(); },
    });
  });
  const resumoAlternarBtn = app.querySelector('[data-action="resumo-diario-alternar"]');
  if(resumoAlternarBtn) resumoAlternarBtn.addEventListener('click', alternarResumoDiario);
  const resumoAgoraBtn = app.querySelector('[data-action="resumo-diario-agora"]');
  if(resumoAgoraBtn) resumoAgoraBtn.addEventListener('click', enviarResumoDiarioAgora);
  const emailTarefasBtn = app.querySelector('[data-action="email-tarefas-alternar"]');
  if(emailTarefasBtn) emailTarefasBtn.addEventListener('click', alternarEmailTarefas);
  const backupAutoAlternarBtn = app.querySelector('[data-action="backup-auto-alternar"]');
  if(backupAutoAlternarBtn) backupAutoAlternarBtn.addEventListener('click', alternarBackupAuto);
  const backupAutoAgoraBtn = app.querySelector('[data-action="backup-auto-agora"]');
  if(backupAutoAgoraBtn) backupAutoAgoraBtn.addEventListener('click', enviarBackupAutoAgora);
  const verificarAtualizacaoBtn = app.querySelector('[data-action="verificar-atualizacao"]');
  if(verificarAtualizacaoBtn) verificarAtualizacaoBtn.addEventListener('click', verificarAtualizacaoApp);
  const preencherMesInicioBtn = app.querySelector('[data-action="preencher-mes-inicio-contato"]');
  if(preencherMesInicioBtn) preencherMesInicioBtn.addEventListener('click', preencherMesInicioContatoAntigos);
  app.querySelectorAll('[data-action="atuar-como-membro"]').forEach(btn=>{
    btn.addEventListener('click', ()=> entrarNoFunilDe(btn.dataset.userId, btn.dataset.nome));
  });
  const sairFunilBtn = app.querySelector('[data-action="sair-funil-de"]');
  if(sairFunilBtn) sairFunilBtn.addEventListener('click', sairDoFunilDe);
  app.querySelectorAll('[data-action="ver-dashboard-membro"]').forEach(btn=>{
    btn.addEventListener('click', ()=> abrirDashboardDeMembro(btn.dataset.userId, btn.dataset.nome));
  });
  const sairDashboardBtn = app.querySelector('[data-action="sair-dashboard-membro"]');
  if(sairDashboardBtn) sairDashboardBtn.addEventListener('click', sairDashboardDeMembro);
  const abrirBackupModalBtn = app.querySelector('[data-action="abrir-backup-modal"]');
  if(abrirBackupModalBtn) abrirBackupModalBtn.addEventListener('click', abrirBackupModal);


  bindEventosConversasEDashboard();
  bindEventosAgenda();
  bindEventosAutomacoesEImportar();
  bindEventosEquipe();
  bindEventosConfigEComissoes();
  bindEventosLeadsEPipeline();
}
// Renderiza o menu "Mover para" fora do card (que tem overflow:hidden e cortava as
// opções de baixo) — usa uma raiz própria, colada no fim do <body>, posicionada via
// JS com as coordenadas reais do botão que foi clicado.
// Arrastar card por toque — cria um "fantasma" fixo que segue o dedo, deixando bem
// visível o que está sendo movido. O fantasma tem pointer-events:none de propósito,
// senão ele mesmo apareceria como "o que está embaixo do dedo" ao consultar
// elementFromPoint, escondendo a coluna real por trás dele.
function iniciarArrastoDeCard(x, y){
  if(!cardTouchDrag) return;
  cardTouchDrag.arrastando = true;
  const rect = cardTouchDrag.cardEl.getBoundingClientRect();
  cardTouchDrag.cardEl.classList.add('card-touch-arrastando');
  const fantasma = document.createElement('div');
  fantasma.id = 'card-touch-fantasma';
  fantasma.className = 'card-touch-fantasma';
  fantasma.style.width = rect.width + 'px';
  fantasma.style.left = (x - rect.width/2) + 'px';
  fantasma.style.top = (y + (ehCelular() ? 30 : -24)) + 'px';
  fantasma.innerHTML = cardTouchDrag.cardEl.querySelector('.card-body') ? cardTouchDrag.cardEl.querySelector('.card-body').innerHTML : cardTouchDrag.cardEl.innerHTML;
  document.body.appendChild(fantasma);
  cardTouchDrag.fantasmaEl = fantasma;
  if(navigator.vibrate) navigator.vibrate(15);
  atualizarArrastoDeCard(x, y);
}
function atualizarArrastoDeCard(x, y){
  if(!cardTouchDrag || !cardTouchDrag.fantasmaEl) return;
  // isso aqui é barato — atualiza sempre na hora, o fantasma nunca fica atrasado atrás do dedo
  cardTouchDrag.fantasmaEl.style.left = (x - cardTouchDrag.fantasmaEl.offsetWidth/2) + 'px';
  cardTouchDrag.fantasmaEl.style.top = (y + (ehCelular() ? 30 : -24)) + 'px';
  cardTouchDrag.ultimoXCalculo = x;
  cardTouchDrag.ultimoYCalculo = y;
  // isso aqui é caro (olha a posição de TODOS os cards da coluna, toda vez) — segurando
  // por muito tempo, o dedo dispara centenas de eventos de movimento, e refazer essa
  // conta pesada em cada um deles ia acumulando trabalho e deixando tudo mais lento
  // (parecendo "parar de reconhecer" depois de um tempo). Por isso, no máximo uma vez
  // por quadro de tela (~60x por segundo), nunca mais que isso.
  if(arrastoRafPendente) return;
  arrastoRafPendente = true;
  requestAnimationFrame(()=>{
    arrastoRafPendente = false;
    if(!cardTouchDrag) return;
    const xAtual = cardTouchDrag.ultimoXCalculo, yAtual = cardTouchDrag.ultimoYCalculo;
    verificarChipDeEtapaSobDedo(xAtual, yAtual);
    const colAlvo = encontrarColunaMaisProxima(xAtual);
    document.querySelectorAll('.column.coluna-drag-alvo').forEach(c=> c.classList.remove('coluna-drag-alvo'));
    if(colAlvo){
      colAlvo.classList.add('coluna-drag-alvo');
      mostrarIndicadorDeInsercao(colAlvo, yAtual, cardTouchDrag.cardId);
    }
    atualizarAutoScrollDoArrasto(xAtual, yAtual, colAlvo);
  });
}
// Acha a coluna sob o dedo — e se não achar nenhuma exatamente ali (dedo soltou bem
// na borda entre duas colunas, ou num pixel qualquer fora delas), pega a mais próxima
// pela posição horizontal, em vez de simplesmente desistir. É bem mais tolerante que
// depender de acertar o pixel exato num aparelho de toque.
function encontrarColunaMaisProxima(x){
  const colunas = [...document.querySelectorAll('.column')].filter(c=> c.offsetParent !== null); // no celular só a etapa aberta está visível
  if(!colunas.length) return null;
  if(ehCelular() && colunas.length === 1) return colunas[0];
  const dentro = colunas.find(c=>{
    const r = c.getBoundingClientRect();
    return x >= r.left && x <= r.right;
  });
  if(dentro) return dentro;
  let maisProxima = null, menorDist = Infinity;
  colunas.forEach(c=>{
    const r = c.getBoundingClientRect();
    const centro = (r.left + r.right) / 2;
    const dist = Math.abs(x - centro);
    if(dist < menorDist){ menorDist = dist; maisProxima = c; }
  });
  return maisProxima;
}
// Rola a tela sozinha quando o dedo (arrastando um card) chega perto da borda —
// horizontal pra passar de uma coluna pra outra que não estava visível, vertical
// pra descer/subir dentro de uma coluna comprida. Fica repetindo a cada quadro
// enquanto o dedo continuar perto da borda; some assim que ele se afasta.
// Sem isso, o navegador mostra o símbolo de "proibido" sempre que o mouse passa por
// fora de uma coluna durante o arrastar (a barra lateral, por exemplo) — mesmo que a
// intenção seja só passar por cima pra rolar até uma coluna escondida. Isso libera
// soltar em qualquer lugar da tela, mas só quando é de fato um card/coluna nosso
// sendo arrastado (não mexe em outros tipos de arrastar, tipo um arquivo do sistema).
function permitirDropForaDasColunas(e){
  const tipos = e.dataTransfer && e.dataTransfer.types;
  if(!tipos || (!tipos.includes('text/x-crm-card') && !tipos.includes('text/x-crm-column'))) return;
  if(e.target.closest('.column')) return; // já tratado pelo listener da própria coluna
  e.preventDefault();
  atualizarAutoScrollDoArrasto(e.clientX, e.clientY, null);
}
// Celular: segurando o cliente sobre o nome de outra etapa (~0,4 s), a etapa abre sozinha,
// com o cliente ainda na mão — dá pra escolher em que posição da lista soltar.
let chipHoverTimer = null;
function verificarChipDeEtapaSobDedo(x, y){
  if(!cardTouchDrag || !ehCelular()) return;
  const sob = document.elementFromPoint(x, y);
  const chip = sob && sob.closest ? sob.closest('#etapas-chips-mobile .etapa-chip-mobile') : null;
  document.querySelectorAll('.etapa-chip-mobile.etapa-chip-alvo').forEach(c=>{ if(c!==chip) c.classList.remove('etapa-chip-alvo'); });
  if(cardTouchDrag.fantasmaEl) cardTouchDrag.fantasmaEl.classList.toggle('sobre-chips', !!chip);
  const id = chip ? chip.dataset.colId : null;
  if(id === cardTouchDrag.chipHover) return;
  clearTimeout(chipHoverTimer);
  cardTouchDrag.chipHover = id;
  if(!chip) return;
  chip.classList.add('etapa-chip-alvo');
  chipHoverTimer = setTimeout(()=>{
    if(cardTouchDrag && cardTouchDrag.chipHover === id){
      trocarEtapaMobile(id, true);
      if(navigator.vibrate) navigator.vibrate(10);
    }
  }, 400);
}
// Troca a etapa aberta no celular. Durante o arrasto, só mexe nas classes (sem redesenhar a
// tela), pra não perder o cliente que está na mão.
function trocarEtapaMobile(colId, durante){
  pipelineEtapaMobileId = colId;
  if(!durante){ renderApp(); return; }
  document.querySelectorAll('.column').forEach(c=> c.classList.toggle('col-ativa-mobile', c.dataset.colId === colId));
  document.querySelectorAll('.etapa-chip-mobile').forEach(c=>{
    const ativo = c.dataset.colId === colId;
    c.classList.toggle('active', ativo);
    c.setAttribute('aria-selected', ativo ? 'true' : 'false');
  });
}
function atualizarAutoScrollDoArrasto(x, y, colAlvo){
  clearInterval(autoScrollDoArrastoInterval);
  if(ehCelular() && cardTouchDrag){
    // celular: a página inteira rola (a lista da etapa não tem rolagem própria)
    let dy = 0;
    const topoLivreY = (document.querySelector('.main-topbar') || { getBoundingClientRect:()=>({ bottom:0 }) }).getBoundingClientRect().bottom;
    if(!cardTouchDrag.chipHover && y < topoLivreY + 60) dy = -12;
    else if(y > window.innerHeight - 150) dy = 12;
    // na ponta da fileira de etapas, ela desliza e mostra as próximas (quanto mais na ponta, mais rápido)
    let dxChips = 0;
    const fileira = document.getElementById('etapas-chips-mobile');
    if(fileira){
      const r = fileira.getBoundingClientRect();
      if(y >= r.top - 10 && y <= r.bottom + 10){
        const borda = 70;
        if(x < r.left + borda) dxChips = -Math.ceil(((r.left + borda - x) / borda) * 14);
        else if(x > r.right - borda) dxChips = Math.ceil(((x - (r.right - borda)) / borda) * 14);
      }
    }
    if(dy || dxChips) autoScrollDoArrastoInterval = setInterval(()=>{ if(dy) window.scrollBy(0, dy); if(dxChips && fileira) fileira.scrollLeft += dxChips; }, 16);
    return;
  }
  const margemHorizontal = 260; // cobre a largura da barra lateral — passar por cima dela já conta como "quero rolar pra lá"
  const margemVertical = 110;
  const mainEl = document.querySelector('main.pipeline-main');
  let dxScroll = 0;
  if(mainEl){
    if(x < margemHorizontal) dxScroll = -16;
    else if(x > window.innerWidth - margemHorizontal) dxScroll = 16;
  }
  const colunaCardsEl = colAlvo ? colAlvo.querySelector('.cards') : null;
  let dyScroll = 0;
  if(colunaCardsEl){
    if(y < margemVertical) dyScroll = -12;
    else if(y > window.innerHeight - margemVertical) dyScroll = 12;
  }
  if(dxScroll===0 && dyScroll===0) return;
  autoScrollDoArrastoInterval = setInterval(()=>{
    if(mainEl && dxScroll) mainEl.scrollLeft += dxScroll;
    if(colunaCardsEl && dyScroll) colunaCardsEl.scrollTop += dyScroll;
  }, 16);
}
function finalizarArrastoDeCard(x, y){
  if(!cardTouchDrag) return;
  const colAlvo = encontrarColunaMaisProxima(x);
  const cardId = cardTouchDrag.cardId;
  limparVisualDoArrasto();
  if(colAlvo && colAlvo.dataset.colId){
    const ordem = calcularOrdemDeInsercao(colAlvo, y, cardId);
    moveCard(cardId, colAlvo.dataset.colId, ordem);
  }
}
function cancelarArrastoDeCard(){
  limparVisualDoArrasto();
}
function limparVisualDoArrasto(){
  if(!cardTouchDrag) return;
  clearTimeout(chipHoverTimer);
  document.querySelectorAll('.etapa-chip-mobile.etapa-chip-alvo').forEach(c=> c.classList.remove('etapa-chip-alvo'));
  clearInterval(autoScrollDoArrastoInterval);
  cardTouchDrag.cardEl.classList.remove('card-touch-arrastando');
  if(cardTouchDrag.fantasmaEl) cardTouchDrag.fantasmaEl.remove();
  document.querySelectorAll('.column.coluna-drag-alvo').forEach(c=> c.classList.remove('coluna-drag-alvo'));
  limparIndicadorDeInsercao();
}
function renderFloatingMoveMenu(){
  let root = document.getElementById('floating-menu-root');
  if(!root){
    root = document.createElement('div');
    root.id = 'floating-menu-root';
    document.body.appendChild(root);
  }
  if(!openMoveMenuCardId){ root.innerHTML = ''; return; }
  const btn = document.querySelector(`[data-action="toggle-move-menu"][data-card-id="${openMoveMenuCardId}"]`);
  const card = board.cards.find(c=>c.id===openMoveMenuCardId);
  if(!btn || !card){ root.innerHTML = ''; openMoveMenuCardId = null; return; }

  const colunasDoMesmoFunil = board.columns.filter(c=>c.funilId===funilAtualId);
  const rect = btn.getBoundingClientRect();
  const alturaEstimada = Math.min(260, colunasDoMesmoFunil.length * 40 + 40);
  const cabeDeBaixo = rect.bottom + alturaEstimada < window.innerHeight;
  const top = cabeDeBaixo ? rect.bottom + 4 : rect.top - alturaEstimada - 4;
  const left = Math.min(rect.left, window.innerWidth - 200); // não deixa vazar pela direita da tela

  root.innerHTML = `
    <div class="col-menu card-move-menu" style="position:fixed; top:${Math.max(4,top)}px; left:${Math.max(4,left)}px;">
      <div class="col-menu-title">Mover para</div>
      ${colunasDoMesmoFunil.map(c=>`
        <button class="col-menu-item" data-action="mover-para-coluna" data-card-id="${card.id}" data-col-id="${c.id}" ${c.id===card.columnId?'disabled':''}>
          ${esc(c.nome)} ${c.id===card.columnId?'✓':''}
        </button>
      `).join('')}
    </div>
  `;
  root.querySelectorAll('[data-action="mover-para-coluna"]').forEach(b=>{
    b.addEventListener('click', (e)=>{
      e.stopPropagation();
      if(b.disabled) return;
      openMoveMenuCardId = null;
      moveCard(b.dataset.cardId, b.dataset.colId);
    });
  });
}
function closeMenusOnOutsideClick(e){
  if(openMenuColId && !e.target.closest('.col-menu') && !e.target.closest('[data-action="toggle-col-menu"]')){
    openMenuColId = null; renderApp();
  }
  if(openMoveMenuCardId && !e.target.closest('.card-move-menu') && !e.target.closest('[data-action="toggle-move-menu"]')){
    openMoveMenuCardId = null; renderFloatingMoveMenu();
  }
  if(menuDiaAberto && !e.target.closest('#menu-dia-root')){
    fecharMenuDia();
  }
  if(dateMenuOpen && !e.target.closest('.date-menu') && !e.target.closest('[data-action="toggle-date-menu"]')){
    dateMenuOpen = false; renderApp();
  }
  if(notifOpen && !e.target.closest('.notif-panel') && !e.target.closest('[data-action="toggle-notif"]')){
    notifOpen = false; renderApp();
  }
  if(ordenarMenuAberto && !e.target.closest('.ordenar-wrap')){
    ordenarMenuAberto = null; renderApp();
  }
}


// Faixa do resumo do funil no celular: esconde o sinal "continua" quando já chegou ao fim
document.addEventListener('scroll', (e)=>{
  const faixa = e.target && e.target.classList && e.target.classList.contains('stats') ? e.target : null;
  if(!faixa || !faixa.parentElement) return;
  faixa.parentElement.classList.toggle('no-fim', faixa.scrollLeft + faixa.clientWidth >= faixa.scrollWidth - 4);
}, true);

// Depois que o arrastar do cliente é confirmado, quem acompanha o dedo é o DOCUMENTO, não o cartão:
// ao abrir outra etapa durante o arrasto, a etapa de origem some (display:none) e o cartão deixaria de
// receber o dedo — o arrastar travava no meio.
function acompanharArrastoNoDocumento(pointerId){
  const mover = (e)=>{
    if(!cardTouchDrag || !cardTouchDrag.arrastando || e.pointerId !== pointerId) return;
    e.preventDefault();
    atualizarArrastoDeCard(e.clientX, e.clientY);
  };
  const soltar = (e)=>{
    if(e.pointerId !== pointerId) return;
    parar();
    if(cardTouchDrag && cardTouchDrag.arrastando){
      if(e.type === 'pointerup'){ e.preventDefault(); finalizarArrastoDeCard(e.clientX, e.clientY); } // preventDefault evita o clique fantasma que abriria o card
      else cancelarArrastoDeCard();
    }
    cardTouchDrag = null;
  };
  const parar = ()=>{
    document.removeEventListener('pointermove', mover);
    document.removeEventListener('pointerup', soltar);
    document.removeEventListener('pointercancel', soltar);
  };
  document.addEventListener('pointermove', mover, { passive:false });
  document.addEventListener('pointerup', soltar);
  document.addEventListener('pointercancel', soltar);
}
