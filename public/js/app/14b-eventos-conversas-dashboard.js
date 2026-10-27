/* ---------- eventos: Conversas, Dashboard e tarefas ---------- */
function bindEventosConversasEDashboard(){
  const app = document.getElementById('app');
  /* -- Conversas (3 colunas) -- */
  const conversasBuscaInput = document.getElementById('conversas-busca-input');
  if(conversasBuscaInput) conversasBuscaInput.addEventListener('input', (e)=>{ conversaBusca = e.target.value; renderApp(); });
  app.querySelectorAll('[data-action="abrir-overlay-conversas"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      conversasOverlay = btn.dataset.overlay;
      if(conversasOverlay==='automacoes' && !automacoesLoaded) loadAutomacoes();
      if(conversasOverlay==='agendamentos' && !agendamentosLoaded) loadAgendamentos();
      renderApp();
    });
  });
  app.querySelectorAll('[data-action="fechar-overlay-conversas"]').forEach(el=>{
    el.addEventListener('click', ()=>{ conversasOverlay = null; renderApp(); });
  });
  app.querySelectorAll('[data-action="selecionar-conversa"]').forEach(el=>{
    el.addEventListener('click', ()=> selecionarConversa(el.dataset.cardId));
  });
  const conversasNovaMsgInput = document.getElementById('conversas-nova-msg');
  if(conversasNovaMsgInput){
    conversasNovaMsgInput.addEventListener('input', (e)=> conversaTexto = e.target.value);
    conversasNovaMsgInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') enviarMensagemConversa(); });
  }
  const conversasEnviarBtn = document.getElementById('conversas-enviar-btn');
  if(conversasEnviarBtn) conversasEnviarBtn.addEventListener('click', enviarMensagemConversa);
  const conversasChatLista = document.getElementById('conversas-chat-lista');
  if(conversasChatLista) conversasChatLista.scrollTop = conversasChatLista.scrollHeight;

  const cvDetNome = document.getElementById('cv-det-nome');
  if(cvDetNome) cvDetNome.addEventListener('blur', (e)=> salvarCampoClienteConversa('cliente', e.target.value));
  const cvDetTelefone = document.getElementById('cv-det-telefone');
  if(cvDetTelefone) cvDetTelefone.addEventListener('blur', (e)=> salvarCampoClienteConversa('telefone', e.target.value));
  const cvDetValor = document.getElementById('cv-det-valor');
  if(cvDetValor){
    cvDetValor.addEventListener('input', (e)=>{
      const { texto } = maskInteiro(e.target.value);
      e.target.value = texto;
    });
    cvDetValor.addEventListener('blur', (e)=>{
      const { numero } = maskInteiro(e.target.value);
      salvarCampoClienteConversa('valor', numero);
    });
  }
  const cvDetTemp = document.getElementById('cv-det-temp');
  if(cvDetTemp) cvDetTemp.addEventListener('change', (e)=> salvarCampoClienteConversa('temperatura', e.target.value));

  app.querySelectorAll('[data-action="executar-automacao-manual"]').forEach(btn=>{
    btn.addEventListener('click', ()=> executarAutomacaoManual(btn.dataset.automacaoId));
  });
  app.querySelectorAll('[data-action="editar-automacao-conversa"]').forEach(btn=>{
    btn.addEventListener('click', ()=> openEditAutomacao(btn.dataset.automacaoId));
  });
  const novaAutomacaoConversaBtn = app.querySelector('[data-action="open-new-automacao-conversa"]');
  if(novaAutomacaoConversaBtn) novaAutomacaoConversaBtn.addEventListener('click', ()=>{
    const card = board.cards.find(c=>c.id===conversaSelecionadaCardId);
    openNewAutomacao(card ? card.columnId : null);
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
  const gerarIcsBtn = app.querySelector('[data-action="gerar-link-ics"]');
  if(gerarIcsBtn) gerarIcsBtn.addEventListener('click', gerarLinkIcs);
  const revogarIcsBtn = app.querySelector('[data-action="revogar-link-ics"]');
  if(revogarIcsBtn) revogarIcsBtn.addEventListener('click', revogarLinkIcs);
  const copiarIcsBtn = app.querySelector('[data-action="copiar-link-ics"]');
  if(copiarIcsBtn) copiarIcsBtn.addEventListener('click', ()=>{
    const input = document.getElementById('ics-url');
    if(!input) return;
    input.select();
    navigator.clipboard && navigator.clipboard.writeText(input.value).catch(()=>{
      document.execCommand('copy');
    });
  });

  /* -- Dashboard -- */
  app.querySelectorAll('[data-action="set-dash-period"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ dashboardPeriod = btn.dataset.period; renderApp(); });
  });
  const gerarInsightsBtn = app.querySelector('[data-action="gerar-insights"]');
  if(gerarInsightsBtn) gerarInsightsBtn.addEventListener('click', gerarInsightsIA);
  const toggleInsightsPipelineBtn = app.querySelector('[data-action="toggle-insights-pipeline"]');
  if(toggleInsightsPipelineBtn) toggleInsightsPipelineBtn.addEventListener('click', ()=>{ insightsPipelineExpandido = !insightsPipelineExpandido; renderApp(); });
  const editarMetaBtn = app.querySelector('[data-action="editar-meta-vendas"]');
  if(editarMetaBtn) editarMetaBtn.addEventListener('click', ()=>{ editandoMetaVendas = true; renderApp(); });
  const salvarMetaBtn = document.getElementById('meta-vendas-salvar');
  if(salvarMetaBtn) salvarMetaBtn.addEventListener('click', salvarMetaVendas);
  const editarMetaEquipeBtn = app.querySelector('[data-action="editar-meta-vendas-equipe"]');
  if(editarMetaEquipeBtn) editarMetaEquipeBtn.addEventListener('click', ()=>{ editandoMetaVendasEquipe = true; renderApp(); });
  const salvarMetaEquipeBtn = document.getElementById('meta-vendas-equipe-salvar');
  if(salvarMetaEquipeBtn) salvarMetaEquipeBtn.addEventListener('click', salvarMetaVendasEquipe);
  app.querySelectorAll('[data-action="toggle-painel-dashboard"]').forEach(btn=>{
    btn.addEventListener('click', ()=> alternarPainelDashboard(btn.dataset.painelId, btn));
  });

  /* -- tarefas (usado no Dashboard e na página Tarefas) -- */
  app.querySelectorAll('[data-action="toggle-task"]').forEach(el=>{
    el.addEventListener('click', ()=> toggleTaskConcluida(el.dataset.taskId));
  });
  app.querySelectorAll('[data-action="toggle-evento"]').forEach(el=>{
    el.addEventListener('click', ()=> toggleEventoConcluido(el.dataset.eventoId));
  });
  const openNewTaskBtn = app.querySelector('[data-action="open-new-task"]');
  if(openNewTaskBtn) openNewTaskBtn.addEventListener('click', ()=> openNewTask());
  app.querySelectorAll('[data-action="open-edit-task"]').forEach(btn=>{
    btn.addEventListener('click', ()=> openEditTask(btn.dataset.taskId));
  });
  app.querySelectorAll('[data-action="delete-task"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.taskId;
      showConfirm({
        message: 'Excluir esta tarefa? Essa ação não pode ser desfeita.',
        onConfirm: ()=>{ deleteTaskById(id); closeConfirm(); closeTaskModal(); },
      });
    });
  });
  const toggleConcluidasEl = app.querySelector('[data-action="toggle-show-concluidas"]');
  if(toggleConcluidasEl) toggleConcluidasEl.addEventListener('click', ()=>{ tarefasShowConcluidas = !tarefasShowConcluidas; renderApp(); });

}
