/* ---------- eventos: Leads e Pipeline (funis, colunas, cartões) ---------- */
function bindEventosLeadsEPipeline(){
  const app = document.getElementById('app');
  /* -- Leads -- */
  const openNewLeadBtn = app.querySelector('[data-action="open-new-lead"]');
  if(openNewLeadBtn) openNewLeadBtn.addEventListener('click', ()=> openNewCard());
  const exportarLeadsXlsxBtn = app.querySelector('[data-action="exportar-leads-xlsx"]');
  if(exportarLeadsXlsxBtn) exportarLeadsXlsxBtn.addEventListener('click', exportarLeadsXlsx);
  const exportarLeadsBtn = app.querySelector('[data-action="exportar-leads"]');
  if(exportarLeadsBtn) exportarLeadsBtn.addEventListener('click', exportarLeads);
  const toggleArquivadosBtn = app.querySelector('[data-action="toggle-mostrar-arquivados"]');
  if(toggleArquivadosBtn) toggleArquivadosBtn.addEventListener('click', ()=>{ mostrarArquivados = !mostrarArquivados; renderApp(); });

  /* -- Leads: seleção e ações em massa -- */
  const selectAllEl = app.querySelector('[data-action="leads-select-all"]');
  if(selectAllEl){
    selectAllEl.addEventListener('click', ()=>{
      const idsVisiveis = filteredLeads().map(c=>c.id);
      toggleSelecionarTodosLeads(idsVisiveis);
    });
  }
  app.querySelectorAll('[data-action="leads-select-um"]').forEach(el=>{
    el.addEventListener('click', ()=> toggleSelecaoLead(el.dataset.cardId));
  });
  const bulkColunaSelect = document.getElementById('leads-bulk-coluna');
  if(bulkColunaSelect) bulkColunaSelect.addEventListener('change', (e)=> bulkMoverLeads(e.target.value));
  const bulkGestorSel = document.getElementById('leads-bulk-gestor-destino');
  if(bulkGestorSel) bulkGestorSel.addEventListener('change', (e)=>{
    const destinoId = e.target.value;
    if(!destinoId) return;
    const nome = ((equipe.membros||[]).find(m=>m.id===destinoId)||{}).nome || 'a pessoa escolhida';
    const qtd = leadsSelecionados.size;
    showConfirm({
      message: `Passar ${qtd} lead${qtd===1?'':'s'} para ${nome}? Eles levam conversas, anexos, tarefas e histórico.`,
      confirmLabel: 'Passar leads',
      onConfirm: ()=>{ closeConfirm(); bulkTransferirLeads(destinoId); },
    });
    e.target.value = '';
  });
  const bulkArquivarBtn = app.querySelector('[data-action="leads-bulk-arquivar"]');
  if(bulkArquivarBtn) bulkArquivarBtn.addEventListener('click', bulkArquivarLeads);
  const bulkExcluirBtn = app.querySelector('[data-action="leads-bulk-excluir"]');
  if(bulkExcluirBtn) bulkExcluirBtn.addEventListener('click', ()=>{
    const qtd = leadsSelecionados.size;
    showConfirm({
      message: `Excluir ${qtd} cliente${qtd===1?'':'s'} selecionado${qtd===1?'':'s'}? Essa ação não pode ser desfeita.`,
      onConfirm: ()=>{ bulkExcluirLeads(); closeConfirm(); },
    });
  });
  const bulkLimparBtn = app.querySelector('[data-action="leads-bulk-limpar"]');
  if(bulkLimparBtn) bulkLimparBtn.addEventListener('click', ()=>{ leadsSelecionados.clear(); renderApp(); });
  const bulkEtiquetaBtn = app.querySelector('[data-action="leads-bulk-etiqueta"]');
  if(bulkEtiquetaBtn) bulkEtiquetaBtn.addEventListener('click', ()=>{ leadsBulkEtiquetaAberta = true; renderApp(); });
  const bulkEtiquetaInput = document.getElementById('leads-bulk-etiqueta-input');
  if(bulkEtiquetaInput){
    bulkEtiquetaInput.addEventListener('input', (e)=> leadsBulkEtiquetaValor = e.target.value);
    bulkEtiquetaInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') confirmarBulkEtiqueta(); });
  }
  const bulkEtiquetaConfirmarBtn = app.querySelector('[data-action="leads-bulk-etiqueta-confirmar"]');
  if(bulkEtiquetaConfirmarBtn) bulkEtiquetaConfirmarBtn.addEventListener('click', confirmarBulkEtiqueta);

  const leadsSearchInput = document.getElementById('leads-search-input');
  if(leadsSearchInput) leadsSearchInput.addEventListener('input', (e)=>{
    const cursorPos = e.target.selectionStart;
    leadsSearch = e.target.value;
    renderApp();
    const novoInput = document.getElementById('leads-search-input');
    if(novoInput){ novoInput.focus(); novoInput.setSelectionRange(cursorPos, cursorPos); }
  });
  app.querySelectorAll('[data-action="leads-chip-status"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ leadsStatusFilter = btn.dataset.colId; renderApp(); });
  });
  app.querySelectorAll('.lead-card-mobile').forEach(el=>{
    el.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); openEditCard(el.dataset.cardId); } });
  });
  app.querySelectorAll('[data-action="set-etapa-mobile"]').forEach(btn=>{
    btn.addEventListener('click', ()=> trocarEtapaMobile(btn.dataset.colId, false));
  });
  const leadsFilterSelect = document.getElementById('leads-status-filter');
  if(leadsFilterSelect) leadsFilterSelect.addEventListener('change', (e)=>{ leadsStatusFilter = e.target.value; renderApp(); });

  /* -- botão de funil de ordenação, compartilhado entre Leads, Pipeline e Comissões -- */
  app.querySelectorAll('[data-action="toggle-ordenar-menu"]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      ordenarMenuAberto = ordenarMenuAberto === btn.dataset.menuId ? null : btn.dataset.menuId;
      renderApp();
    });
  });
  app.querySelectorAll('[data-action="escolher-ordenar"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const menuId = btn.dataset.menuId;
      const valor = btn.dataset.valor;
      ordenarMenuAberto = null;
      if(menuId === 'leads'){ leadsOrdenarPor = valor; renderApp(); }
      else if(menuId === 'comissoes'){ comissoesOrdenarPor = valor; renderApp(); }
      else if(menuId === 'pipeline'){ aplicarOrdenacaoPipeline(valor); }
    });
  });

  /* -- Pipeline: funis -- */
  app.querySelectorAll('[data-action="set-funil"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      funilAtualId = btn.dataset.funilId;
      aiInsights = []; // insights são específicos do funil — limpa pra não mostrar dado desatualizado de outro
      renderApp();
    });
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
  const duplicarFunilBtn = app.querySelector('[data-action="duplicar-funil"]');
  if(duplicarFunilBtn) duplicarFunilBtn.addEventListener('click', ()=> duplicarFunil(duplicarFunilBtn.dataset.funilId));
  ativarArrasteHorizontal();
  ajustarAlturaColunasPipeline();
  ativarRedimensionarStats();
  ajustarLargurasStatsPadrao();

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
  const esfriandoBtn = app.querySelector('[data-action="toggle-esfriando"]');
  if(esfriandoBtn) esfriandoBtn.addEventListener('click', ()=>{ filtroEsfriando = !filtroEsfriando; renderApp(); });

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
  app.querySelectorAll('[data-action="toggle-move-menu"]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      openMoveMenuCardId = (openMoveMenuCardId===btn.dataset.cardId) ? null : btn.dataset.cardId;
      renderFloatingMoveMenu(); // só o menu flutuante — não precisa redesenhar a página toda (isso resetava a rolagem)
    });
  });
  app.querySelectorAll('[data-action="set-col-tipo"]').forEach(btn=>{
    btn.addEventListener('click', ()=> changeTipo(btn.dataset.colId, btn.dataset.tipo));
  });
  document.querySelectorAll('.col-menu-prob-input').forEach(input=>{
    input.addEventListener('blur', (e)=> salvarProbabilidadeColuna(input.dataset.colId, e.target.value));
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') e.target.blur(); });
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
  app.querySelectorAll('[data-action="open-add-lead-choice"]').forEach(btn=>{
    btn.addEventListener('click', ()=> abrirEscolhaAdicionarLead(btn.dataset.colId));
  });
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
    cardEl.addEventListener('dragend', ()=>{ cardEl.classList.remove('dragging'); clearInterval(autoScrollDoArrastoInterval); limparIndicadorDeInsercao(); document.querySelectorAll('.column.coluna-drag-alvo').forEach(c=> c.classList.remove('coluna-drag-alvo')); });

    // Arrastar por toque no card inteiro — usa Pointer Events com setPointerCapture.
    // O CSS do .card já trava touch-action:none desde o início (precisa ser assim,
    // travar depois que o toque já começou não tem efeito — é por isso que antes
    // tocar e segurar acabava selecionando texto: o navegador assumia esse gesto
    // por conta própria). Só que travar touch-action:none tira a rolagem nativa da
    // lista também — por isso, aqui embaixo, quando o gesto claramente é rolar (dedo
    // se move rápido, sem pausa) em vez de arrastar (segura parado um instante), a
    // gente rola a lista na mão, imitando o que o navegador faria sozinho.
    cardEl.addEventListener('pointerdown', (e)=>{
      if(e.pointerType === 'mouse') return;
      if(e.target.closest('.card-move-wrap') || e.target.closest('[data-action="toggle-move-menu"]') || e.target.closest('.wa-btn')) return; // não conflita com os botões
      const cardsContainer = cardEl.closest('.cards');
      cardTouchDrag = {
        cardId: cardEl.dataset.cardId, cardEl, arrastando:false, modoRolagem:false,
        startX:e.clientX, startY:e.clientY, ultimoX:e.clientX, ultimoY:e.clientY,
        pointerId:e.pointerId, cardsContainer, scrollInicial: cardsContainer ? cardsContainer.scrollTop : 0, scrollInicialPagina: window.scrollY,
      };
      cardTouchLongPressTimer = setTimeout(()=>{
        if(!cardTouchDrag || cardTouchDrag.modoRolagem) return; // já virou rolagem, não inicia arrastar
        try{ cardEl.setPointerCapture(cardTouchDrag.pointerId); }catch(err){ /* aparelho sem suporte — segue sem capturar */ }
        iniciarArrastoDeCard(cardTouchDrag.ultimoX, cardTouchDrag.ultimoY);
      }, 280);
    });

    cardEl.addEventListener('pointermove', (e)=>{
      if(!cardTouchDrag || cardTouchDrag.cardEl !== cardEl || cardTouchDrag.pointerId !== e.pointerId) return;
      const dxTotal = e.clientX - cardTouchDrag.startX;
      const dyTotal = e.clientY - cardTouchDrag.startY;
      cardTouchDrag.ultimoX = e.clientX;
      cardTouchDrag.ultimoY = e.clientY;

      if(!cardTouchDrag.arrastando && !cardTouchDrag.modoRolagem){
        if(Math.sqrt(dxTotal*dxTotal + dyTotal*dyTotal) > 10){
          // se moveu antes do temporizador confirmar o arrastar, é rolagem, não segurar-parado
          clearTimeout(cardTouchLongPressTimer);
          cardTouchDrag.modoRolagem = true;
        } else {
          return; // ainda não decidiu — pode virar arrastar (temporizador) ou rolagem (mais movimento)
        }
      }

      if(cardTouchDrag.modoRolagem){
        e.preventDefault();
        const lista = cardTouchDrag.cardsContainer;
        if(lista && lista.scrollHeight > lista.clientHeight + 2 && !ehCelular()) lista.scrollTop = cardTouchDrag.scrollInicial - dyTotal;
        else window.scrollTo(0, cardTouchDrag.scrollInicialPagina - dyTotal); // celular: a página inteira rola, não a coluna
        return;
      }

      if(!cardTouchDrag.arrastando) return; // ainda esperando o temporizador decidir
      e.preventDefault();
      atualizarArrastoDeCard(e.clientX, e.clientY);
    }, { passive:false });

    cardEl.addEventListener('pointerup', (e)=>{
      clearTimeout(cardTouchLongPressTimer);
      if(!cardTouchDrag || cardTouchDrag.cardEl !== cardEl || cardTouchDrag.pointerId !== e.pointerId) return;
      if(cardTouchDrag.arrastando){
        e.preventDefault(); // evita o clique fantasma que abriria o card logo depois de soltar
        finalizarArrastoDeCard(e.clientX, e.clientY);
      }
      cardTouchDrag = null;
    });
    cardEl.addEventListener('pointercancel', ()=>{
      clearTimeout(cardTouchLongPressTimer);
      if(cardTouchDrag && cardTouchDrag.cardEl === cardEl && cardTouchDrag.arrastando) cancelarArrastoDeCard();
      cardTouchDrag = null;
    });
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
    colEl.addEventListener('dragenter', (e)=> e.preventDefault());
    colEl.addEventListener('dragover', (e)=>{
      e.preventDefault();
      atualizarAutoScrollDoArrasto(e.clientX, e.clientY, colEl);
      const cardArrastandoEl = document.querySelector('.card.dragging');
      if(cardArrastandoEl){
        mostrarIndicadorDeInsercao(colEl, e.clientY, cardArrastandoEl.dataset.cardId);
        // mesmo destaque cinza que já existia no arrastar por toque — dá a mesma
        // confirmação visual clara de "aqui vai soltar" também no mouse
        document.querySelectorAll('.column.coluna-drag-alvo').forEach(c=>{ if(c!==colEl) c.classList.remove('coluna-drag-alvo'); });
        colEl.classList.add('coluna-drag-alvo');
      }
    });
    colEl.addEventListener('dragleave', (e)=>{
      clearInterval(autoScrollDoArrastoInterval);
      // só tira o destaque se o mouse realmente saiu da coluna (não só passou por cima
      // de um card filho dentro dela, o que também dispara dragleave por engano)
      if(!colEl.contains(e.relatedTarget)) colEl.classList.remove('coluna-drag-alvo');
    });
    colEl.addEventListener('drop', (e)=>{
      e.preventDefault();
      clearInterval(autoScrollDoArrastoInterval);
      limparIndicadorDeInsercao();
      colEl.classList.remove('coluna-drag-alvo');
      const colId = e.dataTransfer.getData('text/x-crm-column');
      const cardId = e.dataTransfer.getData('text/x-crm-card');
      if(colId) reorderColumns(colId, colEl.dataset.colId);
      else if(cardId){
        const ordem = calcularOrdemDeInsercao(colEl, e.clientY, cardId);
        moveCard(cardId, colEl.dataset.colId, ordem);
      }
    });
  });

  document.addEventListener('click', closeMenusOnOutsideClick);
  document.addEventListener('dragover', permitirDropForaDasColunas);
  document.addEventListener('dragenter', permitirDropForaDasColunas);
  renderFloatingMoveMenu();
}
