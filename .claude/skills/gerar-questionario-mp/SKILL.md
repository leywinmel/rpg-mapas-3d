---
name: gerar-questionario-mp
description: Transforma uma decisão que você não consegue responder por completo em um questionário para outra pessoa preencher.
disable-model-invocation: true
---

Transforme algo que o usuário não consegue responder sozinho em um **questionário**: um documento Markdown que ele entrega a uma pessoa para preencher de forma assíncrona, ou que os dois preenchem juntos em uma reunião. O destinatário detém um conhecimento que falta ao usuário; o questionário extrai isso dele.

**Sabatine o envio, não o assunto.** Entreviste o usuário apenas sobre o _envio_, que é algo que ele sempre consegue responder: para quem vai, e o que ele precisa receber de volta. As perguntas do documento então miram a **lacuna** entre o que o destinatário sabe e o que o usuário precisa.


1. **Para quem vai?** Pergunte, em uma única troca, o cargo do destinatário, a especialidade dele e a relação com o usuário. Isso define o tom do questionário e quanto contexto ele precisa carregar. Concluído quando você souber quem é o destinatário e o que ele sabe que o usuário não sabe.

2. **O que você precisa de volta?** Pergunte, em uma única troca, quais decisões ou fatos específicos o usuário não consegue resolver sozinho e precisa obter dessa pessoa. Concluído quando você tiver uma lista concreta do que o usuário precisa sair capaz de fazer ou decidir.

3. **Escreva o questionário.** Redija perguntas voltadas à lacuna identificada nos passos 1–2, seguindo a estrutura de documento abaixo. Grave em `to-questionnaire-<slug>.md` no diretório atual (slug a partir do tema) e informe o caminho. Concluído quando o arquivo existir e cada item citado pelo usuário no passo 2 estiver coberto por uma pergunta.

## Estrutura do documento

Enquadre o documento como um **questionário de descoberta**: o usuário não tem o contexto, o destinatário tem. Ordene as perguntas da mais importante para a menos importante, já que em modo assíncrono você pode ter apenas uma chance, e agrupe-as sob títulos `##` por tema assim que passarem de um punhado. Escreva usando o template abaixo.

<questionnaire-template>

# <Título do questionário>

**Objetivo:** por que este questionário existe e qual decisão depende dele.

**De:** <o usuário>, **Para:** <o destinatário>, **Como suas respostas serão usadas:** <para onde elas vão>

## Contexto

Um parágrafo que oriente um destinatário que não estava dentro da cabeça do usuário. O suficiente para responder bem, não uma página inteira.

## Como responder

Prazo e esforço aproximado. Respostas parciais e "não sei" são úteis: sinalize qualquer coisa sobre a qual você tenha dúvida em vez de pular.

## <Título do tema>

Uma seção `##` por tema. Sob cada uma, as perguntas dela, da mais importante para a menos importante. Toda pergunta é uma única ideia, nunca composta, com um espaço de resposta logo abaixo, e uma linha de _por que isso importa_ apenas onde a pergunta puder ser mal interpretada ou convidar a uma resposta descartável.

<question-example>
### Qual carga o sistema deve suportar no lançamento?

_Por que isso importa: define se provisionamos para picos de tráfego agora ou adiamos isso._

>
</question-example>

## Mais alguma coisa?

Um fechamento abrangente: alguma coisa que não perguntamos e que deveríamos saber?

</questionnaire-template>
