---
name: gerar-spec-mp
description: "Transforma a conversa atual em uma spec e publica no issue tracker do projeto: sem entrevista, apenas a síntese do que já foi discutido."
disable-model-invocation: true
---

Esta skill pega o contexto da conversa atual e o entendimento da base de código e produz uma spec. NÃO entreviste o usuário; apenas sintetize o que você já sabe.

O issue tracker e o vocabulário de labels de triagem deveriam ter sido fornecidos a você. Se não foram, diga ao usuário para rodar `/configurar-skills-matt-pocock-mp`.

## Processo

1. Explore o repositório para entender o estado atual da base de código, caso ainda não tenha feito isso. Use o vocabulário do glossário de domínio do projeto ao longo de toda a spec e respeite quaisquer ADRs na área que você estiver tocando.

2. Esboce as costuras (seams) nas quais você vai testar a funcionalidade. Costuras já existentes devem ser preferidas a novas. Use a costura mais alta possível. Se novas costuras forem necessárias, proponha-as no ponto mais alto que conseguir. Quanto menos costuras espalhadas pela base de código, melhor — o número ideal é uma.

Confirme com o usuário que essas costuras correspondem ao que ele espera.

3. Escreva a spec usando o template abaixo e depois publique-a no issue tracker do projeto. Aplique a label de triagem `ready-for-agent` — não é necessária triagem adicional.

<spec-template>

## Declaração do Problema

O problema que o usuário está enfrentando, da perspectiva do usuário.

## Solução

A solução para o problema, da perspectiva do usuário.

## Histórias de Usuário

Uma lista LONGA e numerada de histórias de usuário. Cada história deve estar no formato:

1. Como <ator>, eu quero <funcionalidade>, para que <benefício>

<user-story-example>
1. Como cliente de banco mobile, eu quero ver o saldo das minhas contas, para que eu possa tomar decisões mais bem informadas sobre meus gastos
</user-story-example>

Esta lista de histórias deve ser extremamente extensa e cobrir todos os aspectos da funcionalidade.

## Decisões de Implementação

Uma lista das decisões de implementação que foram tomadas. Pode incluir:

- Os módulos que serão construídos/modificados
- As interfaces desses módulos que serão modificadas
- Esclarecimentos técnicos vindos do desenvolvedor
- Decisões arquiteturais
- Mudanças de schema
- Contratos de API
- Interações específicas

NÃO inclua caminhos de arquivo específicos nem trechos de código. Eles podem ficar desatualizados muito rapidamente.

Exceção: se um protótipo produziu um trecho que codifica uma decisão com mais precisão do que a prosa consegue (máquina de estados, reducer, schema, formato de tipo), inclua-o embutido dentro da decisão relevante e observe brevemente que ele veio de um protótipo. Corte para as partes ricas em decisão, não para uma demo funcional — apenas o essencial.

## Decisões de Teste

Uma lista das decisões de teste que foram tomadas. Inclua:

- Uma descrição do que faz um bom teste (teste apenas comportamento externo, não detalhes de implementação)
- Quais módulos serão testados
- Precedentes para os testes (isto é, tipos semelhantes de teste já existentes na base de código)

## Fora de Escopo

Uma descrição das coisas que estão fora do escopo desta spec.

## Notas Adicionais

Quaisquer notas adicionais sobre a funcionalidade.

</spec-template>
