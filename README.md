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

## Estrutura de páginas (front-end)

O painel agora tem uma barra lateral com 4 páginas (tudo dentro do mesmo
`script.js`, sem recarregar a página):
- **Dashboard** — métricas do período (leads, em negociação, ganho,
  conversão), gráfico de leads captados, pipeline por etapa, últimos
  leads e tarefas abertas
- **Pipeline** — o quadro kanban original (arrastar cards, colunas,
  filtro por mês, WhatsApp, etc.)
- **Leads** — todos os clientes em formato de tabela, com busca e
  filtro por etapa
- **Tarefas** — lista de tarefas com prioridade, vencimento e lead
  relacionado

## Rotas da API

**Autenticação (públicas):**
- `POST /api/auth/register` — `{ nome, email, senha }` → cria conta + funil padrão
- `POST /api/auth/login` — `{ email, senha }` → retorna token
- `POST /api/auth/google` — `{ credential }` (token do Google) → cria/liga conta e retorna token
- `GET  /api/auth/me` — dados do usuário logado (exige token)

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
- `DELETE /api/tasks/:id` — exclui tarefa
# crm-consorcio
