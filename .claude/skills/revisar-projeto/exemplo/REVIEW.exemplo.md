# 🔍 Relatório de Auditoria e Revisão de Código

## 📊 Resumo Executivo
Projeto **`loja-api`**: API REST em **Node.js + Express 4.16**, persistência em **MySQL** via driver `mysql` (queries cruas, sem ORM), autenticação por **JWT** (`jsonwebtoken`) e empacotamento em **Docker**. A arquitetura é um monólito simples de 4 arquivos (`server.js`, `db.js`, `routes/users.js`), sem camada de serviço/repositório — regras de negócio, acesso a dados e HTTP estão misturados no mesmo nível.

**Nível de risco atual: CRÍTICO.** A base contém vulnerabilidades de livro-texto que permitem **invasão total do servidor e do banco** (SQL Injection na rota de login, credenciais de produção e chave Stripe `sk_live` versionadas, segredo de JWT `"123456"`) e **violações graves de LGPD** (senha e PII em log claro, CPF trafegado sem necessidade, senhas com MD5). Há ainda um **bug lógico** que faz a listagem responder antes de montar os dados. **Nada aqui está pronto para produção** — recomenda-se bloquear deploy até que a seção de Risco Crítico esteja zerada. Todos os arquivos do escopo foram lidos integralmente; não houve trecho "não auditado".

## 🔥 Top 5 Causas de Vazamento — veredicto obrigatório

| # | Causa | Veredicto | Evidência | Prática |
|---|-------|-----------|-----------|---------|
| V1 | Banco sem RLS / regras abertas | ➖ **NÃO SE APLICA** — MySQL acessado só pelo backend, sem cliente falando direto com o banco. Ainda assim o app conecta como `root`, violando menor privilégio (ver Risco Crítico) | [src/db.js:6](src/db.js:6) | [#55] |
| V2 | Autorização decidida no front-end | ➖ **NÃO SE APLICA** — não há front-end no escopo; porém o backend não tem **nenhuma** checagem de papel ou autenticação nas rotas de usuário | [src/routes/users.js:7](src/routes/users.js:7) | [#51][#56] |
| V3 | IDOR / posse do registro | 🚨 **VULNERÁVEL** — `GET /api/users` devolve a base inteira sem autenticação e nenhum handler valida posse; a query de pedidos concatena o id sem filtro de dono | [src/routes/users.js:7](src/routes/users.js:7), [src/routes/users.js:12](src/routes/users.js:12) | [#55] |
| V4 | Segredo chumbado no código/Git | 🚨 **VULNERÁVEL** — credenciais de produção em `db.js`, chave `sk_live` no `.env` versionado e `JWT_SECRET = '123456'` no código | [src/db.js:4-9](src/db.js:4), [.env:1-2](.env:1), [src/server.js:10](src/server.js:10) | [#37][#80] |
| V5 | Input sem tratamento (XSS) | 🚨 **VULNERÁVEL** — input refletido em HTML sem escape e concatenado direto em SQL, sem validação de schema nem CSP | [src/routes/users.js:28](src/routes/users.js:28), [src/server.js:17](src/server.js:17) | [#51][#52][#53] |

## 🚨 Risco Crítico (Segurança e LGPD)

* **Acesso irrestrito aos dados de todos os usuários (IDOR / Broken Access Control)**: `GET /api/users` não exige autenticação e devolve **todos** os registros da tabela `users` — incluindo PII — para qualquer um que chame a rota. Não há checagem de posse em nenhum handler: quem chega à rota lê o dado de todo mundo. É a causa V3 de vazamento em sua forma mais direta. Quebra **#55 (Menor Privilégio)** e OWASP A01 (Broken Access Control).
  * **Onde está:** [src/routes/users.js:7](src/routes/users.js:7) (listagem) e [src/routes/users.js:12](src/routes/users.js:12) (pedidos buscados por `user_id` concatenado, sem filtro de dono).
  * **Como corrigir:** exigir `authenticate` em todas as rotas e trazer o dono para dentro da query — `SELECT * FROM users WHERE id = ?` com o `id` vindo do token, não da URL; para listagens administrativas, `requireRole('admin')` + paginação. Responder `404` (e não `403`) quando o registro não pertencer ao solicitante.

* **SQL Injection na autenticação**: a query de login concatena `email` e `senha` direto do corpo da requisição na string SQL. Um atacante envia `email = ' OR '1'='1` e autentica como o primeiro usuário, ou usa `UNION` para extrair toda a base. Quebra a prática **#52 (Parameterized Queries)** e **#51 (Sanitização de Inputs)**.
  * **Onde está:** [src/server.js:17](src/server.js:17) (e o mesmo padrão em [src/routes/users.js:26](src/routes/users.js:26) e [src/routes/users.js:12](src/routes/users.js:12)).
  * **Como corrigir:** usar query parametrizada — `db.query('SELECT * FROM users WHERE email = ? AND senha = ?', [email, senhaHash])`. Nunca comparar senha em texto puro (ver item de hashing).

* **Credenciais de produção e chave de pagamento expostas no código/repo**: `db.js` traz host de produção, usuário `root` e senha `Admin@123` hardcoded; o `.env` versionado contém `DB_PASSWORD` e uma chave **Stripe ao vivo** (`STRIPE_KEY=sk_live_...`). Qualquer pessoa com acesso ao repositório invade o banco e movimenta a conta de pagamentos. Quebra **#37 (Zero segredos no Git)**, **#55 (Menor Privilégio)** e **#80 (Config via variáveis de ambiente)**.
  * **Onde está:** [src/db.js:4-9](src/db.js:4), [.env:1-2](.env:1).
  * **Como corrigir:** **rotacionar imediatamente** a senha do banco e a chave Stripe (já devem ser consideradas comprometidas). Remover `.env` do versionamento (`git rm --cached .env`, adicionar ao `.gitignore`), ler segredos só de variáveis de ambiente injetadas no deploy, e dar ao app um usuário de banco com privilégio mínimo (não `root`).

* **JWT com segredo fraco/hardcoded e sem expiração**: `JWT_SECRET = '123456'` está no código e `jwt.sign(...)` é chamado sem `expiresIn`. O segredo é trivial de adivinhar/forjar e o token nunca expira — um token vazado vale para sempre. Quebra **#56 (Autenticação moderna)** e **#37**.
  * **Onde está:** [src/server.js:10](src/server.js:10), [src/server.js:23](src/server.js:23).
  * **Como corrigir:** segredo forte aleatório (≥256 bits) vindo de `process.env.JWT_SECRET`; assinar com `jwt.sign(payload, secret, { expiresIn: '15m' })` e adotar refresh token.

* **[LGPD] Senha e PII em log claro**: o login registra `console.log('Login tentado: ' + email + ' senha=' + senha)`, gravando **e-mail e senha em texto puro** nos logs. Além de violar a LGPD (dado pessoal sem mascaramento), expõe credenciais a qualquer um com acesso ao log. Quebra **#63 (Mascaramento de logs/PII)** e o princípio de segurança da LGPD (art. 46).
  * **Onde está:** [src/server.js:20](src/server.js:20).
  * **Como corrigir:** **nunca** logar senha. Logar no máximo o e-mail mascarado (`j***@dominio.com`) e um id de correlação. Remover a senha do log imediatamente.

* **[LGPD] Senhas armazenadas com MD5 sem salt**: o cadastro gera o hash com `crypto.createHash('md5')`. MD5 é quebrável e sem salt permite ataques de rainbow table — um vazamento expõe as senhas reais dos titulares. Quebra **#54 (Hashing seguro — bcrypt/Argon2)**.
  * **Onde está:** [src/routes/users.js:25](src/routes/users.js:25).
  * **Como corrigir:** trocar por `bcrypt.hash(senha, 12)` (ou Argon2) e comparar com `bcrypt.compare`. Forçar redefinição das senhas existentes.

* **[LGPD] Trânsito desnecessário de CPF e ausência de fluxo de exclusão**: o login retorna `cpf` no JSON de resposta ([src/server.js:24](src/server.js:24)) sem necessidade funcional (viola minimização de dados), e não há nenhuma rota de **exclusão/portabilidade** dos dados do titular (direito ao esquecimento, art. 18 da LGPD) — só há `GET` e `POST` de usuários. Quebra o princípio de minimização e os direitos do titular.
  * **Onde está:** [src/server.js:24](src/server.js:24); ausência de rota `DELETE` em [src/routes/users.js](src/routes/users.js).
  * **Como corrigir:** não devolver CPF na resposta de login; implementar endpoint autenticado de exclusão/anonimização dos dados do usuário e documentar a política de retenção.

## 🐛 Risco Alto (Bugs e Arquitetura)

* **Bug lógico — resposta enviada antes dos dados ficarem prontos**: em `GET /api/users`, o `res.json(users)` na linha 17 executa **antes** dos callbacks assíncronos do loop (linhas 12-15) terminarem. O cliente recebe usuários **sem o campo `orders`**, e o `result` montado é descartado. Mistura de loop síncrono com callbacks assíncronos. Quebra **#2 (Função com propósito único)** e boa parte de #41/#43 (comportamento não testável/correto).
  * **Onde está:** [src/routes/users.js:8-18](src/routes/users.js:8).
  * **Como refatorar:** usar driver com Promises e agregar de uma vez, eliminando o N+1:
    ```js
    const [users] = await db.promise().query(
      `SELECT u.*, o.id AS order_id FROM users u
       LEFT JOIN orders o ON o.user_id = u.id`
    );
    // agrupar orders por usuário em memória, depois res.json(...)
    ```

* **Ausência de arquitetura em camadas (acoplamento alto)**: rotas, regras de negócio e SQL cru convivem no mesmo arquivo; `db` é um singleton importado direto nos handlers. Não há separação controller → service → repository nem injeção de dependência, o que impede teste unitário e amplia o raio de qualquer mudança. Quebra **#16/#22 (SRP / Arquitetura em camadas)**, **#20-#21 (Inversão e Injeção de Dependência)** e **#13 (baixo acoplamento)**.
  * **Onde está:** [src/routes/users.js](src/routes/users.js), [src/server.js:15-29](src/server.js:15), [src/db.js](src/db.js).
  * **Como refatorar:** extrair `UserRepository` (acesso a dados parametrizado), `AuthService` (login/hash/token) e deixar a rota só orquestrando; injetar a conexão em vez de importá-la globalmente.

* **Controle de acesso ausente em endpoints sensíveis**: `GET /api/users` e `POST /api/users` não exigem autenticação nem checam permissão — qualquer um lista todos os usuários e cria contas. Quebra **#55 (Menor Privilégio)** e Broken Access Control (OWASP A01).
  * **Onde está:** [src/routes/users.js:7](src/routes/users.js:7), [src/routes/users.js:22](src/routes/users.js:22).
  * **Como refatorar:** middleware de autenticação JWT + verificação de papel (`requireAuth`, `requireRole('admin')`) antes desses handlers.

* **XSS refletido no cadastro**: a resposta devolve `'<h1>Criado: ' + nome + '</h1>'` com o input renderizado sem escape — `nome = <script>...</script>` executa no navegador. Quebra **#53 (Defesa contra XSS)**.
  * **Onde está:** [src/routes/users.js:28](src/routes/users.js:28).
  * **Como refatorar:** responder JSON (`res.json({ nome })`) em vez de HTML, ou escapar a saída; definir `Content-Type` adequado e headers de segurança (#59).

* **Stack trace de erro vazado ao cliente**: em caso de erro de banco, `res.status(500).send(err)` devolve o objeto de erro cru (estrutura interna, query, possivelmente credenciais). Quebra **#93 (Tratamento global de erros sem expor stack trace)**.
  * **Onde está:** [src/server.js:19](src/server.js:19).
  * **Como refatorar:** middleware global de erros que loga o detalhe internamente e responde mensagem genérica (`{ error: 'Erro interno' }`).

## ⚠️ Risco Médio (Performance e Infraestrutura)

* **Consulta N+1 na listagem de usuários**: para cada usuário, dispara uma query separada de `orders` dentro do loop ([src/routes/users.js:11-12](src/routes/users.js:11)). Quebra **#70 (Problema N+1)**.
  * **Impacto:** com N usuários, N+1 idas ao banco — a tela de listagem degrada linearmente e pode derrubar o pool sob carga.
  * **Solução:** um único `JOIN` (ver refatoração do bug lógico acima) ou `WHERE user_id IN (...)` com agregação em memória.

* **Listagem sem paginação**: `SELECT * FROM users` retorna a tabela inteira ([src/routes/users.js:8](src/routes/users.js:8)). Quebra **#67 (Paginação Incondicional)**.
  * **Impacto:** consumo de memória e payload crescendo com a base; risco de timeout/OOM quando a tabela crescer.
  * **Solução:** `LIMIT`/`OFFSET` (ou keyset pagination) com parâmetros `page`/`pageSize` e teto máximo; selecionar só as colunas necessárias em vez de `SELECT *`.

* **Dockerfile sem multi-stage e base "gorda"**: usa `node:18` (imagem completa) e `COPY . .` antes do `npm install`, sem multi-stage nem `.dockerignore`. Quebra **#85 (Imagens Docker enxutas / multi-stage)**.
  * **Impacto:** imagem grande, superfície de ataque maior (ferramentas de build no runtime), e o `.env` com segredos acaba copiado para dentro da imagem.
  * **Solução:** base `node:18-alpine` ou `-slim`, build multi-stage (deps → runtime), `.dockerignore` com `node_modules`, `.env`, `.git`; instalar deps de produção com `npm ci --omit=dev`.

* **Conexão única de banco e sem health check**: `db.js` cria uma única `createConnection` global ([src/db.js:4](src/db.js:4)); não há pool nem rota de readiness. Quebra **#73 (Connection Pooling)** e **#82 (Health Checks)**.
  * **Impacto:** uma conexão derrubada deixa toda a API sem banco; orquestradores não conseguem saber se o serviço está saudável.
  * **Solução:** `mysql.createPool(...)` e endpoint `/health` que valida a conexão.

## 💡 Risco Baixo (Clean Code e Dívida Técnica)

* **`require` dentro do handler**: `const jwt = require('jsonwebtoken')` é chamado dentro da rota de login ([src/server.js:22](src/server.js:22)) em vez do topo do arquivo. Quebra **#5 (formatação/consistência)**.
  * **Recomendação:** mover todos os `require`/`import` para o topo do módulo.

* **Variável morta `result`**: o array `result` é montado mas nunca usado ([src/routes/users.js:10,14](src/routes/users.js:10)). Quebra **#12 (Remova código morto)**.
  * **Recomendação:** remover na refatoração da listagem.

* **Falta de tipagem e validação de entrada**: handlers acessam `req.body.nome/senha/email` sem validar presença/formato; projeto em JS puro sem schema. Quebra **#11 (Tipagem forte)** e **#51 (validação de input)**.
  * **Recomendação:** validar payloads com `zod`/`joi` e considerar TypeScript.

* **Dependências possivelmente desatualizadas**: versões fixas antigas no `package.json` (`express 4.16.0`, `jsonwebtoken 8.5.1`). Quebra **#62 (Atualização de dependências)**.
  * **Recomendação:** rodar `npm audit`/Dependabot e atualizar libs com CVEs conhecidos.

## ✅ Plano de Ação Imediato
1. **Conter o vazamento agora:** rotacionar a senha do banco e a chave Stripe `sk_live`, remover `.env` do versionamento e mover segredos para variáveis de ambiente do deploy ([src/db.js:4](src/db.js:4), [.env:1](.env:1)).
2. **Fechar o SQL Injection do login** (e demais queries) com queries parametrizadas, e parar de logar/retornar senha e PII ([src/server.js:17](src/server.js:17), [src/server.js:20](src/server.js:20)).
3. **Endurecer a autenticação:** segredo de JWT forte via env + `expiresIn`, trocar MD5 por bcrypt/Argon2 e exigir auth/autorização nas rotas de usuários ([src/server.js:10](src/server.js:10), [src/routes/users.js:25](src/routes/users.js:25)).
4. **Corrigir o bug lógico + N+1 + paginação** da listagem com um único `JOIN` paginado ([src/routes/users.js:8-18](src/routes/users.js:8)).
5. **Refatorar para camadas** (controller/service/repository) e implementar o fluxo de exclusão de dados do titular (LGPD), além de tratamento global de erros e headers de segurança.
