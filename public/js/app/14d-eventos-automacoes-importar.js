/* ---------- eventos: Disparos, automações, fluxos, importar/exportar, agendamentos e relatórios ---------- */
function bindEventosAutomacoesEImportar(){
  const app = document.getElementById('app');
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
  if(openNewAutomacaoBtn) openNewAutomacaoBtn.addEventListener('click', ()=> openNewAutomacao());
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
          confirmLabel: 'Ativar mesmo assim',
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

  /* -- Importar/Exportar -- */
  const escolherPlanilhaBtn = app.querySelector('[data-action="escolher-planilha"]');
  if(escolherPlanilhaBtn) escolherPlanilhaBtn.addEventListener('click', ()=>{ const i = document.getElementById('planilha-input'); if(i) i.click(); });
  const fecharPlanilhaBtn = app.querySelector('[data-action="fechar-planilha"]');
  if(fecharPlanilhaBtn) fecharPlanilhaBtn.addEventListener('click', ()=> fecharPlanilhaImport(false));
  const modeloPlanilhaBtn = app.querySelector('[data-action="baixar-modelo-planilha"]');
  if(modeloPlanilhaBtn) modeloPlanilhaBtn.addEventListener('click', baixarPlanilhaModelo);
  if(importPainelAbrindo) animarAberturaPainelImport();
  const planilhaInput = document.getElementById('planilha-input');
  if(planilhaInput) planilhaInput.addEventListener('change', (e)=>{
    const file = e.target.files && e.target.files[0];
    if(file) handlePlanilhaFileSelected(file);
  });
  const mapNomeEl = document.getElementById('map-nome');
  if(mapNomeEl) mapNomeEl.addEventListener('change', (e)=> importMapNome = e.target.value);
  const mapTelefoneEl = document.getElementById('map-telefone');
  if(mapTelefoneEl) mapTelefoneEl.addEventListener('change', (e)=> importMapTelefone = e.target.value);
  const mapServicoEl = document.getElementById('map-servico');
  if(mapServicoEl) mapServicoEl.addEventListener('change', (e)=> importMapServico = e.target.value);
  const confirmarImportBtn = document.getElementById('confirmar-import-planilha');
  if(confirmarImportBtn) confirmarImportBtn.addEventListener('click', confirmarImportPlanilha);
  const possiveisDestinoSel = document.getElementById('possiveis-destino');
  if(possiveisDestinoSel) possiveisDestinoSel.addEventListener('change', (e)=>{ possiveisDestinoId = e.target.value; });
  const triagemSw = app.querySelector('[data-action="toggle-triagem-contatos"]');
  if(triagemSw){
    triagemSw.addEventListener('click', (e)=>{ e.preventDefault(); alternarTriagemContatos(); });
    triagemSw.addEventListener('keydown', (e)=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); alternarTriagemContatos(); } });
  }
  const passarTodosBtn = app.querySelector('[data-action="possiveis-passar-todos"]');
  if(passarTodosBtn) passarTodosBtn.addEventListener('click', ()=>{
    const qtd = possiveisLeads.length;
    const destino = possiveisDestinoId ? ((equipe.membros||[]).find(m=>m.id===possiveisDestinoId)||{}).nome || 'a pessoa escolhida' : 'os seus Leads';
    showConfirm({
      message: `Passar ${qtd} possível${qtd===1?'':'is'} lead${qtd===1?'':'s'} para ${destino}?`,
      confirmLabel: 'Passar todos',
      onConfirm: ()=>{ closeConfirm(); passarPossiveisParaLeads(true); },
    });
  });
  const passarSelBtn = app.querySelector('[data-action="possiveis-passar-selecionados"]');
  if(passarSelBtn) passarSelBtn.addEventListener('click', ()=> passarPossiveisParaLeads(false));
  const possiveisSelectAll = app.querySelector('[data-action="possiveis-select-all"]');
  if(possiveisSelectAll) possiveisSelectAll.addEventListener('change', ()=>{
    const todos = possiveisLeads.length && possiveisLeads.every(l=>possiveisSelecionados.has(l.id));
    possiveisSelecionados = new Set(todos ? [] : possiveisLeads.map(l=>l.id));
    renderApp();
  });
  app.querySelectorAll('[data-action="possiveis-select-um"]').forEach(el=>{
    el.addEventListener('change', ()=>{ if(el.checked) possiveisSelecionados.add(el.dataset.leadId); else possiveisSelecionados.delete(el.dataset.leadId); renderApp(); });
  });
  app.querySelectorAll('[data-action="completar-possivel-lead"]').forEach(btn=>{
    btn.addEventListener('click', ()=> abrirCompletarLead(btn.dataset.leadId));
  });
  app.querySelectorAll('[data-action="descartar-possivel-lead"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.leadId;
      showConfirm({
        message: 'Descartar esse possível lead? Ele não vira cliente.',
        confirmLabel: 'Descartar',
        onConfirm: ()=>{ descartarPossivelLead(id); closeConfirm(); },
      });
    });
  });

  /* -- Agendamentos -- */
  const openNewAgendamentoBtn = app.querySelector('[data-action="open-new-agendamento"]');
  if(openNewAgendamentoBtn) openNewAgendamentoBtn.addEventListener('click', openNewAgendamento);
  app.querySelectorAll('[data-action="cancelar-agendamento"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.agendamentoId;
      showConfirm({
        message: 'Cancelar essa mensagem agendada?',
        confirmLabel: 'Cancelar mensagem',
        onConfirm: ()=>{ cancelarAgendamento(id); closeConfirm(); },
      });
    });
  });
  app.querySelectorAll('[data-action="excluir-agendamento"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.agendamentoId;
      showConfirm({
        message: 'Excluir esse agendamento permanentemente? Não dá pra desfazer.',
        onConfirm: ()=>{ excluirAgendamento(id); closeConfirm(); },
      });
    });
  });

  /* -- Relatórios -- */
  const relatorioFunilSelect = document.getElementById('relatorio-funil-select');
  app.querySelectorAll('[data-action="rel-visao"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      relatorioVisao = btn.dataset.visao === 'lista' ? 'lista' : 'grafico';
      try{ localStorage.setItem('relatorio-visao', relatorioVisao); }catch(e){}
      renderApp();
    });
  });
  if(relatorioFunilSelect) relatorioFunilSelect.addEventListener('change', (e)=>{ relatorioFunilId = e.target.value; renderApp(); });
  const exportarXlsxBtn = app.querySelector('[data-action="exportar-xlsx"]');
  if(exportarXlsxBtn) exportarXlsxBtn.addEventListener('click', exportarXlsx);
  const exportarCsvBtn = app.querySelector('[data-action="exportar-csv"]');
  if(exportarCsvBtn) exportarCsvBtn.addEventListener('click', exportarCsv);
  const exportarPdfBtn = app.querySelector('[data-action="exportar-relatorio-pdf"]');
  if(exportarPdfBtn) exportarPdfBtn.addEventListener('click', exportarRelatorioPdf);

}
