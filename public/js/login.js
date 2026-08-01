/* ================================================================
   Tela de login / cadastro
================================================================ */
const API_BASE = '/api';
let modo = 'login'; // ou 'register'

// mesma cor de destaque escolhida no painel (guardada no navegador)
document.documentElement.style.setProperty('--accent', localStorage.getItem('accentColor') || '#141414');

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
