# Diretrizes do Projeto (CLAUDE.md)

> Documento vivo de regras. Toda decisão arquitetural deste projeto deriva do
> arquivo de referência **"100 Melhores Práticas de Programação"**. Os números
> entre colchetes (ex: `[#11]`, `[#22]`) referenciam a prática que justifica a regra.
> Decisões de produto tomadas com o usuário: `answers/2026_10_31 rpgmaps-requisitos 001.md`.

## 🎯 Objetivo e Escopo

**rpgmaps** é uma mesa de RPG online (no estilo do Owlbear Rodeo) com **mapas 3D estilo diorama**
e visual low-poly sombrio. O mestre cria salas e mapas; jogadores entram por link.

**Dentro do escopo:**

- Contas com e-mail + senha e Google. O mestre precisa de conta; para o jogador ela é opcional
  (sem conta: entra por link com apelido; com conta: guarda as anotações recebidas).
- Salas por link, com presença e sincronização em tempo real.
- Editor de diorama: chão, paredes e objetos encaixados numa grade, a partir de uma biblioteca
  (pacotes CC0) e de modelos `.glb` enviados pelo mestre.
- Tokens: imagem em pé numa base ("papel-cartão") ou boneco 3D com cores; barra de vida e notas.
  O jogador move só os próprios tokens; o mestre move todos.
- Névoa pintada e revelada manualmente pelo mestre.
- Anotações do mestre enviadas à mesa toda ou a jogadores escolhidos, salvas na sala.
- Dados 3D com física, resultado sincronizado para todos.
- Exportar o mapa: arquivo próprio (JSON, reimportável), imagem PNG e modelo 3D `.glb`.
- Hospedagem gratuita: Vercel (site) + Supabase (contas, banco, tempo real, arquivos).

**Fora do escopo (YAGNI [#8]):** celular e tablet (só desktop), fichas de sistemas específicos,
visão automática dos personagens (linha de visão), chat livre entre jogadores, Jira.
**Critério de lançamento:** "tudo caprichado". Só vai ao ar com todas as funções polidas.

## 🚀 Stack Tecnológica e Ferramentas

- **Frontend:** React 19 + Vite 8 + TypeScript 6 (SPA). 3D com three.js via
  `@react-three/fiber` e `@react-three/drei`; física dos dados com `@react-three/rapier`.
  Estado local com `zustand`; validação com `zod`; rotas com `react-router-dom`.
- **Backend:** sem servidor próprio [#26][#8]. O Supabase faz tudo: Auth (e-mail + Google),
  Postgres com RLS, Realtime (broadcast/presence para movimentos e dados) e Storage (imagens e `.glb`).
  Edge Functions só quando uma regra não puder morar em RLS/trigger.
- **Banco de Dados/BaaS:** Supabase (PostgreSQL), com migrations versionadas em `supabase/migrations` [#87].
- **Infraestrutura/DevOps:** Supabase CLI (sobe o Supabase inteiro em contêineres Docker), Vercel
  para o site, GitHub (`leywinmel/rpg-mapas-3d`) com deploy automático.
- **Qualidade:** Vitest + Testing Library, ESLint + Prettier.

## 🏗️ Arquitetura e Padrões (Baseado nas 100 Melhores Práticas)

- **Design Pattern Principal:** frontend organizado por feature [#13], com um núcleo `src/domain`
  de TypeScript puro (sem React, three.js ou Supabase) para as regras: grade do mapa, permissões
  de token, notação de dados, formato de exportação [#30]. As features chamam o domínio; o domínio
  não conhece as features.
- **Tempo real:** movimentos e rolagens vão por canal Realtime (WebSocket) [#75]; o estado
  persistente (mapas, tokens, anotações) é salvo no Postgres e protegido por RLS.
- **Regras Estritas:**
  - Tipagem forte OBRIGATÓRIA: nada de `any` (o ESLint bloqueia). [#11]
  - Early returns para reduzir aninhamento. [#9]
  - Dependências externas (Supabase, Storage) ficam atrás de módulos em `services/`, injetáveis e
    mockáveis nos testes. [#20][#21][#45]
  - Funções com responsabilidade única; no máximo 3–4 parâmetros (agrupe em objeto acima disso). [#2][#10]
  - DRY e KISS: sem duplicação de regra de negócio, sem solução mais complexa que o necessário. [#6][#7]
  - Sem magic numbers/strings: use constantes ou enums nomeados. [#3]
  - Comentar o "porquê", nunca o "o quê". [#4]
  - Nomenclatura: código em inglês; textos de tela, comentários e docs em PT-BR. [#1]
  - Linter + formatter (ESLint + Prettier) como gate. [#5]
  - Zero segredos no código ou no Git; configuração sensível só via variável de ambiente. [#37][#80]
  - Cena 3D carregada sob demanda (lazy) para a tela inicial ficar leve. [#68]
  - Otimização só com gargalo medido. [#99]

### Interface (base visual)

- Cores, espaços, fontes e camadas só por variáveis de `src/styles/tokens.css`: tema escuro é o
  padrão, o claro vem de `data-theme="light"` no `<html>`. Nada de cor chumbada no componente. [#3][#6]
- Componentes genéricos em `src/components` (importar de `@/components`), cada um com seu CSS Module.
  Antes de criar um novo, veja se já existe; o catálogo vivo fica em `/componentes` (só em desenvolvimento).
- Zero falha silenciosa: erro vai para `reportError` (`src/lib/report-error.ts`), que grava no log
  estruturado (`src/lib/logger.ts`, e-mail mascarado) e mostra um aviso amigável, sem detalhe técnico
  na tela. Toda carga tem estado de carregando, vazio e erro (`LoadingState`, `EmptyState`, `ErrorState`). [#91][#92][#93]
- Dentro de uma janela (`Dialog`), mostre o erro na própria janela: os avisos do canto ficam atrás dela.
- Botão só de ícone usa `IconButton` com `label` (vira o nome lido pelo leitor de tela e a dica).

## 📂 Estrutura de Diretórios

```
rpgmaps/
├── src/
│   ├── app/               # Bootstrap, rotas e providers globais
│   ├── domain/            # Regras puras em TS: grade, permissões, dados, formato de exportação [#30]
│   ├── features/          # Uma pasta por feature, autocontida [#13]
│   │   ├── auth/          # Login e-mail/Google, sessão, apelido de convidado
│   │   ├── rooms/         # Lobby, criar/entrar na sala, presença
│   │   ├── scene/         # Renderização 3D compartilhada: câmera, luz, neblina, grade
│   │   ├── map-editor/    # Editor de diorama (peças, paredes, objetos, upload .glb)
│   │   ├── tokens/        # Tokens de imagem e 3D, vida, notas, permissões de movimento
│   │   ├── fog/           # Névoa pintada pelo mestre
│   │   ├── notes/         # Anotações do mestre para todos ou escolhidos
│   │   ├── dice/          # Dados 3D com física e sincronização
│   │   └── export/        # Exportar/importar JSON, PNG e .glb
│   │       (cada feature: components/ hooks/ services/ types.ts)
│   ├── components/        # UI genérica compartilhada
│   ├── lib/               # Clientes e helpers (supabase, env)
│   └── styles/            # Tema e estilos globais
├── supabase/
│   ├── config.toml        # Configuração do Supabase local
│   ├── migrations/        # Esquema do banco versionado [#87]
│   └── seed.sql           # Dados de exemplo para desenvolvimento
├── public/assets/         # Pacotes 3D CC0 e imagens estáticas
├── tests/                 # Setup e testes de integração/E2E [#41][#42][#43]
├── scripts/               # dev.bat / dev.sh (start/stop/restart)
├── docs/backlog.md        # Lista de tarefas do projeto (substitui o Jira)
└── answers/               # Registro das decisões tomadas com o usuário
```

## 🔐 Diretrizes de Segurança Mínimas

- Validação de todo input do cliente com `zod` antes de gravar. [#51]
- Acesso ao banco só pelo cliente Supabase (queries parametrizadas); nada de SQL concatenado. [#52]
- RLS ligado em TODAS as tabelas: o mestre gerencia a sala; o jogador só altera os próprios tokens;
  anotações só são lidas pelos destinatários. [#55]
- Senhas ficam com o Supabase Auth (bcrypt); o app nunca vê nem guarda senha. [#54]
- Limite de tamanho e de tipo nos uploads (imagens e `.glb`) via regras do Storage. [#65]
- Rate limit do Auth configurado; CORS e headers de segurança (CSP) na Vercel. [#57][#58][#59]
- Nada de dados pessoais (e-mail) em logs. [#63]
- Texto de usuário (anotações, nomes) nunca renderizado como HTML. [#53]

## 🐳 Ambiente Local (Docker)

O Supabase CLI sobe o Supabase completo (Postgres, Auth, Realtime, Storage, Studio) em contêineres
Docker, com as mesmas versões da nuvem [#79][#81]. Por isso não há `docker-compose.yml` à mão:
escrever um compose para o Supabase duplicaria o que a CLI já gerencia e ficaria fora de
sincronia com a nuvem [#7][#23]. O site roda direto com o Vite.

- **Serviços:** Supabase local (API em `http://127.0.0.1:54321`, painel em `http://127.0.0.1:54323`)
  e o site em `http://localhost:5173`.
- **Subir / parar / reiniciar:**
  - Windows: `scripts\dev.bat start` | `stop` | `restart` | `status`
  - Linux/Mac: `./scripts/dev.sh start` | `stop` | `restart` | `status`
- O `start` grava `.env.local` com a URL e a chave pública locais (vêm do `supabase status`).
- **Healthchecks:** a CLI só termina o `supabase start` com os serviços saudáveis. [#82]
- **Comandos úteis:** `npm run db:reset` (recria o banco e aplica migrations + seed),
  `npm run db:new <nome>` (nova migration), `npm run db:types` (gera os tipos TS do banco).
- **Verificação:** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- **Testes do banco:** `npm run test:db` roda os testes pgTAP de `supabase/tests/database/`
  (regras de acesso de cada papel). Rode depois de `db:reset` sempre que mexer em RLS [#49][#55].
- **Serviços desligados:** `analytics` e `edge_runtime` ficam `enabled = false` no
  `supabase/config.toml`: o projeto não usa Edge Functions nem o painel de logs, e eles custam
  memória numa máquina de 16 GB [#8].
- **Convidados:** `enable_anonymous_sign_ins = true`; convidado é usuário `authenticated` com
  `is_anonymous = true` e não cria mesa, mapa nem biblioteca (checado no banco por `is_registered()`).

## 🔗 Integrações

- **Jira:** recusado pelo usuário em 2026-10-31. Não perguntar de novo. O backlog fica em
  `docs/backlog.md`, com códigos `RPG-N`.
- **Repositório:** GitHub `leywinmel/rpg-mapas-3d` (HTTPS, autenticado pelo GitHub CLI).
  A branch antiga `adicionar-skills` e o PR #1 ficam fora do projeto (decisão do usuário).

## 🐙 Git: Branches e Commits

- **Branches** de curta duração a partir da `main` [#33][#36]:
  `feature/RPG-N-descricao`, `bugfix/RPG-N-descricao`, `chore/descricao`.
- **Commits** atômicos em Conventional Commits, com o código da tarefa no escopo quando houver [#31][#32]:
  `feat(RPG-6): adiciona rotação de peças no editor`.
- **Integração** por Pull Request no GitHub, explicando o porquê e como testar [#35];
  squash merge na `main` para manter o histórico legível [#39].
- **Hooks (Husky):** `pre-commit` roda lint-staged (ESLint + Prettier nos arquivos alterados),
  typecheck e testes [#5][#49]; `commit-msg` roda o commitlint [#32]. Nunca use `--no-verify`.
- **Proibido:** `git push -f` na `main` ou em branch compartilhada [#38]; commitar `.env` ou chaves [#37].

## 🔄 Protocolo de Atualização do README.md (CRÍTICO)

O arquivo `README.md` é a documentação pública deste projeto. **Sempre que ocorrer
uma das mudanças abaixo durante o desenvolvimento, o `README.md` DEVE ser atualizado
no mesmo ciclo de trabalho:** [#96]

1. Adição de novas variáveis de ambiente (`.env`).
2. Mudança nos comandos de instalação ou execução.
3. Adição de integração de terceiros essencial.
4. Finalização de um módulo principal.

> Falha em manter o README sincronizado é tratada como bug de documentação.
