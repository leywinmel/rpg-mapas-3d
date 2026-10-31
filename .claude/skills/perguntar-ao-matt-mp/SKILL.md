---
name: perguntar-ao-matt-mp
description: Pergunte qual skill ou fluxo se encaixa na sua situação. Um roteador sobre as skills deste conjunto.
disable-model-invocation: true
---

# Pergunte ao Matt

Você não lembra de cada skill, então pergunte.

Um **fluxo** é um caminho através das skills. A maior parte dos caminhos corre por um **fluxo principal**, e duas **entradas de acesso** desembocam nele. Todo o resto é avulso, ou uma camada de vocabulário que roda por baixo.

## O fluxo principal: ideia → entrega

A rota pela qual a maior parte do trabalho passa. Você tem uma ideia e quer que ela seja construída.

1. **`/sabatina-com-docs-mp`** afia a ideia por entrevista. Comece aqui sempre que estiver **trabalhando em um diretório de trabalho**: ela tem estado, retendo o que aprende no `CONTEXT.md` e em ADRs. (Sem diretório de trabalho? Use **`/me-sabatine-mp`**, coberta em Avulsas. As duas rodam a mesma primitiva `/sabatina-mp`; a `sabatina-com-docs-mp` é a que deixa rastro documental, o que a torna a melhor das duas sempre que houver um repositório onde deixá-lo.)
2. **Ramificação: você consegue resolver toda pergunta na conversa?** Se uma pergunta exige uma resposta executável (estado, regra de negócio, uma UI que você precisa ver), faça um desvio por um protótipo, com **`/handoff-mp`** fazendo a ponte nas duas direções (um protótipo vive no próprio diretório, que é exatamente para isso que serve o `/handoff-mp`; veja Fronteiras de fase):
   - **`/handoff-mp`** para fora, e então abra uma sessão nova contra aquele arquivo,
   - **`/prototipar-mp`** para responder à pergunta com código descartável,
   - **`/handoff-mp`** de volta com o que você aprendeu, e referencie isso a partir do fio original da ideia.
3. **Ramificação: esta construção é de múltiplas sessões?**
   - **Sim** → **`/gerar-spec-mp`** (transforme o fio em uma spec), depois **`/gerar-tickets-mp`** para quebrá-la em tickets do tipo bala traçante, cada um declarando suas **arestas de bloqueio**. Em um tracker local, isso é um arquivo por ticket em `.scratch/<funcionalidade>/issues/`, trabalhado na mão com os bloqueadores primeiro; em um tracker de verdade, as arestas viram links nativos de bloqueio, de modo que qualquer ticket cujos bloqueadores estejam concluídos pode ser pego: dispare **`/implementar-mp`** por ticket, **dando `/clear` no contexto entre um e outro**. Cada ticket é autocontido, então o contexto do último é descartável.
   - **Não** → **`/implementar-mp`** aqui mesmo, na mesma janela de contexto.

   De um jeito ou de outro, **`/implementar-mp`** constrói cada issue conduzindo **`/tdd-mp`** internamente (uma fatia vermelho-verde por vez) e encerra rodando **`/revisar-codigo-mp`**, uma revisão em dois eixos (Padrões + Spec) do diff, antes de comitar. Recorra a **`/tdd-mp`** sozinha quando você só quiser construir um comportamento concreto começando pelos testes, sem uma spec completa, e a **`/revisar-codigo-mp`** sozinha sempre que quiser revisar uma branch ou PR contra um ponto fixo.

### Higiene de contexto

Mantenha os passos 1–3 em **uma única janela de contexto ininterrupta** (não compacte nem limpe até depois do `/gerar-tickets-mp`), para que a sabatina, a spec e os tickets construam todos sobre o mesmo raciocínio. Cada `/implementar-mp` então começa do zero, trabalhando a partir do ticket.

O limite disso é a **[zona inteligente](https://www.aihero.dev/ai-coding-dictionary/smart-zone)**: a janela (~150 mil tokens nos modelos de ponta) dentro da qual o modelo ainda raciocina com nitidez. Se uma sessão se aproximar dela antes do `/gerar-tickets-mp`, não force com o desempenho degradado; dê `/compact` na fronteira de fase mais próxima e siga (veja Fronteiras de fase).

## Entradas de acesso

Uma situação inicial que gera trabalho e depois desemboca no fluxo principal.

- **Bugs e pedidos se acumulando** → **`/triagem-mp`**. Ela move issues pelos papéis de triagem e produz issues prontas para agente, que o **`/implementar-mp`** pega depois.

  A triagem é apenas para issues que **você não criou**: relatos de bug, pedidos de funcionalidade que chegam, qualquer coisa que aparece crua. Tickets produzidos pelo `/gerar-tickets-mp` já estão prontos para agente, então **não os triem**.

- **Alguma coisa quebrou** → **`/diagnosticar-bugs-mp`**. Para os difíceis: o bug que resiste a uma primeira olhada, a falha intermitente, a regressão que se infiltrou entre dois estados sabidamente bons. Ela se recusa a teorizar antes de ter um **ciclo de feedback apertado** (um comando que já fica vermelho *neste* bug), e então corrige com um teste de regressão. O post-mortem dela passa o bastão para **`/melhorar-arquitetura-mp`** quando o achado real é que não existe uma boa costura para travar o bug.

- **Uma empreitada enorme e nebulosa: um projeto do zero ou a construção de uma funcionalidade gigante, grande demais para uma sessão** → **`/mapear-caminho-mp`**, o fluxo cognitivamente mais exigente daqui. Quando o caminho daqui até o destino ainda não está visível, ele traça um **mapa compartilhado** de **tickets de decisão** no issue tracker e os resolve um por vez, produzindo **decisões, não entregáveis**, até a névoa recuar e o caminho ficar claro. Onde a **`/sabatina-com-docs-mp`** afia uma ideia que cabe em uma sessão, o mapear-caminho é para a ideia que não cabe, e ele é mais lento e mais denso, então reserve-o exatamente para isso, nunca para uma funcionalidade bem delimitada.

  Quando o mapa clareia, **ele passa o bastão, não constrói**: desemboque no fluxo principal em **`/gerar-spec-mp`**, que colapsa as decisões encadeadas do mapa em um plano construível, e então `/gerar-tickets-mp` e `/implementar-mp` como de costume. Emendar o mapa direto no `/implementar-mp` pula esse colapso e joga fora o detalhe encadeado, então vá direto ao `/implementar-mp` apenas quando a empreitada se revelar genuinamente pequena.

## Saúde da base de código

Não é trabalho de funcionalidade, é manutenção.

- **`/melhorar-arquitetura-mp`** roda sempre que você tiver um tempo livre para manter a base de código boa para agentes operarem nela. Ela traz à tona **oportunidades de aprofundamento**; escolher uma _gera uma ideia_ que você pode levar ao fluxo principal em `/sabatina-com-docs-mp`. Ela é o levantamento que encontra os candidatos; a **`/design-de-codebase-mp`** (abaixo) é a bancada em que você projeta o escolhido.

## Vocabulário por baixo

Duas referências invocadas pelo modelo que rodam *por baixo* das outras skills, cada uma sendo a fonte única da verdade do vocabulário dela. Recorra a elas diretamente quando o problema forem as **palavras**, não o processo; ou deixe que as skills acima as puxem.

- **`/modelagem-de-dominio-mp`**: afia a linguagem de *domínio* do projeto — questionar um termo impreciso, resolver uma palavra sobrecarregada ("conta" fazendo três trabalhos), registrar como ADR uma decisão difícil de reverter. É a disciplina ativa que a `/sabatina-com-docs-mp` conduz para manter o `CONTEXT.md` um glossário limpo.
- **`/design-de-codebase-mp`** é o vocabulário de módulos profundos (módulo, interface, profundidade, costura, adaptador, alavancagem, localidade) para projetar o *formato* de um módulo: muito comportamento atrás de uma interface pequena, em uma costura limpa. Tanto `/tdd-mp` quanto `/melhorar-arquitetura-mp` falam essa língua.

## Fronteiras de fase

Uma **fase** é um bloco de trabalho dentro de uma sessão: a sabatina, a implementação, o QA. Na **fronteira** entre duas delas você tem cinco opções, e escolher entre elas é a decisão mais nebulosa de todo este mapa:

- **Continuar**: fique onde está. Não custa nada, não perde nada.
- **`/clear`**: esvazie a janela, quando nada daqui importa para o que vem a seguir.
- **`/handoff-mp`** escreve um arquivo markdown portátil. Estreito: apenas para um **novo ambiente**, um **novo diretório**, um **colega**, ou para bifurcar uma tarefa lateral **no meio de uma fase**. O que ele compra é portabilidade.
- **Subagente**: mande uma tarefa bem delimitada para a própria janela dela e receba um relatório de volta.
- **`/compact`** comprime este contexto e semeia uma sessão nova com ele. O **padrão**, no fim da árvore de decisão e não a primeira escolha.

Leia [references/fronteiras-de-fase.md](references/fronteiras-de-fase.md) para a árvore ordenada: as cinco perguntas, o raciocínio por trás de cada ramo, e por que o custo das fontes primárias faz de **Continuar** a primeira a ser descartada. Tome a decisão **na** fronteira; no meio de uma fase, continue ou divida o restante em subagentes.

## Avulsas

Totalmente fora do fluxo principal.

- **`/me-sabatine-mp`**: a mesma entrevista implacável da `/sabatina-com-docs-mp`, mas **sem estado**: não salva nada localmente e não constrói nenhum `CONTEXT.md`. Recorra a ela quando **não estiver trabalhando em um diretório de trabalho** (afiando um plano, um design, um texto, qualquer coisa sem um repositório embaixo). Se você estiver em um diretório de trabalho, use a `/sabatina-com-docs-mp`: ela roda a mesma entrevista e deixa rastro documental, então é estritamente melhor.
- **`/sabatina-mp`** é a própria primitiva de entrevista: rodadas, a fronteira, fatos são trabalho do agente e decisões são suas. `/me-sabatine-mp` e `/sabatina-com-docs-mp` são as duas portas de entrada nomeadas, e `/triagem-mp`, `/mapear-caminho-mp` e `/melhorar-arquitetura-mp` a rodam internamente. Recorra a ela diretamente apenas quando quiser a entrevista sem invólucro nenhum.
- **`/resolver-conflitos-merge-mp`** trabalha um conflito de merge ou rebase em andamento, trecho a trecho, resolvendo pela **intenção** rastreada até a fonte primária de cada lado, em vez de escolher linhas, e depois conclui a operação. Ela nunca roda `--abort`. Avulsa e fora de todos os fluxos: recorra a ela quando você já estiver no meio de um conflito.
- **`/prototipar-mp`** é um programa pequeno e descartável que responde a uma pergunta de design: este modelo de estado faz sentido, ou como esta UI deveria ser. "Descartável" é uma restrição sobre como o código é escrito, não uma promessa de destruí-lo: a resposta é incorporada ao código real, e o próprio protótipo é guardado como **fonte primária** em uma branch `prototype/<nome>` fora da main, referenciada a partir da issue de implementação. É o desvio do passo 2 do fluxo principal, mas recorra a ele sempre que uma pergunta de design for difícil de resolver no papel.
- **`/pesquisar-mp`**: delegue o trabalho braçal de leitura a um **agente em segundo plano**: ele investiga uma pergunta contra **fontes primárias** e depois deixa um arquivo Markdown com citações no repositório. Continue trabalhando enquanto ele lê. O arquivo que ele produz é algo para levar *para dentro* do fluxo principal em `/sabatina-com-docs-mp`, já que a pesquisa alimenta o raciocínio em vez de substituí-lo.
- **`/gerar-questionario-mp`** entra quando o que está te travando não está na sua cabeça nem na base de código, mas na **cabeça de outra pessoa**, e escreve um questionário para ela preencher. É o inverso do `/me-sabatine-mp`: em vez de entrevistar você sobre o assunto, ele entrevista você sobre o **envio** (para quem vai, o que você precisa de volta) e mira as perguntas na lacuna. O que volta é material para `/sabatina-com-docs-mp` ou `/gerar-spec-mp`.
- **`/mago-de-scripts-mp`** é para os passos que só um **humano** pode dar: provisionar infraestrutura, configurar credenciais ou segredos de CI, clicar por um painel de terceiros desconhecido, rodar uma migração ou virada de chave pontual. Ele gera um script bash interativo que abre cada URL, captura cada valor e o escreve no `.env` e nos segredos do GitHub, para que o procedimento deixe de ser algo que você reexplica a um agente toda vez. Invocado pelo modelo, então o agente recorre a ele no instante em que bate em uma parede que só você pode atravessar. Se o agente puder simplesmente fazer aquilo sozinho, ele deve fazer; isto é para quando o humano está genuinamente no ciclo.
- **`/como-assim-mp`** é o corretivo para uma mensagem que não foi compreendida. Use no meio de uma conversa, dentro de qualquer outra skill, e o agente reapresenta o que acabou de dizer com o contexto que estava faltando, em linguagem simples, usando o vocabulário do `CONTEXT.md`. Ele funciona depois do fato; a `/sabatina-com-docs-mp` é a cura preventiva, porque uma linguagem compartilhada acordada cedo é o que impede o jargão de chegar.
- **`/ensinar-mp`**: aprenda um conceito ao longo de várias sessões, usando o diretório atual como um workspace com estado.
- **`/escrever-para-agentes-mp`** é a referência para escrever documentos que agentes consomem: skills, AGENTS.md, docs apontados por ponteiros.

## Pré-requisito

**`/configurar-skills-matt-pocock-mp`**: rode antes do seu primeiro fluxo de engenharia, para configurar o issue tracker, as labels de triagem e o layout de documentação que as outras skills pressupõem. Issue trackers customizados também funcionam.
