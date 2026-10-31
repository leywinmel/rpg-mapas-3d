# Projete Duas Vezes

Quando o usuário quiser explorar interfaces alternativas para um candidato a aprofundamento já escolhido, use este padrão de subagentes em paralelo. Baseado em "Design It Twice" (Ousterhout): é improvável que a sua primeira ideia seja a melhor.

Usa o vocabulário do [SKILL.md](../SKILL.md): **módulo**, **interface**, **costura**, **adaptador**, **alavancagem**.

## Processo

### 1. Enquadre o espaço do problema

Antes de subir os subagentes, escreva uma explicação voltada ao usuário sobre o espaço do problema para o candidato escolhido:

- As restrições que qualquer nova interface precisaria satisfazer
- As dependências das quais ela dependeria, e em qual categoria elas se encaixam (veja [aprofundamento.md](aprofundamento.md))
- Um esboço de código aproximado e ilustrativo para ancorar as restrições — não uma proposta, apenas um jeito de tornar as restrições concretas

Mostre isso ao usuário e depois siga imediatamente para o Passo 2. O usuário lê e pensa enquanto os subagentes trabalham em paralelo.

### 2. Suba os subagentes

Suba 3 ou mais subagentes em paralelo. Cada um precisa produzir uma interface **radicalmente diferente** para o módulo aprofundado.

Dê a cada subagente um briefing técnico separado (caminhos de arquivo, detalhes de acoplamento, categoria de dependência conforme [aprofundamento.md](aprofundamento.md), o que fica atrás da costura). O briefing é independente da explicação do espaço do problema voltada ao usuário no Passo 1. Dê a cada agente uma restrição de design diferente:

- Agente 1: "Minimize a interface: mire em no máximo 1–3 pontos de entrada. Maximize a alavancagem por ponto de entrada."
- Agente 2: "Maximize a flexibilidade: suporte muitos casos de uso e extensão."
- Agente 3: "Otimize para o chamador mais comum: torne o caso padrão trivial."
- Agente 4 (se aplicável): "Projete em torno de ports & adapters para dependências que cruzam a costura."

Inclua no briefing tanto o vocabulário do [SKILL.md](../SKILL.md) quanto o do CONTEXT.md, para que cada subagente nomeie as coisas de forma consistente com a linguagem de arquitetura e com a linguagem de domínio do projeto.

Cada subagente entrega:

1. A interface (tipos, métodos, parâmetros, mais invariantes, ordem, modos de erro)
2. Um exemplo de uso mostrando como quem chama a utiliza
3. O que a implementação esconde atrás da costura
4. A estratégia de dependências e os adaptadores (veja [aprofundamento.md](aprofundamento.md))
5. Trade-offs: onde a alavancagem é alta, onde ela é fraca

### 3. Apresente e compare

Apresente os designs sequencialmente, para que o usuário absorva um de cada vez, e depois compare-os em prosa. Contraste por **profundidade** (alavancagem na interface), **localidade** (onde a mudança se concentra) e **posicionamento da costura**.

Depois de comparar, dê sua própria recomendação: qual design você considera mais forte e por quê. Se elementos de designs diferentes combinarem bem, proponha um híbrido. Tenha opinião: o usuário quer uma leitura firme, não um cardápio.
