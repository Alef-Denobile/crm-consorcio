/* ================================================================
   Tela de login / cadastro
================================================================ */
const API_BASE = '/api';
let modo = 'login'; // ou 'register'

// mesma cor de destaque escolhida no painel (guardada no navegador)
document.documentElement.style.setProperty('--accent', localStorage.getItem('accentColor') || '#141414');
// mesmo modo noturno escolhido no painel
document.documentElement.setAttribute('data-theme', localStorage.getItem('darkMode') === '1' ? 'dark' : 'light');

const form = document.getElementById('auth-form');
const errorBox = document.getElementById('auth-error');
const submitBtn = document.getElementById('auth-submit');
const fieldNome = document.getElementById('field-nome');

/* se já tem sessão, pula direto pro painel */
if(localStorage.getItem('token')){
  window.location.href = 'index.html';
}

document.querySelectorAll('.auth-tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    modo = btn.dataset.mode;
    document.querySelectorAll('.auth-tab').forEach(b=> b.classList.toggle('active', b===btn));
    fieldNome.style.display = modo==='register' ? 'block' : 'none';
    submitBtn.textContent = modo==='register' ? 'Criar conta' : 'Entrar';
    errorBox.style.display = 'none';
  });
});

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  errorBox.style.display = 'none';
  submitBtn.disabled = true;

  const email = document.getElementById('a-email').value.trim();
  const senha = document.getElementById('a-senha').value;
  const nome = document.getElementById('a-nome').value.trim();

  const path = modo==='register' ? '/auth/register' : '/auth/login';
  const body = modo==='register' ? { nome, email, senha } : { email, senha };

  try{
    const res = await fetch(API_BASE + path, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if(!res.ok){ throw new Error(data.error || 'Não foi possível concluir. Tente novamente.'); }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = 'index.html';
  }catch(err){
    errorBox.textContent = err.message;
    errorBox.style.display = 'block';
  }finally{
    submitBtn.disabled = false;
  }
});

/* ---------- "Continuar com Google" ---------- */
// Troque pelo Client ID gerado no Google Cloud Console (veja o README).
const GOOGLE_CLIENT_ID = '105063218745-vsie49mgs15lgpn6hdfk06v2a6o23o9b.apps.googleusercontent.com';

function initGoogleButton(){
  if(GOOGLE_CLIENT_ID.indexOf('COLOQUE_SEU') !== -1){
    const fallback = document.getElementById('google-btn-fallback');
    if(fallback) fallback.style.display = 'block';
    return;
  }
  if(!window.google || !window.google.accounts){
    setTimeout(initGoogleButton, 300);
    return;
  }
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
  });
  google.accounts.id.renderButton(
    document.getElementById('google-btn-container'),
    { theme:'outline', size:'large', width:320, text:'continue_with', locale:'pt-BR' }
  );
}
initGoogleButton();

async function handleGoogleCredential(response){
  errorBox.style.display = 'none';
  try{
    const res = await fetch(API_BASE + '/auth/google', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ credential: response.credential }),
    });
    const data = await res.json();
    if(!res.ok){ throw new Error(data.error || 'Não foi possível entrar com o Google.'); }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = 'index.html';
  }catch(err){
    errorBox.textContent = err.message;
    errorBox.style.display = 'block';
  }
}
