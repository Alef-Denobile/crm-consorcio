/* ================================================================
   Animações de transição (fade, deslizar, abrir/fechar)
   Tudo aqui é "por cima" do que já existe: não muda a lógica das telas.
   - Troca de tela/aba/etapa: o conteúdo novo entra com fade + deslize (a lateral depende do sentido).
   - Janelas (modais) e menus flutuantes: entram com fade; ao fechar, uma cópia some com fade.
   - Menus que abrem dentro da página (notificações, data, coluna, ordenar): entram e saem com fade.
   - Setas, chaves liga/desliga, abas e chips: a mudança de estado anima (o painel é redesenhado a cada
     mudança, então o estado antigo é lembrado e reaplicado por um instante).
   Respeita "Menos animação" (Acessibilidade) e o modo de movimento reduzido do aparelho.
================================================================ */
(function(){
  const reduzido = ()=> document.documentElement.classList.contains('a11y-sem-animacao') ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- 1) troca de tela ---------- */
  let ultimaChave = null;      // chave da tela que está aparecendo
  let ultimaEtapaIdx = -1;     // posição da etapa aberta no celular (para saber o lado)
  let ultimaSubAba = null;

  function indiceDaEtapa(){
    try{
      const cols = board.columns.filter(c=>c.funilId===funilAtualId);
      return cols.findIndex(c=>c.id===pipelineEtapaMobileId);
    }catch(e){ return -1; }
  }
  function chaveDaTela(){
    const p = currentPage;
    const partes = [p];
    if(p==='configuracoes') partes.push(configCategoriaAtiva);
    if(p==='equipe') partes.push(equipeDentro, equipeSubTab, gestaoSecao);
    if(p==='pipeline') partes.push(funilAtualId, pipelineEtapaMobileId, filterMonth);
    if(p==='leads') partes.push(leadsStatusFilter);
    if(p==='relatorios') partes.push(relatorioVisao, relatorioFunilId);
    return partes.join('|');
  }

  /* o que lembrar antes de o painel ser redesenhado */
  const POPUPS_SAIDA = ['.notif-panel', '.date-menu', '.col-menu:not(.card-move-menu)', '.ordenar-menu'];
  const POPUPS_ENTRADA = POPUPS_SAIDA.concat(['.pipeline-insights-conteudo', '.field-dropdown .tipo-pessoa-dropdown']);
  const ESTADOS = [ // [seletor, classe que muda] — a mudança é animada
    ['.switch', 'on'], ['.auditoria-toggle-seta', 'aberta'], ['.tipo-pessoa-select-seta', 'aberta'],
    ['.dash-panel-seta', 'fechada'], ['.tab-btn', 'active'], ['.nav-item', 'active'],
    ['.etapa-chip-mobile', 'active'], ['.config-sidebar-item', 'active'], ['.rel-visao-btn', 'active'],
    ['.a11y-tamanho', 'active'], ['.auth-tab', 'active'],
  ];
  let antes = null;

  window.animarAntesDeRenderizar = function(){
    if(reduzido()){ antes = null; return; }
    antes = { chave: ultimaChave, popups: [], estados: [] };
    POPUPS_SAIDA.forEach(sel=>{
      const el = document.querySelector(sel);
      if(el){ const r = el.getBoundingClientRect(); antes.popups.push({ sel, clone: el.cloneNode(true), r }); }
    });
    ESTADOS.forEach(([sel, cls])=>{
      antes.estados.push([...document.querySelectorAll(sel)].map(el=> el.classList.contains(cls)));
    });
  };

  function fantasmaSaindo(clone, r){
    clone.querySelectorAll('[id]').forEach(e=> e.removeAttribute('id'));
    clone.classList.add('anim-saida');
    clone.setAttribute('aria-hidden', 'true');
    Object.assign(clone.style, { position:'fixed', left:r.left+'px', top:r.top+'px', width:r.width+'px', right:'auto', bottom:'auto', margin:'0', zIndex:'400', pointerEvents:'none' });
    document.body.appendChild(clone);
    setTimeout(()=> clone.remove(), 220);
  }

  window.animarDepoisDeRenderizar = function(){
    const chave = chaveDaTela();
    const mudouDeTela = ultimaChave !== null && chave !== ultimaChave;
    const idx = indiceDaEtapa();
    if(reduzido()){ ultimaChave = chave; ultimaEtapaIdx = idx; ultimaSubAba = equipeSubTab; antes = null; return; }

    /* tela nova: o conteúdo (menos a barra do topo) entra com fade + deslize */
    if(mudouDeTela){
      let lado = 'sobe';
      const partes = chave.split('|'), antigas = (ultimaChave||'').split('|');
      if(partes[0]==='pipeline' && antigas[0]==='pipeline' && partes[3]!==antigas[3] && ultimaEtapaIdx>=0 && idx>=0 && idx!==ultimaEtapaIdx) lado = idx > ultimaEtapaIdx ? 'dir' : 'esq';
      if(partes[0]==='equipe' && antigas[0]==='equipe' && partes[2]!==antigas[2] && equipeSubTab !== ultimaSubAba) lado = equipeSubTab==='supervisao' ? 'dir' : 'esq';
      const filhos = [...document.querySelectorAll('.main-area > *')].filter(el=> !el.classList.contains('main-topbar') && !el.classList.contains('fab-novo-lead'));
      filhos.forEach(el=>{
        el.classList.add('tela-entra', 'tela-entra-'+lado);
        // limpa ao terminar (ou depois de um tempo, se o elemento estiver escondido e a animação nem rodar)
        setTimeout(()=> el.classList.remove('tela-entra','tela-entra-sobe','tela-entra-dir','tela-entra-esq'), 450);
      });
      // cartões, painéis e colunas entram um depois do outro (só os primeiros, para não demorar)
      [...document.querySelectorAll('.main-area .metric-card, .main-area .dash-panel, .main-area .column, .main-area .lead-card-mobile, .main-area .equipe-cartao, .main-area .settings-page-section')]
        .slice(0, 10).forEach((el, i)=>{
          el.style.animationDelay = (60 + i*45) + 'ms';
          el.classList.add('item-entra');
          setTimeout(()=>{ el.classList.remove('item-entra'); el.style.animationDelay = ''; }, 900);
        });
    }

    /* menus da página: os que acabaram de abrir entram com fade; os que fecharam saem com fade */
    const eraAntes = new Set((antes && antes.popups || []).map(p=>p.sel));
    POPUPS_ENTRADA.forEach(sel=>{
      if(eraAntes.has(sel)) return;
      document.querySelectorAll(sel).forEach(el=> el.classList.add('anim-popup-entra'));
    });
    if(antes && !mudouDeTela){
      antes.popups.forEach(p=>{ if(!document.querySelector(p.sel)) fantasmaSaindo(p.clone, p.r); });
    }

    /* setas, chaves e abas: lembra o estado antigo e deixa o navegador animar até o novo */
    if(antes && !mudouDeTela && antes.chave === chave){
      ESTADOS.forEach(([sel, cls], k)=>{
        const velhos = antes.estados[k], els = [...document.querySelectorAll(sel)];
        if(!velhos || velhos.length !== els.length) return;
        const mudaram = [];
        els.forEach((el, i)=>{ const agora = el.classList.contains(cls); if(agora !== velhos[i]){ el.classList.toggle(cls, velhos[i]); mudaram.push([el, agora]); } });
        if(mudaram.length){ void document.body.offsetHeight; mudaram.forEach(([el, agora])=> el.classList.toggle(cls, agora)); }
      });
    }

    ultimaChave = chave; ultimaEtapaIdx = idx; ultimaSubAba = equipeSubTab; antes = null;
  };

  /* ---------- 2) janelas (modais) e menus flutuantes ---------- */
  const ehJanela = (n)=> n.nodeType===1 && !n.classList.contains('anim-saida') && n.matches && n.matches('.overlay, .card-move-menu');
  function aoMudar(registros){
    if(reduzido()) return;
    const novos = [], velhos = [];
    registros.forEach(r=>{ r.addedNodes.forEach(n=>{ if(ehJanela(n)) novos.push(n); }); r.removedNodes.forEach(n=>{ if(ehJanela(n)) velhos.push(n); }); });
    if(novos.length && !velhos.length) novos.forEach(n=> n.classList.add('anim-entra'));        // abriu (se só trocou o conteúdo, não repete)
    if(velhos.length && !novos.length) velhos.forEach(n=>{                                       // fechou: uma cópia some com fade
      n.querySelectorAll('[id]').forEach(e=> e.removeAttribute('id'));
      n.removeAttribute('id');
      n.classList.remove('anim-entra');
      n.classList.add('anim-saida');
      n.setAttribute('aria-hidden', 'true');
      n.style.pointerEvents = 'none';
      document.body.appendChild(n);
      setTimeout(()=> n.remove(), 220);
    });
  }
  function observar(el){ if(el && !el.__animObs){ el.__animObs = new MutationObserver(aoMudar); el.__animObs.observe(el, { childList:true }); } }
  function iniciar(){
    observar(document.getElementById('modal-root'));
    observar(document.getElementById('floating-menu-root'));
    observar(document.getElementById('confirm-root'));
    new MutationObserver((regs)=>{
      observar(document.getElementById('floating-menu-root'));
      aoMudar(regs); // janelas colocadas direto no body (ex.: confirmação)
    }).observe(document.body, { childList:true });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
