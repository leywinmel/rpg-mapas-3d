---
name: revisar-codigo-mp
description: "Revisa as mudanças desde um ponto fixo (commit, branch, tag ou merge-base) em dois eixos: Padrões (o código segue os padrões de codificação documentados deste repositório?) e Spec (o código corresponde ao que a issue/spec de origem pediu?). Roda as duas revisões em subagentes paralelos e as reporta lado a lado. Use quando o usuário quiser revisar uma branch, um PR, mudanças em andamento, ou pedir para \"revisar desde X\"."
---

Revisão em dois eixos do diff entre `HEAD` e um ponto fixo fornecido pelo usuário:

- **Padrões**: o código está em conformidade com os padrões de codificação documentados deste repositório?
- **Spec**: o código implementa fielmente a issue / spec de origem?

Os dois eixos rodam como **subagentes paralelos**, para que não poluam o contexto um do outro, e depois esta skill agrega os achados.

O issue tracker deveria ter sido fornecido a você. Se `docs/agents/issue-tracker.md` estiver faltando, diga ao usuário para rodar `/configurar-skills-matt-pocock-mp`.

## Processo

### 1. Fixe o ponto de referência

O que o usuário disser é o ponto fixo (um SHA de commit, nome de branch, tag, `main`, `HEAD~5` etc.). Se ele não especificar, pergunte.

Capture o comando de diff uma vez: `git diff <ponto-fixo>...HEAD` (três pontos, para que a comparação seja contra o merge-base). Anote também a lista de commits via `git log <ponto-fixo>..HEAD --oneline`.

Antes de prosseguir, confirme que o ponto fixo resolve (`git rev-parse <ponto-fixo>`) e que o diff não está vazio. Uma ref inválida ou um diff vazio deve falhar aqui, não dentro de dois subagentes paralelos.

### 2. Identifique a fonte da spec

Procure a spec de origem, nesta ordem:

1. Referências a issues nas mensagens de commit (`#123`, `Closes #45`, `!67` do GitLab etc.), buscadas pelo fluxo descrito em `docs/agents/issue-tracker.md`.
2. Um caminho que o usuário passou como argumento.
3. Um arquivo de spec em `docs/`, `specs/` ou `.scratch/` que corresponda ao nome da branch ou da funcionalidade.
4. Se nada for encontrado, pergunte ao usuário onde está a spec. Se ele disser que não existe, o subagente de **Spec** será pulado e reportará "nenhuma spec disponível".

### 3. Identifique as fontes de padrões

Qualquer coisa no repositório que documente como o código deve ser escrito, como `CODING_STANDARDS.md` ou `CONTRIBUTING.md`.

Além do que o repositório documentar, o eixo de Padrões sempre carrega a **linha de base de smells** abaixo: um conjunto fixo de code smells de Fowler (_Refactoring_, cap. 3) que se aplica mesmo quando o repositório não documenta nada. Duas regras o governam:

- **O repositório prevalece.** Um padrão documentado do repositório sempre vence; onde ele endossar algo que a linha de base sinalizaria, suprima o smell.
- **Sempre um julgamento.** Cada smell é uma heurística rotulada ("possível Feature Envy"), nunca uma violação categórica. Como qualquer padrão aqui, pule tudo o que a tooling já impõe.

Cada smell se lê *o que é* → *como corrigir*; confronte-o com o diff:

- **Nome Misterioso**: uma função, variável ou tipo cujo nome não revela o que ela faz ou guarda. → renomeie; se não surgir um nome honesto, o design está turvo.
- **Código Duplicado**: a mesma forma lógica aparece em mais de um trecho ou arquivo da mudança. → extraia a forma comum e chame-a dos dois lugares.
- **Feature Envy (Inveja de Funcionalidade)**: um método que mexe mais nos dados de outro objeto do que nos próprios. → mova o método para junto dos dados que ele inveja.
- **Aglomerados de Dados**: os mesmos poucos campos ou parâmetros andam sempre juntos (um tipo querendo nascer). → agrupe-os em um único tipo e passe esse tipo.
- **Obsessão por Primitivos**: um primitivo ou string fazendo as vezes de um conceito de domínio que merece o próprio tipo. → dê ao conceito um tipo pequeno e próprio.
- **Switches Repetidos**: o mesmo `switch`/cascata de `if` sobre o mesmo tipo se repete ao longo da mudança. → substitua por polimorfismo, ou por um mapa único compartilhado pelos dois locais.
- **Cirurgia com Espingarda**: uma única mudança lógica obriga a edições espalhadas por muitos arquivos do diff. → reúna o que muda junto em um só módulo.
- **Mudança Divergente**: um arquivo ou módulo é editado por vários motivos não relacionados. → separe, para que cada módulo mude por um motivo só.
- **Generalidade Especulativa**: abstração, parâmetros ou ganchos adicionados para necessidades que a spec não tem. → apague; faça o inline de volta até que uma necessidade real apareça.
- **Cadeias de Mensagens**: navegação longa do tipo `a.b().c().d()` da qual quem chama não deveria depender. → esconda o percurso atrás de um único método no primeiro objeto.
- **Intermediário (Middle Man)**: uma classe ou função que basicamente só delega adiante. → corte-a e chame o alvo real diretamente.
- **Herança Recusada**: uma subclasse ou implementação que ignora ou sobrescreve a maior parte do que herda. → abandone a herança e use composição.

### 4. Suba os dois subagentes em paralelo

O **prompt do subagente de Padrões** deve incluir:

- O comando de diff completo e a lista de commits.
- A lista de arquivos-fonte de padrões que você encontrou no passo 3, **mais a linha de base de smells do passo 3** colada por inteiro (o subagente não tem outro acesso a ela).
- O briefing: "Reporte, por arquivo/trecho quando fizer sentido, (a) cada lugar em que o diff viola um padrão documentado: cite o padrão (arquivo + a regra); e (b) qualquer smell da linha de base que você identificar: nomeie-o e cite o trecho. Distinga violações categóricas de julgamentos: infrações a padrões documentados podem ser categóricas, mas smells da linha de base são sempre julgamentos, e um padrão documentado do repositório se sobrepõe à linha de base. Pule tudo o que a tooling já impõe. Menos de 400 palavras."

O **prompt do subagente de Spec** deve incluir:

- O comando de diff e a lista de commits.
- O caminho ou o conteúdo já buscado da spec.
- O briefing: "Reporte: (a) requisitos pedidos pela spec que estão faltando ou parciais; (b) comportamento presente no diff que não foi pedido (scope creep); (c) requisitos que parecem implementados mas cuja implementação parece errada. Cite a linha da spec para cada achado. Menos de 400 palavras."

Se a spec estiver faltando, pule o subagente de Spec e registre isso no relatório final.

### 5. Agregue

Apresente os dois relatórios sob os títulos `## Padrões` e `## Spec`, na íntegra ou com uma limpeza leve. **Não** funda nem reordene os achados, porque os dois eixos são deliberadamente separados (veja _Por que dois eixos_).

Termine com um resumo de uma linha: total de achados por eixo e o pior problema _dentro de cada eixo_ (se houver). Não escolha um único vencedor entre os eixos: essa é justamente a reordenação que a separação existe para evitar.

## Por que dois eixos

Uma mudança pode passar em um eixo e falhar no outro:

- Código que segue todos os padrões mas implementa a coisa errada → **Padrões passa, Spec falha.**
- Código que faz exatamente o que a issue pediu mas quebra as convenções do projeto → **Spec passa, Padrões falha.**

Reportá-los separadamente impede que um eixo mascare o outro.
