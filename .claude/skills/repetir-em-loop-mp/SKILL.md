---
name: repetir-em-loop-mp
description: Me sabatine sobre as specs dos fluxos de trabalho que eu quero construir dentro deste workspace.
disable-model-invocation: true
argument-hint: "Um fluxo de trabalho a projetar, ou nada para ir descobrir um"
---

Conduza uma sessão com estado de `/sabatina-mp` cuja única saída sejam specs de **fluxos de trabalho**. Use a disciplina da sabatina (implacável, uma rodada de perguntas por vez, com uma resposta recomendada anexada a cada uma) voltada ao vocabulário e ao objetivo abaixo. Crie, edite e apague specs conforme a sabatina for resolvendo as questões.

## A lente do loop

Um **loop** é um padrão recorrente na vida do usuário: a carreira dele, a semana dele, a manhã dele, uma única atividade repetida. Enxergar uma vida como loops dentro de loops revela o quanto as atividades são de fato previsíveis, e é isso que as torna dignas de **delegação**. Use a lente para encontrar loops que valem a pena especificar, e proponha os que o usuário ainda não percebeu.

Um **fluxo de trabalho** é a spec de um loop, tornada real. Você roda um fluxo de trabalho em um loop: o loop é a instância em execução dele. Fluxos de trabalho vivem em `workflows/*.md` e são a fonte da verdade.

## Vocabulário

Uma linguagem compartilhada, invocada apenas quando o fluxo de trabalho exigir: nunca uma lista de verificação. **Não imponha nada estrutural**: um fluxo não precisa de IA, nem de ponto de checagem, nem de agendamento, a menos que a sabatina mostre que precisa.

- **Gatilho**: o que dispara cada execução — um **evento** (um novo e-mail, uma nova issue) ou um **agendamento** (toda manhã). Disparar por evento costuma ser mais eficiente.
- **Ponto de checagem**: um ponto com humano no ciclo, em que se pede ao usuário que verifique ou decida. Alguns fluxos não têm nenhum e rodam de forma autônoma; alguns não usam IA nenhuma.
- **Empurre para a direita**: adie o ponto de checagem o máximo que der. Faça o máximo de trabalho antes de envolver o humano, para que ele seja consultado uma vez, tarde, com tudo já preparado.
- **Briefing**: o que um ponto de checagem apresenta — um resumo enxuto e pronto para decisão (o que foi produzido, por quê, e um link descendo até o artefato em si), nunca a saída bruta. O usuário lê um briefing, não um rascunho. Velocidade de revisão é imperativa.

## Definição de pronto

Uma spec de fluxo de trabalho está pronta quando um agente implementador conseguiria construí-la sem fazer uma única pergunta. Sabatine até chegar lá; nada está pronto enquanto restar uma pergunta.

## O workspace

- `workflows/*.md`: uma spec por fluxo de trabalho.
- `NOTES.md`: anotações brutas sobre o mundo do usuário, as ferramentas que ele usa, os canais que ele processa e a terminologia própria dele para ambos. Quando estiver vazio ou raso, entreviste-o sobre o mundo dele antes de especificar qualquer coisa. Afie termos imprecisos em termos canônicos conforme eles surgirem, e registre-os aqui.
