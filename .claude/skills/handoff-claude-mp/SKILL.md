---
name: handoff-claude-mp
description: Passa a conversa atual para um agente novo em segundo plano, que assume o trabalho imediatamente.
argument-hint: "Para que a próxima sessão será usada?"
disable-model-invocation: true
---

Escreva um resumo de passagem de bastão (handoff) da conversa atual, para que um agente novo consiga continuar o trabalho. Em vez de salvá-lo, lance um agente em segundo plano semeado com o resumo como prompt: `claude --bg --name "<nome descritivo>" "<resumo do handoff>"`. Ele começa no diretório de trabalho atual e retorna imediatamente; o usuário o gerencia com `claude agents`.

Sempre passe `-n`/`--name` com um nome descritivo (por exemplo, `--name "Corrigir bug de login"`); ele define o nome exibido na lista de jobs, no seletor de sessões e no título do terminal.

Inclua no resumo uma seção "skills sugeridas", nomeando para quais skills o próximo agente deve chamar a ferramenta Skill.

Não duplique conteúdo já capturado em outros artefatos (specs, planos, ADRs, issues, commits, diffs). Referencie-os por caminho ou URL.

Suprima qualquer informação sensível, como chaves de API, senhas ou dados pessoais identificáveis, já que o resumo vira o prompt do agente.

Se o usuário tiver passado argumentos, trate-os como uma descrição do foco da próxima sessão e adapte o resumo a isso.
