---
name: handoff-mp
description: Handoff — compacta a conversa atual num documento de passagem de bastão em handoff/ do projeto, para outro agente continuar. Acionar quando o usuário pedir handoff ou passar o bastão, e quando a executar-projeto parar por limite de uso.
argument-hint: "Para que a próxima sessão será usada?"
---

Escreva um documento de handoff resumindo a conversa atual, para que um agente novo consiga continuar o trabalho. O documento mora **dentro do projeto**, na pasta `handoff/`, nunca em diretório temporário.

## Onde salvar

O caminho é sempre:

```
<raiz do projeto>\handoff\<subprojeto ou chaves do Jira>\<NNN> - <DD_MM_AAAA> <resumo>.md
```

Resolva cada parte nesta ordem, criando as pastas que faltarem:

1. **Raiz do projeto** — a raiz do checkout principal, que não some quando a worktree for apagada:
   ```bash
   git rev-parse --git-common-dir
   ```
   A raiz é a pasta pai do `.git` devolvido. Sem git, use o diretório de trabalho atual.
2. **Subpasta** — a(s) chave(s) do Jira da tarefa (`RT-626`), lidas da branch, dos commits ou da conversa; várias chaves unidas por `+` (`RT-626+RT-578`). Sem chave, o nome do subprojeto em kebab-case (`menu-de-skills`). Se nenhum dos dois puder ser inferido, pergunte ao usuário antes de salvar.
3. **Ordenador** — três dígitos, por subpasta: o maior `NNN` já existente nela mais um; `001` quando a subpasta está vazia. Liste a subpasta antes de numerar.
4. **Data** — a de hoje, em `DD_MM_AAAA`.
5. **Resumo** — até 30 caracteres, sem `\ / : * ? " < > |`, dizendo o foco do handoff (`menu instalar e exportar`).

Exemplo pronto: `C:\repos\radar\handoff\RT-626\003 - 06_10_2026 folga do centavo.md`.

Termine informando o caminho completo onde o documento foi salvo.

## O que vai no documento

Inclua uma seção "skills sugeridas", nomeando para quais skills o próximo agente deve chamar a ferramenta Skill.

Quando a `executar-projeto` estiver no meio de uma fila de agentes, inclua a tabela de fatias do plano com o estado de cada uma, as branches e os PRs abertos, e o caminho do plano. É isso que a próxima sessão precisa para retomar sem relançar o que já entregou.

Não duplique conteúdo já capturado em outros artefatos (specs, planos, ADRs, issues, commits, diffs). Referencie-os por caminho ou URL. Handoffs anteriores da mesma subpasta contam como artefato: aponte para eles em vez de repeti-los.

Suprima qualquer informação sensível, como chaves de API, senhas ou dados pessoais identificáveis.

Se o usuário tiver passado argumentos, trate-os como uma descrição do foco da próxima sessão e adapte o documento a isso.
