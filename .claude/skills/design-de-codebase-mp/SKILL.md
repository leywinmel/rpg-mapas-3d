---
name: design-de-codebase-mp
description: Vocabulário compartilhado para projetar módulos profundos. Use quando o usuário quiser projetar ou melhorar a interface de um módulo, encontrar oportunidades de aprofundamento, decidir onde uma costura (seam) fica, tornar o código mais testável ou mais navegável por IA, ou quando outra skill precisar do vocabulário de módulos profundos.
---

# Design de Base de Código

Projete **módulos profundos**: muito comportamento atrás de uma interface pequena, posicionada em uma costura limpa, testável através dessa interface. Use esta linguagem e estes princípios sempre que código estiver sendo projetado ou reestruturado. O objetivo é alavancagem para quem chama, localidade para quem mantém e testabilidade para todos.

## Glossário

Use estes termos exatamente assim: não substitua por "componente", "serviço", "API" ou "fronteira". Linguagem consistente é justamente o ponto.

**Módulo**: qualquer coisa com uma interface e uma implementação. Deliberadamente agnóstico de escala: uma função, classe, pacote ou fatia que atravessa camadas. _Evite_: unidade, componente, serviço.

**Interface**: tudo o que quem chama precisa saber para usar o módulo corretamente: a assinatura de tipo, mas também invariantes, restrições de ordem, modos de erro, configuração obrigatória e características de performance. _Evite_: API, assinatura (estreitos demais, referem-se apenas à superfície de tipos).

**Implementação**: o que está dentro de um módulo, o corpo de código dele. Distinto de **Adaptador**: uma coisa pode ser um adaptador pequeno com uma implementação grande (um repositório Postgres) ou um adaptador grande com uma implementação pequena (um fake em memória). Use "adaptador" quando a costura for o assunto; "implementação" no resto.

**Profundidade**: alavancagem na interface. A quantidade de comportamento que quem chama (ou um teste) consegue exercitar por unidade de interface que precisa aprender. Um módulo é **profundo** quando uma grande quantidade de comportamento fica atrás de uma interface pequena, e **raso** quando a interface é quase tão complexa quanto a implementação.

**Costura (Seam)** _(Michael Feathers)_: um lugar onde você consegue alterar comportamento sem editar naquele lugar; a *localização* onde a interface de um módulo vive. Onde colocar a costura é uma decisão de design própria, distinta do que fica atrás dela. _Evite_: fronteira (sobrecarregado pelo bounded context do DDD).

**Adaptador**: uma coisa concreta que satisfaz uma interface em uma costura. Descreve o *papel* (que espaço ele preenche), não a substância (o que há dentro).

**Alavancagem**: o que quem chama ganha com a profundidade. Mais capacidade por unidade de interface aprendida. Uma implementação se paga ao longo de N pontos de chamada e M testes.

**Localidade**: o que quem mantém ganha com a profundidade. Mudança, bugs, conhecimento e verificação se concentram em um só lugar em vez de se espalharem pelos chamadores. Conserta uma vez, consertado em todo lugar.

## Profundo vs. raso

**Módulo profundo** = interface pequena + muita implementação:

```
┌─────────────────────┐
│  Interface Pequena  │  ← Poucos métodos, parâmetros simples
├─────────────────────┤
│                     │
│ Implementação Funda │  ← Lógica complexa escondida
│                     │
└─────────────────────┘
```

**Módulo raso** = interface grande + pouca implementação (evite):

```
┌─────────────────────────────────┐
│       Interface Grande          │  ← Muitos métodos, parâmetros complexos
├─────────────────────────────────┤
│  Implementação Fina             │  ← Só repassa adiante
└─────────────────────────────────┘
```

Ao projetar uma interface, pergunte:

- Consigo reduzir o número de métodos?
- Consigo simplificar os parâmetros?
- Consigo esconder mais complexidade lá dentro?

## Princípios

- **Profundidade é uma propriedade da interface, não da implementação.** Um módulo profundo pode ser internamente composto de partes pequenas, mockáveis e substituíveis; elas apenas não fazem parte da interface. Um módulo pode ter **costuras internas** (privadas à sua implementação, usadas pelos testes dele) além da **costura externa** na interface.
- **O teste da deleção.** Imagine apagar o módulo. Se a complexidade desaparecer, ele era um mero repasse. Se a complexidade reaparecer espalhada por N chamadores, ele estava valendo o que custava.
- **A interface é a superfície de teste.** Chamadores e testes atravessam a mesma costura. Se você quer testar *além* da interface, o módulo provavelmente está com o formato errado.
- **Um adaptador significa uma costura hipotética. Dois adaptadores significam uma costura real.** Não introduza uma costura a menos que algo de fato varie através dela.

## Projetando para testabilidade

Boas interfaces tornam o teste natural:

1. **Aceite dependências, não as crie.**

   ```typescript
   // Testável
   function processOrder(order, paymentGateway) {}

   // Difícil de testar
   function processOrder(order) {
     const gateway = new StripeGateway();
   }
   ```

2. **Retorne resultados, não produza efeitos colaterais.**

   ```typescript
   // Testável
   function calculateDiscount(cart): Discount {}

   // Difícil de testar
   function applyDiscount(cart): void {
     cart.total -= discount;
   }
   ```

3. **Superfície pequena.** Menos métodos = menos testes necessários. Menos parâmetros = preparação de teste mais simples.

## Relacionamentos

- Um **Módulo** tem exatamente uma **Interface** (a superfície que ele apresenta a chamadores e testes).
- **Profundidade** é uma propriedade de um **Módulo**, medida contra a **Interface** dele.
- Uma **Costura** é onde a **Interface** de um **Módulo** vive.
- Um **Adaptador** fica em uma **Costura** e satisfaz a **Interface**.
- **Profundidade** produz **Alavancagem** para quem chama e **Localidade** para quem mantém.

## Enquadramentos rejeitados

- **Profundidade como razão entre linhas de implementação e linhas de interface** (Ousterhout): recompensa inchar a implementação. Usamos profundidade-como-alavancagem no lugar.
- **"Interface" como a palavra-chave `interface` do TypeScript ou os métodos públicos de uma classe**: estreito demais — interface aqui inclui todo fato que quem chama precisa saber.
- **"Fronteira"**: sobrecarregado pelo bounded context do DDD. Diga **costura** ou **interface**.

## Aprofundando

- **Aprofundar um agrupamento a partir de suas dependências**: veja [references/aprofundamento.md](references/aprofundamento.md) — categorias de dependência, disciplina de costura e testes que substituem em vez de empilhar camadas.
- **Explorar interfaces alternativas**: veja [references/projete-duas-vezes.md](references/projete-duas-vezes.md) — suba subagentes em paralelo para projetar a interface de várias maneiras radicalmente diferentes e depois compare em profundidade, localidade e posicionamento da costura.
