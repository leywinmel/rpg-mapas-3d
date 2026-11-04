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

**Vou fazer:** RPG-1 a RPG-17 de `docs/backlog.md`, mais RPG-19 (régua), RPG-20 (ping) e RPG-21 (ordem de iniciativa). Desde 01/11, também o Épico 8 (RPG-22 a RPG-25, seção 11).

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

| Fatia | O que entrega                                                                                 | Módulo                                  | Nível       | Depende de | Branch                       | Estado                                             |
| ----- | --------------------------------------------------------------------------------------------- | --------------------------------------- | ----------- | ---------- | ---------------------------- | -------------------------------------------------- |
| F0    | RPG-1: tabelas, RLS, buckets, tipos gerados                                                   | `supabase/`                             | coordenador | —          | `feature/RPG-1-banco`        | mergeada (#3)                                      |
| F1    | Formato do mapa (JSON versionado), grade, permissões, notação de dados, em TS puro com testes | `src/domain`                            | coordenador | —          | `feature/RPG-14-dominio`     | mergeada (#2)                                      |
| F2    | Tema, componentes base, layout da mesa (design-de-interface-projeto)                          | `src/components`, `src/styles`          | coordenador | —          | `feature/RPG-17-design-base` | mergeada (#4)                                      |
| F3    | RPG-2, RPG-3: contas (e-mail, Google, convidado), lobby, criar/entrar na sala, presença       | `features/auth`, `features/rooms`       | alto        | F0, F2     | `feature/RPG-3-contas-salas` | mergeada (#5)                                      |
| F4    | RPG-4 a RPG-7: cena, biblioteca CC0, editor de diorama, upload `.glb`, vários mapas por mesa  | `features/scene`, `features/map-editor` | alto        | F0, F1, F2 | `feature/RPG-6-editor`       | mergeada (#6)                                      |
| F5    | RPG-13: dados 3D com física, rolagem escondida, histórico                                     | `features/dice`                         | medio       | F1, F2     | `feature/RPG-13-dados`       | mergeada (#7)                                      |
| F6    | RPG-8 a RPG-11: tokens (imagem e 3D), vida/notas, movimento sincronizado, névoa               | `features/tokens`, `features/fog`       | alto        | F3, F4     | `feature/RPG-8-tokens-nevoa` | na fila, depois do formato novo do mapa (seção 11) |
| F7    | RPG-12: anotações com destinatários e imagem                                                  | `features/notes`                        | medio       | F3         | `feature/RPG-12-anotacoes`   | mergeada (#9)                                      |
| F8    | RPG-14 a RPG-16: exportar/importar JSON, PNG e `.glb`                                         | `features/export`                       | medio       | F4         | `feature/RPG-15-exportacao`  | na fila                                            |
| F9    | RPG-19 a RPG-21: régua, ping, ordem de iniciativa                                             | `features/table-tools`                  | medio       | F3, F4     | `feature/RPG-19-ferramentas` | na fila                                            |

**Ordem:** F0 → F1 → F2 (coordenador, em sequência) → lote 1: F3 + F4 → lote 2: F5 + F7 → Épico 8 (seção 11) → lote 3: F6 + F8 → F9. Máximo de 2 agentes por vez.

## 7. Impacto em Dados e Contratos

- **Banco:** migrations novas em `supabase/migrations` [#87]; RLS em todas as tabelas [#55].
- **Configuração:** nenhuma variável nova prevista além das do `.env.example` [#80].
- **LGPD:** e-mail e nome do usuário; nunca em log [#63]; conta apagável (cascade).

## 8. Plano de Testes

| Nível            | O que cobre                                                   | Caminho de falha                                                                 |
| ---------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Unidade [#41]    | domínio: grade, permissões, notação de dados, formato do mapa | entrada inválida, mapa acima do limite (100×100 hoje; 1000×1000 no formato novo) |
| Integração [#42] | RLS no Supabase local (jogador tentando ler anotação alheia)  | acesso negado                                                                    |
| E2E [#43]        | fica para `testes-projeto` (etapa seguinte do pipeline)       | —                                                                                |

**Bateria:** `npm run typecheck && npm run lint && npm test && npm run build`.

## 9. Riscos e Rollback

| Risco                              | Prob. | Impacto                    | Mitigação                                                                                        |
| ---------------------------------- | ----- | -------------------------- | ------------------------------------------------------------------------------------------------ |
| Limite do plano Pro acabar no meio | Alta  | pausa até a janela resetar | checkpoints de uso; handoff-mp; 2 agentes por vez                                                |
| Mapa 1000×1000 lento               | Alta  | travamento em PC fraco     | guardar e desenhar em pedaços, qualidade que se ajusta sozinha; medir com uma cidade cheia [#99] |
| RLS errado vazar anotação/névoa    | Média | jogador vê segredo         | testes de integração de RLS; revisão de segurança                                                |

**Rollback** [#84]: um PR por módulo; reverter o PR desfaz a fatia.

## 10. Definição de Pronto

- [ ] Todas as fatias `revisada: pronta`, com PR pronto para revisão
- [ ] Bateria verde em cada PR [#49]
- [ ] App rodando com duas janelas (mestre e jogador) conferido de verdade
- [ ] Sem segredo em código [#37]
- [ ] `docs/planos/ENTREGA-backlog-v1.md` escrito; `CLAUDE.md` e README atualizados

## 11. Épico 8: mundos maiores e outros estilos (pedido de 01/11/2026)

Decisões em `answers/2026_11_01 rpgmaps-backlog-v1 002.md`: mapa de até 1000×1000 casas; altura e andares, com um
corte para ver dentro dos prédios (cada jogador mexe no seu, o mestre trava ou libera); qualidade que se ajusta
sozinha em PC fraco; três estilos de peças CC0, com filtro e mistura livre; interface neutra; gerador de vilas e
cidades com casas prontas. O formato novo do mapa entra antes da F6, para tokens e névoa já nascerem sobre ele.

Fatias a detalhar na retomada de 02/11 (rascunho, na ordem das dependências):

| Fatia | O que entrega                                                                                                                                                   | Depende de |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| F10   | Formato v2 do mapa no domínio: até 1000×1000 em pedaços, altura por casa, peças empilhadas, objetos maiores que 1×1 (carros, carroças: RPG-26), conversão do v1 | —          |
| F11   | Banco e serviço do formato v2: pedaços gravados à parte, autosave só do que mudou [#87]                                                                         | F10        |
| F12   | Cena em pedaços, com qualidade adaptável e o corte de andares; medir numa cidade cheia [#99]                                                                    | F10        |
| F13   | Editor: pincel de altura, empilhar, corte, ferramentas para mapa grande                                                                                         | F11, F12   |
| F14   | Estilos: pacotes CC0 (cada download autorizado pelo usuário), filtro na biblioteca, interface neutra                                                            | F12        |
| F15   | Gerador de vilas e cidades e coleção de casas prontas                                                                                                           | F13, F14   |

Depois delas: F6 (tokens e névoa) sobre o formato v2, depois F8 e F9.

**F10 lançada em 02/11, ~00:45:**

- **Onde:** branch `feature/RPG-25-formato-v2`, pasta `F:\projetos\rpgmaps-RPG-25-formato-v2`.
- **Nível:** médio (Sonnet). A semanal estava em 93%; o desenho foi pronto no brief e a revisão é do coordenador.
- **Desenho:**
  - Pedaços de 32×32 casas: um cabeçalho pequeno mais um documento por pedaço. O tamanho do mapa continua nas colunas `width` e `depth` de `maps`.
  - Terreno compacto: paleta mais corridas de valores iguais.
  - Medidas verticais em degraus de 0,5 unidade; um andar tem 4 degraus.
  - Peças com âncora no canto de menor x e z, nível, giro em quartos de volta e tamanho em casas (até 8×8).
  - Corte por altura absoluta, com trava do mestre. O terreno nunca é cortado.
  - Operações que trocam só os pedaços tocados.
  - Conversão do v1 sem mudar a aparência.
- **Quando entra no app:** o v2 mora em `src/domain/map-v2/`, e as features só passam a usá-lo da F11 à F13.
- **Estado (03/11):** revisada e mergeada (#10, squash `27976cf`).

**Decisões de 03/11 (answers 002, linhas 12 a 14):** o coordenador pode mergear sozinho depois da revisão e da
bateria verde (squash); ao subir o chão de uma casa, peças e paredes em cima sobem junto (F13); o banco guarda só os
pedaços mexidos, e pedaço ausente vale como chão liso padrão (F11).

**F11 e F12 lançadas em 03/11 (~14:30), com Opus:**

| Fatia                                                                                                                                                             | Branch                        | Pasta                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------- |
| F11: tabela `map_chunks` com RLS e pgTAP, `width`/`depth` até 1000, pedaço ausente = padrão no domínio, serviço que carrega e salva só o que mudou                | `feature/RPG-25-banco-v2`     | `F:\projetos\rpgmaps-RPG-25-banco-v2`     |
| F12: cena desenha o `MapModel` em pedaços (instâncias, culling por pedaço), corte de andares, qualidade adaptável com troca manual, medição numa cidade 1000×1000 | `feature/RPG-25-cena-pedacos` | `F:\projetos\rpgmaps-RPG-25-cena-pedacos` |

O editor continua no v1 até a F13; a cena da F12 desenha o v1 convertido.

**F11 mergeada (03/11, #11, `7281b30`):** bateria (996 testes, build), `test:db` (139 pgTAP), tipos gerados sem
diferença. Ficam para a F13: diminuir um mapa v2 apaga os pedaços que saem dele; ligar `map-v2-service` ao editor.
Para a F15: a primeira gravação de uma cidade inteira vai num pedido só e pode precisar ir em lotes. O limite de
1,5 MB por pedaço tem só ~4% de folga sobre o pior caso: se os limites por pedaço do domínio subirem, ele sobe junto.

**F12 mergeada (03/11, #13, `6bdf12a`):** cidade 1000×1000 foi de 5,6 para 54,8 FPS (visão geral, qualidade alta;
GTX 1650), montagem de ~5,9 s para ~3,2 s. Página de medição em `/dev/cena` (só em desenvolvimento). Sobras: `.glb` de
várias casas só centralizado (sem esticar); detalhe montado de perto não é desmontado ao afastar (memória cresce);
de longe, blocos sem sombra.

**F13 dividida em duas (03/11), por causa do limite de uso:**

| Fatia | O que entrega                                                                                                                                                                                                  | Branch / pasta                                                 | Estado                                                                                                                                                               |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F13a  | Operações que faltam (pincel de altura com "sobe junto", parede que substitui a sobreposta, mudar tamanho do v2), editor e sala no `MapModel`, autosave pelo `saveMapV2`, todo leitor de `maps.document` no v2 | —                                                              | mergeada (#14, `2794d2d`): 1103 testes, 148 pgTAP; salvar uma pincelada num 1000×1000 leva ~13 ms. Sobra: câmera do 1000×1000 abre perto do canto (vai na F13b)      |
| F13b  | Controle de corte de andares e trava do mestre, empilhar peças, ferramentas para mapa gigante (minimapa, retângulos, câmera do 1000×1000), jogador relê só os pedaços novos                                    | —                                                              | mergeada (04/11, #15, `9d6149b`): 1162 testes; pgTAP próprio ok. Perguntas abertas: parede empilha em parede? névoa acompanha a distância da câmera?                 |
| F14   | Pacotes 3D otimizados em `public/assets/`, catálogo com footprint, filtro por estilo, interface neutra, página de créditos                                                                                     | —                                                              | mergeada (04/11, #16, `4f427eb`). Ajuste #17 (`bbe0f4c`): veículos proporcionais ao boneco 1×1 (carros 2×3, furgão/ambulância 2×4, caminhões 3×6), pedido do usuário |
| F15   | Gerador de vilas e cidades (domínio puro, por semente), casas prontas na biblioteca, criar mapa pelo gerador com gravação em lotes                                                                             | `feature/RPG-23-gerador`, `F:\projetos\rpgmaps-RPG-23-gerador` | parada em 04/11 ~11:40 (semanal 44%): 3 commits com push e 4 arquivos sem commit; retomar o mesmo agente                                                             |
