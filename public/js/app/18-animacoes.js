/* ================================================================
   Animações de transição (fade, deslizar, abrir/fechar)
   Tudo aqui é "por cima" do que já existe: não muda a lógica das telas.
   O painel é redesenhado inteiro a cada mudança, então aqui a gente compara a tela ANTIGA com a NOVA
   e anima só o que mudou de verdade:
   - bloco que apareceu  -> abre (altura + fade) ou, se for menu flutuante, entra com fade;
   - bloco que sumiu     -> a cópia antiga encolhe/some com fade;
   - tela, aba ou etapa diferente -> o conteúdo novo entra deslizando (o lado depende do sentido);
   - janela (modal) nova, ou troca de uma janela por outra -> entra com fade/deslize; ao fechar, some com fade;
   - setas, chaves liga/desliga e abas: a mudança de estado anima.
   Texto que só mudou de valor (números, nomes) NÃO anima. Respeita "Menos animação" (Acessibilidade)
   e o modo de movimento reduzido do aparelho.
================================================================ */
(function(){
  const reduzido = ()=> document.documentElement.classList.contains('a11y-sem-animacao') ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* quem está digitando não deve ver a tela piscar a cada letra */
  let ultimaDigitacao = 0;
  document.addEventListener('input', ()=>{ ultimaDigitacao = Date.now(); }, true);
  document.addEventListener('keydown', (e)=>{ if(e.key && e.key.length === 1) ultimaDigitacao = Date.now(); }, true);

  /* ---------- comparação estrutural (só as tags, sem texto nem atributos) ---------- */
  const IGNORAR = '.cards, .card, .assistente-painel, #assistente-root, .stats, .busca-global-modal, .chat-interno-mensagens, #chat-interno-mensagens';
  function montarAssinaturas(raiz, mapa){
    const f = (n)=>{
      let s = '<' + n.tagName;
      for(const c of n.children) s += f(c);
      s += '>';
      mapa.set(n, s);
      return s;
    };
    f(raiz);
  }
  function orcamento(){ return { n: 0, max: 24 }; }

  /* bloco que apareceu */
  function aparecer(el, orc){
    if(orc.n++ >= orc.max || el.nodeType !== 1) return;
    const cs = getComputedStyle(el);
    if(cs.display === 'none') return;
    if(cs.position === 'absolute' || cs.position === 'fixed'){ el.classList.add('anim-popup-entra'); setTimeout(()=> el.classList.remove('anim-popup-entra'), 400); return; }
    const pai = el.parentElement ? getComputedStyle(el.parentElement) : null;
    const emLinha = pai && ((pai.display.includes('flex') && pai.flexDirection.startsWith('row')) || pai.display.includes('grid') || pai.display.includes('inline'));
    const h = el.offsetHeight;
    if(emLinha || !h || !el.animate){ el.animate && el.animate([{ opacity:0, transform:'translateY(6px)' }, { opacity:1, transform:'none' }], { duration:220, easing:'ease-out' }); return; }
    const fim = { height:h+'px', opacity:1, paddingTop:cs.paddingTop, paddingBottom:cs.paddingBottom, marginTop:cs.marginTop, marginBottom:cs.marginBottom };
    const ini = { height:'0px', opacity:0, paddingTop:'0px', paddingBottom:'0px', marginTop:'0px', marginBottom:'0px' };
    const antigoOverflow = el.style.overflow;
    el.style.overflow = 'hidden';
    const a = el.animate([ini, fim], { duration:280, easing:'cubic-bezier(.2,.8,.3,1)' });
    const limpar = ()=>{ el.style.overflow = antigoOverflow; };
    a.onfinish = limpar; a.oncancel = limpar;
  }

  /* bloco que sumiu: a cópia antiga volta para o lugar e encolhe/some */
  function sumir(velho, pai, ancora, orc){
    if(orc.n++ >= orc.max || velho.nodeType !== 1 || !velho.animate) return;
    velho.querySelectorAll('[id]').forEach(e=> e.removeAttribute('id'));
    velho.querySelectorAll('[data-action]').forEach(e=> e.removeAttribute('data-action'));
    velho.removeAttribute('id'); velho.removeAttribute('data-action');
    velho.setAttribute('aria-hidden', 'true');
    velho.style.pointerEvents = 'none';
    pai.insertBefore(velho, ancora || null);
    const cs = getComputedStyle(velho);
    if(cs.display === 'none'){ velho.remove(); return; }
    const remover = ()=> velho.remove();
    if(cs.position === 'absolute' || cs.position === 'fixed'){
      const a = velho.animate([{ opacity:1 }, { opacity:0 }], { duration:150, easing:'ease-in' }); a.onfinish = remover; a.oncancel = remover; return;
    }
    const pcs = getComputedStyle(pai);
    const h = velho.offsetHeight;
    if(!h || (pcs.display.includes('flex') && pcs.flexDirection.startsWith('row')) || pcs.display.includes('grid')){
      const a = velho.animate([{ opacity:1 }, { opacity:0 }], { duration:160, easing:'ease-in' }); a.onfinish = remover; a.oncancel = remover; return;
    }
    velho.style.overflow = 'hidden';
    const a = velho.animate([
      { height:h+'px', opacity:1, paddingTop:cs.paddingTop, paddingBottom:cs.paddingBottom, marginTop:cs.marginTop, marginBottom:cs.marginBottom },
      { height:'0px', opacity:0, paddingTop:'0px', paddingBottom:'0px', marginTop:'0px', marginBottom:'0px' },
    ], { duration:240, easing:'ease' });
    a.onfinish = remover; a.oncancel = remover;
  }

  /* bloco trocado por outro (não dá para saber qual virou qual): o novo entra com um fade leve */
  function trocado(el, orc){
    if(orc.n++ >= orc.max || el.nodeType !== 1 || !el.animate) return;
    if(getComputedStyle(el).display === 'none') return;
    el.animate([{ opacity:0.2, transform:'translateY(5px)' }, { opacity:1, transform:'none' }], { duration:240, easing:'ease-out' });
  }

  /* compara as duas árvores e anima o que mudou */
  function comparar(velho, novo, sv, sn, orc, nivel){
    if(orc.n >= orc.max || nivel > 14) return;
    const cv = [...velho.children], cn = [...novo.children];
    let p = 0;
    while(p < cv.length && p < cn.length && sv.get(cv[p]) === sn.get(cn[p])) p++;
    let s = 0;
    while(s < cv.length - p && s < cn.length - p && sv.get(cv[cv.length-1-s]) === sn.get(cn[cn.length-1-s])) s++;
    const mv = cv.slice(p, cv.length - s), mn = cn.slice(p, cn.length - s);
    if(!mv.length && !mn.length) return;
    // dentro dos blocos que já têm animação própria (cartões do funil, chat, resultados) não mexe
    const filhos = (el)=> el.matches && el.matches(IGNORAR);
    if(filhos(novo)) return;
    if(!mv.length){ mn.forEach(x=> aparecer(x, orc)); return; }
    if(!mn.length){ const ancora = cn[p] || null; mv.forEach(x=> sumir(x, novo, ancora, orc)); return; }
    if(mv.length === mn.length){
      mn.forEach((x, i)=>{
        if(mv[i].tagName === x.tagName && nivel < 14) comparar(mv[i], x, sv, sn, orc, nivel+1);
        else trocado(x, orc);
      });
      return;
    }
    mn.forEach(x=> trocado(x, orc));
  }
  function animarDiferencas(raizVelha, raizNova){
    if(!raizVelha || !raizNova || raizVelha === raizNova) return;
    const sv = new Map(), sn = new Map();
    montarAssinaturas(raizVelha, sv); montarAssinaturas(raizNova, sn);
    if(sv.get(raizVelha) === sn.get(raizNova)) return;
    comparar(raizVelha, raizNova, sv, sn, orcamento(), 0);
  }

  /* ---------- setas, chaves e abas: o estado muda com transição ---------- */
  const ESTADOS = [ // [seletor, classe que muda]
    ['.switch', 'on'], ['.auditoria-toggle-seta', 'aberta'], ['.tipo-pessoa-select-seta', 'aberta'],
    ['.dash-panel-seta', 'fechada'], ['.tab-btn', 'active'], ['.nav-item', 'active'],
    ['.etapa-chip-mobile', 'active'], ['.config-sidebar-item', 'active'], ['.rel-visao-btn', 'active'],
    ['.a11y-tamanho', 'active'], ['.opcao-membro', 'ativa'],
  ];
  function lerEstados(raiz){ return ESTADOS.map(([sel, cls])=> [...raiz.querySelectorAll(sel)].map(el=> el.classList.contains(cls))); }
  function animarEstados(velhos, raizNova){
    ESTADOS.forEach(([sel, cls], k)=>{
      const v = velhos[k], els = [...raizNova.querySelectorAll(sel)];
      if(!v || v.length !== els.length) return;
      const mudaram = [];
      els.forEach((el, i)=>{ const agora = el.classList.contains(cls); if(agora !== v[i]){ el.classList.toggle(cls, v[i]); mudaram.push([el, agora]); } });
      if(mudaram.length){ void document.body.offsetHeight; mudaram.forEach(([el, agora])=> el.classList.toggle(cls, agora)); }
    });
  }

  /* ---------- 1) troca de tela / aba / etapa ---------- */
  let ultimaChave = null, ultimaEtapaIdx = -1, ultimoNivel = 0, ultimaSubAba = null;

  function indiceDaEtapa(){
    try{ return board.columns.filter(c=>c.funilId===funilAtualId).findIndex(c=>c.id===pipelineEtapaMobileId); }catch(e){ return -1; }
  }
  // quanto mais "para dentro" (lista -> detalhe), maior o nível; entrar = vem da direita, voltar = vem da esquerda
  function nivelDaTela(){
    if(currentPage==='configuracoes') return configMobileConteudo ? 1 : 0;
    if(currentPage==='equipe') return (equipeDentro ? 1 : 0) + (gestaoMobileConteudo ? 1 : 0);
    if(currentPage==='conversas') return conversaSelecionadaCardId ? 1 : 0;
    return 0;
  }
  function chaveDaTela(){
    const p = currentPage, partes = [p];
    if(p==='configuracoes') partes.push(configCategoriaAtiva, configMobileConteudo);
    if(p==='equipe') partes.push(equipeDentro, equipeSubTab, gestaoSecao, gestaoMobileConteudo);
    if(p==='conversas') partes.push(conversaSelecionadaCardId);
    if(p==='pipeline') partes.push(funilAtualId, pipelineEtapaMobileId, filterMonth);
    if(p==='leads') partes.push(leadsStatusFilter);
    if(p==='relatorios') partes.push(relatorioVisao, relatorioFunilId);
    return partes.join('|');
  }

  let antes = null;
  window.animarAntesDeRenderizar = function(){
    if(reduzido()){ antes = null; return; }
    const raiz = document.querySelector('.main-area');
    antes = { chave: ultimaChave, raiz, estados: raiz ? lerEstados(document.getElementById('app')) : null, digitando: Date.now() - ultimaDigitacao < 700 };
  };

  window.animarDepoisDeRenderizar = function(){
    const chave = chaveDaTela(), idx = indiceDaEtapa(), nivel = nivelDaTela();
    const mudouDeTela = ultimaChave !== null && chave !== ultimaChave;
    const a = antes; antes = null;
    const guardar = ()=>{ ultimaChave = chave; ultimaEtapaIdx = idx; ultimoNivel = nivel; ultimaSubAba = equipeSubTab; };
    if(reduzido()){ guardar(); return; }

    if(mudouDeTela){
      let lado = 'sobe';
      const partes = chave.split('|'), antigas = (ultimaChave||'').split('|');
      if(nivel !== ultimoNivel) lado = nivel > ultimoNivel ? 'dir' : 'esq';
      else if(partes[0]==='pipeline' && antigas[0]==='pipeline' && ultimaEtapaIdx>=0 && idx>=0 && idx!==ultimaEtapaIdx) lado = idx > ultimaEtapaIdx ? 'dir' : 'esq';
      else if(partes[0]==='equipe' && antigas[0]==='equipe' && equipeSubTab !== ultimaSubAba) lado = equipeSubTab==='supervisao' ? 'dir' : 'esq';
      const filhos = [...document.querySelectorAll('.main-area > *')].filter(el=> !el.classList.contains('main-topbar') && !el.classList.contains('fab-novo-lead'));
      filhos.forEach(el=>{
        el.classList.add('tela-entra', 'tela-entra-'+lado);
        setTimeout(()=> el.classList.remove('tela-entra','tela-entra-sobe','tela-entra-dir','tela-entra-esq'), 450);
      });
      // cartões, painéis e colunas entram um depois do outro (só os primeiros, para não demorar)
      [...document.querySelectorAll('.main-area .metric-card, .main-area .dash-panel, .main-area .column, .main-area .lead-card-mobile, .main-area .equipe-cartao, .main-area .settings-page-section')]
        .slice(0, 10).forEach((el, i)=>{
          el.style.animationDelay = (60 + i*45) + 'ms';
          el.classList.add('item-entra');
          setTimeout(()=>{ el.classList.remove('item-entra'); el.style.animationDelay = ''; }, 900);
        });
    } else if(a && a.raiz && !a.digitando){
      // mesma tela: anima só o que mudou (bloco que abriu, bloco que fechou, menu que apareceu...)
      const nova = document.querySelector('.main-area');
      animarDiferencas(a.raiz, nova);
    }
    // setas, chaves e abas (só na mesma tela)
    if(a && a.estados && !mudouDeTela) animarEstados(a.estados, document.getElementById('app'));
    guardar();
  };

  /* ---------- 2) janelas (modais) e menus flutuantes ---------- */
  const ehJanela = (n)=> n.nodeType===1 && !n.classList.contains('anim-saida') && n.matches && n.matches('.overlay, .card-move-menu');
  const assinaturaDaJanela = (n)=>{
    const t = n.querySelector('.modal-head h3, .modal-head h2, h3, h2');
    return (n.id || n.className.replace(/anim-\S+/g,'')) + '|' + (t ? t.textContent.trim() : '') + '|' + (n.querySelector('.modal') ? n.querySelector('.modal').className : '');
  };
  function fantasmaDaJanela(velho, transparente){
    velho.querySelectorAll('[id]').forEach(e=> e.removeAttribute('id'));
    velho.querySelectorAll('[data-action]').forEach(e=> e.removeAttribute('data-action'));
    velho.removeAttribute('id');
    velho.classList.remove('anim-entra', 'anim-troca-entra');
    velho.classList.add('anim-saida');
    if(transparente) velho.classList.add('anim-troca-saida');
    velho.setAttribute('aria-hidden', 'true');
    velho.style.pointerEvents = 'none';
    document.body.appendChild(velho);
    setTimeout(()=> velho.remove(), 260);
  }
  function aoMudar(registros){
    if(reduzido()) return;
    const novos = [], velhos = [];
    registros.forEach(r=>{ r.addedNodes.forEach(n=>{ if(ehJanela(n)) novos.push(n); }); r.removedNodes.forEach(n=>{ if(ehJanela(n)) velhos.push(n); }); });
    if(novos.length && !velhos.length){ novos.forEach(n=> n.classList.add('anim-entra')); return; }            // abriu
    if(velhos.length && !novos.length){ velhos.forEach(n=> fantasmaDaJanela(n, false)); return; }                // fechou
    if(novos.length && velhos.length){
      const nv = novos[novos.length-1], vv = velhos[velhos.length-1];
      if(!nv.classList.contains('overlay') || !vv.classList.contains('overlay')) return;
      if(assinaturaDaJanela(nv) !== assinaturaDaJanela(vv)){
        // outra janela no lugar da anterior (ex.: Padrão/Gestor -> Física/Jurídica -> Novo lead): a antiga sai para a esquerda, a nova entra pela direita
        nv.classList.add('anim-troca-entra');
        fantasmaDaJanela(vv, true);
      } else if(nv.id !== 'busca-global-overlay'){
        // mesma janela redesenhada (ex.: trocar Física/Jurídica, abrir uma lista): anima só o que mudou
        const mv = vv.querySelector('.modal'), mn = nv.querySelector('.modal');
        if(mv && mn){
          const estados = lerEstados(vv);
          animarDiferencas(mv, mn);
          animarEstados(estados, nv);
        }
      }
    }
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
