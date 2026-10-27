/* ---------- eventos: Agenda (calendário) ---------- */
function bindEventosAgenda(){
  const app = document.getElementById('app');
  /* -- Agenda (calendário) -- */
  app.querySelectorAll('[data-action="agenda-mes"]').forEach(btn=>{
    btn.addEventListener('click', ()=> mudarMesAgenda(parseInt(btn.dataset.delta,10)));
  });
  app.querySelectorAll('[data-action="set-agenda-subtab"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      agendaSubTab = btn.dataset.subtab;
      if(agendaSubTab==='gerot' && !gerotLoaded) loadGerot(gerotSemanaAtual);
      renderApp();
    });
  });
  app.querySelectorAll('[data-action="gerot-semana"]').forEach(btn=>{
    btn.addEventListener('click', ()=> mudarSemanaGerot(parseInt(btn.dataset.delta,10)));
  });
  const gerotHojeBtn = app.querySelector('[data-action="gerot-hoje"]');
  if(gerotHojeBtn) gerotHojeBtn.addEventListener('click', ()=>{
    gerotSemanaAtual = inicioDaSemana(new Date());
    loadGerot(gerotSemanaAtual);
  });
  const gerotCopiarBtn = app.querySelector('[data-action="gerot-copiar-semana"]');
  if(gerotCopiarBtn) gerotCopiarBtn.addEventListener('click', copiarSemanaAnteriorGerot);
  const gerotExportarBtn = app.querySelector('[data-action="gerot-exportar-planilha"]');
  if(gerotExportarBtn) gerotExportarBtn.addEventListener('click', exportarGerotParaPlanilha);
  const gerotImportarBtn = app.querySelector('[data-action="gerot-importar-planilha"]');
  const gerotImportarInput = document.getElementById('gerot-importar-input');
  if(gerotImportarBtn && gerotImportarInput) gerotImportarBtn.addEventListener('click', ()=> gerotImportarInput.click());
  if(gerotImportarInput) gerotImportarInput.addEventListener('change', (e)=>{
    const file = e.target.files && e.target.files[0];
    if(file) importarGerotDePlanilha(file);
    e.target.value = ''; // permite selecionar o mesmo arquivo de novo depois, se precisar
  });
  app.querySelectorAll('[data-action="gerot-abrir-editor"]').forEach(btn=>{
    btn.addEventListener('click', ()=> abrirGerotEditor(Number(btn.dataset.dia), btn.dataset.horario, btn.dataset.blocoId || null));
  });
  const gerotEditorInicio = document.getElementById('gerot-editor-inicio');
  if(gerotEditorInicio) gerotEditorInicio.addEventListener('change', (e)=>{
    gerotEditor.horarioInicio = e.target.value;
    if(gerotEditor.horarioFim <= gerotEditor.horarioInicio){
      const idx = GEROT_HORARIOS.indexOf(gerotEditor.horarioInicio);
      gerotEditor.horarioFim = GEROT_LIMITES[idx+1] || GEROT_LIMITES[GEROT_LIMITES.length-1];
    }
    renderApp();
  });
  const gerotEditorFim = document.getElementById('gerot-editor-fim');
  if(gerotEditorFim) gerotEditorFim.addEventListener('change', (e)=> gerotEditor.horarioFim = e.target.value);
  const gerotEditorTexto = document.getElementById('gerot-editor-texto');
  if(gerotEditorTexto){
    gerotEditorTexto.addEventListener('input', (e)=> gerotEditor.texto = e.target.value);
    gerotEditorTexto.addEventListener('keydown', (e)=>{ if(e.key==='Enter') salvarGerotEditor(); });
  }
  const gerotEditorSalvar = document.getElementById('gerot-editor-salvar');
  if(gerotEditorSalvar) gerotEditorSalvar.addEventListener('click', salvarGerotEditor);
  const gerotEditorCancelar = document.getElementById('gerot-editor-cancelar');
  if(gerotEditorCancelar) gerotEditorCancelar.addEventListener('click', fecharGerotEditor);
  const gerotEditorApagar = document.getElementById('gerot-editor-apagar');
  if(gerotEditorApagar) gerotEditorApagar.addEventListener('click', apagarGerotEditorAtual);
  const cancelarCopiaPrincipalBtn = app.querySelector('[data-action="cancelar-tarefa-copiada"]');
  if(cancelarCopiaPrincipalBtn) cancelarCopiaPrincipalBtn.addEventListener('click', cancelarTarefaCopiada);
  const agendaHojeBtn = app.querySelector('[data-action="agenda-hoje"]');
  if(agendaHojeBtn) agendaHojeBtn.addEventListener('click', ()=>{
    agendaMesAtual = currentMonthKey();
    loadAgendaMes(agendaMesAtual);
  });
  app.querySelectorAll('[data-action="abrir-dia-agenda"]').forEach(cel=>{
    cel.addEventListener('click', ()=>{
      if(longPressDisparou){ longPressDisparou = false; return; } // ignora o clique fantasma que o toque dispara depois de segurar
      const diaISO = cel.dataset.dia;
      if(diaAgendaCopiado && diaISO !== diaAgendaCopiado.origemISO){
        colarDiaInteiroEm(diaISO, cel);
        if(navigator.vibrate) navigator.vibrate(15);
        return;
      }
      agendaDiaSelecionado = diaISO; renderAgendaDiaModal();
    });
    cel.addEventListener('contextmenu', (e)=>{
      e.preventDefault();
      abrirMenuDia(cel.dataset.dia, e.clientX, e.clientY);
    });
    cel.addEventListener('touchstart', (e)=>{
      const touch = e.touches[0];
      const x = touch.clientX, y = touch.clientY;
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(()=>{
        longPressDisparou = true;
        cel.classList.remove('agenda-cell-pressionando');
        if(navigator.vibrate) navigator.vibrate(15);
        abrirMenuDia(cel.dataset.dia, x, y);
      }, 550);
      cel.classList.add('agenda-cell-pressionando');
    }, { passive:true });
    cel.addEventListener('touchend', ()=>{ clearTimeout(longPressTimer); cel.classList.remove('agenda-cell-pressionando'); });
    cel.addEventListener('touchmove', ()=>{ clearTimeout(longPressTimer); cel.classList.remove('agenda-cell-pressionando'); }); // dedo se moveu = rolando a tela, não é aperta-e-segura
    cel.addEventListener('touchcancel', ()=>{ clearTimeout(longPressTimer); cel.classList.remove('agenda-cell-pressionando'); });
  });

}
