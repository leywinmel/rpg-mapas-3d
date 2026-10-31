# Issue tracker: GitLab

As issues e specs deste repositório vivem como issues do GitLab. Use a CLI [`glab`](https://gitlab.com/gitlab-org/cli) para todas as operações.

## Convenções

- **Criar uma issue**: `glab issue create --title "..." --description "..."`. Use um heredoc para descrições de múltiplas linhas. Passe `--description -` para abrir um editor.
- **Ler uma issue**: `glab issue view <número> --comments`. Use `-F json` para saída legível por máquina.
- **Listar issues**: `glab issue list -F json` com os filtros `--label` apropriados.
- **Comentar em uma issue**: `glab issue note <número> --message "..."`. O GitLab chama comentários de "notes".
- **Aplicar / remover labels**: `glab issue update <número> --label "..."` / `--unlabel "..."`. Múltiplas labels podem ser separadas por vírgula ou informadas repetindo a flag.
- **Fechar**: `glab issue close <número>`. O `glab issue close` não aceita um comentário de fechamento, então publique a explicação antes, com `glab issue note <número> --message "..."`, e só então feche.
- **Merge requests**: o GitLab chama PRs de "merge requests". Use `glab mr create`, `glab mr view`, `glab mr note` etc., com o mesmo formato de `gh pr ...`, trocando `pr` por `mr` e `comment`/`--body` por `note`/`--message`.

Infira o repositório a partir de `git remote -v`; o `glab` faz isso automaticamente quando rodado dentro de um clone.

## Merge requests como superfície de triagem

**MRs como superfície de solicitação: não.** _(Defina como `sim` se este repositório tratar merge requests externos como pedidos de funcionalidade; a `/triagem-mp` lê esta flag.)_

Quando definida como `sim`, os MRs passam pelas mesmas labels e estados das issues, usando os equivalentes `glab mr`:

- **Ler um MR**: `glab mr view <número> --comments` e `glab mr diff <número>` para o diff.
- **Listar MRs externos para triagem**: `glab mr list -F json` e então mantenha apenas os MRs cujo autor não seja membro/dono do projeto (o MR de um colaborador externo, não o trabalho em andamento de um mantenedor).
- **Comentar / rotular / fechar**: `glab mr note`, `glab mr update --label`/`--unlabel`, `glab mr close`.

Diferente do GitHub, o GitLab numera issues e MRs separadamente, então `#42` é inequívoco assim que você souber a qual superfície o mantenedor se refere.

## Quando uma skill disser "publique no issue tracker"

Crie uma issue do GitLab.

## Quando uma skill disser "busque o ticket relevante"

Rode `glab issue view <número> --comments`.

## Operações de mapeamento de caminho (wayfinding)

Usadas pela `/mapear-caminho-mp`. O **mapa** é uma única issue, com issues **filhas** como tickets.

- **Mapa**: uma única issue com a label `wayfinder:map`, contendo o corpo com Notas / Decisões-até-aqui / Névoa. `glab issue create --label wayfinder:map`. (Em planos do GitLab com epics nativos, um epic pode conter o mapa; uma issue com label funciona em qualquer lugar.)
- **Ticket filho**: uma issue com `Part of #<mapa>` no topo da descrição e as labels `wayfinder:<tipo>` (`research`/`prototype`/`grilling`/`task`). Uma vez reivindicado, o ticket é atribuído ao desenvolvedor que conduz.
- **Bloqueio**: o **link nativo de bloqueio** do GitLab, a representação canônica e visível na interface. Adicione-o com a ação rápida `/blocked_by #<n>`, publicada como uma note (`glab issue note <filho> --message "/blocked_by #<bloqueador>"`). Links nativos de bloqueio são um recurso Premium/Ultimate; no plano gratuito (ou onde não estiverem disponíveis), recorra a uma linha `Blocked by: #<n>, #<n>` no topo da descrição. Um ticket está desbloqueado quando todo bloqueador está fechado.
- **Consulta da fronteira**: `glab issue list -F json` restrito aos filhos do mapa; descarte os que tiverem bloqueador aberto — um link nativo `blocked_by` para uma issue aberta (`glab api projects/:id/issues/:iid/links`), ou uma issue aberta na linha `Blocked by` — ou responsável atribuído; vence o primeiro na ordem do mapa.
- **Reivindicar**: `glab issue update <n> --assignee @me`, a primeira escrita da sessão.
- **Resolver**: `glab issue note <n> --message "<resposta>"`, depois `glab issue close <n>`, e então acrescente um ponteiro de contexto (resumo + link) ao Decisões-até-aqui do mapa.
