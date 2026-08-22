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
  filtro por mês, WhatsApp, etc.), agora dividido em **funis** — abas
  no topo da página, cada uma com seu próprio conjunto de colunas e
  clientes. Dá pra ter, por exemplo, um funil "Consórcio Imóvel" e
  outro "Consórcio Auto" totalmente separados. Contas criadas antes
  desse recurso ganham automaticamente um "Funil Principal" com as
  colunas que já existiam — nada se perde
- **Leads** — todos os clientes em formato de tabela, com busca e
  filtro por etapa
- **Comissões** — contratos de comissão por mês, com cálculo automático
  das parcelas a partir do valor da carta de crédito vendida (regra fixa:
  10 parcelas × 0,00103388 + 3 parcelas × 0,00190561)
- **Tarefas** — lista de tarefas com prioridade, vencimento e lead
  relacionado
- **Conversas** — todas as conversas do WhatsApp Business, ordenadas
  pela mensagem mais recente; clicar numa abre o card do cliente
- **Relatórios** — novos leads por mês (últimos 6 meses), leads por
  qualificação, totais de ganho/perdido, e exportação em CSV. Tem um
  seletor para ver "Todos os funis" ou um específico
- **Disparos** — envia a mesma mensagem de WhatsApp para vários leads
  de uma vez, com filtro por coluna e qualificação. Também aceita
  **modelos de mensagem aprovados** (necessário pra alcançar leads
  frios, fora da janela de 24h de texto livre)
- **Automações** — cria regras com dois gatilhos possíveis: "quando o
  cliente entra numa coluna" (na hora) ou "quando fica X dias parado
  numa coluna" (checado a cada hora pelo servidor). A ação pode ser
  criar uma tarefa ou mover pra outra coluna
- **Chat Interno** — um canal de conversa único por equipe, entre quem
  faz parte dela
- **Supervisão** — visível só pra quem é supervisor(a) da equipe:
  código de convite, gerenciar membros (promover/rebaixar/remover) e
  um resumo do desempenho de cada um (leads, em negociação, ganho,
  perdido) — nunca os clientes/negociações em si, só os totais
- **Suporte** — perguntas frequentes e um link de contato por e-mail.
  Fica no rodapé da barra lateral, junto com Configurações
- **Configurações** — uma página só, em três seções na ordem Perfil →
  Integrações → Aparência. Os botões no topo rolam a tela até a seção
  correspondente. O botão de acesso fica no rodapé da barra lateral,
  separado dos outros, acima do "Sair"

Também tem um **sino de notificações** no topo de todas as páginas,
com tarefas vencendo, leads novos e mensagens recebidas nas últimas
48h — calculado na hora a partir do que já está carregado, sem
nenhuma tabela nova no banco.

## Configurar a API do WhatsApp Business (opcional)

Isso é diferente do botão de WhatsApp que já existia (aquele só abre uma
conversa externa). Com essa integração, as mensagens passam a ficar
registradas dentro do CRM — dá pra ver o histórico e responder sem sair
do painel.

**O que você precisa preparar no Meta:**

1. Crie/acesse uma conta em [business.facebook.com](https://business.facebook.com)
2. Vá em [developers.facebook.com/apps](https://developers.facebook.com/apps), crie um app do tipo "Empresa" e adicione o produto **WhatsApp**
3. No painel do produto WhatsApp, você já ganha um número de teste — ou
   pode adicionar seu próprio número comercial (ele não pode continuar
   logado no WhatsApp normal do celular ao mesmo tempo)
4. Copie o **Phone Number ID** (aparece na tela inicial do produto WhatsApp)
5. Gere um **Access Token permanente**: Configurações da Empresa →
   Usuários do sistema → crie um usuário do sistema → gere um token com
   permissão `whatsapp_business_messaging`
6. (Opcional) copie o **WABA ID** (ID da conta do WhatsApp Business),
   útil se você quiser gerenciar modelos de mensagem depois

**Configure o webhook (pra receber mensagens):**

1. No painel do produto WhatsApp → Configuração → Webhook
2. URL de retorno de chamada: `https://seudominio.com.br/api/whatsapp/webhook`
3. Token de verificação: qualquer texto que você escolher — coloque esse
   mesmo valor no `.env` como `WHATSAPP_VERIFY_TOKEN` (e no Render também)
4. Inscreva-se no campo `messages`

**No painel do CRM:**

1. Configurações → Integrações → WhatsApp Business API
2. Cole o Phone Number ID e o Access Token → Conectar

Depois disso, qualquer mensagem que o cliente mandar pro seu número
aparece automaticamente como um card novo no Pipeline (se ainda não
existir um cliente com aquele telefone) e fica registrada na conversa
dentro do card — acessível pelo botão "Ver conversa" no modal de edição.

⚠️ **Sobre o primeiro contato:** a API só deixa mandar texto livre pra
quem já te escreveu nas últimas 24h. Pra iniciar uma conversa com
alguém que nunca falou com você, é preciso usar um "modelo de mensagem"
aprovado pela Meta — isso não está implementado ainda (só o envio de
texto livre, pra quando o cliente inicia ou responde).

⚠️ **Custo:** a Meta cobra por conversa iniciada (varia por categoria e
país), geralmente com uma cota gratuita mensal. Consulte a página de
preços da Meta antes de usar em produção.

## Configurar a captação de leads via Instagram/Facebook (opcional)

Usa o mesmo App do Meta que você já criou pro WhatsApp Business — não
precisa cadastrar outro. Toda vez que alguém preenche um formulário de
anúncio (mesmo rodando no Instagram, ele é sempre vinculado a uma
Página do Facebook), um lead novo é criado automaticamente na primeira
coluna "em aberto".

**No painel do Meta (mesmo App do WhatsApp):**

1. Adicione o produto **Marketing API** ao App (Adicionar produto)
2. Configurações da Empresa → Contas → Páginas → conecte sua Página do
   Facebook (com o Instagram profissional já vinculado a ela) ao App
3. Configurações da Empresa → Usuários do sistema → gere um **token de
   acesso de página** com as permissões `leads_retrieval`,
   `pages_manage_ads` e `pages_show_list`
4. No produto Webhooks do App (o mesmo onde você cadastrou o do
   WhatsApp): URL `https://seudominio.com.br/api/instagram/webhook`,
   token de verificação = o mesmo valor que você colocar em
   `INSTAGRAM_VERIFY_TOKEN` no `.env`/Render — e inscreva-se no campo
   `leadgen`

**No painel do CRM:**

1. Configurações → Integrações → Instagram (captação de leads)
2. Cole o Page ID e o Access Token da página → Conectar

⚠️ Os nomes dos campos do formulário variam de anúncio pra anúncio.
O sistema tenta reconhecer automaticamente nome, telefone e e-mail a
partir dos nomes mais comuns (`full_name`, `phone_number`, `email`,
entre outros) — se o seu formulário usar nomes de campo muito
diferentes disso, talvez alguns dados não sejam capturados
corretamente na primeira tentativa.

## Equipes (Chat Interno e Supervisão)

Diferente de tudo mais no projeto, isso não é uma funcionalidade "por
usuário" — é uma camada nova, sem mexer em nenhum dado que já existia:

- Cada pessoa continua com seu **funil totalmente separado** (colunas,
  clientes, tarefas — nada disso é compartilhado)
- Uma equipe é só um agrupamento: quem cria vira **supervisor(a)**
  automaticamente e ganha um código de convite
- Quem entra com o código vira **membro** — o funil dele continua
  100% dele, só ganha acesso ao chat interno da equipe
- Só supervisores veem a página **Supervisão**, com um resumo agregado
  (quantos leads, quanto está em negociação/ganho/perdido) de cada
  membro — nunca os clientes individuais de ninguém
- Uma pessoa só pode estar em **uma equipe por vez**. Sair da equipe
  (ou ser removido) não apaga nada do funil dela

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

### ⚠️ Agente IA autônomo (opcional, desligado por padrão)

Diferente dos recursos acima (que só sugerem, você decide se envia),
esse **responde o cliente sozinho, sem revisão humana**. Fica em
Configurações → Integrações → WhatsApp Business API, só aparece
depois de conectar o WhatsApp, e pede uma confirmação explícita antes
de ligar.

Regra de segurança embutida: sempre que você responder um cliente
manualmente, o agente fica em silêncio por 30 minutos naquela
conversa — pra nunca responder por cima de um atendimento humano em
andamento. Pode ser desativado a qualquer momento, e o aviso de que
está ativo fica visível na tela enquanto ligado.

**Autenticação (públicas):**
- `POST /api/auth/register` — `{ nome, email, senha }` → cria conta + funil padrão
- `POST /api/auth/login` — `{ email, senha }` → retorna token
- `POST /api/auth/google` — `{ credential }` (token do Google) → cria/liga conta e retorna token
- `GET  /api/auth/me` — dados do usuário logado (exige token)
- `PUT  /api/auth/password` — `{ senhaAtual, senhaNova }` → troca (ou define) a senha da conta

**Painel (exigem token, sempre isoladas por usuário):**
- `GET  /api/funis` — lista os funis (cria "Funil Principal" e migra colunas antigas se necessário)
- `POST /api/funis` — cria funil vazio
- `PUT  /api/funis/:id` — renomeia funil
- `DELETE /api/funis/:id` — exclui funil, colunas e cards dele (exige ao menos 1 funil restante)
- `GET  /api/board` — colunas + cards
- `POST /api/columns` — cria coluna (dentro de um funil, via `funilId`)
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

**Equipes (exigem token):**
- `GET  /api/equipe` — dados da equipe do usuário logado (ou `null`)
- `POST /api/equipe` — `{ nome }` → cria equipe (quem cria vira supervisor)
- `POST /api/equipe/entrar` — `{ codigo }` → entra numa equipe existente
- `POST /api/equipe/sair` — sai da equipe atual
- `POST /api/equipe/regenerar-codigo` — gera novo código de convite (só supervisor)
- `PUT  /api/equipe/membro/:userId/papel` — `{ papel }` → promove/rebaixa (só supervisor)
- `DELETE /api/equipe/membro/:userId` — remove um membro (só supervisor)
- `GET  /api/equipe/chat` — mensagens do chat interno
- `POST /api/equipe/chat` — `{ texto }` → envia mensagem no chat interno
- `GET  /api/equipe/supervisao` — resumo de desempenho de cada membro (só supervisor)

**WhatsApp Business:**
- `GET  /api/whatsapp/webhook` — verificação do webhook (chamada pela Meta, não chame direto)
- `POST /api/whatsapp/webhook` — recebe mensagens e status (chamada pela Meta, pública)
- `GET  /api/whatsapp/status` — diz se o usuário já conectou (exige token)
- `POST /api/whatsapp/configurar` — `{ phoneNumberId, accessToken, wabaId }` (exige token)
- `POST /api/whatsapp/desconectar` — (exige token)
- `GET  /api/whatsapp/conversas/:cardId` — histórico de mensagens do cliente (exige token)
- `POST /api/whatsapp/enviar` — `{ cardId, texto }` → envia mensagem (exige token)
- `GET  /api/whatsapp/conversas` — lista todas as conversas, ordenadas pela mais recente (exige token)
- `POST /api/whatsapp/disparo` — `{ cardIds, texto }` ou `{ cardIds, usarTemplate:true, templateName, idioma, variaveis }` → envia (exige token)
- `GET  /api/whatsapp/templates` — lista os modelos de mensagem aprovados (exige token e WABA ID configurado)
- `POST /api/whatsapp/enviar-template` — `{ cardId, templateName, idioma, variaveis }` → envia um modelo (exige token)
- `POST /api/whatsapp/agente-ia` — `{ ativo }` → liga/desliga o agente que responde clientes sozinho (exige token)

**Automações (exigem token):**
- `GET  /api/automacoes` — lista as automações do usuário
- `POST /api/automacoes` — `{ nome, colunaGatilhoId, acaoTipo, acaoParams }` → cria
- `PUT  /api/automacoes/:id` — edita (nome, ativa/inativa, parâmetros da ação)
- `DELETE /api/automacoes/:id` — exclui

**Instagram/Facebook Lead Ads:**
- `GET  /api/instagram/webhook` — verificação do webhook (chamada pela Meta, não chame direto)
- `POST /api/instagram/webhook` — recebe eventos de novo lead (chamada pela Meta, pública)
- `GET  /api/instagram/status` — diz se o usuário já conectou (exige token)
- `POST /api/instagram/configurar` — `{ pageId, pageAccessToken }` (exige token)
- `POST /api/instagram/desconectar` — (exige token)
# crm-consorcio
