// 19-produto-servico.js — campo "Tipo de carta / produto" (digitar com sugestões) + "+ Criar".
// Portado do Livro-Caixa (parte 2, item B) e adaptado ao consórcio:
// - cada tipo é uma "regra de comissão" (Comissões ⚙); o card guarda a chave em card.tipoCarta e um texto livre em card.produtoDetalhe;
// - as regras iniciais (Imóvel, Veículo…) continuam existindo — o campo só ganha o "+ Criar";
// - digitou um nome que não existe: "+ Criar" pede a comissão (opcional; em branco = sem comissão, não gera contrato).

const pctDaRegra = (r)=> (r && Array.isArray(r.blocos) ? r.blocos : []).reduce((s,b)=> s + (Number(b.percentual)||0) * Math.max(1, parseInt(b.parcelas,10)||1), 0);
function nomeDoProduto(chave){
  if(!chave) return '';
  const r = regrasComissao.find(x=> x.chave === chave);
  if(r) return r.nome;
  return (typeof REGRAS_COMISSAO_FALLBACK_NOMES !== 'undefined' && REGRAS_COMISSAO_FALLBACK_NOMES[chave]) || chave;
}
const fmtPctProduto = (p)=> (p*100).toLocaleString('pt-BR', { maximumFractionDigits:2 }) + '%';
function textoComissaoDoProduto(chave){
  const r = regrasComissao.find(x=> x.chave === chave);
  if(!r) return '';
  const pct = pctDaRegra(r);
  if(!(pct > 0)) return 'Sem comissão: não gera contrato em Comissões.';
  const parcelas = (r.blocos||[]).reduce((s,b)=> s + Math.max(1, parseInt(b.parcelas,10)||1), 0);
  return `Comissão: ${fmtPctProduto(pct)} no total, em ${parcelas} ${parcelas===1?'parcela':'parcelas'}, quando for vendido.`;
}
const semAcentoProduto = (s)=> String(s||'').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// prefixo: id único na tela ('f', 'c'…). op.detalhe = valor do campo Detalhe (undefined = sem esse campo).
function htmlCampoProduto(prefixo, chave, op = {}){
  const dica = chave ? textoComissaoDoProduto(chave) : (op.obrigatorio ? 'Obrigatório: é o tipo que define a comissão.' : 'É o tipo que define a comissão.');
  return `
    <div class="field ps-field" data-ps="${prefixo}">
      <label for="${prefixo}-ps-input">${op.rotulo || 'Tipo de carta / produto'}</label>
      <div class="ps-wrap">
        ${chave ? `
          <div class="ps-escolhido"><span class="ps-escolhido-nome">${esc(nomeDoProduto(chave))}</span>
            <button type="button" class="ps-limpar" data-ps-limpar aria-label="Trocar o tipo de carta">✕</button></div>
        ` : `
          <input type="text" class="ps-input" id="${prefixo}-ps-input" autocomplete="off" maxlength="80"
            placeholder="Digite ou escolha (ex.: Imóvel)" role="combobox" aria-expanded="false" aria-controls="${prefixo}-ps-lista" />
        `}
        <div class="ps-lista" id="${prefixo}-ps-lista" role="listbox" hidden></div>
      </div>
      ${dica ? `<p class="ps-dica">${esc(dica)}</p>` : ''}
    </div>
    ${op.detalhe !== undefined ? `
      <div class="field">
        <label for="${prefixo}-detalhe">Detalhe (opcional)</label>
        <input type="text" id="${prefixo}-detalhe" maxlength="140" value="${esc(op.detalhe||'')}" placeholder="Ex.: carta de 300 mil, 2 cotas" />
      </div>` : ''}`;
}

// Liga o campo. aoEscolher(chave) é chamado ao escolher/criar/limpar. op.aoDetalhe(texto) para o campo Detalhe.
function ligarCampoProduto(prefixo, aoEscolher, op = {}){
  const raiz = document.querySelector(`.ps-field[data-ps="${prefixo}"]`);
  if(!raiz) return;
  const detalheEl = document.getElementById(`${prefixo}-detalhe`);
  if(detalheEl && op.aoDetalhe && !detalheEl.dataset.ligado){ detalheEl.dataset.ligado = '1'; detalheEl.addEventListener('input', (e)=> op.aoDetalhe(e.target.value)); }
  const redesenhar = (chave)=>{
    const novo = document.createElement('div');
    novo.innerHTML = htmlCampoProduto(prefixo, chave, { obrigatorio: op.obrigatorio });
    raiz.replaceWith(novo.firstElementChild);
    ligarCampoProduto(prefixo, aoEscolher, op);
  };
  const escolher = (chave)=>{ aoEscolher(chave); redesenhar(chave); if(!chave){ const i = document.getElementById(`${prefixo}-ps-input`); if(i) i.focus(); } };

  const limpar = raiz.querySelector('[data-ps-limpar]');
  if(limpar){ limpar.addEventListener('click', ()=> escolher('')); return; }

  const input = raiz.querySelector('.ps-input');
  const lista = raiz.querySelector('.ps-lista');
  let ativo = 0, itens = [], criando = false;

  function opcoes(){
    const q = semAcentoProduto(input.value);
    const meus = regrasComissao.filter(r=> !q || semAcentoProduto(r.nome).includes(q));
    const exato = q && regrasComissao.some(r=> semAcentoProduto(r.nome) === q);
    return { meus, criar: q && !exato ? input.value.trim() : '' };
  }
  function desenhar(){
    if(criando) return;
    const { meus, criar } = opcoes();
    itens = [...meus.map(r=>({ tipo:'meu', r })), ...(criar ? [{ tipo:'criar', nome: criar }] : [])];
    if(!itens.length){
      lista.innerHTML = `<div class="ps-vazio">Nenhum tipo com esse nome.</div>`;
    } else {
      let n = 0;
      lista.innerHTML = `
        ${meus.length ? `<div class="ps-grupo">Seus tipos de carta e produtos</div>${meus.map(r=>`<button type="button" class="ps-item ${n===ativo?'on':''}" data-i="${n++}" role="option"><span>${esc(r.nome)}</span><small>${pctDaRegra(r) > 0 ? 'comissão ' + fmtPctProduto(pctDaRegra(r)) : 'sem comissão'}</small></button>`).join('')}` : ''}
        ${criar ? `<button type="button" class="ps-criar ${n===ativo?'on':''}" data-i="${n++}">+ Criar <b>“${esc(criar)}”</b></button>` : ''}`;
    }
    lista.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    lista.querySelectorAll('[data-i]').forEach(b=>{
      b.addEventListener('mousedown', (e)=> e.preventDefault()); // não tira o foco do campo antes do clique
      b.addEventListener('click', ()=> usar(itens[Number(b.dataset.i)]));
    });
  }
  function fechar(){ if(criando) return; lista.hidden = true; input.setAttribute('aria-expanded', 'false'); }

  async function criarProduto(nome, pctTexto){
    const pct = parseFloat(String(pctTexto||'').replace(',', '.'));
    const percentual = Number.isFinite(pct) && pct > 0 ? pct : 0;
    try{
      const r = await apiRequest('POST', '/regras-comissao', { nome, blocos:[{ parcelas:1, percentual }] });
      regrasComissao = [...regrasComissao, r];
      return r.chave;
    }catch(e){
      errorMsg = (e && e.message) || 'Não foi possível criar o tipo.';
      renderApp();
      return null;
    }
  }
  function mostrarCriar(nome){
    criando = true;
    lista.innerHTML = `
      <div class="ps-novo-form">
        <b>Novo: “${esc(nome)}”</b>
        <label class="ps-novo-pct">Comissão total (opcional)
          <span><input type="text" inputmode="decimal" id="${prefixo}-ps-pct" placeholder="0" maxlength="6" /> %</span>
        </label>
        <small>Em branco: sem comissão (não gera contrato). Dá para ajustar parcelas em Comissões ⚙.</small>
        <div class="ps-novo-botoes">
          <button type="button" class="btn-outline" data-ps-cancelar>Voltar</button>
          <button type="button" class="btn-save" data-ps-criar>Criar</button>
        </div>
      </div>`;
    lista.hidden = false;
    const pctEl = document.getElementById(`${prefixo}-ps-pct`);
    pctEl.focus();
    const confirmar = async ()=>{
      const btn = lista.querySelector('[data-ps-criar]'); if(btn) btn.disabled = true;
      const chave = await criarProduto(nome, pctEl.value);
      criando = false;
      if(chave) escolher(chave); else desenhar();
    };
    lista.querySelector('[data-ps-criar]').addEventListener('click', confirmar);
    lista.querySelector('[data-ps-cancelar]').addEventListener('click', ()=>{ criando = false; input.focus(); desenhar(); });
    pctEl.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); confirmar(); } if(e.key === 'Escape'){ e.preventDefault(); criando = false; input.focus(); desenhar(); } });
  }
  function usar(item){
    if(!item) return;
    if(item.tipo === 'meu') escolher(item.r.chave); else mostrarCriar(item.nome);
  }

  input.addEventListener('focus', ()=>{ ativo = 0; desenhar(); });
  input.addEventListener('input', ()=>{ ativo = 0; desenhar(); });
  input.addEventListener('blur', ()=> setTimeout(()=>{ if(!raiz.contains(document.activeElement)) fechar(); }, 120));
  input.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowDown'){ e.preventDefault(); ativo = Math.min(itens.length - 1, ativo + 1); desenhar(); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); ativo = Math.max(0, ativo - 1); desenhar(); }
    else if(e.key === 'Enter'){ if(!lista.hidden && itens.length){ e.preventDefault(); usar(itens[ativo]); } }
    else if(e.key === 'Escape'){ if(!lista.hidden){ e.preventDefault(); e.stopPropagation(); fechar(); } }
  });
}
