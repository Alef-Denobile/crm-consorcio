/* ---------- eventos: Equipe, chat interno e gestão ---------- */
function bindEventosEquipe(){
  const app = document.getElementById('app');
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
      confirmLabel: 'Sair da equipe',
      onConfirm: ()=>{ sairDaEquipe(); closeConfirm(); },
    });
  });
  app.querySelectorAll('[data-action="entrar-na-equipe"]').forEach(card=>{
    const entrar = ()=>{
      const id = card.dataset.equipeId;
      const ativa = minhasEquipes.find(e=>e.id===id && e.ativa);
      if(ativa){ equipeSubTab = 'chat'; equipeDentro = true; gestaoMobileConteudo = false; if(!chatLoaded) loadChat(); renderApp(); }
      else abrirEquipeDaLista(id);
    };
    card.addEventListener('click', entrar);
    card.addEventListener('keydown', (e)=>{ if(e.target===card && (e.key==='Enter' || e.key===' ')){ e.preventDefault(); entrar(); } });
  });
  const maisEquipeBtn = app.querySelector('[data-action="toggle-equipe-novo"]');
  if(maisEquipeBtn) maisEquipeBtn.addEventListener('click', ()=>{
    // sem renderApp: só troca classes, para o CSS animar (o + gira e vira ×, o bloco desliza)
    equipeMostrarNovo = !equipeMostrarNovo;
    const bloco = document.getElementById('equipe-novo');
    maisEquipeBtn.classList.toggle('aberto', equipeMostrarNovo);
    maisEquipeBtn.setAttribute('aria-expanded', equipeMostrarNovo ? 'true' : 'false');
    if(bloco){
      bloco.classList.toggle('aberto', equipeMostrarNovo);
      if(equipeMostrarNovo){ bloco.removeAttribute('inert'); setTimeout(()=>{ const i = document.getElementById('equipe-nome-novo'); if(i) i.focus({ preventScroll:true }); }, 320); }
      else bloco.setAttribute('inert','');
    }
  });
  const voltarEquipesBtn = app.querySelector('[data-action="equipe-voltar-lista"]');
  if(voltarEquipesBtn) voltarEquipesBtn.addEventListener('click', ()=>{ equipeDentro = false; renderApp(); });
  app.querySelectorAll('[data-action="sair-equipe-lista"]').forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      showConfirm({
        message: `Sair da equipe "${btn.dataset.nome}"? Você perde o chat e a supervisão dela — seu funil continua intocado.`,
        confirmLabel: 'Sair da equipe',
        onConfirm: ()=>{ closeConfirm(); sairDaEquipe(btn.dataset.equipeId); },
      });
    });
  });
  app.querySelectorAll('[data-action="set-gestao-secao"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ gestaoSecao = btn.dataset.secao; gestaoMobileConteudo = true; equipeMsg = null; contaNovaLink = null; renderApp(); if(ehCelular()) window.scrollTo(0,0); });
  });
  const gestaoVoltarBtn = app.querySelector('[data-action="gestao-voltar-lista"]');
  if(gestaoVoltarBtn) gestaoVoltarBtn.addEventListener('click', ()=>{ gestaoMobileConteudo = false; renderApp(); });
  const contaNomeInput = document.getElementById('conta-nova-nome');
  if(contaNomeInput) contaNomeInput.addEventListener('input', (e)=> contaNovaNome = e.target.value);
  const contaEmailInput = document.getElementById('conta-nova-email');
  if(contaEmailInput){
    contaEmailInput.addEventListener('input', (e)=> contaNovaEmail = e.target.value);
    contaEmailInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') criarContaMembro(); });
  }
  const criarContaBtn = app.querySelector('[data-action="criar-conta-membro"]');
  if(criarContaBtn) criarContaBtn.addEventListener('click', criarContaMembro);
  const conviteEmailInput = document.getElementById('convite-email-novo');
  if(conviteEmailInput){
    conviteEmailInput.addEventListener('input', (e)=> conviteEmailNovo = e.target.value);
    conviteEmailInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') enviarConviteEquipe(); });
  }
  app.querySelectorAll('[data-action="definir-meta-membro"]').forEach(btn=>{
    btn.addEventListener('click', ()=> abrirMetaMembroModal(btn.dataset.userId, btn.dataset.nome, parseFloat(btn.dataset.meta)||0));
  });
  const salvarRodizioBtn = app.querySelector('[data-action="salvar-rodizio"]');
  if(salvarRodizioBtn) salvarRodizioBtn.addEventListener('click', ()=>{ const f = rodizioDoFormulario(); salvarRodizio(f.ativo, f.membros); });
  const enviarConviteBtn = app.querySelector('[data-action="enviar-convite-equipe"]');
  if(enviarConviteBtn) enviarConviteBtn.addEventListener('click', enviarConviteEquipe);
  app.querySelectorAll('[data-action="cancelar-convite-equipe"]').forEach(btn=>{
    btn.addEventListener('click', ()=> cancelarConviteEquipe(btn.dataset.conviteId));
  });
  app.querySelectorAll('[data-action="aceitar-convite-equipe"]').forEach(btn=>{
    btn.addEventListener('click', ()=> responderConviteEquipe(btn.dataset.conviteId, true));
  });
  app.querySelectorAll('[data-action="recusar-convite-equipe"]').forEach(btn=>{
    btn.addEventListener('click', ()=> responderConviteEquipe(btn.dataset.conviteId, false));
  });
  const regenerarCodigoBtn = app.querySelector('[data-action="regenerar-codigo-equipe"]');
  if(regenerarCodigoBtn) regenerarCodigoBtn.addEventListener('click', regenerarCodigoEquipe);
  app.querySelectorAll('[data-action="alterar-papel-membro"]').forEach(btn=>{
    btn.addEventListener('click', ()=> alterarPapelMembro(btn.dataset.userId, btn.dataset.papel));
  });
  app.querySelectorAll('[data-action="abrir-opcoes-membro"]').forEach(btn=>{
    btn.addEventListener('click', ()=> abrirOpcoesMembroModal(btn.dataset.userId));
  });
  app.querySelectorAll('[data-action="toggle-supervisor-dados"]').forEach(btn=>{
    btn.addEventListener('click', ()=> alterarSupervisorDeDados(btn.dataset.userId, btn.dataset.ativo==='1'));
  });
  app.querySelectorAll('[data-action="remover-membro"]').forEach(btn=>{
    btn.addEventListener('click', ()=> abrirRemoverMembroModal(btn.dataset.userId));
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

  app.querySelectorAll('[data-action="set-equipe-subtab"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      equipeSubTab = btn.dataset.subtab;
      gestaoMobileConteudo = false;
      if(equipeSubTab==='chat' && !chatLoaded) loadChat();
      if(equipeSubTab==='supervisao' && equipe && equipe.souSupervisor && !supervisaoLoaded) loadSupervisao();
      renderApp();
    });
  });
  app.querySelectorAll('[data-action="abrir-conversa-individual"]').forEach(btn=>{
    btn.addEventListener('click', ()=> abrirConversaIndividual(btn.dataset.userId));
  });
  const fecharDmBtn = app.querySelector('[data-action="fechar-conversa-individual"]');
  if(fecharDmBtn) fecharDmBtn.addEventListener('click', ()=>{ dmDestinatarioId = null; renderApp(); });
  const chatIndividualInput = document.getElementById('chat-individual-input');
  if(chatIndividualInput){
    chatIndividualInput.addEventListener('input', (e)=> dmTexto = e.target.value);
    chatIndividualInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') enviarMensagemIndividual(); });
  }
  const enviarDmBtn = app.querySelector('[data-action="enviar-chat-individual"]');
  if(enviarDmBtn) enviarDmBtn.addEventListener('click', enviarMensagemIndividual);
  const dmMsgsEl = document.getElementById('chat-individual-mensagens');
  if(dmMsgsEl) dmMsgsEl.scrollTop = dmMsgsEl.scrollHeight;

}
