# Exemplos de Estruturas de Diretórios

Modelos de referência. **Adapte** à stack e ao escopo — não force um padrão maior do que o
projeto precisa [#7][#23]. Em ambos os casos, o domínio (regras de negócio) fica isolado de
frameworks e do banco [#30], e as camadas de rota/controlador/serviço/repositório ficam
separadas [#22].

## Sumário
- [Arquitetura em Camadas — Backend Node.js](#camadas-backend)
- [Clean Architecture — Backend Node.js](#clean-backend)
- [Frontend React + Vite (feature-based)](#frontend-react)
- [Monorepo (web + mobile + api)](#monorepo)

---

<a id="camadas-backend"></a>
## Arquitetura em Camadas — Backend Node.js

Boa default para a maioria dos projetos em fase inicial: simples, direta, escalável [#26].

```
src/
├── routes/          # Definição de endpoints e versionamento (/v1) [#28]
├── controllers/     # Recebe req/res, valida input, delega ao service [#51]
├── services/        # Regras de negócio. Recebe dependências por injeção [#21]
├── repositories/    # Único ponto de acesso ao banco (queries parametrizadas) [#52]
├── middlewares/     # Auth, rate limit, error handler global [#58][#93]
├── models/          # Tipos/entidades e schemas de validação [#11]
├── config/          # Carga de variáveis de ambiente (12-Factor) [#80]
├── utils/           # Funções puras compartilhadas (DRY) [#6]
└── server.ts        # Bootstrap da aplicação
test/                # Unidade, integração e E2E [#41][#42][#43]
```

---

<a id="clean-backend"></a>
## Clean Architecture — Backend Node.js

Use quando o domínio é rico e precisa ser totalmente independente de framework/infra [#30].
Dependências apontam sempre para dentro (regra da dependência [#20]).

```
src/
├── domain/                  # Núcleo: independente de tudo
│   ├── entities/            # Entidades e regras de negócio puras
│   └── repositories/        # Interfaces (contratos), não implementações [#20]
├── application/             # Casos de uso (orquestram o domínio)
│   └── use-cases/
├── infrastructure/          # Detalhes: banco, libs externas, frameworks
│   ├── database/            # Implementação concreta dos repositórios + migrations [#87]
│   ├── http/                # Controllers, rotas, middlewares
│   └── services/            # Integrações de terceiros (mockáveis nos testes) [#45]
├── shared/                  # Erros, tipos e utils transversais
└── main.ts                  # Composition root: injeção de dependências [#21]
```

---

<a id="frontend-react"></a>
## Frontend React + Vite (feature-based)

Organização por feature favorece coesão alta e acoplamento baixo [#13].

```
src/
├── features/                # Cada feature isolada e autocontida
│   └── <feature>/
│       ├── components/
│       ├── hooks/
│       ├── services/        # Chamadas à API
│       └── types.ts
├── components/              # UI compartilhada e genérica
├── hooks/                   # Hooks globais reutilizáveis
├── lib/                     # Clientes (ex: api, supabase), helpers
├── routes/                  # Definição de rotas (lazy loading) [#68]
├── styles/
└── main.tsx
```

---

<a id="monorepo"></a>
## Monorepo (web + mobile + api)

Para produtos com web, mobile e backend compartilhando código tipado.

```
apps/
├── web/                     # React + Vite
├── mobile/                  # React Native
└── api/                     # Node.js (Camadas ou Clean)
packages/
├── types/                   # Tipos compartilhados entre apps [#11]
├── ui/                      # Design system compartilhado
└── config/                  # ESLint, TS, Prettier compartilhados [#5]
docker-compose.yml           # Paridade de ambientes [#79][#81]
```
