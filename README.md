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

## Rotas da API

**Autenticação (públicas):**
- `POST /api/auth/register` — `{ nome, email, senha }` → cria conta + funil padrão
- `POST /api/auth/login` — `{ email, senha }` → retorna token
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
# crm-consorcio
