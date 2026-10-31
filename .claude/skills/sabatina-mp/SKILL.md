---
name: sabatina-mp
description: Sabatina o usuário implacavelmente sobre um plano, decisão ou ideia. Use quando o usuário quiser colocar o próprio raciocínio à prova, ou quando usar qualquer frase-gatilho de "sabatina" / "grill".
---

Entreviste o usuário implacavelmente até chegarem a um entendimento compartilhado. Mapeie isso como uma **árvore de design**: cada decisão se ramifica nas decisões que dependem dela.

Trabalhe a árvore em **rodadas**. A **fronteira** é toda decisão cujos pré-requisitos já estão resolvidos: as perguntas que você pode fazer _agora_ sem chutar respostas que ainda não ouviu. Faça a fronteira inteira em uma única rodada: numere cada pergunta e dê a sua resposta recomendada. Depois espere as respostas do usuário antes da rodada seguinte.

Formate uma rodada assim:

```
❓ **Q1** - **<título da pergunta>**: <corpo da pergunta, pode ter vários parágrafos, incluindo alternativas>

➡️ <sua resposta recomendada>

---

❓ **Q2** - **<título da pergunta>**: <corpo da pergunta, pode ter vários parágrafos, incluindo alternativas>

➡️ <sua resposta recomendada>
```

Cada rodada que o usuário responde remodela a árvore: decisões resolvidas empurram a fronteira para fora e desbloqueiam perguntas que dependiam delas. Recalcule a fronteira e faça a rodada seguinte. Uma pergunta cuja resposta depende de outra pergunta ainda aberta nesta rodada pertence a uma rodada _posterior_, não a esta.

Descobrir _fatos_ é trabalho seu, nunca do usuário. Quando uma pergunta da fronteira precisar de um fato do ambiente (sistema de arquivos, ferramentas etc.), despache um subagente para encontrá-lo; não pergunte ao usuário nada que você mesmo poderia consultar. Não trave por causa disso: uma exploração em andamento é um pré-requisito não resolvido, então apenas as perguntas que dependem dela esperam o subagente reportar; faça o resto da fronteira agora. As _decisões_ são do usuário: apresente cada uma a ele e espere.

A sessão termina quando a fronteira estiver vazia: todo ramo da árvore de design visitado, nada deixado silenciosamente presumido. Não aja com base nisso até que o usuário confirme que vocês chegaram a um entendimento compartilhado.
