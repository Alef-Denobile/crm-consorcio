// Uma pessoa pode estar em várias equipes. O sistema inteiro continua olhando para a "equipe
// aberta" (User.equipeId / papelEquipe / supervisorDeDados / rodizio). As outras equipes ficam
// guardadas em User.outrasEquipes e trocam de lugar com a aberta quando a pessoa clica em
// "Abrir" na aba Equipe. O funil de leads é um só, da pessoa — não muda com a equipe.

const id = (v) => (v == null ? '' : String(v));

// filtro do Mongo: "quem é membro da equipe X" (com ela aberta ou guardada)
function filtroMembros(equipeId) {
  return { $or: [{ equipeId }, { 'outrasEquipes.equipeId': equipeId }] };
}

function guardada(user, equipeId) {
  return (user.outrasEquipes || []).find((e) => id(e.equipeId) === id(equipeId)) || null;
}

function idsDasEquipes(user) {
  const lista = [];
  if (user.equipeId) lista.push(id(user.equipeId));
  (user.outrasEquipes || []).forEach((e) => lista.push(id(e.equipeId)));
  return lista;
}

function membroDe(user, equipeId) {
  return !!equipeId && idsDasEquipes(user).includes(id(equipeId));
}

function papelEm(user, equipeId) {
  if (!equipeId) return 'membro';
  if (id(user.equipeId) === id(equipeId)) return user.papelEquipe || 'membro';
  const g = guardada(user, equipeId);
  return g ? g.papel || 'membro' : 'membro';
}

function supervisorDeDadosEm(user, equipeId) {
  if (id(user.equipeId) === id(equipeId)) return !!user.supervisorDeDados;
  const g = guardada(user, equipeId);
  return !!(g && g.supervisorDeDados);
}

function definirPapel(user, equipeId, papel) {
  if (id(user.equipeId) === id(equipeId)) { user.papelEquipe = papel; return true; }
  const g = guardada(user, equipeId);
  if (!g) return false;
  g.papel = papel;
  return true;
}

function definirSupervisorDeDados(user, equipeId, valor) {
  if (id(user.equipeId) === id(equipeId)) { user.supervisorDeDados = !!valor; return true; }
  const g = guardada(user, equipeId);
  if (!g) return false;
  g.supervisorDeDados = !!valor;
  return true;
}

// é gestor em alguma das equipes dele?
function gestorEmAlguma(user) {
  if (user.equipeId && user.papelEquipe === 'supervisor') return true;
  return (user.outrasEquipes || []).some((e) => e.papel === 'supervisor');
}
// é gestor em TODAS as equipes dele? (regra "a mais restrita vale": quem é só membro em uma equipe
// não ganha permissão de gestor criando ou abrindo outra)
function gestorEmTodas(user) {
  const ids = idsDasEquipes(user);
  if (!ids.length) return false;
  return ids.every((eid) => papelEm(user, eid) === 'supervisor');
}
function emAlgumaEquipe(user) { return idsDasEquipes(user).length > 0; }

// duas pessoas têm alguma equipe em comum?
function equipeEmComum(a, b) {
  const minhas = idsDasEquipes(a);
  return idsDasEquipes(b).some((x) => minhas.includes(x));
}

function plano(r) {
  return { ativo: !!(r && r.ativo), membros: ((r && r.membros) || []).slice(), contador: (r && r.contador) || 0 };
}

// guarda a equipe aberta em "outrasEquipes" e deixa a pessoa sem equipe aberta
function guardarAberta(user) {
  if (!user.equipeId) return;
  if (!user.outrasEquipes) user.outrasEquipes = [];
  user.outrasEquipes = user.outrasEquipes.filter((e) => id(e.equipeId) !== id(user.equipeId));
  user.outrasEquipes.push({ equipeId: user.equipeId, papel: user.papelEquipe || 'membro', supervisorDeDados: !!user.supervisorDeDados, rodizio: plano(user.rodizio) });
  user.equipeId = null;
  user.papelEquipe = 'membro';
  user.supervisorDeDados = false;
  user.rodizio = plano(null);
}

// abre a equipe indicada (ela precisa estar guardada). Devolve false se a pessoa não faz parte dela.
function abrirEquipe(user, equipeId) {
  if (id(user.equipeId) === id(equipeId)) return true;
  const g = guardada(user, equipeId);
  if (!g) return false;
  const dados = { equipeId: g.equipeId, papel: g.papel, supervisorDeDados: !!g.supervisorDeDados, rodizio: plano(g.rodizio) };
  user.outrasEquipes = user.outrasEquipes.filter((e) => id(e.equipeId) !== id(equipeId));
  guardarAberta(user);
  user.equipeId = dados.equipeId;
  user.papelEquipe = dados.papel || 'membro';
  user.supervisorDeDados = dados.supervisorDeDados;
  user.rodizio = dados.rodizio;
  return true;
}

// põe a pessoa numa equipe nova (ou volta pra uma que já era dela) e a deixa aberta; a que estava aberta fica guardada
function entrarEquipe(user, equipeId, papel, supervisorDeDados) {
  if (id(user.equipeId) === id(equipeId)) return;
  if (guardada(user, equipeId)) { abrirEquipe(user, equipeId); return; }
  guardarAberta(user);
  user.equipeId = equipeId;
  user.papelEquipe = papel || 'membro';
  user.supervisorDeDados = !!supervisorDeDados;
  user.rodizio = plano(null);
}

// tira a pessoa de uma equipe; se era a aberta, abre a próxima que ela tiver
function sairEquipe(user, equipeId) {
  if (id(user.equipeId) === id(equipeId)) {
    user.equipeId = null;
    user.papelEquipe = 'membro';
    user.supervisorDeDados = false;
    user.rodizio = plano(null);
    const proxima = (user.outrasEquipes || [])[0];
    if (proxima) abrirEquipe(user, proxima.equipeId);
    return true;
  }
  if (!guardada(user, equipeId)) return false;
  user.outrasEquipes = user.outrasEquipes.filter((e) => id(e.equipeId) !== id(equipeId));
  return true;
}

module.exports = { filtroMembros, idsDasEquipes, membroDe, papelEm, supervisorDeDadosEm, definirPapel, definirSupervisorDeDados, gestorEmAlguma, gestorEmTodas, emAlgumaEquipe, equipeEmComum, abrirEquipe, entrarEquipe, sairEquipe };
