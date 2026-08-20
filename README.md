# Painel do Consórcio — CRM com MongoDB e login

## Estrutura

```
crm-consorcio/
  public/                <- front-end (servido pelo Express)
    index.html            (painel — exige login)
    login.html             (tela de entrar / criar conta)
    css/style.css
    js/script.js           (lógica do painel)
    js/login.js             (lógica do login/cadastro)
  server/                 <- back-end
    server.js
    seed.js                 (cria o funil padrão para cada novo usuário)
    middleware/
      auth.js                (valida o token JWT)
    models/
      User.js
      Column.js
      Card.js
    routes/
      auth.js                (cadastro, login, /me)
      board.js
      columns.js
      cards.js
    package.json
    .env.example
```

## Passo a passo

1. Instale as dependências:
   ```
   cd server
   npm install
   ```

2. Configure o banco e o segredo do login:
   ```
   cp .env.example .env
   ```
   Edite `.env`:
   - `MONGODB_URI` com a sua string de conexão (local ou Atlas)
   - `JWT_SECRET` com qualquer texto longo e aleatório (usado para assinar os tokens de login)

3. Rode o servidor:
   ```
   npm start
   ```

4. Abra `http://localhost:3000`. Como ainda não há sessão, você cai direto em
   `login.html`. Clique em "Criar conta", preencha e-mail e senha — isso já
   cria o seu funil padrão (Leads, Qualificação, Negociação, Fechado, Perdido)
   e te leva pro painel.

## Como funciona o login

- Senhas nunca são salvas em texto puro — são criptografadas com `bcrypt`
  antes de ir pro banco (campo `senhaHash`).
- Ao entrar ou criar conta, a API devolve um token (JWT) que o front-end
  guarda no `localStorage` do navegador.
- Toda requisição ao painel (`/api/board`, `/api/columns`, `/api/cards`)
  manda esse token no header `Authorization: Bearer <token>`. O servidor
  confere o token e descobre de qual usuário são os dados.
- Cada coluna e cada card tem um `userId` — os dados de um usuário nunca
  aparecem para outro.
- O botão "Sair" no painel apaga o token e volta pra tela de login.

## Configurar o "Continuar com Google" (opcional)

O botão já está pronto no código, mas precisa de um Client ID seu pra
funcionar — sem isso, ele mostra uma mensagem discreta em vez do botão.

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   e crie um projeto (ou use um existente).
2. Configure a "Tela de consentimento OAuth" (tipo "Externo" funciona
   para a maioria dos casos).
3. Em "Credenciais" → "Criar credenciais" → "ID do cliente OAuth":
   - Tipo de aplicativo: **Aplicativo da Web**
   - Em "Origens JavaScript autorizadas", adicione a URL do seu site
     (ex: `https://seudominio.com.br` e, para testar local,
     `http://localhost:3000`)
4. Copie o Client ID gerado (termina em `.apps.googleusercontent.com`).
5. Cole em dois lugares:
   - No `.env` do servidor: `GOOGLE_CLIENT_ID=seu-client-id-aqui`
   - No arquivo `public/js/login.js`, na linha que diz
     `const GOOGLE_CLIENT_ID = 'COLOQUE_SEU_GOOGLE_CLIENT_ID_AQUI...'`
6. Reinicie o servidor (ou refaça o deploy). O botão aparece sozinho.

Quem entrar com Google e já tiver uma conta com o mesmo e-mail cadastrada
por senha continua na mesma conta (o Google só é "linkado" a ela).

## Configurar a sincronização com a Google Agenda (opcional)

Usa o mesmo projeto do Google Cloud de cima, mas precisa de **duas coisas a
mais** além do Client ID que você já tem:

1. Volte em **Credenciais** → clique no ID do cliente OAuth que você já
   criou (o mesmo do login) → em **"URIs de redirecionamento
   autorizados"**, adicione:
   - `https://seudominio.com.br/api/calendar/callback` (produção)
   - `http://localhost:3000/api/calendar/callback` (se for testar local)

   ⚠️ Isso é diferente das "Origens JavaScript autorizadas" que você já
   preencheu pro login — sem essa URL de redirecionamento cadastrada, o
   Google recusa a conexão com erro `redirect_uri_mismatch`.

2. Na mesma tela, copie o **Client Secret** (fica visível ao lado do
   Client ID) e adicione no `.env`:
   ```
   GOOGLE_CLIENT_SECRET=seu-client-secret-aqui
   ```
   (No Render, adicione como variável de ambiente também, igual às outras.)

3. Se a tela de consentimento OAuth do seu projeto ainda estiver em modo
   **"Testando"** (comum pra projetos pessoais), adicione seu e-mail em
   **"Usuários de teste"** — senão o Google recusa a conexão.

Depois disso, é só clicar em **Conectar Google Agenda** dentro do painel
(ícone de engrenagem → seção "Google Agenda"). Um calendário novo chamado
**"Painel do Consórcio — Tarefas"** é criado automaticamente na sua conta
Google — só ele é usado, seus outros compromissos não são tocados.

⚠️ **Limitação do modo "Testando":** enquanto o projeto não passar pela
verificação do Google (processo à parte, opcional), a conexão expira a
cada 7 dias e você precisa clicar em "Conectar" de novo. Pra uso pessoal
isso costuma ser tranquilo; se incomodar, me avise que vejo com você o
processo de verificação.

## Estrutura de páginas (front-end)

O painel agora tem uma barra lateral com 5 páginas (tudo dentro do mesmo
`script.js`, sem recarregar a página):
- **Dashboard** — métricas do período (leads, em negociação, ganho,
  conversão), gráfico de leads captados, pipeline por etapa, últimos
  leads e tarefas abertas
- **Pipeline** — o quadro kanban original (arrastar cards, colunas,
  filtro por mês, WhatsApp, etc.)
- **Leads** — todos os clientes em formato de tabela, com busca e
  filtro por etapa
- **Comissões** — contratos de comissão por mês, com cálculo automático
  das parcelas a partir do valor da carta de crédito vendida (regra fixa:
  10 parcelas × 0,00103388 + 3 parcelas × 0,00190561)
- **Tarefas** — lista de tarefas com prioridade, vencimento e lead
  relacionado
- **Configurações** — uma página só, em três seções na ordem Perfil →
  Integrações → Aparência. Os botões no topo rolam a tela até a seção
  correspondente. O botão de acesso fica no rodapé da barra lateral,
  separado dos outros, acima do "Sair"

## Recursos de IA

Usam a API da Anthropic (modelo Haiku, rápido e barato — dá pra trocar
em `server/utils/anthropic.js` se quiser mais qualidade em troca de
custo maior). Precisam da variável `ANTHROPIC_API_KEY` no `.env`
(gere em https://console.anthropic.com/settings/keys). Sem essa chave
configurada, os botões continuam aparecendo mas mostram uma mensagem
de erro ao clicar.

- **Sugerir mensagem** — no modal de editar cliente, ao lado do botão
  do WhatsApp: gera um rascunho de mensagem de retomada de contato
  personalizado, com opção de copiar ou já abrir o WhatsApp com o
  texto preenchido
- **Sugerir tarefa de acompanhamento** — no modal de editar cliente,
  perto de Observações: sugere uma tarefa com prazo, que pode ser
  criada com um clique
- **Insights da IA** — no Dashboard, um painel com botão "Gerar" que
  lista de 2 a 4 alertas curtos sobre o estado atual do funil (não
  gera sozinho, só quando você pede — pra não pesar a tela nem gastar
  chamadas de API à toa)

**Autenticação (públicas):**
- `POST /api/auth/register` — `{ nome, email, senha }` → cria conta + funil padrão
- `POST /api/auth/login` — `{ email, senha }` → retorna token
- `POST /api/auth/google` — `{ credential }` (token do Google) → cria/liga conta e retorna token
- `GET  /api/auth/me` — dados do usuário logado (exige token)
- `PUT  /api/auth/password` — `{ senhaAtual, senhaNova }` → troca (ou define) a senha da conta

**Painel (exigem token, sempre isoladas por usuário):**
- `GET  /api/board` — colunas + cards
- `POST /api/columns` — cria coluna
- `PUT  /api/columns/:id` — renomeia / muda tipo
- `DELETE /api/columns/:id` — exclui coluna (e os cards dela)
- `POST /api/cards` — cria cliente
- `PUT  /api/cards/:id` — edita cliente
- `PUT  /api/cards/:id/move` — move cliente entre colunas (drag and drop)
- `DELETE /api/cards/:id` — exclui cliente

**Tarefas (exigem token, isoladas por usuário):**
- `GET  /api/tasks` — lista as tarefas
- `POST /api/tasks` — cria tarefa
- `PUT  /api/tasks/:id` — edita tarefa
- `PUT  /api/tasks/:id/toggle` — marca/desmarca como concluída
- `DELETE /api/tasks/:id` — exclui tarefa (e o evento correspondente na Agenda)
- `POST /api/tasks/sync-calendar` — puxa da Google Agenda o que mudou de lá pra cá

**Comissões (exigem token, isoladas por usuário):**
- `GET  /api/comissoes` — lista os contratos
- `POST /api/comissoes` — cria contrato (parcelas calculadas automaticamente)
- `PUT  /api/comissoes/:id` — edita contrato (recalcula se o valor da carta mudar)
- `DELETE /api/comissoes/:id` — exclui contrato

**Google Agenda (exigem token):**
- `GET  /api/calendar/status` — diz se o usuário já conectou a Agenda
- `GET  /api/calendar/connect-url` — devolve a URL de autorização do Google
- `GET  /api/calendar/callback` — o Google redireciona pra cá após o consentimento (não chame direto)
- `POST /api/calendar/disconnect` — desconecta (não apaga os eventos já criados)

**IA (exigem token):**
- `POST /api/ai/mensagem` — `{ cardId }` → sugere mensagem de WhatsApp para o cliente
- `POST /api/ai/insights` — gera de 2 a 4 alertas curtos sobre o funil atual
- `POST /api/ai/sugerir-tarefa` — `{ cardId }` → sugere título e prazo de uma tarefa de acompanhamento
# crm-consorcio
