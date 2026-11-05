# Agentes em Segundo Plano — fatiar, lançar, enfileirar, revisar

Referência da etapa 8 da skill `executar-projeto` para tarefa **complexa** com fatias independentes. O chat que invocou a skill é o **coordenador**: ele planeja, lança, administra a fila, revisa e decide o PR. Os agentes executam fatias restritas e entregam PR em rascunho.

---

## 1. O que é uma fatia restrita

Uma fatia é a unidade de trabalho de um agente. Ela precisa passar nas quatro checagens:

- **Um módulo do código** (pasta ou pacote com dono claro: `app/src/screens/monetizacao`, `supabase/migrations`, `supabase/functions/selic-sync`). Fatia que cruza dois módulos vira duas fatias, ou fica com o coordenador.
- **Zero decisão em aberto.** Toda pergunta da etapa 4 já respondida; o que o agente precisa decidir está no brief.
- **Definição de Pronto verificável** por um comando ou por uma leitura objetiva.
- **Independente das outras fatias em voo**, ou com a dependência nomeada (só entra na fila quando a dependência tiver PR revisado).

Fatia que reprova em qualquer checagem fica com o coordenador. Isso vale também para a parte da tarefa que exige conversa com o usuário.

## 2. Os três níveis (presets)

| Nível | Modelo | Serve para |
|---|---|---|
| `leve` | Haiku | mecânica com padrão já decidido: renomear, mover, replicar ajuste, rodar e relatar |
| `medio` | Sonnet | implementação própria dentro do módulo, seguindo convenção visível no código |
| `alto` | Opus | decisão de desenho, regra de negócio, banco com gate, defeito sem causa conhecida |

**Padrão: `alto`.** Esforço médio e janela de 200K nos três; o esforço se ajusta no arquivo do preset, não na chamada.

As definições vivem em `~/.claude/agents/<nivel>.agent.md`. Antes do primeiro lançamento, confira que as três existem; a que faltar, copie de `assets/agentes/` desta skill.

**Pergunte o nível uma vez por lote**, em linguagem leiga, com a recomendação marcada:

> Vou lançar 3 agentes em segundo plano. Nível de cada um: `alto` (recomendado — decisão de desenho), `medio` (implementação com padrão visível) ou `leve` (mecânico)? Responda por fatia ou "padrão" para todos em `alto`.

Em **modo Loop**, use `alto` em tudo e registre como premissa.

## 3. Preparar a fatia

Cada fatia nasce com branch e worktree próprias. Worktree **irmã** do checkout, nunca dentro dele:

```bash
git worktree add "../<repo>-<CHAVE>-<modulo>" -b "<tipo>/<CHAVE>-<modulo>-<slug>" main
```

Depois copie o que a worktree precisa para rodar e que o `.gitignore` esconde (o `CLAUDE.md` do projeto lista; no radar-tributario são `app/.env` e `app/.env.development.local`, e sem o segundo a worktree roda contra produção). Pule `npm install` quando a fatia não precisa subir o app.

O **brief** é a única entrada do agente. Preencha todos os campos:

```
FATIA: <nome curto>
OBJETIVO: <uma frase, resultado esperado>
MÓDULO: <pasta>   ARQUIVOS: <lista, ou "os do módulo">
FORA DO ESCOPO: <o que ele vai ver e deve deixar quieto>
CHAVE: <RT-626 ou "sem Jira">
BRANCH: <nome>   WORKTREE: <caminho absoluto>
BATERIA: <comando literal, ex.: cd app && npx tsc -b && npx vitest run --pool=threads src/lib/x.test.ts>
DEFINIÇÃO DE PRONTO:
- <item verificável>
DECISÕES JÁ TOMADAS: <premissas e respostas do usuário que afetam a fatia>
```

## 4. Lançar

Ferramenta `Agent`, `subagent_type` igual ao nível, `run_in_background: true`, prompt igual ao brief. Não use `isolation: "worktree"`: ela cria a árvore dentro de `.claude/worktrees/`, e é exatamente a árvore que o `CLAUDE.md` do projeto proíbe. A worktree irmã já está no brief.

Lance **até 3 agentes simultâneos**. O quarto espera na fila.

## 5. A fila

A fila mora no plano (`docs/planos/PLANO-<ID>.md`, seção "Fatias"), uma linha por fatia:

| Fatia | Nível | Depende de | Branch | Estado |
|---|---|---|---|---|

Estados, nesta ordem: `na fila` → `rodando` → `entregue` → `revisada: pendente` ou `revisada: pronta`.

Regras da fila:

- **Resultado chegou?** Revise (seção 6) e, no mesmo turno, lance a próxima fatia `na fila` cuja dependência esteja `revisada: pronta`. Não espere nova cobrança do usuário.
- **Trabalho independente acumulou** enquanto os três slots estão ocupados? Ele entra `na fila`; o que o libera é um slot, não uma mensagem.
- **Pergunta no relatório** do agente? Responda você, quando o plano responde; pergunte ao usuário, quando não. Com a resposta, relance a mesma fatia no mesmo nível, na mesma branch, com o brief acrescido da decisão.
- **Fim da fila:** todas `revisada: pronta`. Só então o fechamento da etapa 8.

## 6. Revisar a entrega

Toda entrega passa pelas mesmas cinco leituras, na worktree da fatia:

1. **Escopo.** `git diff main...<branch> --stat`: só o módulo do brief. Arquivo de fora é pendência.
2. **Commits.** `git log main..<branch> --oneline`: atômicos, Conventional Commits, chave do Jira.
3. **Bateria local completa do projeto**, a mesma que o `CLAUDE.md` manda rodar antes de commitar (no radar-tributario: `cd app && npx tsc -b && npm run lint && npx vitest run --pool=threads`). O agente rodou a bateria do brief; você roda a do projeto.
4. **Migrations.** Branch que traz migration passa pelos gates do projeto: pré-push, o número (`bash supabase/scripts/numeracao_migrations.sh proximo`; divergiu, renumere e rebaseie); e `supabase db reset` como prova de ordem. O gate pós-merge (`node supabase/scripts/verificar_historico_prod.mjs`) roda quando o PR mergear, antes de qualquer `db push`. Projeto sem esses scripts: o que o `CLAUDE.md` dele nomear.
5. **Definição de Pronto** do brief, item a item.

**Decisão, sua e só sua:**

- Tudo verde → `gh pr ready <n>`. Estado `revisada: pronta`.
- Qualquer pendência → o PR fica rascunho, com as pendências listadas no corpo (`gh pr edit --body`). Estado `revisada: pendente`. Relance a fatia com a lista de pendências como brief, no mesmo nível.

## 7. Um PR por módulo

Um PR representa **um módulo**. Fatias nascem por módulo (seção 1), então o normal é um PR por fatia. Quando duas fatias tocam o mesmo módulo, a segunda rebaseia sobre a primeira e entra no PR dela; o PR da segunda fecha. Quando uma fatia cruzou módulos apesar do brief, separe por `cherry-pick` em duas branches antes de revisar, e registre no brief seguinte o que vazou.

**Merge é do usuário.** A skill abre, revisa e marca pronto. Nunca mergeia.

## 8. Limpeza

Fatia `revisada: pronta`: `git worktree remove "../<repo>-<CHAVE>-<modulo>"`. A branch fica até o merge.
