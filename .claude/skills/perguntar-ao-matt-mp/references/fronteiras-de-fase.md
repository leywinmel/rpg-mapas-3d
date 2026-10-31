# Fronteiras de fase

Uma **fase** é um bloco de trabalho dentro de uma sessão: a sabatina, a implementação, o QA. A definição é vaga de propósito: uma fase termina quando você pensa *"ok, terminamos aquilo"*.

A **fronteira de fase** é o intervalo entre duas fases, e é o único lugar ao qual esta decisão pertence. No meio de uma fase não há decisão a tomar: continue, ou divida o trabalho restante em subagentes. Compactar no meio de uma fase faz o agente perder o fio.

## As cinco opções

| Opção          | O que faz                                                                 |
| -------------- | ------------------------------------------------------------------------- |
| **Continuar**  | Fica na sessão. Nenhuma troca de contexto.                                 |
| **`/clear`**   | Esvazia a janela de contexto e começa do zero.                             |
| **`/handoff-mp`** | Escreve um arquivo markdown portátil e semeia uma sessão em qualquer lugar com ele. |
| **Subagente**  | Manda a tarefa para a própria janela de contexto dela e recebe um relatório. |
| **`/compact`** | Comprime este contexto e semeia uma sessão nova com o resumo.               |

## A árvore

Trabalhe de cima para baixo, na fronteira. O primeiro **sim** vence.

**1. Você consegue continuar nesta sessão?** Duas coisas fazem a resposta ser sim: a próxima fase precisa desta fase como **fonte primária**, ou você ainda tem [zona inteligente](https://www.aihero.dev/ai-coding-dictionary/smart-zone) suficiente (~150 mil tokens) para a próxima fase caber. Sabatina → implementação é o sim padrão: a implementação quer o raciocínio literal, não um resumo dele. Continuar não custa nada e não perde nada, então descarte essa opção antes de qualquer outra.

**2. O contexto é irrelevante para o que vem a seguir?** Tudo nesta sessão (a exploração, as decisões, os becos sem saída) é descartável? Se for, dê **`/clear`**. É o movimento mais barato do tabuleiro: não leva tempo e devolve a janela inteira. O `/clear` também não é terminal: a sessão antiga continua retomável.

O custo de errar aqui é irreversível. Limpe um contexto *relevante* e você perde o **porquê** por trás do que construiu, e nenhuma releitura do diff traz isso de volta.

**3. Você precisa passar o bastão?** O `/handoff-mp` é estreito. Você só precisa dele quando está:

- trocando para um **novo ambiente** (Claude → Codex),
- movendo para um **novo diretório** ou repositório,
- enviando o trabalho para um **colega**,
- ou bifurcando uma tarefa lateral que você encontrou **no meio de uma fase**, sem descarrilhar o que está fazendo.

Essa lista é a cláusula inteira. O que o `/handoff-mp` compra é **portabilidade**: um arquivo que viaja. Se nada está viajando, você não precisa dele.

**4. A tarefa pode ser feita AFK?** Ela está delimitada o bastante para rodar com você longe do teclado, sem direcionamento? Então mande-a para um **subagente** e deixe esta sessão intocada. Revisão automatizada é o caso padrão: o agente lê o diff e reporta, e você não é necessário enquanto isso.

**5. Caso contrário, `/compact`.** Contexto relevante, mesmo ambiente, mesmo diretório, e você precisa continuar no ciclo: é aqui que a árvore termina, e ela termina aqui com frequência. Passe uma instrução (`/compact vamos fazer QA desta área`), para que o resumo preserve o que a próxima fase precisa.

O `/compact` é o **padrão, não a primeira escolha**. Ele fica no fim porque as quatro perguntas acima dele são todas mais baratas ou mais precisas. O modo de falha de quem começa por aqui é uma sessão nova confiantemente errada sobre uma decisão que o resumo achatou.

## Fontes primárias e secundárias

Todo movimento, exceto **Continuar**, transforma uma **fonte primária** em uma **fonte secundária**: a sessão como ela aconteceu, substituída por um resumo dela. A troca tem sempre o mesmo formato:

| Fonte                                | Informação | Ruído | Espaço de manobra |
| ------------------------------------ | ---------- | ----- | ----------------- |
| Primária (Continuar)                 | Completa   | Muito | Pouco             |
| Secundária (`/compact`, `/handoff-mp`) | Com perdas | Menos | Muito             |

É por isso que a pergunta 1 vem primeiro. Você só paga a perda de informação quando ficar custa mais do que economiza.

## Isto é julgamento

As perguntas não são objetivas: cada uma tem gosto embutido, e a mesma fronteira pode ir para dois lados em dois dias diferentes. O valor está em fazê-las **em ordem**, na fronteira e não no meio do trabalho.
