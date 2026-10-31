---
name: gerar-tickets-mp
description: Quebra um plano, uma spec ou a conversa atual em um conjunto de tickets do tipo bala traçante, cada um declarando suas arestas de bloqueio, publicados no tracker configurado (arestas como texto em um arquivo por ticket localmente, ou links nativos de bloqueio em um tracker de verdade).
disable-model-invocation: true
---

# Gerar Tickets

Quebre um plano, uma spec ou uma conversa em um conjunto de **tickets**: fatias verticais do tipo bala traçante (tracer bullet), cada uma declarando os tickets que a **bloqueiam**.

O issue tracker e o vocabulário de labels de triagem deveriam ter sido fornecidos a você. Se não foram, diga ao usuário para rodar `/configurar-skills-matt-pocock-mp`.

## Processo

### 1. Reúna o contexto

Trabalhe com o que já está no contexto da conversa. Se o usuário passar uma referência (um caminho de spec, um número ou URL de issue) como argumento, busque-a e leia o corpo completo e os comentários.

### 2. Explore a base de código (opcional)

Se você ainda não explorou a base de código, faça isso para entender o estado atual do código. Títulos e descrições dos tickets devem usar o vocabulário do glossário de domínio do projeto e respeitar os ADRs da área que você estiver tocando.

Procure oportunidades de prefatorar o código para tornar a implementação mais fácil. "Torne a mudança fácil, depois faça a mudança fácil."

### 3. Rascunhe as fatias verticais

Quebre o trabalho em tickets do tipo **bala traçante**.

<vertical-slice-rules>

- Cada fatia corta um caminho estreito porém COMPLETO através de todas as camadas (schema, API, UI, testes): vertical, NÃO uma fatia horizontal de uma única camada
- Uma fatia concluída é demonstrável ou verificável por si só
- Cada fatia é dimensionada para caber em uma única janela de contexto nova
- Qualquer prefatoração deve ser feita primeiro

</vertical-slice-rules>

Dê a cada ticket suas **arestas de bloqueio**: os outros tickets que precisam ser concluídos antes que ele possa começar. Um ticket sem bloqueadores pode começar imediatamente.

**Refatorações amplas são a exceção ao fatiamento vertical.** Uma **refatoração ampla** é uma única mudança mecânica (renomear uma coluna, retipar um símbolo compartilhado) cujo **raio de impacto** se espalha por toda a base de código, de modo que uma única edição quebra milhares de pontos de chamada de uma vez e nenhuma fatia vertical consegue entrar verde. Não force isso em uma bala traçante; sequencie como **expandir–contrair**. Primeiro expanda: adicione a forma nova ao lado da antiga, para que nada quebre. Depois migre os pontos de chamada em lotes dimensionados pelo raio de impacto (por pacote, por diretório), cada lote sendo seu próprio ticket bloqueado pela expansão, mantendo o CI verde de lote em lote porque a forma antiga ainda existe. Por fim contraia: apague a forma antiga quando não sobrar nenhum chamador, em um ticket bloqueado por todos os lotes de migração. Quando nem os lotes conseguem ficar verdes sozinhos, mantenha a sequência mas deixe que compartilhem uma branch de integração que todos bloqueiam até um ticket final de integrar-e-verificar; o verde só é prometido ali.

### 4. Sabatine o usuário

Apresente a quebra proposta como uma lista numerada. Para cada ticket, mostre:

- **Título**: nome curto e descritivo
- **Bloqueado por**: quais outros tickets (se houver) precisam ser concluídos antes
- **O que entrega**: o comportamento ponta a ponta que este ticket faz funcionar

Pergunte ao usuário:

- A granularidade parece adequada? (grossa demais / fina demais)
- As arestas de bloqueio estão corretas: cada ticket depende apenas de tickets que genuinamente o travam?
- Algum ticket deveria ser fundido ou dividido mais?

Itere até o usuário aprovar a quebra.

### 5. Publique os tickets no tracker configurado

Publique os tickets aprovados. **Como** depende do tracker que o `/configurar-skills-matt-pocock-mp` configurou; os tickets são os mesmos nos dois casos, só muda a forma das arestas de bloqueio:

- **Arquivos locais** → escreva um arquivo por ticket em `.scratch/<slug-da-funcionalidade>/issues/<NN>-<slug>.md`, numerados a partir de `01` em ordem de dependência (bloqueadores primeiro). O campo "Bloqueado por" de cada arquivo lista os números/títulos dos quais ele depende. Use o template por ticket abaixo: um ticket por arquivo, nunca um único arquivo combinado.
- **Um issue tracker de verdade (GitHub, Linear, …)** → publique uma issue por ticket em ordem de dependência (bloqueadores primeiro), para que as arestas de bloqueio de cada ticket possam referenciar identificadores reais. Use o relacionamento nativo de bloqueio / sub-issue da plataforma, quando existir; caso contrário, preencha o "Bloqueado por" de cada ticket com as issues bloqueadoras. Aplique a label de triagem `ready-for-agent`, salvo instrução em contrário; os tickets já são, por construção, "pegáveis" por um agente.

Trabalhe a **fronteira**: qualquer ticket cujos bloqueadores estejam todos concluídos. Para uma cadeia puramente linear, isso significa de cima para baixo.

NÃO feche nem modifique nenhuma issue-pai.

<local-ticket-template>

# <NN>: <Título do ticket>

**O que construir:** o comportamento ponta a ponta que este ticket faz funcionar, da perspectiva do usuário, não uma lista de implementação camada por camada.

**Bloqueado por:** os números/títulos dos tickets que travam este, ou "Nenhum (pode começar imediatamente)".

**Status:** ready-for-agent

- [ ] Critério de aceite 1
- [ ] Critério de aceite 2

</local-ticket-template>

<issue-template>

## Pai

Uma referência à issue-pai no tracker (se a origem foi uma issue existente; caso contrário, omita esta seção).

## O que construir

O comportamento ponta a ponta que este ticket faz funcionar, da perspectiva do usuário, não a implementação camada por camada.

## Critérios de aceite

- [ ] Critério 1
- [ ] Critério 2

## Bloqueado por

- Uma referência a cada ticket bloqueador, ou "Nenhum (pode começar imediatamente)".

</issue-template>

Em qualquer uma das formas, evite caminhos de arquivo específicos ou trechos de código: eles envelhecem rápido. Exceção: se um protótipo produziu um trecho que codifica uma decisão com mais precisão do que a prosa consegue (máquina de estados, reducer, schema, formato de tipo), inclua-o embutido e observe brevemente que veio de um protótipo. Corte para as partes ricas em decisão, não para uma demo funcional — apenas o essencial.
