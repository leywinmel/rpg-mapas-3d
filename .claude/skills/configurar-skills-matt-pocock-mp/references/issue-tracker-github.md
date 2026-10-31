# Issue tracker: GitHub

As issues e specs deste repositório vivem como issues do GitHub. Use a CLI `gh` para todas as operações.

## Convenções

- **Criar uma issue**: `gh issue create --title "..." --body "..."`. Use um heredoc para corpos de múltiplas linhas.
- **Ler uma issue**: `gh issue view <número> --comments`, filtrando os comentários com `jq` e buscando também as labels.
- **Listar issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` com os filtros `--label` e `--state` apropriados.
- **Comentar em uma issue**: `gh issue comment <número> --body "..."`
- **Aplicar / remover labels**: `gh issue edit <número> --add-label "..."` / `--remove-label "..."`
- **Fechar**: `gh issue close <número> --comment "..."`

Infira o repositório a partir de `git remote -v`; o `gh` faz isso automaticamente quando rodado dentro de um clone.

## Pull requests como superfície de triagem

**PRs como superfície de solicitação: não.** _(Defina como `sim` se este repositório tratar PRs externos como pedidos de funcionalidade; a `/triagem-mp` lê esta flag.)_

Quando definida como `sim`, os PRs passam pelas mesmas labels e estados das issues, usando os equivalentes `gh pr`:

- **Ler um PR**: `gh pr view <número> --comments` e `gh pr diff <número>` para o diff.
- **Listar PRs externos para triagem**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` e então mantenha apenas os com `authorAssociation` igual a `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR` ou `NONE` (descarte `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comentar / rotular / fechar**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

O GitHub compartilha um mesmo espaço de numeração entre issues e PRs, então um `#42` solto pode ser qualquer um dos dois: resolva com `gh pr view 42` e recorra a `gh issue view 42` como alternativa.

## Quando uma skill disser "publique no issue tracker"

Crie uma issue do GitHub.

## Quando uma skill disser "busque o ticket relevante"

Rode `gh issue view <número> --comments`.

## Operações de mapeamento de caminho (wayfinding)

Usadas pela `/mapear-caminho-mp`. O **mapa** é uma única issue, com issues **filhas** como tickets.

- **Mapa**: uma única issue com a label `wayfinder:map`, contendo o corpo com Notas / Decisões-até-aqui / Névoa. `gh issue create --label wayfinder:map`.
- **Ticket filho**: uma issue ligada ao mapa como sub-issue do GitHub (`gh api` no endpoint de sub-issues). Onde sub-issues não estiverem habilitadas, adicione o filho a uma lista de tarefas no corpo do mapa e coloque `Part of #<mapa>` no topo do corpo do filho. Labels: `wayfinder:<tipo>` (`research`/`prototype`/`grilling`/`task`). Uma vez reivindicado, o ticket é atribuído ao desenvolvedor que conduz.
- **Bloqueio**: as **dependências nativas de issue** do GitHub, a representação canônica e visível na interface. Adicione uma aresta com `gh api --method POST repos/<owner>/<repo>/issues/<filho>/dependencies/blocked_by -F issue_id=<id-do-bloqueador>`, em que `<id-do-bloqueador>` é o **id numérico de banco** do bloqueador (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _não_ o `#número` nem o `node_id`). O GitHub reporta `issue_dependencies_summary.blocked_by` (apenas bloqueadores abertos, o portão vivo). Onde as dependências não estiverem disponíveis, recorra a uma linha `Blocked by: #<n>, #<n>` no topo do corpo do filho. Um ticket está desbloqueado quando todo bloqueador está fechado.
- **Consulta da fronteira**: liste os filhos abertos do mapa (`gh issue list --state open`, restrito às sub-issues / lista de tarefas do mapa), descarte os que tiverem bloqueador aberto (`issue_dependencies_summary.blocked_by > 0`, ou uma issue aberta na linha `Blocked by`) ou responsável atribuído; vence o primeiro na ordem do mapa.
- **Reivindicar**: `gh issue edit <n> --add-assignee @me`, a primeira escrita da sessão.
- **Resolver**: `gh issue comment <n> --body "<resposta>"`, depois `gh issue close <n>`, e então acrescente um ponteiro de contexto (resumo + link) ao Decisões-até-aqui do mapa.
