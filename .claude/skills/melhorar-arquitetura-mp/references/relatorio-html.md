# Formato do Relatório HTML

A revisão arquitetural é renderizada como um único arquivo HTML autocontido no diretório temporário do sistema operacional. Tailwind e Mermaid vêm ambos de CDNs. O Mermaid dá conta de diagramas em forma de grafo de maneira confiável; divs feitos à mão e SVG embutido dão conta dos visuais mais editoriais (diagramas de massa, cortes transversais). Misture os dois: não se apoie no Mermaid para tudo, senão o resultado começa a parecer genérico.

## Esqueleto

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Revisão de arquitetura de {{nome do repositório}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      /* pequena camada customizada para o que o Tailwind não cobre com elegância:
         linhas de costura tracejadas, pontas de seta com cara de desenho à mão etc. */
      .seam { stroke-dasharray: 4 4; }
      .leak { stroke: #dc2626; }
      .deep { background: linear-gradient(135deg, #0f172a, #1e293b); }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="candidates" class="space-y-10">...</section>
      <section id="top-recommendation">...</section>
    </main>
  </body>
</html>
```

## Cabeçalho

Nome do repositório, data e uma legenda compacta: caixa sólida = módulo, linha tracejada = costura, seta vermelha = vazamento, caixa escura e grossa = módulo profundo. Sem parágrafo de introdução. Direto aos candidatos.

## Cartão de candidato

Os diagramas carregam o peso. A prosa é escassa, direta e usa os termos do glossário (da skill `/design-de-codebase-mp`) sem cerimônia.

Cada candidato é um `<article>`:

- **Título**: curto, nomeia o aprofundamento (por exemplo, "Colapsar o pipeline de entrada de Pedidos").
- **Linha de selos**: força da recomendação (`Forte` = esmeralda, `Vale explorar` = âmbar, `Especulativa` = ardósia), mais uma etiqueta para a categoria de dependência (`no mesmo processo`, `substituível localmente`, `ports & adapters`, `mock`).
- **Arquivos**: lista em monoespaçada, `font-mono text-sm`.
- **Diagrama Antes / Depois**: a peça central. Duas colunas, lado a lado. Veja os padrões abaixo.
- **Problema**: uma frase. O que dói.
- **Solução**: uma frase. O que muda.
- **Ganhos**: bullets de até 6 palavras cada. Por exemplo: "Testes batem em uma interface", "Lógica de preço para de vazar", "Apagar 4 wrappers rasos".
- **Destaque de ADR** (se aplicável): uma linha em uma caixa com tom âmbar.

Nada de parágrafos de explicação. Se o diagrama precisa de um parágrafo para ser entendido, redesenhe o diagrama.

## Padrões de diagrama

Escolha o padrão que serve ao candidato. Misture-os. Não faça todos os diagramas parecerem iguais. A variedade faz parte do ponto.

### Grafo Mermaid (o burro de carga para dependências / fluxo de chamadas)

Use um `flowchart` ou `graph` do Mermaid quando o ponto for "X chama Y, que chama Z, e olha a bagunça". Envolva-o em um cartão estilizado com Tailwind, para que não pareça enfiado de paraquedas. Estilize com `classDef` para colorir arestas de vazamento em vermelho e o módulo profundo em escuro. Diagramas de sequência funcionam bem para "antes: 6 idas e voltas; depois: 1".

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      A[OrderHandler] --> B[OrderValidator]
      B --> C[OrderRepo]
      C -.leak.-> D[PricingClient]
      classDef leak stroke:#dc2626,stroke-width:2px;
      class C,D leak
  </pre>
</div>
```

### Caixas-e-setas feitas à mão (quando o layout do Mermaid briga com você)

Módulos como `<div>`s com bordas e rótulos. Setas como elementos `<line>` ou `<path>` de SVG embutido, posicionados de forma absoluta sobre um contêiner relativo. Recorra a isto quando quiser que o diagrama do "depois" pareça um único módulo profundo de borda grossa, com as entranhas esmaecidas — o Mermaid não vai renderizar isso com o peso certo.

### Corte transversal (bom para rasidão em camadas)

Empilhe faixas horizontais (`h-12 border-l-4`) para mostrar as camadas pelas quais uma chamada passa. Antes: 6 camadas finas, cada uma sem fazer nada. Depois: 1 faixa grossa rotulada com a responsabilidade consolidada.

### Diagrama de massa (bom para "interface tão larga quanto a implementação")

Dois retângulos por módulo: um para a área de superfície da interface, outro para a implementação. Antes: o retângulo da interface é quase tão alto quanto o da implementação (raso). Depois: o retângulo da interface é baixo e o da implementação é alto (profundo).

### Colapso de grafo de chamadas

Antes: uma árvore de chamadas de função renderizada como caixas aninhadas. Depois: a mesma árvore colapsada em uma caixa, com as chamadas agora internas exibidas esmaecidas dentro dela.

## Orientações de estilo

- Puxe para o editorial, não para o dashboard corporativo. Espaço em branco generoso. Serifa opcional para títulos (`font-serif` combina bem com stone/slate).
- Cor com parcimônia: um acento (esmeralda ou índigo) mais vermelho para vazamento e âmbar para avisos.
- Mantenha os diagramas com cerca de 320px de altura, para que antes/depois fiquem confortavelmente lado a lado sem rolagem.
- Use `text-xs uppercase tracking-wider` para os rótulos de módulo dentro dos diagramas, para que eles se leiam como esquema, não como UI.
- Os únicos scripts são o CDN do Tailwind e o import ESM do Mermaid. Fora isso, o relatório é estático: sem código de aplicação, sem interatividade além da própria renderização do Mermaid.

## Seção de recomendação principal

Um cartão maior. Nome do candidato, uma frase sobre o porquê, link-âncora para o cartão dele. Só isso.

## Tom

Linguagem simples, concisa, mas os substantivos e verbos arquiteturais vêm direto da skill `/design-de-codebase-mp`. Concisão não é desculpa para derivar.

**Use exatamente:** módulo, interface, implementação, profundidade, profundo, raso, costura, adaptador, alavancagem, localidade.

**Nunca substitua por:** componente, serviço, unidade (no lugar de módulo) · API, assinatura (no lugar de interface) · fronteira (no lugar de costura) · camada, wrapper (no lugar de módulo, quando você quer dizer módulo).

**Formulações que combinam com o estilo:**

- "O módulo de entrada de Pedidos é raso: a interface quase se iguala à implementação."
- "Preço vaza através da costura."
- "Aprofundar: uma interface, um lugar para testar."
- "Dois adaptadores justificam a costura: HTTP em produção, em memória nos testes."

**Os bullets de ganhos** nomeiam o ganho em termos do glossário: *"localidade: os bugs se concentram em um módulo"*, *"alavancagem: uma interface, N pontos de chamada"*, *"a interface encolhe; a implementação absorve os wrappers"*. Não escreva *"mais fácil de manter"* nem *"código mais limpo"*, porque esses termos não estão no glossário e não conquistam seu lugar.

Sem rodeios, sem pigarro retórico, sem "vale notar que…". Se uma frase poderia ser um bullet, faça dela um bullet. Se um bullet pode ser cortado, corte. Se um termo não está no glossário de `/design-de-codebase-mp`, procure um que esteja antes de inventar um novo.
