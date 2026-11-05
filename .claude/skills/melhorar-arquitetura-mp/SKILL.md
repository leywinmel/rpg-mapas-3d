---
name: melhorar-arquitetura-mp
description: Varre uma base de código em busca de oportunidades de aprofundamento, apresenta-as em um relatório HTML visual e depois sabatina em cima da que você escolher.
disable-model-invocation: true
---

# Melhorar a Arquitetura da Base de Código

Traga à tona o atrito arquitetural e proponha **oportunidades de aprofundamento**: refatorações que transformam módulos rasos em módulos profundos. O objetivo é testabilidade e navegabilidade por IA.

Este comando é _informado_ pelo modelo de domínio do projeto e construído sobre um vocabulário de design compartilhado:

- Chame a ferramenta Skill com "design-de-codebase-mp" para pegar o vocabulário de arquitetura (**módulo**, **interface**, **profundidade**, **costura**, **adaptador**, **alavancagem**, **localidade**) e os princípios dele (o teste da deleção, "a interface é a superfície de teste", "um adaptador = costura hipotética, dois = costura real"). Use esses termos exatamente assim em cada sugestão, e não derive para "componente", "serviço", "API" ou "fronteira".
- A linguagem de domínio do `CONTEXT.md` dá nomes a boas costuras; os ADRs em `docs/adr/` registram decisões que este comando não deve rediscutir.

## Processo

### 1. Explore

**Delimite antes de varrer: YAGNI.** Aprofundar um módulo se paga tornando mudanças futuras nele mais fáceis, então dê peso extra às partes da base de código que mudaram recentemente. Decida *onde* olhar antes de olhar:

- Se o usuário indicou uma direção (um módulo, um subsistema, um ponto de dor), siga-a e pule a inferência abaixo.
- Caso contrário, percorra um bom trecho do histórico de commits (`git log --oneline`) para encontrar os pontos quentes da base de código — os arquivos e áreas que aparecem repetidamente — e deixe esses caminhos puxarem sua atenção primeiro. Se as mudanças estiverem espalhadas sem nenhum ponto quente claro, alargue a rede.

Leia primeiro o glossário de domínio do projeto (`CONTEXT.md`) e quaisquer ADRs da área que você estiver tocando.

Depois suba um subagente para percorrer a base de código. Não siga heurísticas rígidas; explore organicamente e anote onde você sente atrito:

- Onde entender um único conceito exige ficar pulando entre muitos módulos pequenos?
- Onde os módulos são **rasos**, com uma interface quase tão complexa quanto a implementação?
- Onde funções puras foram extraídas só por testabilidade, mas os bugs reais se escondem em como elas são chamadas (nenhuma **localidade**)?
- Onde módulos fortemente acoplados vazam através das costuras deles?
- Quais partes da base de código não têm testes, ou são difíceis de testar pela interface atual?

Aplique o **teste da deleção** a qualquer coisa que você suspeite ser rasa: apagar isso concentraria a complexidade ou apenas a moveria? Um "sim, concentra" é o sinal que você quer.

### 2. Apresente os candidatos como um relatório HTML

Escreva um arquivo HTML autocontido no diretório temporário do sistema operacional, para que nada caia no repositório. Resolva o diretório temporário a partir de `$TMPDIR`, recorrendo a `/tmp` (ou `%TEMP%` no Windows), e grave em `<tmpdir>/architecture-review-<timestamp>.html`, para que cada execução gere um arquivo novo. Abra-o para o usuário (`xdg-open <caminho>` no Linux, `open <caminho>` no macOS, `start <caminho>` no Windows) e informe o caminho absoluto.

O relatório usa **Tailwind via CDN** para layout e estilo, e **Mermaid via CDN** para diagramas onde um grafo/fluxo/sequência comunica a estrutura de forma confiável. Misture Mermaid com visuais em CSS/SVG feitos à mão: use Mermaid quando as relações tiverem forma de grafo (grafos de chamada, dependências, sequências), e divs/SVG construídos à mão quando quiser algo mais editorial (diagramas de massa, cortes transversais, animações de colapso). Cada candidato ganha uma **visualização antes/depois**. Seja visual.

Para cada candidato, renderize um cartão com:

- **Arquivos**: quais arquivos/módulos estão envolvidos
- **Problema**: por que a arquitetura atual está causando atrito
- **Solução**: descrição em linguagem simples do que mudaria
- **Benefícios**: explicados em termos de localidade e alavancagem, e de como os testes melhorariam
- **Diagrama Antes / Depois**: lado a lado, desenhado sob medida, ilustrando a rasidão e o aprofundamento
- **Força da recomendação**: uma dentre `Forte`, `Vale explorar`, `Especulativa`, renderizada como um selo

Termine o relatório com uma seção **Recomendação principal**: qual candidato você atacaria primeiro e por quê.

**Use o vocabulário do CONTEXT.md para o domínio, e o vocabulário de `/design-de-codebase-mp` para a arquitetura.** Se o `CONTEXT.md` define "Pedido", fale sobre "o módulo de entrada de Pedidos", não sobre "o FooBarHandler", e nem sobre "o serviço de Pedido".

**Conflitos com ADRs**: se um candidato contradiz um ADR existente, só o traga à tona quando o atrito for real o bastante para justificar revisitar o ADR. Marque isso claramente no cartão (por exemplo, um destaque de aviso: _"contradiz o ADR-0007, mas vale reabrir porque…"_). Não liste toda refatoração teórica que um ADR proíbe.

Veja [references/relatorio-html.md](references/relatorio-html.md) para o esqueleto HTML completo, os padrões de diagrama e as orientações de estilo.

NÃO proponha interfaces ainda. Depois que o arquivo estiver escrito, pergunte ao usuário: "Qual destes você gostaria de explorar?"

### 3. Ciclo de sabatina

Assim que o usuário escolher um candidato, chame a ferramenta Skill com "sabatina-mp" para percorrer a árvore de decisão com ele: restrições, dependências, o formato do módulo aprofundado, o que fica atrás da costura, quais testes sobrevivem.

Os efeitos colaterais acontecem na hora, conforme as decisões cristalizam; chame a ferramenta Skill com "modelagem-de-dominio-mp" para manter o modelo de domínio atualizado ao longo do caminho:

- **Nomeando um módulo aprofundado com um conceito que não está no `CONTEXT.md`?** Adicione o termo ao `CONTEXT.md`. Crie o arquivo preguiçosamente se ele não existir.
- **Afiando um termo impreciso durante a conversa?** Atualize o `CONTEXT.md` ali mesmo.
- **O usuário rejeita o candidato com um motivo estrutural?** Ofereça um ADR, enquadrado assim: _"Quer que eu registre isto como um ADR, para que revisões futuras de arquitetura não sugiram de novo?"_ Só ofereça quando o motivo seria de fato necessário a um explorador futuro para evitar sugerir a mesma coisa; pule motivos efêmeros ("não vale a pena agora") e motivos autoevidentes.
- **Quer explorar interfaces alternativas para o módulo aprofundado?** Chame a ferramenta Skill com "design-de-codebase-mp" e use o padrão de subagentes paralelos "projete duas vezes" dela.
