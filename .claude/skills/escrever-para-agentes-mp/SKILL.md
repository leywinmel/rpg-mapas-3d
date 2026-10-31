---
name: escrever-para-agentes-mp
description: Escrever documentos para agentes. Use ao criar ou editar skills, ou ao modificar AGENTS.md ou CLAUDE.md.
---

Referência para escrever qualquer documento que um agente consome: uma skill, um `AGENTS.md` / `CLAUDE.md`, um doc alcançado por um ponteiro. O empacotamento difere; a escrita não: as mesmas alavancas tornam cada um previsível, já que o agente segue o mesmo _processo_ a cada execução, em vez de produzir a mesma saída.

Quando o documento que você está escrevendo for uma skill, leia [references/mecanica-de-skills.md](references/mecanica-de-skills.md) para frontmatter, escolha de invocação e skills roteadoras.

## Ponteiros de contexto

Um **ponteiro de contexto** é uma referência mantida no contexto do agente que nomeia algum material fora do contexto e codifica a condição para alcançá-lo. A descrição de uma skill é um deles; uma linha no `AGENTS.md` nomeando um doc é o mesmo objeto. É a _formulação_ do ponteiro, não o alvo dele, que decide quando o agente alcança o material, e com que confiabilidade. Um alvo indispensável atrás de um ponteiro mal formulado é um bug de variância: afie a formulação primeiro, e só embuta o material se afiar não resolver.

Um ponteiro faz dois trabalhos: dizer o que é o material e listar as **ramificações** que devem disparar o acesso a ele (uma ramificação é um caso distinto que o documento trata, de modo que execuções diferentes percorrem caminhos diferentes dentro dele). Cada palavra de um ponteiro sempre carregado custa a cada turno, então ele merece uma poda ainda mais dura que o corpo:

- **Ponha a palavra-guia na frente**: o ponteiro é onde ela faz o trabalho de disparo.
- **Um gatilho por ramificação.** Sinônimos que renomeiam uma única ramificação são uma ramificação escrita duas vezes; funda-os e mantenha apenas ramificações genuinamente distintas.
- **Corte a identidade que o corpo já carrega.**

## As duas cargas

Todo documento e ponteiro que você adiciona gasta um de dois orçamentos:

- **Carga de contexto** é o custo do material sempre carregado na janela do agente: uma linha do `AGENTS.md`, a descrição de uma skill, qualquer coisa presente no contexto a cada turno, gastando tokens e atenção quer dispare, quer não.
- **Carga cognitiva** é o custo sobre o humano: quais documentos existem e quando recorrer a cada um. O humano é o índice. Não é um custo a minimizar: é o preço da autonomia humana; gaste-o onde o julgamento humano importa e remova-o onde não importa.

Material alcançado apenas por um ponteiro escapa da carga de contexto ao preço da própria linha do ponteiro; material sem ponteiro nenhum viaja inteiramente sobre a carga cognitiva.

## Hierarquia da informação

Um documento é construído com dois tipos de conteúdo: **passos** (as ações ordenadas que o agente executa) e **referência** (definições, regras, fatos consultados sob demanda). Os dois se misturam livremente: só passos (uma receita), só referência (as regras de uma revisão, esta skill), ou ambos. A decisão central é onde cada peça fica na **hierarquia da informação**, uma escada ordenada por quão imediatamente o agente precisa do material:

1. **Passo no arquivo** é o degrau primário: o que o agente faz, em ordem.
2. **Referência no arquivo** é consultada sob demanda. Frequentemente é um conjunto legitimamente plano de pares (todas as regras de uma revisão no mesmo degrau), o que é um arranjo adequado, não um cheiro ruim.
3. **Referência divulgada** é empurrada para um arquivo separado, alcançada por um ponteiro de contexto, carregada apenas quando o ponteiro dispara. Vai desde um arquivo irmão na mesma pasta até referência totalmente externa, que vive em qualquer lugar e para a qual qualquer documento pode apontar.

Empurre pouco demais para baixo e o topo incha; empurre demais e você esconde material de que o agente realmente precisa. Essa tensão é a decisão inteira.

**Divulgação progressiva** é o movimento escada abaixo (para fora do arquivo principal e para trás de um ponteiro), para que o topo continue legível. Não é primariamente uma otimização de tokens: é como a hierarquia é protegida. Ramificação é o teste de divulgação mais limpo: embuta o que toda ramificação precisa e empurre para trás de um ponteiro o que só algumas ramificações alcançam. Quando um documento tem passos, referência no arquivo que deveria ter sido divulgada os soterra e transforma a atenção a eles em cara ou coroa: uma alavanca de variância, não apenas de legibilidade.

**Colocalização** é a companheira dentro do arquivo: onde a escada decide _quão embaixo_ uma peça fica, a colocalização decide _o que fica ao lado dela_ ali. Mantenha a definição, as regras e as ressalvas de um conceito sob um único título, em vez de espalhadas, para que ler uma parte traga junto as vizinhas. O teste: o documento deve se ler como documentação escrita para o agente. Material agrupado se lê assim; material espalhado, não. (Distinto de duplicação: aquela repete um significado em dois lugares; o espalhamento fragmenta um significado por muitos.)

**Alastramento** é o modo de falha aqui: um documento simplesmente longo demais, mesmo quando cada linha é viva e única. A atenção se dilui pelo excesso, e cada linha extra é mais uma para manter relevante. A cura é a escada: divulgue referência atrás de ponteiros e divida por ramificação ou por sequência, para que cada caminho carregue apenas o que precisa.

## Passos e critérios de conclusão

Todo passo termina em um **critério de conclusão**, a condição que diz ao agente que o trabalho acabou. Duas propriedades fazem dele uma alavanca:

- **Clareza**: o agente consegue distinguir feito de não feito? Um limite vago ("entendimento alcançado") convida à **conclusão prematura**: encerrar o passo antes de ele estar genuinamente pronto, com a atenção escorregando para _estar pronto_. Os passos visíveis ainda à frente (os **passos pós-conclusão**) fornecem o puxão; a clareza do critério é a resistência. Defenda nesta ordem: **afie o limite primeiro** (local e barato); só se ele for irredutivelmente vago _e_ você observar a pressa, esconda os passos posteriores dividindo a sequência. Esconder só funciona através de uma fronteira de contexto real (uma passagem de bastão ou o despacho de um subagente; uma chamada embutida deixa os passos posteriores no contexto e não limpa nada).
- **Exigência**: quanto ele requer. "Cada modelo modificado contabilizado" força trabalho minucioso, enquanto "produza uma lista de mudanças" não. A exigência conduz o **trabalho braçal** (a escavação que o agente faz dentro do trabalho, latente na formulação e não escrita como um passo próprio), e ela não está presa a passos: "cada regra aplicada" amarra um corpo de referência plana do mesmo jeito que "cada passo feito" amarra uma sequência — é assim que um documento só de referência ainda carrega uma barra de exaustividade.

Os critérios mais fortes são, ao mesmo tempo, verificáveis e exaustivos.

## Quando dividir

Dividir um documento em dois gasta uma das duas cargas, então divida apenas quando o corte se pagar:

- **Por sequência**: divida uma sequência de passos onde os passos pós-conclusão tentam o agente a apressar o passo à frente dele. Mantê-los fora de vista gera mais trabalho braçal na tarefa atual. Cuidado com o inverso: fundir sequências expõe os passos posteriores de cada passo ao que vem depois, convidando à conclusão prematura.
- **Por invocação**, específico de skills: veja [references/mecanica-de-skills.md](references/mecanica-de-skills.md).

## Palavras-guia

Uma **palavra-guia** é um conceito compacto que já vive no pré-treino do modelo e com o qual o agente pensa enquanto executa o documento (_lição_, _névoa da guerra_, _balas traçantes_). Repetida como um token, nunca como uma frase, ela acumula uma definição distribuída e ancora uma região inteira de comportamento no menor número de tokens, recrutando priors que o modelo já possui. Cunhar a sua própria funciona se você a definir com clareza, mas uma palavra inventada não recruta prior nenhum: você paga em tokens de definição o que uma palavra pré-treinada dá de graça; procure uma palavra existente primeiro.

Ela ancora duas vezes. No corpo, a _execução_: o agente busca o mesmo comportamento toda vez que a palavra aparece e, dentro de referência plana, ela foca a atenção em uma classe de coisa a procurar. Em um ponteiro, a _invocação_: quando a mesma palavra vive nos seus prompts, nos seus documentos e na sua base de código, o agente conecta essa linguagem compartilhada ao material e o alcança com mais confiabilidade.

Cace oportunidades de refatorar com palavras-guia. Uma tríade soletrada em três lugares; um ponteiro gastando uma frase para gesticular em direção a uma ideia. Cada um é uma passagem implorando para colapsar em um único token:

- "rápido, determinístico, de baixo overhead" → _apertado_ (um ciclo _apertado_).
- "um ciclo em que você confia" → _vermelho_, transformando um portão vago em um estado binário observável (o ciclo fica _vermelho_ no bug, ou não fica).

Você ganha duas vezes: menos tokens e um gancho mais afiado onde o agente pendura o raciocínio. Presuma que todo documento carrega reformulações que palavras-guia aposentam. Vá encontrá-las.

**Negação** é o modo de falha ao lado desta alavanca: dirigir por proibição arrasta o comportamento proibido para dentro do contexto e o torna _mais_ disponível, não menos. _Não pense em um elefante_, e o elefante é tudo o que existe; a negação é um modificador fraco que o conceito fortemente ativado atropela, então a proibição meio que se lê como uma instrução para fazer a coisa. Estimule o **positivo**: enuncie o comportamento-alvo ("escreva comentários de uma linha"), para que o proibido nunca seja mencionado. Uma proibição só conquista seu lugar como uma barreira rígida que você não consegue formular de forma positiva; e, mesmo assim, acompanhe-a do alvo positivo, para que a atenção pouse no que fazer.

## Poda

- Mantenha cada significado em uma **fonte única da verdade**: um lugar autoritativo, para que mudar o comportamento seja uma edição em um só lugar. **Duplicação** (o mesmo significado em mais de um lugar) custa manutenção e tokens, e infla a proeminência de um significado na escada além do posto real dele. (É o inverso acidental de uma palavra-guia, que repete um token de propósito, nunca o significado.)
- O **ambiente** também é uma fonte da verdade (scripts do `package.json`, arquivos de configuração, o layout de diretórios, a saída de `--help`), e um documento que o repete é um **cache**: uma cópia de uma consulta, que só se paga quando a consulta é cara. Cacheie o que o agente não consegue achar olhando: a convenção não escrita, a razão por trás de uma escolha, a pegadinha que nenhuma configuração confessa. Deixe as consultas de um arquivo e de um comando a cargo do ambiente, onde elas não podem envelhecer.
- Verifique a **relevância** de cada linha: ela ainda diz respeito ao que o documento faz? Uma linha perde relevância por nunca dizer respeito à tarefa (mera exposição, ou uma ramificação que deveria ser divulgada) ou por envelhecer conforme o comportamento ou o mundo que ela descreve muda. Documentos mais curtos são mais fáceis de manter relevantes. Sem uma disciplina de poda, o destino padrão é o **sedimento**: camadas velhas que se acumulam porque adicionar parece seguro e remover parece arriscado, até que você precise perfurar através delas para achar o que ainda está vivo.
- Cace **instruções inócuas (no-ops)** frase a frase: uma instrução que o modelo já obedece por padrão paga carga para não dizer nada. O teste (isto muda o comportamento em relação ao padrão?) é relativo ao modelo, não ao leitor: duas pessoas discordando sobre um no-op estão discordando sobre o padrão, e resolvem isso rodando o documento, não debatendo. Quando uma frase reprova, apague a frase inteira em vez de aparar palavras dela. O teste também avalia palavras-guia: uma palavra fraca demais para vencer o padrão (_seja minucioso_ quando o agente já é razoavelmente minucioso) é um no-op, e a correção é uma palavra mais forte (_implacável_), não outra técnica.
