# Formato do CONTEXT.md

## Estrutura

```md
# {Nome do Contexto}

{Descrição de uma ou duas frases sobre o que é este contexto e por que ele existe.}

## Linguagem

**Pedido**:
{Descrição de uma ou duas frases do termo}
_Evite_: Compra, transação

**Fatura**:
Uma cobrança enviada ao cliente após a entrega.
_Evite_: Boleto, solicitação de pagamento

**Cliente**:
Uma pessoa ou organização que faz pedidos.
_Evite_: Comprador, conta
```

## Regras

- **Tenha opinião.** Quando existirem várias palavras para o mesmo conceito, escolha a melhor e liste as outras sob `_Evite_`.
- **Mantenha as definições enxutas.** Uma ou duas frases no máximo. Defina o que o termo É, não o que ele faz.
- **Inclua apenas termos específicos do contexto deste projeto.** Conceitos gerais de programação (timeouts, tipos de erro, padrões utilitários) não pertencem aqui, mesmo que o projeto os use bastante. Antes de adicionar um termo, pergunte: isto é um conceito único deste contexto ou um conceito geral de programação? Só o primeiro pertence aqui.
- **Agrupe os termos sob subtítulos** quando agrupamentos naturais emergirem. Se todos os termos pertencerem a uma única área coesa, uma lista plana está ótima.

## Repositórios de contexto único vs. múltiplos contextos

**Contexto único (a maioria dos repositórios):** um `CONTEXT.md` na raiz do repositório.

**Múltiplos contextos:** um `CONTEXT-MAP.md` na raiz lista os contextos, onde eles vivem e como se relacionam entre si:

```md
# Mapa de Contextos

## Contextos

- [Pedidos](./src/ordering/CONTEXT.md): recebe e acompanha os pedidos dos clientes
- [Faturamento](./src/billing/CONTEXT.md): gera faturas e processa pagamentos
- [Expedição](./src/fulfillment/CONTEXT.md): gerencia a separação no armazém e o envio

## Relacionamentos

- **Pedidos → Expedição**: Pedidos emite eventos `OrderPlaced`; Expedição os consome para iniciar a separação
- **Expedição → Faturamento**: Expedição emite eventos `ShipmentDispatched`; Faturamento os consome para gerar faturas
- **Pedidos ↔ Faturamento**: tipos compartilhados para `CustomerId` e `Money`
```

A skill infere qual estrutura se aplica:

- Se existir `CONTEXT-MAP.md`, leia-o para encontrar os contextos
- Se existir apenas um `CONTEXT.md` na raiz, é contexto único
- Se nenhum dos dois existir, crie preguiçosamente um `CONTEXT.md` na raiz quando o primeiro termo for resolvido

Quando houver múltiplos contextos, infira a qual deles o tema atual se refere. Se não estiver claro, pergunte.
