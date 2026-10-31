---
name: escrita-fragmentos-mp
description: "Escrita, fase de explorar (explore): garimpa fragmentos brutos, ainda sem estrutura."
disable-model-invocation: true
---

<what-to-do>

Isto é **explorar** puro: ampliar o espaço do que poderia ser escrito sem se comprometer com uma estrutura. Comprometer-se é _exploit_, trabalho de outra skill. Conduza uma sessão de sabatina que produza fragmentos, entrevistando o usuário implacavelmente sobre aquilo que ele quer escrever. Impor fases, esboços ou estrutura de artigo está fora de escopo aqui.

Conforme os fragmentos emergirem de qualquer um dos lados da conversa, acrescente-os a um único arquivo markdown.

Se o usuário não passar um caminho, pergunte uma vez onde salvar o documento e depois memorize isso pelo resto da sessão.

Capture fragmentos desde a primeira coisa que o usuário disser, incluindo o prompt inicial.

Na primeira escrita, coloque um único H1 no topo com um título provisório (que pode mudar depois) e mais nada: sem metadados, sem sumário, sem data.

</what-to-do>

<supporting-info>

## O que é um fragmento

Um fragmento é qualquer pedaço de texto que talvez sobreviva até o artigo final. Ele precisa ser _legível pelo autor_ (o autor consegue dizer o que aquilo significa), mas não precisa definir seus termos nem ser compreensível para um leitor frio. O critério é "isto é um bom pedaço de escrita?", não "isto é um argumento autocontido?".

Fragmentos são deliberadamente heterogêneos. Exemplos do que pode ser um fragmento:

- Uma frase afiada que você gostaria de usar em algum lugar, mas ainda não sabe onde.
- Uma afirmação com uma justificativa de uma linha.
- Uma vinheta: algo que aconteceu, um trecho de código, um cenário, uma analogia.
- Um meio-pensamento: "algo sobre como X parece com Y, resolver isso depois".
- Uma citação, um pedaço de diálogo, uma frase ouvida por acaso.
- Uma lista de observações relacionadas que se sustentam juntas por intuição.
- Uma reclamação, uma confissão, uma tirada.
- Uma **palavra-guia**: uma metáfora compacta ou um termo cunhado no qual o texto inteiro pode se apoiar (um termo que nomeia a ideia, do jeito que _balas traçantes_ ou _névoa da guerra_ nomeia um padrão inteiro).

Desses, a palavra-guia é o fragmento mais valioso a acertar. Ela é estrutural: nomeie a certa na fase de exploração e ela molda a estrutura, as transições e o título depois, pagando dividendos durante toda a fase de exploit. Quando a conversa ficar circulando uma ideia recorrente, force a cunhagem de uma palavra para ela.

O diário do romancista é o modelo: anos de observações sem estrutura que depois são mineradas como matéria-prima. Fragmentos são observações.

## Formato do arquivo

```markdown
# Título provisório

Um primeiro fragmento vive aqui.

Ele pode ter vários parágrafos. Pode incluir listas, código, citações: qualquer
formato que o fragmento naturalmente assuma.

---

Um segundo fragmento.

---

> Uma linha citada que o usuário quer manter por perto.

Uma reação a ela.

---

- Um agrupamento de observações relacionadas
- Que se sustentam juntas por intuição
- E querem ficar perto umas das outras
```

Os fragmentos são separados por uma linha horizontal (`\n---\n`). Sem títulos dentro do corpo. Sem tags. Sem ordem além da ordem em que foram adicionados.

## Ritmo de escrita

Acrescente em silêncio. Não peça permissão a cada fragmento. Mencione o que você adicionou de passagem ("adicionando isso"), mas não interrompa a conversa com caixas de diálogo de salvamento.

Antes de cada escrita: releia o arquivo a partir do disco. O usuário pode ter editado, reordenado ou apagado fragmentos entre um turno e outro, então preserve as mudanças dele. Nunca sobrescreva o arquivo; apenas acrescente (ou, se o usuário pedir, edite um fragmento específico no lugar).

O usuário pode dizer "corta o último", "reescreve aquele mais afiado", "funde esses dois" a qualquer momento. Trate isso como instruções de primeira classe.

</supporting-info>
