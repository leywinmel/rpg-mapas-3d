---
name: retrospectiva-mp
description: "Conduz uma retrospectiva sobre uma sessão de programação."
disable-model-invocation: true
---

O usuário pediu uma **retrospectiva**. Você está sugerindo melhorias no **ambiente** do agente de programação para melhorar execuções futuras.

## Passos

1. Chame a ferramenta Skill com `escrever-para-agentes-mp` para pegar o guia de estilo de escrita.

2. Leia as fontes primárias da sessão que o usuário indicar. Isso pode significar vasculhar logs de sessão nesta máquina. Se o usuário não indicar uma sessão, use a atual por padrão.

3. Procure candidatos a melhoria nestas categorias.

- **Navegação**: quão fácil foi para o agente encontrar os arquivos certos? Existem dependências ocultas entre arquivos? Um **ponteiro de navegação** facilitaria? _Use quando_ a sessão demorou muito para encontrar uma informação.
- **Verificações automatizadas**: existem verificações automatizadas que poderiam pegar erros que o agente cometeu? Linting, tipagem, testes, linters de sistema de arquivos? _Use quando_ o agente cometeu um erro que uma verificação automatizada teria pegado.
- **Padrões de codificação**: o **agente revisor** deveria receber uma nova regra para impor? Alguma regra existente deveria ser removida ou esclarecida? _Use quando_ o agente revisor deixou passar um erro.
- **AGENTS.md global**: existem instruções de direcionamento que deveriam migrar para os padrões de codificação (ou para verificações automatizadas)? _Use quando_ o arquivo AGENTS.md estiver particularmente grande — no repositório OU no escopo global do usuário.
- **Economia de ferramentas**: o agente fez chamadas de ferramenta caras que poderiam ser enxugadas? Existe alguma ferramenta customizada (CLIs, MCPs) particularmente ineficiente em tokens? _Use quando_ o agente fez uma chamada de ferramenta cara.
- **Instruções inócuas (no-ops)**: procure instruções em arquivos de direcionamento que não modificam o comportamento do agente. _Use quando_ os arquivos de direcionamento estiverem grandes e difíceis de manejar.
- **Acesso à informação**: procure oportunidades de ampliar o acesso do agente à informação. Encaminhar os logs do servidor de desenvolvimento, acesso somente leitura a serviços de terceiros. _Use quando_ uma informação crucial não estava disponível para o agente.

4. Apresente esses candidatos ao usuário, em ordem de gravidade.

## Referência

### Implementação vs. Revisão

Lembre-se de que todo trabalho passa por dois estágios: implementação e revisão. O agente de implementação tem a maior **pressão de contexto**. Ele é responsável pela exploração, pela escrita do código e pela depuração de falhas.

O agente de revisão tem a menor pressão de contexto — ele recebe um diff, então não precisa explorar. Muitas vezes ele não precisa escrever código nem depurar.

Isso significa que o agente de revisão é que deve ser responsável por impor os padrões de codificação, não o agente de implementação.

### Arquivos

Você tem acesso a diversos arquivos no repositório:

- `CLAUDE.md`/`AGENTS.md`: esses arquivos são empurrados para a janela de contexto de qualquer agente trabalhando neste repositório. Devem ser usados com extrema parcimônia, geralmente apenas para **ponteiros de navegação** para outros arquivos.
- `CODING_STANDARDS.md`: este arquivo é lido durante a revisão, não durante a implementação. Adicione **ponteiros de navegação** para pastas de documentação se o arquivo de padrões passar de 1.000 linhas.
- Documentação: use docs como arquivos de referência, apontados por outros arquivos. Procure docs existentes antes de escrever novos.
- Skills: use skills para documentação (já que a descrição delas entra na janela de contexto do agente), ou para comandos invocados pelo usuário. Siga as orientações da skill `escrever-para-agentes-mp`.
