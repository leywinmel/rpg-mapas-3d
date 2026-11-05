# Mecânica de skills

A ramificação específica de skills de [`escrever-para-agentes-mp`](../SKILL.md): o que muda quando o documento é uma skill (frontmatter, a escolha de invocação e skills roteadoras). Todo o resto sobre como escrevê-la é a referência universal no `SKILL.md`.

## Invocação

Duas escolhas, negociando as duas cargas:

- Uma skill **invocada pelo modelo** mantém uma `description`, então o agente pode dispará-la autonomamente, e outras skills conseguem alcançá-la. Você ainda pode digitar o nome dela: a invocação pelo modelo sempre _inclui_ o alcance do usuário; uma descrição apenas acrescenta a descoberta pelo agente, nunca remove a do humano. A descrição é o ponteiro de contexto de topo da skill, forçado a permanecer carregado o tempo todo: carga de contexto permanente em troca de descobribilidade. Uma skill invocada pelo modelo cujo conteúdo é todo referência também é um lar para referência compartilhada: outra skill pode invocá-la, então a referência de que várias skills precisam vive em um só lugar. Mecânica: omita `disable-model-invocation` e escreva uma descrição voltada ao modelo carregando as ramificações de gatilho (as regras de escrita de ponteiro do `SKILL.md` valem integralmente).
- Uma skill **invocada pelo usuário** tira a descrição do alcance do agente: só o humano digitando o nome dela consegue invocá-la, e nenhuma outra skill consegue. Carga de contexto zero, mas ela gasta carga cognitiva: você é o índice que precisa lembrar que ela existe. Mecânica: defina `disable-model-invocation: true`; a `description` passa a ser voltada ao humano — um resumo de uma linha, sem listas de gatilhos.

Escolha invocação pelo modelo apenas quando o agente precisar alcançar a skill por conta própria, ou quando outra skill precisar. Se ela só dispara na mão, faça-a invocada pelo usuário e não pague carga de contexto nenhuma.

Referência compartilhada de que duas skills invocadas pelo usuário precisam não pode viver em nenhuma das duas: sem descrições, nenhuma consegue disparar a outra. Empurre-a para um arquivo simples fora do sistema de skills: referência externa para a qual qualquer skill pode apontar.

## Dividir por invocação

O corte por invocação (o corte por sequência está no `SKILL.md`): separe uma skill invocada pelo modelo quando você tiver uma palavra-guia distinta que deva dispará-la sozinha (uma palavra-gatilho que você de fato usa nos seus prompts), ou quando outra skill precisar alcançá-la. Você paga carga de contexto pela nova descrição sempre carregada, então esse alcance independente precisa valer a pena.

## Skills roteadoras

Quando as skills invocadas pelo usuário se multiplicam além do que você consegue lembrar, essa carga cognitiva acumulada é curada por uma **skill roteadora**: uma única skill invocada pelo usuário que nomeia as outras e diz quando recorrer a cada uma, para que o humano tenha uma skill para lembrar em vez de muitas. Ela só consegue sugerir, nunca disparar as outras: skills invocadas pelo usuário não têm descrição, então nada além do humano consegue alcançá-las.
