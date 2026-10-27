/* ---------- eventos: Comissões e Configurações ---------- */
function bindEventosConfigEComissoes(){
  const app = document.getElementById('app');
  /* -- Comissões -- */
  app.querySelectorAll('[data-action="comissoes-mes"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ comissoesMonth = addMonthsKey(comissoesMonth, parseInt(btn.dataset.delta,10)); renderApp(); });
  });
  const openNewContratoBtn = app.querySelector('[data-action="open-new-contrato"]');
  if(openNewContratoBtn) openNewContratoBtn.addEventListener('click', openNewContrato);
  const openRegrasBtn = app.querySelector('[data-action="open-regras-comissao"]');
  if(openRegrasBtn) openRegrasBtn.addEventListener('click', openRegrasComissaoModal);
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
  app.querySelectorAll('[data-action="cancelar-contrato"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.contratoId;
      showConfirm({
        message: `Marcar esse contrato como cancelado a partir de ${monthLabel(comissoesMonth, true)}? As parcelas desse mês em diante param de contar — os meses anteriores continuam valendo.`,
        confirmLabel: 'Cancelar comissão',
        onConfirm: ()=>{ cancelarContrato(id); closeConfirm(); },
      });
    });
  });
  app.querySelectorAll('[data-action="reativar-contrato"]').forEach(btn=>{
    btn.addEventListener('click', ()=> reativarContrato(btn.dataset.contratoId));
  });

  /* -- Configurações -- */
  const configVoltarBtn = app.querySelector('[data-action="config-voltar-lista"]');
  if(configVoltarBtn) configVoltarBtn.addEventListener('click', ()=>{ configMobileConteudo = false; renderApp(); window.scrollTo(0,0); });
  app.querySelectorAll('[data-action="set-config-categoria"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      configCategoriaAtiva = btn.dataset.categoria;
      configMobileConteudo = true;
      if(configCategoriaAtiva==='monitoramento' && !monitoramentoLoaded) loadMonitoramento();
      renderApp();
      if(ehCelular()) window.scrollTo(0,0);
    });
  });
  const avatarInput = document.getElementById('avatar-input');
  if(avatarInput) avatarInput.addEventListener('change', (e)=>{
    const file = e.target.files && e.target.files[0];
    if(file) handleAvatarFileSelected(file);
  });
  const avatarRemoverBtn = document.getElementById('avatar-remover-btn');
  if(avatarRemoverBtn) avatarRemoverBtn.addEventListener('click', removerAvatar);
  const abrirEditarPerfilBtn = app.querySelector('[data-action="abrir-editar-perfil"]');
  if(abrirEditarPerfilBtn) abrirEditarPerfilBtn.addEventListener('click', abrirEditarPerfilModal);
  // A bolinha da foto: clique rápido abre o seletor de arquivo (trocar/adicionar foto);
  // clique e segure (ou toque e segure, no celular) abre a foto atual em tamanho maior.
  const avatarPreview = document.getElementById('avatar-preview');
  if(avatarPreview){
    const iniciarPress = ()=>{
      clearTimeout(avatarPressTimer);
      avatarPressTimer = setTimeout(()=>{
        avatarPressDisparou = true;
        abrirAvatarLightbox();
      }, 550);
    };
    const cancelarPress = ()=> clearTimeout(avatarPressTimer);
    avatarPreview.addEventListener('mousedown', iniciarPress);
    avatarPreview.addEventListener('mouseup', cancelarPress);
    avatarPreview.addEventListener('mouseleave', cancelarPress);
    avatarPreview.addEventListener('touchstart', iniciarPress, { passive:true });
    avatarPreview.addEventListener('touchend', cancelarPress);
    avatarPreview.addEventListener('touchmove', cancelarPress);
    avatarPreview.addEventListener('touchcancel', cancelarPress);
    avatarPreview.addEventListener('contextmenu', (e)=> e.preventDefault());
    avatarPreview.addEventListener('click', ()=>{
      if(avatarPressDisparou){ avatarPressDisparou = false; return; } // ignora o clique fantasma depois de segurar
      if(avatarInput) avatarInput.click();
    });
  }
  const logoutAllBtn = app.querySelector('[data-action="desconectar-todos"]');
  if(logoutAllBtn) logoutAllBtn.addEventListener('click', ()=>{
    showConfirm({
      message: 'Desconectar todos os dispositivos, incluindo este? Você vai precisar fazer login de novo.',
      confirmLabel: 'Desconectar',
      onConfirm: ()=>{ desconectarTodosDispositivos(); closeConfirm(); },
    });
  });
  const abrirSenhaBtn = app.querySelector('[data-action="abrir-alterar-senha"]');
  if(abrirSenhaBtn) abrirSenhaBtn.addEventListener('click', abrirAlterarSenhaModal);
  const toggleAuditoriaBtn = app.querySelector('[data-action="toggle-auditoria"]');
  if(toggleAuditoriaBtn) toggleAuditoriaBtn.addEventListener('click', ()=>{ auditoriaExpandida = !auditoriaExpandida; renderApp(); });
  const atualizarMonitoramentoBtn = app.querySelector('[data-action="atualizar-monitoramento"]');
  if(atualizarMonitoramentoBtn) atualizarMonitoramentoBtn.addEventListener('click', loadMonitoramento);
  const limparMonitoramentoBtn = app.querySelector('[data-action="limpar-monitoramento"]');
  if(limparMonitoramentoBtn) limparMonitoramentoBtn.addEventListener('click', limparMonitoramento);
  const importColunaSelect = document.getElementById('import-coluna');
  if(importColunaSelect) importColunaSelect.addEventListener('change', (e)=> importColumnId = e.target.value);
  const importBtn = document.getElementById('import-btn');
  if(importBtn) importBtn.addEventListener('click', importarLeadsCsv);

  const novoCampoNomeEl = document.getElementById('novo-campo-nome');
  if(novoCampoNomeEl) novoCampoNomeEl.addEventListener('input', (e)=> novoCampoNome = e.target.value);
  const novoCampoTipoEl = document.getElementById('novo-campo-tipo');
  if(novoCampoTipoEl) novoCampoTipoEl.addEventListener('change', (e)=> novoCampoTipo = e.target.value);
  const criarCampoBtn = app.querySelector('[data-action="criar-campo-personalizado"]');
  if(criarCampoBtn) criarCampoBtn.addEventListener('click', criarCampoPersonalizado);

  const criarWebhookBtn = app.querySelector('[data-action="criar-webhook-saida"]');
  if(criarWebhookBtn) criarWebhookBtn.addEventListener('click', criarWebhookSaida);
  app.querySelectorAll('[data-action="testar-webhook-saida"]').forEach(btn=>{
    btn.addEventListener('click', ()=> testarWebhookSaida(btn.dataset.webhookId));
  });
  app.querySelectorAll('[data-action="toggle-webhook-saida"]').forEach(btn=>{
    btn.addEventListener('click', ()=> toggleWebhookSaida(btn.dataset.webhookId, btn.dataset.ativo==='1'));
  });
  app.querySelectorAll('[data-action="excluir-webhook-saida"]').forEach(btn=>{
    btn.addEventListener('click', ()=> excluirWebhookSaida(btn.dataset.webhookId));
  });
  const toggleAgendamentoPublicoBtn = app.querySelector('[data-action="toggle-agendamento-publico-ativo"]');
  if(toggleAgendamentoPublicoBtn) toggleAgendamentoPublicoBtn.addEventListener('click', toggleAgendamentoPublicoAtivo);
  const salvarAgendamentoPublicoBtn = app.querySelector('[data-action="salvar-agendamento-publico"]');
  if(salvarAgendamentoPublicoBtn) salvarAgendamentoPublicoBtn.addEventListener('click', salvarAgendamentoPublico);
  const copiarLinkBtn = app.querySelector('[data-action="copiar-link-agendamento"]');
  if(copiarLinkBtn) copiarLinkBtn.addEventListener('click', copiarLinkAgendamento);
  app.querySelectorAll('[data-action="excluir-campo-personalizado"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.campoId;
      showConfirm({
        message: 'Excluir esse campo personalizado? Ele para de aparecer nos clientes.',
        onConfirm: ()=>{ excluirCampoPersonalizado(id); closeConfirm(); },
      });
    });
  });

  const salvarWaBtn = app.querySelector('[data-action="salvar-whatsapp-config"]');
  if(salvarWaBtn) salvarWaBtn.addEventListener('click', salvarWhatsappConfig);
  const waProvEl = document.getElementById('wa-provedor');
  if(waProvEl) waProvEl.addEventListener('change', ()=>{ whatsappProvedorEscolhido = waProvEl.value==='ycloud' ? 'ycloud' : 'meta'; whatsappConfigMsg = null; renderApp(); });
  const abrirYcSecretBtn = app.querySelector('[data-action="abrir-ycloud-secret"]');
  if(abrirYcSecretBtn) abrirYcSecretBtn.addEventListener('click', abrirYcloudSecretModal);
  const desconectarWaBtn = app.querySelector('[data-action="desconectar-whatsapp"]');
  if(desconectarWaBtn) desconectarWaBtn.addEventListener('click', desconectarWhatsapp);

  const toggleAgenteIaEl = app.querySelector('[data-action="toggle-agente-ia"]');
  if(toggleAgenteIaEl) toggleAgenteIaEl.addEventListener('click', ()=>{
    if(!agenteIaAtivo){
      showConfirm({
        message: 'Ativar o agente de IA? Ele vai responder mensagens de WhatsApp automaticamente, sem você revisar antes de enviar. Sempre que você responder um cliente manualmente, o agente fica em silêncio por 30 minutos naquela conversa. Pode desativar a qualquer momento.',
        confirmLabel: 'Ativar mesmo assim',
        onConfirm: ()=>{ definirAgenteIa(true); closeConfirm(); },
      });
    } else {
      definirAgenteIa(false);
    }
  });
  const toggleIaProativaEl = app.querySelector('[data-action="toggle-ia-proativa"]');
  if(toggleIaProativaEl) toggleIaProativaEl.addEventListener('click', ()=> definirIaProativa(!iaProativaAtiva));

  const mtMensagemEl = document.getElementById('mt-mensagem');
  if(mtMensagemEl) mtMensagemEl.addEventListener('input', (e)=> menuTriagem.mensagemInicial = e.target.value);
  const mtAddOpcaoBtn = document.getElementById('mt-add-opcao');
  if(mtAddOpcaoBtn) mtAddOpcaoBtn.addEventListener('click', ()=>{
    menuTriagem.opcoes.push({ numero: String(menuTriagem.opcoes.length+1), colunaDestinoId: (board.columns[0]||{}).id || '', respostaConfirmacao:'' });
    renderApp();
  });
  document.querySelectorAll('.mt-opcao-remover').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      menuTriagem.opcoes.splice(parseInt(btn.dataset.idx,10),1);
      renderApp();
    });
  });
  document.querySelectorAll('.mt-opcao-numero').forEach(el=>{
    el.addEventListener('input', (e)=>{ menuTriagem.opcoes[parseInt(el.dataset.idx,10)].numero = e.target.value; });
  });
  document.querySelectorAll('.mt-opcao-coluna').forEach(el=>{
    el.addEventListener('change', (e)=>{ menuTriagem.opcoes[parseInt(el.dataset.idx,10)].colunaDestinoId = e.target.value; });
  });
  document.querySelectorAll('.mt-opcao-confirmacao').forEach(el=>{
    el.addEventListener('input', (e)=>{ menuTriagem.opcoes[parseInt(el.dataset.idx,10)].respostaConfirmacao = e.target.value; });
  });
  const toggleMenuTriagemEl = app.querySelector('[data-action="toggle-menu-triagem"]');
  if(toggleMenuTriagemEl) toggleMenuTriagemEl.addEventListener('click', ()=>{ menuTriagem.ativo = !menuTriagem.ativo; renderApp(); });
  const salvarMenuTriagemBtn = document.getElementById('mt-salvar');
  if(salvarMenuTriagemBtn) salvarMenuTriagemBtn.addEventListener('click', ()=>{
    if(menuTriagem.ativo){
      showConfirm({
        message: 'Salvar e manter o menu de triagem ativo? Ele vai responder automaticamente qualquer contato novo no WhatsApp, sem revisão sua.',
        confirmLabel: 'Manter ativo',
        onConfirm: ()=>{ salvarMenuTriagem(); closeConfirm(); },
      });
    } else {
      salvarMenuTriagem();
    }
  });

  const twofaIniciarBtn = document.getElementById('twofa-iniciar');
  if(twofaIniciarBtn) twofaIniciarBtn.addEventListener('click', iniciar2FA);
  const twofaCancelarSetupBtn = document.getElementById('twofa-cancelar-setup');
  if(twofaCancelarSetupBtn) twofaCancelarSetupBtn.addEventListener('click', cancelarSetup2FA);
  const twofaConfirmarBtn = document.getElementById('twofa-confirmar');
  if(twofaConfirmarBtn) twofaConfirmarBtn.addEventListener('click', confirmar2FA);
  const twofaMostrarDesativarBtn = document.getElementById('twofa-mostrar-desativar');
  if(twofaMostrarDesativarBtn) twofaMostrarDesativarBtn.addEventListener('click', ()=>{ mostrarDesativar2FA = true; renderApp(); });
  const twofaCancelarDesativarBtn = document.getElementById('twofa-cancelar-desativar');
  if(twofaCancelarDesativarBtn) twofaCancelarDesativarBtn.addEventListener('click', ()=>{ mostrarDesativar2FA = false; twoFactorMsg = null; renderApp(); });
  const twofaConfirmarDesativarBtn = document.getElementById('twofa-confirmar-desativar');
  if(twofaConfirmarDesativarBtn) twofaConfirmarDesativarBtn.addEventListener('click', desativar2FA);
  if(twoFactorSetup) renderizarQrCode2FA();

  const salvarIgBtn = app.querySelector('[data-action="salvar-instagram-config"]');
  if(salvarIgBtn) salvarIgBtn.addEventListener('click', salvarInstagramConfig);
  const desconectarIgBtn = app.querySelector('[data-action="desconectar-instagram"]');
  if(desconectarIgBtn) desconectarIgBtn.addEventListener('click', desconectarInstagram);
  const sincronizarTemplatesBtn = app.querySelector('[data-action="sincronizar-templates"]');
  if(sincronizarTemplatesBtn) sincronizarTemplatesBtn.addEventListener('click', sincronizarTemplates);
  const openNewTemplateBtn = app.querySelector('[data-action="open-new-template"]');
  if(openNewTemplateBtn) openNewTemplateBtn.addEventListener('click', openNewTemplateModal);

}
