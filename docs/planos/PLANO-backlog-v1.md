# PLANO DE EXECUÇÃO — backlog-v1

| Campo                | Valor                                           |
| -------------------- | ----------------------------------------------- |
| **Tarefa**           | `backlog-v1` (RPG-1 a RPG-17 + RPG-19 a RPG-21) |
| **Origem**           | descrição livre (`docs/backlog.md`)             |
| **Tipo**             | História                                        |
| **Modo de execução** | 💬 Interativo                                   |
| **Data**             | 2026-10-31                                      |
| **Branch**           | uma por fatia: `feature/RPG-N-<modulo>`         |

## 1. Enunciado Canônico

- **Problema:** o site tem só a base técnica; nenhuma função de RPG existe.
- **Resultado esperado:** salas, contas, editor de diorama, tokens, névoa, anotações, dados 3D, ferramentas de mesa e exportação funcionando e polidos, cada módulo num PR pronto para revisão.
- **Como validar:** mestre e jogador abrem a mesma sala em duas janelas; o mestre monta o mapa, move peças, revela névoa, manda anotação e rola dado escondido; o jogador vê só o que deve, move só o seu token e exporta nada que não seja dele.

## 2. Escopo

**Vou fazer:** RPG-1 a RPG-17 de `docs/backlog.md`, mais RPG-19 (régua), RPG-20 (ping) e RPG-21 (ordem de iniciativa).

**NÃO vou fazer** [#8]: publicação (RPG-18, fica para o fim do pipeline), celular, grade hexagonal, fichas de sistema, visão automática, desenho livre, chat livre entre jogadores, PDF nas anotações.

## 3. Premissas Assumidas

Registro completo em `answers/2026_10_31 rpgmaps-backlog-v1 001.md` e `answers/2026_10_31 rpgmaps-requisitos 001.md`.

| #   | Premissa                                                  | Por quê                                   | Se estiver errada…                    |
| --- | --------------------------------------------------------- | ----------------------------------------- | ------------------------------------- |
| P1  | Upload: `.glb` até 10 MB, imagem até 5 MB                 | Cabe no plano gratuito; evita abuso [#65] | Ajustar a regra do bucket (1 linha)   |
| P2  | Visual low-poly sombrio; pacotes CC0 + upload `.glb`      | Recomendação aceita por falta de resposta | Trocar pacotes e tema; lógica intacta |
| P3  | Convidado sem conta = login anônimo do Supabase + apelido | Dá identidade para RLS sem cadastro [#55] | Trocar por token de convite próprio   |

## 4. Decisão Visual

- **Superfície visual:** sim, todas as telas são novas.
- **Mockup:** sim, porque tudo é tela nova. `design-de-interface-projeto` define tema, componentes base e estados (carregando, vazio, erro) na fatia F2, antes das telas.

## 5. Terreno

Scaffold em `main` (`27d067d`): rotas `/` e `/sala/:roomId`, `DioramaPreview` de teste, `lib/env.ts`, `lib/supabase.ts`, Supabase local com `config.toml`, migrations vazias. Convenções em `CLAUDE.md` (feature folders, domínio puro em `src/domain`, zod, sem `any`).

## 6. Passos (fatias)

| Fatia | O que entrega                                                                                 | Módulo                                  | Nível       | Depende de | Branch                       | Estado  |
| ----- | --------------------------------------------------------------------------------------------- | --------------------------------------- | ----------- | ---------- | ---------------------------- | ------- |
| F0    | RPG-1: tabelas, RLS, buckets, tipos gerados                                                   | `supabase/`                             | coordenador | —          | `feature/RPG-1-banco`        | na fila |
| F1    | Formato do mapa (JSON versionado), grade, permissões, notação de dados, em TS puro com testes | `src/domain`                            | coordenador | —          | `feature/RPG-14-dominio`     | na fila |
| F2    | Tema, componentes base, layout da mesa (design-de-interface-projeto)                          | `src/components`, `src/styles`          | coordenador | —          | `feature/RPG-17-design-base` | na fila |
| F3    | RPG-2, RPG-3: contas (e-mail, Google, convidado), lobby, criar/entrar na sala, presença       | `features/auth`, `features/rooms`       | alto        | F0, F2     | `feature/RPG-3-contas-salas` | na fila |
| F4    | RPG-4 a RPG-7: cena, biblioteca CC0, editor de diorama, upload `.glb`, vários mapas por mesa  | `features/scene`, `features/map-editor` | alto        | F0, F1, F2 | `feature/RPG-6-editor`       | na fila |
| F5    | RPG-13: dados 3D com física, rolagem escondida, histórico                                     | `features/dice`                         | medio       | F1, F2     | `feature/RPG-13-dados`       | na fila |
| F6    | RPG-8 a RPG-11: tokens (imagem e 3D), vida/notas, movimento sincronizado, névoa               | `features/tokens`, `features/fog`       | alto        | F3, F4     | `feature/RPG-8-tokens-nevoa` | na fila |
| F7    | RPG-12: anotações com destinatários e imagem                                                  | `features/notes`                        | medio       | F3         | `feature/RPG-12-anotacoes`   | na fila |
| F8    | RPG-14 a RPG-16: exportar/importar JSON, PNG e `.glb`                                         | `features/export`                       | medio       | F4         | `feature/RPG-15-exportacao`  | na fila |
| F9    | RPG-19 a RPG-21: régua, ping, ordem de iniciativa                                             | `features/table-tools`                  | medio       | F3, F4     | `feature/RPG-19-ferramentas` | na fila |

**Ordem:** F0 → F1 → F2 (coordenador, em sequência) → lote 1: F3 + F4 → lote 2: F5 + F7 → lote 3: F6 + F8 → F9. Máximo de 2 agentes por vez.

## 7. Impacto em Dados e Contratos

- **Banco:** migrations novas em `supabase/migrations` [#87]; RLS em todas as tabelas [#55].
- **Configuração:** nenhuma variável nova prevista além das do `.env.example` [#80].
- **LGPD:** e-mail e nome do usuário; nunca em log [#63]; conta apagável (cascade).

## 8. Plano de Testes

| Nível            | O que cobre                                                   | Caminho de falha                        |
| ---------------- | ------------------------------------------------------------- | --------------------------------------- |
| Unidade [#41]    | domínio: grade, permissões, notação de dados, formato do mapa | entrada inválida, mapa acima de 100×100 |
| Integração [#42] | RLS no Supabase local (jogador tentando ler anotação alheia)  | acesso negado                           |
| E2E [#43]        | fica para `testes-projeto` (etapa seguinte do pipeline)       | —                                       |

**Bateria:** `npm run typecheck && npm run lint && npm test && npm run build`.

## 9. Riscos e Rollback

| Risco                              | Prob. | Impacto                    | Mitigação                                             |
| ---------------------------------- | ----- | -------------------------- | ----------------------------------------------------- |
| Limite do plano Pro acabar no meio | Alta  | pausa até a janela resetar | checkpoints de uso; handoff-mp; 2 agentes por vez     |
| Mapa 100×100 lento                 | Média | travamento em PC fraco     | instancing desde o início; medir com mapa cheio [#99] |
| RLS errado vazar anotação/névoa    | Média | jogador vê segredo         | testes de integração de RLS; revisão de segurança     |

**Rollback** [#84]: um PR por módulo; reverter o PR desfaz a fatia.

## 10. Definição de Pronto

- [ ] Todas as fatias `revisada: pronta`, com PR pronto para revisão
- [ ] Bateria verde em cada PR [#49]
- [ ] App rodando com duas janelas (mestre e jogador) conferido de verdade
- [ ] Sem segredo em código [#37]
- [ ] `docs/planos/ENTREGA-backlog-v1.md` escrito; `CLAUDE.md` e README atualizados
