---
name: escrita-forma-mp
description: "Escrita, fase de explorar-a-fundo (exploit): dá forma ao material bruto transformando-o em um artigo, parágrafo a parágrafo."
disable-model-invocation: true
---

<what-to-do>

O usuário passou (ou vai passar) um arquivo markdown de material bruto. Trate-o como a pilha de entrada: pode ser desde uma lista organizada de fragmentos até um paredão de prosa sem estrutura ou uma transcrição. O formato não importa. Leia-o de ponta a ponta antes de qualquer outra coisa.

Depois conduza uma sessão de modelagem que produza um documento de artigo separado. Esta é a fase de **exploit**: a exploração acabou, a pilha está fechada — comprometa-se com uma estrutura e minere a pilha para preenchê-la. Não edite o arquivo de material bruto: ele é somente leitura para esta skill.

Se o usuário não disser onde salvar o artigo, pergunte uma vez e memorize o caminho.

</what-to-do>

<supporting-info>

## O ciclo

1. **Leia a pilha.** Leia o arquivo de entrada por inteiro. Forme uma noção do que há nele.
2. **Estabeleça os pré-requisitos.** Acerte com o usuário o que o leitor sabe ao entrar: os conceitos que estão **ancorados** desde o início. Todo o resto precisa ser ancorado por um bloco antes que um bloco posterior possa se apoiar nele. Veja [Ancoragem](#ancoragem).
3. **Rascunhe 2–3 aberturas candidatas.** Cada abertura deve implicar uma tese ou um ângulo diferente para o artigo. Mostre todas. Force o usuário a escolher uma ou compor um híbrido. A abertura escolhida define o que o resto do artigo precisa fazer.
4. **Cresça parágrafo a parágrafo.** Depois que a abertura entrar, pergunte "dada esta abertura, o que o leitor precisa ouvir em seguida?". Puxe material da pilha para responder. O bloco seguinte só pode se apoiar em conceitos ancorados, e ancora novos ao entrar. Discuta a forma que o próximo bloco assume: um parágrafo, uma lista, uma tabela, um destaque, uma citação, um bloco de código. Cada escolha de formato deve ser deliberada e defensável.
5. **Acrescente ao arquivo do artigo conforme avança.** Não acumule em lote. Escreva cada parágrafo ou bloco acordado imediatamente, para que o usuário veja o artigo ganhando forma.
6. **Repita o passo 4 até o artigo estar pronto.** O usuário decide quando está pronto.

## Ancoragem

Todo **conceito** precisa estar **ancorado** antes que um bloco possa se apoiar nele: ou o leitor já entrou sabendo, ou encontrou o conceito em um bloco anterior. Um bloco que recorre a um conceito não ancorado perde o leitor. A unidade é o conceito, não a palavra que o nomeia: um bloco pode se apoiar em uma ideia que falta ao leitor mesmo sem nenhum jargão à vista. Quando um conceito tem um nome (um **termo**), ancorá-lo significa fixar a ideia e o termo juntos.

Um conceito é ancorado de duas maneiras:

- **Pré-requisito**: ancorado antes da abertura. O leitor traz consigo. Fixado no início.
- **Introduzido**: um bloco o estabelece e, dali em diante, ele fica ancorado para o resto do artigo.

Mantenha uma lista corrente do que está ancorado. Quando você perguntar "o que o leitor precisa ouvir em seguida?", um conceito não ancorado de que o próximo movimento precisa é, ele mesmo, a resposta: ancore-o primeiro (aqui ou em um bloco anterior) ou você não consegue fazer o movimento. Isso é a nomeação de lacunas de [Puxando da pilha](#puxando-da-pilha) um nível acima: lá falta material na pilha; aqui falta fundação no artigo.

A alavanca é o que você transforma em pré-requisito versus o que você ancora dentro do artigo. Exija demais de antemão e você exclui leitores; ancore demais lá dentro e a abertura se afoga em definições. Acerte isso com o usuário ao estabelecer os pré-requisitos.

## Clima da conversa

Isto é uma sessão de sabatina invertida. Na ideação, a pergunta era "o que você está de fato notando?". Aqui é "o que este artigo está de fato defendendo, e em que ordem o leitor precisa ouvir isso?". Confronte. Recuse-se a deixar passar transições fracas. Se um parágrafo não conquistar o lugar dele, corte.

Movimentos específicos para usar sempre:

- "O que este parágrafo faz pelo leitor que o anterior não fez?"
- "Se eu cortar isto, o que quebra?"
- "Isto é prosa ou deveria ser uma lista? Por que prosa?"
- "Esta frase está fazendo dois trabalhos: separe-a ou escolha um."
- "A abertura prometeu X. Nós derivamos para Y. Ou costure de volta, ou mude a abertura."

## Puxando da pilha

Trate o material bruto como uma pedreira, não como um roteiro. Puxe um fragmento, retrabalhe-o para caber no parágrafo ao redor e posicione-o. Um fragmento pode ser dividido entre vários parágrafos, fundido com outro ou parafraseado. O trabalho da pilha é ser minerada; o trabalho do artigo é soar como uma única voz.

Se faltar na pilha algo de que o artigo precisa, nomeie a lacuna explicitamente: "Precisamos de um exemplo aqui e a pilha não tem nenhum. Me dê um agora ou cortamos esta seção."

## Discussões de formato que você deve realmente ter

Ao escolher como renderizar um bloco, pese estes trade-offs em voz alta com o usuário, não em silêncio:

- **Prosa vs. lista.** Prosa carrega argumento; listas carregam itens paralelos. Se os itens não forem verdadeiramente paralelos, prosa é melhor. Se forem, a lista é mais rápida de escanear.
- **Embutido vs. destaque.** Dicas, avisos e comentários laterais vão em destaques (`> [!TIP]`, `> [!NOTE]`), mas só se, embutidos, eles genuinamente descarrilhariam o argumento principal. Caso contrário, deixe-os embutidos.
- **Tabela vs. estrutura repetida.** Se o mesmo formato se repete 3 ou mais vezes com os mesmos campos, use tabela. Caso contrário, prosa com aberturas em negrito.
- **Citação vs. paráfrase.** Cite quando a formulação original for o ponto. Parafraseie quando só a ideia importar.
- **Bloco de código vs. código embutido.** Multilinha, executável ou ilustrativo → bloco. Um único token ou identificador → embutido.

## Ritmo de escrita

Acrescente ao arquivo do artigo conforme cada bloco for acordado. Releia o arquivo a partir do disco antes de cada escrita: o usuário pode ter editado entre os turnos. Nunca sobrescreva às cegas. Se o usuário quiser um parágrafo reescrito, edite aquele parágrafo específico no lugar; deixe o resto intacto.

## Fora de escopo

- Garimpar novos fragmentos que não estão na pilha (trate lacunas como em "Puxando da pilha").
- Editar o arquivo de material bruto.
- Publicar, formatar para uma plataforma específica, ou adicionar frontmatter que o usuário não pediu.

</supporting-info>
