/* ---------- Notificações push (neste aparelho) ---------- */
let pushEstado = { carregado:false, suportado:false, permissao:'default', inscrito:false, ocupado:false, msg:null };

function pushSuportado(){
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
function urlBase64ParaUint8(base64){
  const pad = '='.repeat((4 - base64.length % 4) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c=> c.charCodeAt(0)));
}
async function carregarEstadoPush(){
  pushEstado.suportado = pushSuportado();
  if(pushEstado.suportado){
    pushEstado.permissao = Notification.permission;
    try{
      const reg = await navigator.serviceWorker.ready;
      pushEstado.inscrito = !!(await reg.pushManager.getSubscription());
    }catch(e){ pushEstado.inscrito = false; }
  }
  pushEstado.carregado = true;
  renderApp();
}
async function ativarPush(){
  if(pushEstado.ocupado) return;
  pushEstado.ocupado = true; pushEstado.msg = null; renderApp();
  try{
    const permissao = await Notification.requestPermission();
    pushEstado.permissao = permissao;
    if(permissao !== 'granted') throw new Error('Permissão negada. Libere as notificações deste site nas configurações do navegador e tente de novo.');
    const { publicKey } = await apiRequest('GET', '/push/chave');
    if(!publicKey) throw new Error('O servidor ainda não tem as chaves de notificação configuradas.');
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if(!sub){
      sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: urlBase64ParaUint8(publicKey) });
    }
    await apiRequest('POST', '/push/inscrever', { subscription: sub.toJSON() });
    pushEstado.inscrito = true;
    pushEstado.msg = { tipo:'ok', texto:'Notificações ativadas neste aparelho. Use "Enviar teste" pra conferir.' };
  }catch(e){
    pushEstado.msg = { tipo:'erro', texto: e.message || 'Não foi possível ativar as notificações.' };
  }
  pushEstado.ocupado = false; renderApp();
}
async function desativarPush(){
  if(pushEstado.ocupado) return;
  pushEstado.ocupado = true; pushEstado.msg = null; renderApp();
  try{
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if(sub){
      try{ await apiRequest('POST', '/push/cancelar', { endpoint: sub.endpoint }); }catch(e){ /* segue e cancela localmente */ }
      await sub.unsubscribe();
    }
    pushEstado.inscrito = false;
    pushEstado.msg = { tipo:'ok', texto:'Notificações desativadas neste aparelho.' };
  }catch(e){
    pushEstado.msg = { tipo:'erro', texto: e.message || 'Não foi possível desativar.' };
  }
  pushEstado.ocupado = false; renderApp();
}
async function testarPush(){
  if(pushEstado.ocupado) return;
  pushEstado.ocupado = true; pushEstado.msg = null; renderApp();
  try{
    const r = await apiRequest('POST', '/push/testar');
    pushEstado.msg = r && r.enviados > 0
      ? { tipo:'ok', texto:'Teste enviado! Em instantes deve aparecer uma notificação.' }
      : { tipo:'erro', texto:'Nenhum aparelho inscrito foi encontrado. Ative as notificações primeiro.' };
  }catch(e){
    pushEstado.msg = { tipo:'erro', texto: e.message || 'Não foi possível enviar o teste.' };
  }
  pushEstado.ocupado = false; renderApp();
}

function renderConfigNotificacoes(){
  if(!pushEstado.carregado){ carregarEstadoPush(); }
  let corpo;
  if(!integracoesConfig.push){
    corpo = `<p class="settings-page-note">As notificações ainda não foram configuradas neste servidor (faltam as chaves VAPID nas variáveis de ambiente). Veja o README.</p>`;
  } else if(!pushEstado.carregado){
    corpo = `<p class="settings-page-note">Verificando este aparelho…</p>`;
  } else if(!pushEstado.suportado){
    corpo = `<p class="settings-page-note">Este navegador não suporta notificações com o app fechado. No iPhone, primeiro adicione o painel à Tela de Início (Compartilhar → Adicionar à Tela de Início) e abra por lá.</p>`;
  } else if(pushEstado.permissao === 'denied'){
    corpo = `<p class="settings-page-note">As notificações estão bloqueadas para este site. Libere nas configurações do navegador (cadeado ao lado do endereço) e volte aqui.</p>`;
  } else {
    corpo = `
      <p class="settings-page-note">Avisa no celular ou computador quando chegar mensagem de cliente (WhatsApp/Instagram) e na hora das suas tarefas, mesmo com o app fechado. A ativação vale só para este aparelho.</p>
      <p class="settings-page-note"><strong>Situação:</strong> ${pushEstado.inscrito ? 'ativadas neste aparelho ✅' : 'desativadas neste aparelho'}</p>
      ${pushEstado.msg ? `<p class="settings-page-msg ${pushEstado.msg.tipo}">${esc(pushEstado.msg.texto)}</p>` : ''}
      ${pushEstado.inscrito
        ? `<button class="btn-outline" data-action="push-testar" ${pushEstado.ocupado?'disabled':''}>Enviar teste</button>
           <button class="btn-outline" data-action="push-desativar" ${pushEstado.ocupado?'disabled':''}>Desativar</button>`
        : `<button class="btn-primary" data-action="push-ativar" ${pushEstado.ocupado?'disabled':''}>${pushEstado.ocupado?'Ativando…':'Ativar neste aparelho'}</button>`}
    `;
  }
  return `
    <div class="settings-page-section">
      <h3>Notificações no aparelho</h3>
      ${corpo}
    </div>
  `;
}

/* ---------- Backup automático por e-mail ---------- */
let backupAuto = { carregado:false, disponivel:false, ativo:false, ultimoEnvio:null, email:'', ocupado:false, msg:null };
async function carregarBackupAuto(){
  backupAuto.carregado = true;
  try{
    const d = await apiRequest('GET', '/backup/automatico');
    backupAuto = { ...backupAuto, ...d };
  }catch(e){ backupAuto.disponivel = false; }
  renderApp();
}
async function alternarBackupAuto(){
  if(backupAuto.ocupado) return;
  backupAuto.ocupado = true; backupAuto.msg = null; renderApp();
  try{
    const d = await apiRequest('PUT', '/backup/automatico', { ativo: !backupAuto.ativo });
    backupAuto.ativo = !!d.ativo;
    backupAuto.msg = { tipo:'ok', texto: backupAuto.ativo ? 'Backup semanal ativado.' : 'Backup semanal desativado.' };
  }catch(e){
    backupAuto.msg = { tipo:'erro', texto: e.message || 'Não foi possível alterar.' };
  }
  backupAuto.ocupado = false; renderApp();
}
async function enviarBackupAutoAgora(){
  if(backupAuto.ocupado) return;
  backupAuto.ocupado = true; backupAuto.msg = null; renderApp();
  try{
    const d = await apiRequest('POST', '/backup/automatico/enviar-agora', undefined, 90000);
    backupAuto.ultimoEnvio = (d && d.ultimoEnvio) || new Date().toISOString();
    backupAuto.msg = { tipo:'ok', texto:'Backup enviado para ' + (backupAuto.email || 'o seu e-mail') + '.' };
  }catch(e){
    backupAuto.msg = { tipo:'erro', texto: e.message || 'Não foi possível enviar agora.' };
  }
  backupAuto.ocupado = false; renderApp();
}
function renderBlocoBackupAuto(){
  if(!backupAuto.carregado){ carregarBackupAuto(); return ''; }
  if(!backupAuto.disponivel) return '';
  const ult = backupAuto.ultimoEnvio ? new Date(backupAuto.ultimoEnvio).toLocaleString('pt-BR') : 'nunca';
  return `
    <div class="settings-page-section">
      <h3>Backup automático por e-mail</h3>
      <p class="settings-page-note">Toda semana enviamos uma cópia dos seus dados (clientes, tarefas, comissões, mensagens e configurações) para <strong>${esc(backupAuto.email || 'o seu e-mail')}</strong>. Os anexos dos clientes não entram nesse arquivo — para eles use o botão Backup acima. Último envio: ${esc(ult)}.</p>
      ${backupAuto.msg ? `<p class="settings-page-msg ${backupAuto.msg.tipo}">${esc(backupAuto.msg.texto)}</p>` : ''}
      <button class="btn-outline" data-action="backup-auto-alternar" ${backupAuto.ocupado?'disabled':''}>${backupAuto.ativo?'Desativar backup semanal':'Ativar backup semanal'}</button>
      <button class="btn-outline" data-action="backup-auto-agora" ${backupAuto.ocupado?'disabled':''}>${backupAuto.ocupado?'Aguarde…':'Enviar backup agora'}</button>
    </div>
  `;
}

function renderConfigManutencao(){
  return `
    <div class="settings-page-section">
      <h3>Backup dos seus dados</h3>
      <p class="settings-page-note">Guarda ou restaura uma cópia de todos os seus clientes, tarefas, comissões, mensagens e configurações.</p>
      <button class="btn-outline" data-action="abrir-backup-modal">📦 Backup</button>
    </div>
    ${renderBlocoBackupAuto()}
    <div class="settings-page-section">
      <h3>Início de contato nos leads antigos</h3>
      <p class="settings-page-note">Preenche automaticamente o "mês de início de contato" dos seus leads que ainda não têm esse campo, usando o mês de venda que já estava cadastrado como ponto de partida. Não altera leads que você já preencheu manualmente, e pode ser usado quantas vezes quiser.</p>
      ${mesInicioContatoMsg ? `<p class="settings-page-msg ${mesInicioContatoMsg.tipo}">${esc(mesInicioContatoMsg.texto)}</p>` : ''}
      <button class="btn-outline" data-action="preencher-mes-inicio-contato" ${preenchendoMesInicioContato?'disabled':''}>${preenchendoMesInicioContato?'Preenchendo…':'Preencher automaticamente'}</button>
    </div>
    <div class="settings-page-section">
      <h3>Atualizações</h3>
      <p class="settings-page-note">Se o painel parecer desatualizado (algo que já mudou e não aparece), use esse botão pra forçar buscar a versão mais nova — principalmente útil no app instalado no celular.</p>
      ${atualizacaoMsg ? `<p class="settings-page-msg ${atualizacaoMsg.tipo}">${esc(atualizacaoMsg.texto)}</p>` : ''}
      <button class="btn-outline" data-action="verificar-atualizacao" ${verificandoAtualizacao?'disabled':''}>${verificandoAtualizacao?'Verificando…':'Verificar atualizações'}</button>
    </div>
  `;
}

function renderConfiguracoesPage(){
  const CONTEUDO_CATEGORIA = {
    'perfil': renderConfigPerfil,
    'seguranca': renderConfigSeguranca,
    'aparencia': renderConfigAparencia,
    'notificacoes': renderConfigNotificacoes,
    'whatsapp': renderConfigWhatsapp,
    'google-agenda': renderConfigGoogleAgenda,
    'instagram': renderConfigInstagram,
    'webhooks': renderConfigWebhooks,
    'agendamento': renderConfigAgendamento,
    'campos': renderConfigCampos,
    'importar': renderConfigImportar,
    'manutencao': renderConfigManutencao,
  };
  const renderFn = CONTEUDO_CATEGORIA[configCategoriaAtiva] || renderConfigPerfil;
  return `
    <div class="page-head">
      <div>
        <h1>Configurações</h1>
        <p>Sua conta, integrações e dados</p>
      </div>
    </div>

    <div class="config-layout">
      <div class="config-sidebar">
        ${CONFIG_CATEGORIAS.map(g=>`
          <div class="config-sidebar-grupo">${g.grupo}</div>
          ${g.itens.map(([key,label])=>`<button class="config-sidebar-item ${configCategoriaAtiva===key?'active':''}" data-action="set-config-categoria" data-categoria="${key}">${label}</button>`).join('')}
        `).join('')}
      </div>
      <div class="config-content">
        ${renderFn()}
      </div>
    </div>
  `;
}

