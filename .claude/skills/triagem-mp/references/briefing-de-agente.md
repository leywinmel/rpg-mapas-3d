# Escrevendo Briefings de Agente

Um briefing de agente é um comentário estruturado publicado em uma issue ou PR do GitHub quando ela passa para `ready-for-agent`. Ele é a especificação autoritativa a partir da qual um agente AFK vai trabalhar. O corpo original e a discussão são contexto: o briefing de agente é o contrato.

O briefing declara **o que o agente deve fazer**, o que se estende às duas superfícies: para uma issue, isso é construir a mudança do zero; para um PR, é o que falta fazer *no diff existente*: terminá-lo, fechar lacunas, endereçar pontos de revisão. Mesmos princípios nos dois casos; o exemplo de PR abaixo mostra a diferença.

## Princípios

### Durabilidade acima de precisão

A issue pode ficar em `ready-for-agent` por dias ou semanas. A base de código vai mudar nesse meio-tempo. Escreva o briefing de modo que ele continue útil mesmo com arquivos renomeados, movidos ou refatorados.

- **Faça** descrever interfaces, tipos e contratos de comportamento
- **Faça** nomear tipos, assinaturas de função ou formatos de configuração específicos que o agente deve procurar ou modificar
- **Não** referencie caminhos de arquivo: eles envelhecem
- **Não** referencie números de linha
- **Não** presuma que a estrutura atual da implementação vai continuar a mesma

### Comportamental, não procedimental

Descreva **o que** o sistema deve fazer, não **como** implementar. O agente vai explorar a base de código do zero e tomar as próprias decisões de implementação.

- **Bom:** "O tipo `SkillConfig` deve aceitar um campo opcional `schedule` do tipo `CronExpression`"
- **Ruim:** "Abra src/types/skill.ts e adicione um campo schedule na linha 42"
- **Bom:** "Quando um usuário roda `/triage` sem argumentos, ele deve ver um resumo das issues que precisam de atenção"
- **Ruim:** "Adicione um switch na função principal de tratamento"

### Critérios de aceite completos

O agente precisa saber quando terminou. Todo briefing de agente precisa ter critérios de aceite concretos e testáveis. Cada critério deve ser verificável de forma independente.

- **Bom:** "Rodar `gh issue list --label needs-triage` retorna issues que passaram pela classificação inicial"
- **Ruim:** "A triagem deve funcionar corretamente"

### Fronteiras de escopo explícitas

Diga o que está fora de escopo. Isso impede que o agente enfeite demais ou presuma coisas sobre funcionalidades adjacentes.

## Template

```markdown
## Briefing de Agente

**Categoria:** bug / enhancement
**Resumo:** descrição de uma linha do que precisa acontecer

**Comportamento atual:**
Descreva o que acontece hoje. Para bugs, este é o comportamento quebrado.
Para enhancements, este é o status quo sobre o qual a funcionalidade se apoia.

**Comportamento desejado:**
Descreva o que deve acontecer depois que o trabalho do agente estiver completo.
Seja específico sobre casos de borda e condições de erro.

**Interfaces-chave:**
- `NomeDoTipo`: o que precisa mudar e por quê
- Tipo de retorno de `nomeDaFuncao()`: o que ela retorna hoje vs. o que deveria retornar
- Formato de configuração: quaisquer novas opções necessárias

**Critérios de aceite:**
- [ ] Critério específico e testável 1
- [ ] Critério específico e testável 2
- [ ] Critério específico e testável 3

**Fora de escopo:**
- Coisa que NÃO deve ser alterada ou tratada nesta issue
- Funcionalidade adjacente que pode parecer relacionada, mas é separada
```

## Exemplos

### Bom briefing de agente (bug)

```markdown
## Briefing de Agente

**Categoria:** bug
**Resumo:** o truncamento da descrição de skill corta no meio da palavra, produzindo saída quebrada

**Comportamento atual:**
Quando a descrição de uma skill excede 1024 caracteres, ela é truncada em
exatamente 1024 caracteres, sem respeitar limites de palavra. Isso produz
descrições que terminam no meio da palavra (por exemplo, "Use quando o usuário quiser confi").

**Comportamento desejado:**
O truncamento deve quebrar no último limite de palavra antes de 1024 caracteres
e acrescentar "..." para indicar o corte.

**Interfaces-chave:**
- O campo `description` do tipo `SkillMetadata`: nenhuma mudança de tipo é necessária,
  mas a lógica de validação/processamento que o preenche precisa respeitar
  limites de palavra
- Qualquer função que leia o frontmatter do SKILL.md e extraia a descrição

**Critérios de aceite:**
- [ ] Descrições com menos de 1024 caracteres permanecem inalteradas
- [ ] Descrições com mais de 1024 caracteres são truncadas no último limite de palavra
      antes de 1024 caracteres
- [ ] Descrições truncadas terminam com "..."
- [ ] O comprimento total, incluindo o "...", não excede 1024 caracteres

**Fora de escopo:**
- Mudar o próprio limite de 1024 caracteres
- Suporte a descrições de múltiplas linhas
```

### Bom briefing de agente (enhancement)

```markdown
## Briefing de Agente

**Categoria:** enhancement
**Resumo:** adicionar suporte ao diretório `.out-of-scope/` para rastrear pedidos de funcionalidade rejeitados

**Comportamento atual:**
Quando um pedido de funcionalidade é rejeitado, a issue é fechada com a label `wontfix`
e um comentário. Não existe registro persistente da decisão nem do raciocínio.
Pedidos semelhantes no futuro exigem que o mantenedor se lembre ou vá buscar a
discussão anterior.

**Comportamento desejado:**
Pedidos de funcionalidade rejeitados devem ser documentados em arquivos
`.out-of-scope/<conceito>.md` que registrem a decisão, o raciocínio e links para
todas as issues que pediram a funcionalidade. Ao triar novas issues, esses arquivos
devem ser consultados em busca de correspondências.

**Interfaces-chave:**
- Formato do arquivo markdown em `.out-of-scope/`: cada arquivo deve ter um
  título `# Nome do Conceito`, uma linha `**Decisão:**`, uma linha `**Motivo:**`
  e uma lista `**Pedidos anteriores:**` com links de issues
- O fluxo de triagem deve ler todos os arquivos `.out-of-scope/*.md` cedo
  e comparar as issues que chegam com eles por similaridade de conceito

**Critérios de aceite:**
- [ ] Fechar uma funcionalidade como wontfix cria/atualiza um arquivo em `.out-of-scope/`
- [ ] O arquivo inclui a decisão, o raciocínio e o link para a issue fechada
- [ ] Se já existir um arquivo `.out-of-scope/` correspondente, a nova issue é
      acrescentada à lista "Pedidos anteriores" dele, em vez de criar uma duplicata
- [ ] Durante a triagem, os arquivos `.out-of-scope/` existentes são consultados e trazidos à tona
      quando uma nova issue corresponde a uma rejeição anterior

**Fora de escopo:**
- Correspondência automatizada (o humano confirma a correspondência)
- Reabrir funcionalidades rejeitadas anteriormente
- Relatos de bug (apenas rejeições de enhancement vão para `.out-of-scope/`)
```

### Bom briefing de agente (PR)

Para um PR, o "Comportamento atual" descreve o estado do diff, e o briefing pede que o agente termine ou conserte, em vez de construir do zero.

```markdown
## Briefing de Agente

**Categoria:** enhancement
**Resumo:** finalizar a flag de saída `--json` do colaborador para o `triage list`

**Comportamento atual:**
O PR adiciona uma flag `--json` que serializa a lista de issues para JSON. O caminho
feliz funciona e o diff segue a estrutura de comandos do projeto. Restam duas lacunas:
os erros ainda são impressos como texto humano (não JSON), e a nova flag não tem
cobertura de testes.

**Comportamento desejado:**
Com `--json`, toda a saída (inclusive erros) é JSON bem formado no stdout,
e os códigos de saída do comando permanecem inalterados. A saída legível por humanos
já existente fica intocada quando a flag não é usada.

**Interfaces-chave:**
- O caminho de erro do comando deve emitir `{ "error": string }` sob `--json`,
  em vez do erro em texto puro
- Reutilize o serializador que o PR já adicionou; não introduza um segundo

**Critérios de aceite:**
- [ ] `triage list --json` emite JSON válido tanto no sucesso quanto no erro
- [ ] Os códigos de saída batem com os do comando sem JSON
- [ ] Um teste cobre a saída de sucesso com `--json` e um caso de erro
- [ ] A saída padrão (sem JSON) permanece byte a byte inalterada

**Fora de escopo:**
- Adicionar `--json` a qualquer outro comando
- Mudar o formato JSON do payload de sucesso que o PR já definiu
```

### Briefing de agente ruim

```markdown
## Briefing de Agente

**Resumo:** corrigir o bug da triagem

**O que fazer:**
A coisa da triagem está quebrada. Olhe o arquivo principal e conserte.
A função por volta da linha 150 tem o problema.

**Arquivos a alterar:**
- src/triage/handler.ts (linha 150)
- src/types.ts (linha 42)
```

Isto é ruim porque:
- Não tem categoria
- Descrição vaga ("a coisa da triagem está quebrada")
- Referencia caminhos de arquivo e números de linha que vão envelhecer
- Não tem critérios de aceite
- Não tem fronteiras de escopo
- Não descreve comportamento atual vs. desejado
