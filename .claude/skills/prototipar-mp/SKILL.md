---
name: prototipar-mp
description: Constrói um protótipo descartável para responder a uma pergunta de design. Use quando o usuário quiser checar se um modelo de estado ou uma lógica faz sentido, ou explorar como uma UI deveria ser.
---

# Prototipar

Um protótipo é **código descartável que responde a uma pergunta**. A pergunta decide o formato.

## Escolha a ramificação

Identifique qual pergunta está sendo respondida, usando o prompt do usuário, o código ao redor, ou perguntando, se o usuário estiver por perto:

- **"Esta lógica / este modelo de estado faz sentido?"** → [references/logica.md](references/logica.md). Construa um único arquivo HTML compartilhável (botões de uso livre mais passeios guiados em abas) que empurre a máquina de estados por casos difíceis de raciocinar no papel, e que uma pessoa não desenvolvedora consiga conduzir.
- **"Como isto deveria parecer?"** → [references/ui.md](references/ui.md). Gere várias variações de UI radicalmente diferentes em uma única rota, alternáveis por um parâmetro de busca na URL e uma barra flutuante embaixo.

As duas ramificações produzem artefatos muito diferentes, então errar isso desperdiça o protótipo inteiro. Se a pergunta for genuinamente ambígua e o usuário estiver inacessível, use por padrão a ramificação que melhor combina com o código ao redor (um módulo de backend → lógica; uma página ou componente → UI) e declare a suposição no topo do protótipo.

## Regras que valem para as duas

1. **Descartável desde o primeiro dia, e claramente marcado como tal.** Posicione o código do protótipo perto de onde ele será de fato usado (ao lado do módulo ou página para a qual está prototipando), para que o contexto seja óbvio, mas nomeie-o de modo que um leitor casual perceba que é um protótipo e não produção. Para rotas de UI descartáveis, obedeça a convenção de rotas que o projeto já usa; não invente uma nova estrutura de topo.
2. **Trivial de rodar.** Um protótipo de UI começa com um comando no executor de tarefas do projeto: `pnpm <nome>`, `python <caminho>`, `bun <caminho>` etc. Uma demo de lógica é um único arquivo HTML no qual o usuário dá dois cliques. De um jeito ou de outro, não exige pensar para iniciar.
3. **Sem persistência por padrão.** O estado vive em memória. Persistência é justamente a coisa que o protótipo está _verificando_, não algo de que ele deva depender. Se a pergunta envolver explicitamente um banco de dados, use um banco de rascunho ou um arquivo local com um nome claro do tipo "PROTÓTIPO, pode apagar".
4. **Pule o polimento.** Sem testes, sem tratamento de erros além do necessário para o protótipo _rodar_, sem abstrações. O objetivo é aprender algo rápido.
5. **Exponha o estado.** Depois de cada ação (lógica) ou a cada troca de variante (UI), imprima ou renderize todo o estado relevante, para que o usuário veja o que mudou.
6. **Capture quando terminar.** Incorpore ao código real qualquer decisão validada, e depois capture o próprio protótipo como uma **fonte primária**: comite-o em uma branch descartável, fora da main, e deixe um ponteiro de contexto para essa branch na issue de implementação. Capture também a resposta (o veredicto e a pergunta que ele resolveu) na issue ou em um commit. A branch main guarda apenas a decisão validada.
