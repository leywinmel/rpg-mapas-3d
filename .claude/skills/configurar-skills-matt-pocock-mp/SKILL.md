---
name: configurar-skills-matt-pocock-mp
description: "Configura este repositório para as skills de engenharia: define o issue tracker, o vocabulário de labels de triagem e o layout dos documentos de domínio. Rode uma vez antes do primeiro uso das demais skills de engenharia."
disable-model-invocation: true
---

# Configurar as Skills do Matt Pocock

Monte a configuração por repositório que as skills de engenharia pressupõem:

- **Issue tracker**: onde as issues vivem (GitHub por padrão; markdown local também é suportado de fábrica)
- **Labels de triagem**: as strings usadas para os cinco papéis canônicos de triagem
- **Documentos de domínio**: onde vivem o `CONTEXT.md` e os ADRs, e as regras de consumo para lê-los

Esta é uma skill guiada por prompt, não um script determinístico. Explore, apresente o que encontrou, confirme com o usuário e então escreva.

## Processo

### 1. Explore

Olhe o repositório atual para entender o estado inicial dele. Leia o que existe; não presuma:

- `git remote -v` e `.git/config`: este é um repositório do GitHub? Qual?
- `AGENTS.md` e `CLAUDE.md` na raiz do repositório: algum deles existe? Já existe uma seção `## Agent skills` em algum?
- `CONTEXT.md` e `CONTEXT-MAP.md` na raiz do repositório
- `docs/adr/` e quaisquer diretórios `src/*/docs/adr/`
- `docs/agents/`: a saída anterior desta skill já existe?
- `.scratch/`: um sinal de que já se usa a convenção de issue tracker em markdown local
- A skill `triagem-mp` está instalada? (uma pasta de skill `triagem-mp` ao lado desta, ou `triagem-mp` entre as skills disponíveis.) Isso decide se a Seção B roda ou não.
- Sinais de monorepo: um `pnpm-workspace.yaml`, um campo `workspaces` no `package.json`, ou um `packages/*` povoado com `src/` próprio. Isso só aparece em um repositório genuinamente grande e multipacote; a ausência significa contexto único, que é o caso de quase todo repositório.

### 2. Apresente os achados e pergunte

Resuma o que está presente e o que está faltando. Depois percorra as seções em ordem. Uma seção, uma resposta, e então a seguinte.

Comece cada seção pela resposta recomendada, para que o usuário possa aceitá-la em uma palavra. Dê uma explicação de uma linha apenas quando a escolha genuinamente se ramificar; pule a seção inteira quando a exploração já a tiver resolvido (Seção B quando a `triagem-mp` não estiver instalada, Seção C quando não houver monorepo).

**Seção A: Issue tracker.**

> Explicação: o "issue tracker" é onde as issues deste repositório vivem. Skills como `gerar-tickets-mp`, `triagem-mp` e `gerar-spec-mp` leem e escrevem nele. Elas precisam saber se devem chamar `gh issue create`, escrever um arquivo markdown em `.scratch/`, ou seguir algum outro fluxo que você descreva. Escolha o lugar onde você de fato acompanha o trabalho deste repositório.

Postura padrão: estas skills foram projetadas para o GitHub. Se um `git remote` apontar para o GitHub, proponha isso. Se um `git remote` apontar para o GitLab (`gitlab.com` ou um host auto-hospedado), proponha GitLab. Caso contrário (ou se o usuário preferir), ofereça:

- **GitHub**: as issues vivem no GitHub Issues do repositório (usa a CLI `gh`)
- **GitLab**: as issues vivem no GitLab Issues do repositório (usa a CLI [`glab`](https://gitlab.com/gitlab-org/cli))
- **Markdown local**: as issues vivem como arquivos em `.scratch/<funcionalidade>/` neste repositório (bom para projetos solo ou repositórios sem remoto)
- **Outro** (Jira, Linear etc.): peça ao usuário que descreva o fluxo em um parágrafo; a skill vai registrá-lo como prosa livre

Registre a escolha em `docs/agents/issue-tracker.md`. Os templates de GitHub e GitLab carregam uma flag de "PRs como superfície de solicitação", desligada por padrão. Deixe desligada e não levante o assunto: quem quiser PRs externos na fila de triagem pode virar a flag no arquivo depois.

**Seção B: vocabulário de labels de triagem.** Pule esta seção inteira se a skill `triagem-mp` não estiver instalada (a exploração já te disse isso), já que uma skill não instalada não precisa de labels.

Se estiver instalada, faça exatamente uma pergunta:

> Você quer manter as labels de triagem padrão? (recomendado: **sim**)

Os padrões são os cinco papéis canônicos, com cada string de label igual ao nome dela: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Se for **sim**, escreva-os como estão. Só se o usuário disser não — normalmente porque o tracker dele já usa outros nomes (por exemplo, `bug:triage` no lugar de `needs-triage`) — colete as substituições, para que a `triagem-mp` aplique labels existentes em vez de criar duplicatas.

**Seção C: documentos de domínio.** Use **contexto único** por padrão (um `CONTEXT.md` + `docs/adr/` na raiz do repositório). Isso serve para quase todo repositório; escreva sem perguntar.

Ofereça **múltiplos contextos** (um `CONTEXT-MAP.md` na raiz apontando para arquivos `CONTEXT.md` por contexto) apenas quando a exploração encontrar sinais de monorepo. Nesse caso, confirme qual layout ele quer.

### 3. Confirme e edite

Mostre ao usuário um rascunho de:

- O bloco `## Agent skills` a ser adicionado ao `CLAUDE.md` ou ao `AGENTS.md`, o que estiver sendo editado (veja o passo 4 para as regras de escolha)
- O conteúdo de `docs/agents/issue-tracker.md`, `docs/agents/domain.md` e `docs/agents/triage-labels.md` (o último apenas quando a `triagem-mp` estiver instalada)

Deixe que ele edite antes de você escrever.

### 4. Escreva

**Escolha o arquivo a editar:**

- Se o `CLAUDE.md` existir, edite-o.
- Senão, se o `AGENTS.md` existir, edite-o.
- Se nenhum dos dois existir, pergunte ao usuário qual criar; não escolha por ele.

Nunca crie o `AGENTS.md` quando o `CLAUDE.md` já existe (e vice-versa); sempre edite o que já está lá.

Se já existir um bloco `## Agent skills` no arquivo escolhido, atualize o conteúdo dele no lugar, em vez de acrescentar uma duplicata. Não sobrescreva edições do usuário nas seções ao redor.

O bloco:

```markdown
## Agent skills

### Issue tracker

[resumo de uma linha de onde as issues são acompanhadas]. Veja `docs/agents/issue-tracker.md`.

### Triage labels

[resumo de uma linha do vocabulário de labels]. Veja `docs/agents/triage-labels.md`.

### Domain docs

[resumo de uma linha do layout: "contexto único" ou "múltiplos contextos"]. Veja `docs/agents/domain.md`.
```

Inclua o subbloco `### Triage labels`, e escreva o `docs/agents/triage-labels.md`, apenas quando a `triagem-mp` estiver instalada e a Seção B tiver rodado. Quando não estiver, ambos são omitidos.

Depois escreva os arquivos de documentação usando como ponto de partida os templates-semente desta pasta de skill:

- [references/issue-tracker-github.md](references/issue-tracker-github.md): issue tracker no GitHub
- [references/issue-tracker-gitlab.md](references/issue-tracker-gitlab.md): issue tracker no GitLab
- [references/issue-tracker-local.md](references/issue-tracker-local.md): issue tracker em markdown local
- [references/labels-de-triagem.md](references/labels-de-triagem.md): mapeamento de labels (apenas se a `triagem-mp` estiver instalada)
- [references/dominio.md](references/dominio.md): regras de consumo dos documentos de domínio + layout

Para issue trackers do tipo "outro", escreva o `docs/agents/issue-tracker.md` do zero, a partir da descrição do usuário.

### 5. Pronto

Diga ao usuário que a configuração está completa e quais skills de engenharia passarão a ler desses arquivos. Mencione que ele pode editar `docs/agents/*.md` diretamente depois; rodar esta skill de novo só é necessário se ele quiser trocar de issue tracker ou recomeçar do zero.
