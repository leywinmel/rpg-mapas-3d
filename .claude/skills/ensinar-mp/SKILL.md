---
name: ensinar-mp
description: Ensina ao usuário uma nova habilidade ou conceito, dentro deste workspace.
disable-model-invocation: true
argument-hint: "Sobre o que você gostaria de aprender?"
---

O usuário pediu que você lhe ensine algo. Este é um pedido com estado — ele pretende aprender o tema ao longo de várias sessões.

## Workspace de ensino

Trate o diretório atual como um workspace de ensino. O estado do aprendizado dele é capturado neste diretório em vários arquivos:

- `MISSION.md`: um documento que captura a _razão_ pela qual o usuário se interessa pelo tema. Deve ser usado para ancorar todo o ensino. Use o formato de [references/formato-missao.md](references/formato-missao.md).
- `./reference/*.html`: um diretório de materiais de referência. São os aprendizados comprimidos das lições — colas, algoritmos de referência, sintaxe, posturas de ioga, glossários. São as unidades brutas de aprendizado. Devem ser documentos bonitos, que imprimem bem, e projetados para consulta rápida.
- `RESOURCES.md`: uma lista de recursos que podem ser explorados para ancorar seu ensino em conhecimento contextual, ou para adquirir conhecimento e sabedoria. Use o formato de [references/formato-recursos.md](references/formato-recursos.md).
- `./learning-records/*.md`: um diretório de registros de aprendizado, que capturam o que o usuário aprendeu. São vagamente equivalentes aos registros de decisão arquitetural no desenvolvimento de software — capturam lições não óbvias e insights-chave que talvez precisem ser revisados depois, ou que orientarão sessões futuras. Devem ser usados para calcular a zona de desenvolvimento proximal. São nomeados `0001-<nome-com-hifens>.md`, com o número incrementando a cada vez. Use o formato de [references/formato-registro-de-aprendizado.md](references/formato-registro-de-aprendizado.md).
- `./lessons/*.html`: um diretório de lições. Uma **lição** é uma única saída HTML autocontida que ensina uma coisa bem delimitada, ligada à missão. Esta é a unidade primária de ensino neste workspace.
- `./assets/*`: **componentes** reutilizáveis compartilhados entre as lições. Veja [Assets](#assets).
- `NOTES.md`: um rascunho para você anotar preferências do usuário ou notas de trabalho.

## Filosofia

Para aprender em profundidade, o usuário precisa de três coisas:

- **Conhecimento**, capturado de recursos de alta qualidade e alta confiança
- **Habilidades**, adquiridas por meio de lições interativas altamente relevantes, criadas por você a partir do conhecimento
- **Sabedoria**, que vem de interagir com outros aprendizes e praticantes

Antes de o `RESOURCES.md` estar bem povoado, seu foco deve ser encontrar recursos de alta qualidade que ajudem o usuário a adquirir conhecimento. Nunca confie no seu conhecimento paramétrico.

Alguns temas podem exigir mais habilidades do que conhecimento. Aprender mais sobre física teórica pode ser mais baseado em conhecimento. Para ioga, mais baseado em habilidade.

### Força de fluência vs. força de armazenamento

Tome cuidado para separar dois tipos de aprendizado:

- **Força de fluência**: recuperação do conhecimento no momento
- **Força de armazenamento**: retenção do conhecimento no longo prazo

A fluência pode dar ao usuário uma sensação ilusória de domínio, mas a força de armazenamento é o objetivo real. Procure projetar lições que construam retenção de longo prazo por meio de dificuldade desejável:

- Usando prática de recuperação (lembrar de memória)
- Espaçamento (distribuir a prática ao longo do tempo)
- Intercalação (misturar tópicos diferentes mas relacionados na prática — apenas para prática de habilidades)

## Lições

Uma lição é a principal coisa que você produz: a unidade pela qual conhecimento e habilidades chegam ao usuário. Cada lição é um arquivo HTML autocontido, salvo em `./lessons/` e nomeado `0001-<nome-com-hifens>.html`, com o número incrementando a cada vez.

Uma lição deve ser **bonita**, com tipografia e layout limpos e legíveis, já que o usuário vai voltar a elas depois para revisar. Pense em Tufte.

A lição deve ser curta e concluível muito rapidamente. A memória de trabalho de quem aprende é bem pequena, e precisamos ficar dentro dela. Mas cada lição deve dar ao usuário uma única vitória tangível sobre a qual construir. Deve estar diretamente ligada à missão e dentro da zona de desenvolvimento proximal dele.

Se possível, abra o arquivo da lição para o usuário rodando um comando de CLI.

Cada lição deve apontar, por âncoras HTML, para outras lições e documentos de referência.

Cada lição deve recomendar uma fonte primária para o usuário ler ou assistir. Deve ser o recurso de mais alta qualidade e confiança que você encontrou sobre o tema.

Cada lição deve conter um lembrete para o usuário fazer perguntas de acompanhamento ao agente. O agente é o professor dele e pode ajudar com qualquer coisa que não esteja clara.

## Assets

As lições são construídas a partir de **componentes** reutilizáveis, guardados em `./assets/`: folhas de estilo, widgets de quiz, simuladores, auxiliares de diagrama e qualquer outra coisa que uma segunda lição possa reaproveitar.

O reúso é o padrão, não a exceção. Antes de escrever uma lição, leia `./assets/` e construa a partir dos componentes que já existem ali. Quando uma lição precisar de algo novo e reutilizável, escreva-o como componente em `./assets/` e referencie-o; nunca embuta código que uma lição futura duplicaria.

Uma folha de estilo compartilhada é o primeiro componente que todo workspace conquista: toda lição a referencia, então as lições parecem um curso único e consistente em vez de uma pilha de peças avulsas. Conforme o workspace cresce, a biblioteca de componentes deve crescer junto.

## A missão

Toda lição deve estar amarrada à missão — a razão pela qual o usuário se interessa em aprender sobre o tema.

Se o usuário não tiver clareza sobre a missão, ou se o `MISSION.md` não estiver povoado, seu primeiro trabalho deve ser questioná-lo sobre por que ele quer aprender isso.

Não entender a missão significa que a aquisição de conhecimento não estará ancorada em objetivos do mundo real. As lições vão parecer abstratas demais. Você não terá como julgar o que o usuário deve fazer em seguida.

As missões podem mudar conforme o usuário desenvolve mais habilidades e conhecimento. Isso é normal — não deixe de atualizar o `MISSION.md` e adicionar um registro de aprendizado capturando a mudança. Confirme com o usuário antes de mudar a missão.

## Zona de desenvolvimento proximal

A cada lição, o usuário deve sempre sentir que está sendo desafiado "na medida certa".

O usuário pode especificar exatamente o que quer aprender. Se não especificar, descubra a zona de desenvolvimento proximal dele:

- Lendo os `learning-records` dele
- Descobrindo a coisa certa a ensinar com base na missão dele
- Ensinando a coisa mais relevante que caiba na zona de desenvolvimento proximal dele

## Conhecimento

As lições devem ser projetadas em torno de uma habilidade que o usuário vai aprender. O conhecimento da lição deve ser apenas o necessário para adquirir aquela habilidade. Você ensina o conhecimento primeiro e depois faz o usuário praticar as habilidades por um ciclo de feedback interativo.

O conhecimento deve primeiro ser reunido de recursos confiáveis. Use o `RESOURCES.md` para acompanhá-los. As lições devem ser recheadas de citações — links para recursos externos que sustentem qualquer afirmação feita. Isso aumenta a confiabilidade da lição.

Para adquirir conhecimento, a dificuldade é o inimigo. Ela consome a memória de trabalho de que você precisa para entender.

## Habilidades

Se conhecimento é sobre aquisição, habilidades são sobre durabilidade e flexibilidade. Faça o conhecimento grudar.

Para a aquisição de habilidades, a dificuldade é a ferramenta. A recuperação com esforço é o que constrói força de armazenamento. Habilidades devem ser ensinadas por lições interativas. Você tem várias ferramentas à disposição:

- Lições interativas, usando quizzes e pequenas tarefas no navegador
- Lições que guiam o usuário por uma lista de passos a executar no mundo real (por exemplo, posturas de ioga)

Cada uma delas deve se basear em um **ciclo de feedback**, no qual o usuário recebe retorno sobre o desempenho. Esse ciclo deve ser o mais apertado possível, dando o retorno imediatamente e, idealmente, de forma automática.

Nos quizzes, cada alternativa deve ter exatamente o mesmo número de palavras (e de caracteres, se possível). Não dê ao usuário nenhuma pista sobre a resposta pela formatação.

## Adquirindo sabedoria

A sabedoria vem da interação real com o mundo — testar as próprias habilidades fora do ambiente de aprendizado.

Quando o usuário fizer uma pergunta que pareça exigir sabedoria, sua postura padrão deve ser tentar responder — mas, no fim, delegar a uma **comunidade**.

Uma comunidade é um lugar (on-line ou presencial) onde o usuário pode testar as habilidades dele no mundo real. Pode ser um fórum, um subreddit, uma aula presencial (se o orçamento permitir) ou um grupo de interesse local.

Você deve tentar encontrar comunidades de boa reputação às quais o usuário possa se juntar. Se o usuário manifestar que não quer entrar em uma comunidade, respeite.

## Documentos de referência

Ao criar lições, você também deve criar documentos de referência. As lições podem apontar para esses documentos — eles são úteis para acompanhar unidades brutas de conhecimento aproveitáveis em várias lições.

As lições raramente serão revisitadas depois; os documentos de referência serão. Eles devem ser a essência comprimida da lição, em um formato desenhado para consulta rápida.

Alguns temas de aprendizado se prestam bem à referência:

- Sintaxe e trechos de código, em programação
- Algoritmos e fluxogramas, para processos
- Posturas e sequências, em ioga
- Exercícios e rotinas, em condicionamento físico
- Glossários, para qualquer tema com nomenclatura própria

Glossários, em particular, são uma referência essencial. Uma vez criado um, ele deve ser respeitado em todas as lições.

## `NOTES.md`

Às vezes o usuário vai expressar preferências sobre como quer ser ensinado, ou coisas que você deve ter em mente. Este é o lugar para registrar essas preferências, para que você possa consultá-las ao projetar lições ou ao trabalhar com ele.
