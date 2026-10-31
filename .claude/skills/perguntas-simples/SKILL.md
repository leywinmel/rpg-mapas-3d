---
name: perguntas-simples
description: Levanta todas as dúvidas em aberto do chat ou da tarefa atual e as devolve ao usuário como perguntas de múltipla escolha, em lote, com no mínimo 3 alternativas, a recomendada marcada e o impacto de cada uma em linguagem leiga; registra as respostas em answers/ no projeto. Também reescreve, em termos simples, uma pergunta que o usuário não entendeu. Use sempre que houver decisão que só o usuário pode tomar antes de o trabalho seguir; quando ele disser "me pergunte tudo", "quais são as dúvidas", "o que falta decidir", "tem algo em aberto"; quando ele pedir perguntas mais simples, "explica para um leigo", "fala em português claro", "não entendi a pergunta", "o que você quer dizer com isso", "me dá opções"; quando um plano, spec, contrato, roadmap ou mockup deixar escolhas como padrão implícito ("vale se ninguém vetar"); e quando outra skill precisar zerar a ambiguidade antes de executar. Dispare mesmo que o usuário não use a palavra "pergunta".
argument-hint: "Opcional: o tema, documento ou lista de incógnitas; 'só bloqueantes' para perguntar apenas o que trava"
---

Transforme tudo o que ainda está em aberto neste chat em **decisões fáceis de tomar**. O usuário quer receber as escolhas como perguntas diretas, em lote, antes de o trabalho seguir; uma escolha deixada como "padrão" dentro de um documento longo passa sem ele ver, e ele discorda de parte delas quando enfim as vê. Perguntar é barato; descobrir depois que a premissa estava errada custa o trabalho inteiro.

**Quantidade não é problema; qualidade é.** Não existe limite de perguntas por rodada: faça todas as que a fronteira (seção 3) permitir. O que existe é o crivo (seção 2), e cada pergunta passa por ele.

Se o usuário passou argumentos, trate-os como o foco: concentre as perguntas nesse tema, documento ou lista de incógnitas e deixe o resto para depois.

A referência completa (crivo das 7 checagens, tradutor de jargão, banco de perguntas por tipo de tarefa, exemplos ruim → bom) está em [references/protocolo-de-perguntas.md](references/protocolo-de-perguntas.md). Abra-a quando a tarefa for de um tipo que você ainda não cobriu (funcionalidade nova, bug, tela, relatório, integração, dados, performance) ou quando uma pergunta sua reprovar no crivo e você não souber como reescrevê-la.

## Três modos

- **Levantar**: o padrão. Há decisões em aberto e você vai encontrá-las, filtrá-las e perguntá-las (seções 1 a 6).
- **Só bloqueantes**: o usuário pediu com o argumento `só bloqueantes` ou disse que está com pressa. Siga as mesmas seções, mas pergunte apenas o que tem peso **Bloqueante**; o resto vira premissa com a recomendada, listada no registro para ele revisar depois.
- **Reformular**: o usuário disse que não entendeu uma pergunta, pediu algo mais simples ou "para leigo". Pegue a pergunta tal como foi feita (por você ou por outra skill), descubra qual decisão ela esconde e refaça-a passando pelo crivo da seção 2: uma decisão só, zero jargão, contexto em uma linha, 3 alternativas com impacto. Pergunta que carregava duas decisões vira duas. Não acrescente perguntas novas nesse modo; o usuário pediu clareza, não mais trabalho.

## 1. Levantar as incógnitas

Releia a conversa, os arquivos citados e o foco pedido. Para cada ponto em aberto, classifique:

- **Fato**: algo que existe no ambiente (código, configuração, documento, saída de um comando). Descobrir fatos é trabalho seu, nunca do usuário. Consulte, ou despache um subagente, e não pergunte nada que você mesmo consiga responder lendo.
- **Decisão**: algo que depende da vontade, da prioridade ou do conhecimento de negócio do usuário. Isto vira pergunta.

Para cada decisão, escreva para si mesmo: *o que eu faria de diferente conforme a resposta?* Se toda resposta levaria ao mesmo resultado, a pergunta é decorativa; corte. Concluído quando a lista tiver só decisões que mudam o que você vai fazer e nenhuma incógnita tiver ficado presumida em silêncio.

### Antes de perguntar, veja se já foi decidido

Decisão repetida entre chats irrita e abre espaço para o usuário se contradizer sem perceber. Antes de montar a rodada, procure cada decisão da lista em:

- `answers/` do projeto (os registros desta skill, seção 6), do mais novo para o mais antigo;
- os documentos de decisão do projeto: `COORDENACAO.md`, `CLAUDE.md`, planos em `docs/planos/`, contrato ou spec citados na conversa;
- a sua memória persistente, quando houver.

Decisão já tomada não vira pergunta nova: vira uma **confirmação** de uma linha, com a decisão anterior, a origem e a data, e as alternativas "continua valendo (Recomendado)", "mudar para <X>" e "mudar para <Y>". Se a decisão anterior conflita com algo dito agora, isso é uma contradição (seção 5), não uma confirmação.

## 2. Passar cada pergunta pelo crivo

Antes de enviar, cada pergunta passa pelo **crivo**:

| Checagem | Como validar |
|---|---|
| Uma decisão só | "Qual formato e onde salvar?" são duas perguntas. Separe. |
| Um leigo entende | Leia imaginando alguém do financeiro ouvindo. Jargão sem tradução? Reescreva. Termo inevitável (nome de tela, de campo, de sistema) fica, com uma analogia curta entre parênteses. |
| Pelo menos 3 alternativas concretas | Pergunta aberta devolve o trabalho ao usuário. Três caminhos reais, mutuamente exclusivos; a terceira costuma ser o "meio-termo" ou o "adiar sem perder nada". Se só existem dois caminhos de verdade, a terceira é "decidir depois, com <consequência>", nunca uma opção inventada. |
| Recomendação marcada | Você é o especialista: marque uma alternativa como recomendada e diga o porquê em uma linha. |
| Impacto em linguagem de negócio | Cada alternativa diz o que muda para quem usa: tempo, custo, risco, experiência, retrabalho. Não "usa Redis", mas "fica mais rápido, porém há um serviço a mais para manter". |
| Contexto em uma linha | Como é hoje, ou por que isto virou dúvida. Sem isso o usuário precisa reconstruir o problema para responder. |

## 3. Ordenar

Pense nas decisões como uma **árvore**: algumas só fazem sentido depois que outra foi respondida. A **fronteira** é o conjunto de perguntas que podem ser feitas agora sem chutar respostas que você ainda não ouviu. Pergunta cuja resposta depende de outra ainda aberta pertence à rodada seguinte.

Dentro da fronteira, ordene da mais consequente para a menos, e etiquete cada pergunta com o peso dela:

- **Bloqueante**: sem a resposta, qualquer caminho pode estar errado.
- **Importante**: muda comportamento visível ou regra de negócio.
- **Detalhe**: afina o resultado, mas a recomendada serve bem.

A etiqueta deixa o usuário gastar atenção onde importa e responder "não sei" nos detalhes com tranquilidade.

## 4. Apresentar

Abra com uma **recapitulação** de duas a cinco linhas do que você já entendeu e vai tomar como certo. É aí que o usuário corrige um mal-entendido antes de responder vinte perguntas em cima dele.

Depois, faça a fronteira inteira em uma rodada:

- **Com a ferramenta `AskUserQuestion` disponível**, use-a. Ela aceita até 4 perguntas por chamada, então encadeie quantas chamadas a fronteira pedir, uma atrás da outra, agrupadas por tema e sem texto entre elas. A alternativa recomendada vem primeiro com o sufixo "(Recomendado)"; o `header` é o tema em até 12 caracteres; a `description` de cada opção carrega o impacto. A ferramenta já oferece "Outro" sozinha, então não gaste uma alternativa com isso. Marque o peso no início da pergunta: `[Bloqueante]`, `[Importante]`, `[Detalhe]`.
- **Sem a ferramenta** (modo loop, agente em segundo plano, cliente que não a expõe), use o formato Markdown abaixo na própria mensagem e pare esperando a resposta.

Feche toda rodada com a saída de emergência: *"Se não souber alguma, responda 'não sei': eu fico com a recomendada e registro como premissa para você revisar depois."*

### Formato Markdown (quando não há ferramenta)

```markdown
**Recapitulando o que já entendi:** <2 a 5 linhas>

## Sobre <tema>

**1. [Importante] <Pergunta de uma decisão só, em linguagem do dia a dia>**

*(<contexto em uma linha: como é hoje / por que virou dúvida>)*

- **A)** <alternativa> — **(recomendado)**: <porquê em uma linha>
  <impacto para o negócio>
- **B)** <alternativa>
  <impacto>
- **C)** <alternativa>
  <impacto>

> Se não souber alguma, responda "não sei": eu fico com a recomendada e registro como premissa.
```

### Exemplo de pergunta boa

> **[Importante] Quando o aluno já tiver uma aula reservada, o que acontece se ele tentar reservar outra no mesmo horário?**
> *(Hoje o sistema deixa criar as duas.)*
> - **A)** Bloquear e avisar "você já tem uma aula nesse horário" — **(recomendado)**: evita cobrança em dobro. Leva meio dia.
> - **B)** Deixar criar e resolver no relatório mensal. Rápido de fazer, mas alguém confere à mão todo mês.
> - **C)** Trocar automaticamente a antiga pela nova. Confortável para o aluno, mas mexe no cálculo do plano e leva dois dias.

## 5. Fechar a rodada

Quando as respostas chegarem:

- Resposta que abre dúvida nova, ou que libera perguntas que dependiam dela, recalcula a fronteira: faça a rodada seguinte, recapitulando em uma linha cada resposta anterior.
- Resposta que contradiz algo já decidido na conversa, num documento citado ou num `answers/` anterior: aponte a contradição, com a origem e a data da decisão antiga, e pergunte qual das duas vale, em vez de seguir com as duas.
- "Não sei" vira a recomendada, marcada como **premissa**.

A sessão termina quando a fronteira estiver vazia.

## 6. Registrar em `answers/`

Toda sessão com pelo menos uma resposta termina gravada no projeto, para que handoffs, planos e o `COORDENACAO.md` apontem para o registro em vez de copiá-lo, e para que a seção 1 encontre a decisão da próxima vez. O caminho é:

```
<raiz do projeto>\answers\<AAAA_MM_DD> <tarefa> <NNN>.md
```

Resolva cada parte, criando a pasta se faltar:

1. **Raiz do projeto**: a pasta pai do `.git` devolvido por `git rev-parse --git-common-dir` (sobrevive a worktrees apagadas). Sem git, o diretório de trabalho atual.
2. **Data**: a de hoje.
3. **Tarefa**: a chave do Jira (`RT-626`), lida da branch, dos commits ou da conversa; sem chave, um slug curto em kebab-case do tema (`reservas-duplicadas`). Sem nenhum dos dois, pergunte.
4. **Contagem**: três dígitos, por tarefa: o maior `NNN` já existente para essa tarefa em `answers/` mais um; `001` se não houver nenhum. Liste a pasta antes de numerar.

Exemplo: `C:\repos\snake-server\answers\2026_10_07 RT-626 002.md`.

Conteúdo do arquivo:

```markdown
# Decisões — <tarefa> — <AAAA-MM-DD>

**Contexto:** <uma ou duas linhas sobre a tarefa e o que motivou as perguntas>
**Modo:** levantar | só bloqueantes | reformular

| # | Peso | Pergunta | Decisão | Consequência |
|---|---|---|---|---|
| 1 | Importante | <resumo da pergunta> | <alternativa escolhida> | <o que muda> |

**Confirmações** (decisões antigas que continuam valendo): <lista com origem e data, ou "nenhuma">
**Premissas** (recomendadas aceitas por "não sei" ou não perguntadas no modo só bloqueantes): <lista ou "nenhuma">
**Ainda em aberto** (dependiam de algo fora desta sessão): <lista ou "nenhuma">
```

Termine informando o caminho do arquivo. Se outra skill ou tarefa chamou esta, devolva o caminho, a tabela e o controle a ela; se o usuário chamou esta skill sozinho, pare aí e espere o próximo pedido. Agir sobre as decisões é trabalho de quem pediu as perguntas, não desta skill.
