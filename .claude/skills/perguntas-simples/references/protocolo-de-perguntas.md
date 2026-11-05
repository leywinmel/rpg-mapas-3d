# Protocolo de Perguntas — Linguagem Leiga, Qualidade Cirúrgica

> **Princípio central:** a quantidade de perguntas **não é o problema**. Uma pergunta ruim é.
> Pergunte quantas vezes for necessário para zerar a ambiguidade — mas cada pergunta precisa
> passar no **Crivo das 7 Checagens** abaixo antes de sair da sua boca.

Este documento é a referência completa da skill `perguntas-simples`. Qualquer skill que precise perguntar ao usuário (a `executar-projeto` na etapa de perguntas, por exemplo) chama a `perguntas-simples`, e ela aplica o que está aqui.

---

## 1. Por que perguntar

Errar a interpretação de uma tarefa custa mais caro do que qualquer refatoração. Um dia de
código na direção errada é um dia jogado fora — mais o dia de desfazer. Perguntar é barato;
adivinhar é caro. O usuário quase sempre **sabe** a resposta: ele só não sabe que aquilo era
uma dúvida, porque para ele era "óbvio".

O seu trabalho é transformar o que é óbvio para você (técnico) em uma escolha simples para
ele (negócio).

---

## 2. O Crivo das 7 Checagens

Antes de enviar **cada** pergunta, valide as 7. Falhou em uma? Reescreva ou descarte.

| # | Checagem | Como validar |
|---|---|---|
| 1 | **Eu já tentei responder sozinho?** | Você leu o código, o `CLAUDE.md`, o README e o card do Jira procurando a resposta? Se a resposta está lá, **não pergunte**. |
| 2 | **É uma decisão só?** | A pergunta tem um único ponto de decisão. "Qual formato e onde salvar?" são **duas** perguntas. |
| 3 | **Um leigo entende?** | Leia em voz alta imaginando alguém do financeiro ouvindo. Tem jargão sem tradução? Reescreva. |
| 4 | **Tem pelo menos 3 opções?** | Ofereça `A / B / C` concretas e mutuamente exclusivas. Pergunta aberta ("como você quer?") joga o trabalho de volta para o usuário. Quando só existem dois caminhos reais, a terceira é "decidir depois, com <consequência>", nunca uma opção inventada. |
| 5 | **Tem recomendação?** | Você é o especialista. Marque uma opção como **(recomendado)** e diga por quê em uma linha. |
| 6 | **O impacto está claro?** | Cada opção diz o que muda para o **negócio**: tempo, custo, risco, experiência. Não "usa Redis", mas "fica mais rápido, porém precisa de um serviço a mais para manter". |
| 7 | **A resposta muda o que eu vou fazer?** | Se qualquer resposta levaria ao mesmo código, a pergunta é decorativa. Corte. |

---

## 3. Anatomia de uma pergunta boa

```markdown
**3. Quando o cliente já tiver uma compra em aberto, o que deve acontecer se ele tentar
comprar de novo?**

*(Hoje o sistema deixa criar duas compras ao mesmo tempo para a mesma pessoa.)*

- **A)** Bloquear e avisar "você já tem uma compra em andamento" — **(recomendado)**
  Evita cobrança duplicada. Leva mais ou menos meio dia.
- **B)** Deixar criar as duas e resolver depois no relatório.
  Rápido de fazer, mas alguém vai ter que conferir manualmente todo mês.
- **C)** Juntar as duas compras em uma só automaticamente.
  É o mais confortável para o cliente, mas leva 2 dias e mexe no cálculo do total.
```

Repare: contexto em uma linha entre parênteses, três opções concretas, recomendação
marcada, impacto em tempo/risco/negócio — zero jargão.

---

## 4. Tradutor de jargão (use sempre)

| Não escreva | Escreva |
|---|---|
| "Qual o *payload* esperado no endpoint?" | "Quais informações essa tela precisa enviar quando o usuário clicar em Salvar?" |
| "Deseja *soft delete* ou *hard delete*?" | "Quando o usuário apagar um registro, ele some para sempre ou fica guardado escondido para poder ser recuperado depois?" |
| "*Cache* com qual TTL?" | "Se o dado tiver alguns minutos de atraso, tudo bem? Isso deixa a tela bem mais rápida." |
| "Precisa ser *idempotente*?" | "Se a pessoa clicar duas vezes no botão sem querer, pode acontecer duas vezes ou tem que acontecer só uma?" |
| "Migração *breaking change* na API?" | "Existe outro sistema ou aplicativo que já usa essa informação e pode parar de funcionar se eu mudar o formato?" |
| "Qual a estratégia de *paginação*?" | "Essa lista pode ficar com milhares de itens. Mostro de 20 em 20 com um botão 'ver mais'?" |
| "*Race condition* em concorrência" | "Se duas pessoas fizerem isso no mesmo segundo, o que deve acontecer?" |
| "Precisa de *audit log*?" | "Você vai precisar saber depois quem alterou e quando?" |
| "Autenticação por *JWT* ou sessão?" | "Quem pode usar essa função: qualquer pessoa logada, só o gestor, ou só o dono do registro?" |
| "Qual a *timezone* de referência?" | "Quando eu mostrar a data, uso o horário de Brasília ou o horário do computador de quem está olhando?" |

Se um termo técnico for **inevitável** (nome de sistema, de tela, de campo já existente),
mantenha-o e explique entre parênteses com uma analogia curta.

---

## 5. Banco de perguntas por tipo de tarefa

Use como **ponto de partida**. Corte tudo que você já descobriu sozinho (Checagem #1).

### 5.1 Funcionalidade nova
1. Quem vai usar isso no dia a dia? (todo mundo / só um perfil / só o administrador)
2. O que a pessoa está tentando resolver quando usa essa função?
3. Como você vai saber que ficou pronto? Descreva o "teste de aceite" com suas palavras.
4. Tem alguma regra do negócio que **impede** a ação em algum caso? (valor máximo, prazo, status)
5. Precisa avisar alguém quando isso acontecer? (e-mail, notificação, registro em relatório)
6. Isso substitui alguma coisa que existe hoje, ou convive com ela?
7. Quantas pessoas/registros por dia, mais ou menos? (dez, mil, milhão — muda a solução)

### 5.2 Bug / correção
1. O que você **esperava** que acontecesse e o que **aconteceu**?
2. Acontece sempre ou só às vezes? Se for às vezes, você lembra de algum padrão?
3. Desde quando? Mudou alguma coisa por perto na mesma época?
4. Quantas pessoas estão sendo afetadas agora? (define urgência)
5. Os dados que já ficaram errados precisam ser **corrigidos para trás** ou só parar de errar daqui pra frente?
6. Existe um caso concreto (número do pedido, CPF, id) que eu possa usar para reproduzir?

### 5.3 Tela / interface (dispara também a etapa 5 — design)
1. Essa tela é nova ou é uma que já existe recebendo um pedaço a mais?
2. Tem alguma tela do próprio sistema (ou de outro sistema) que serve de referência de "como deve ficar"?
3. Vai ser usada mais no computador, no celular, ou nos dois?
4. Quando a informação estiver carregando, prefere mostrar um "carregando..." ou o esqueleto da tela?
5. Se der erro, o usuário pode tentar de novo sozinho ou precisa chamar o suporte?
6. Tem campo obrigatório? Qual a mensagem que você quer que apareça se a pessoa esquecer?
7. Tem alguma informação sensível na tela que não pode aparecer para todo mundo?

### 5.4 Relatório / exportação
1. Quem lê esse relatório e para tomar qual decisão?
2. Prefere ver na tela, baixar em Excel/PDF, ou receber por e-mail?
3. Qual o período padrão quando a pessoa abrir? (hoje, mês atual, últimos 30 dias)
4. Precisa somar/agrupar por alguma coisa? (por cliente, por mês, por vendedor)
5. Números com centavos, arredondados, ou com sinal de moeda?

### 5.5 Integração com outro sistema
1. Quem manda e quem recebe a informação?
2. Se o outro sistema estiver fora do ar, o que deve acontecer? (tentar de novo depois / avisar na hora / ignorar)
3. Com que frequência precisa sincronizar? (na hora, de hora em hora, uma vez por dia)
4. Já existe alguém do outro lado que possa confirmar o formato dos dados?
5. Tem custo por chamada / limite de uso nessa integração?

### 5.6 Dados e regras de negócio
1. Essa informação pode ficar em branco?
2. Alguém pode editar depois de salvo? Quem?
3. Se apagar, apaga de verdade ou só some da lista?
4. Existe algum dado pessoal aí (CPF, e-mail, telefone, endereço)? (LGPD)
5. Quem pode enxergar esse dado?
6. Existe algum registro antigo que não segue essa regra? O que fazer com ele?

### 5.7 Performance
1. O que está lento hoje, na sua percepção: abrir a tela, salvar, ou gerar o relatório?
2. Quanto tempo está levando e quanto seria aceitável?
3. Piorou depois de algum evento? (crescimento da base, mudança recente)
4. Tudo bem se o dado tiver alguns minutos de atraso em troca de ficar bem mais rápido?

### 5.8 Sempre valem a pena (fechamento)
1. Tem prazo? Existe alguma data em que isso precisa estar no ar?
2. Tem alguma coisa que eu **não** posso mexer nesse pedaço do sistema?
3. Existe alguém que precisa aprovar antes de ir para produção?

---

## 6. Como conduzir as rodadas

- **Agrupe por tema** e numere. Um bloco por assunto (Ex: `Sobre a tela`, `Sobre os dados`, `Sobre o prazo`).
- **Etiquete o peso** de cada pergunta: `[Bloqueante]`, `[Importante]` ou `[Detalhe]`, para o usuário saber onde gastar atenção e onde o "não sei" é seguro.
- **Sem limite de perguntas por rodada.** Quantidade não é problema; qualidade é. Faça a fronteira inteira
  (tudo o que já pode ser perguntado sem chutar resposta pendente); com a `AskUserQuestion`, encadeie chamadas de 4 em 4.
- **Antes de perguntar, confira `answers/`, `COORDENACAO.md`, planos e memória.** Decisão já tomada vira
  confirmação de uma linha ("continua valendo?"), com origem e data, não pergunta nova.
- **Quantas rodadas forem necessárias.** Resposta nova que abre dúvida nova gera rodada nova.
  Encerre só quando você conseguir escrever o plano milimétrico sem nenhum "acho que".
- **Feche toda rodada com a saída de emergência:**
  > *"Se não souber responder alguma, responda 'não sei' — eu escolho a opção recomendada e registro como premissa no plano."*
- **Recapitule as respostas** no início da rodada seguinte em uma linha cada, para o usuário
  confirmar que você entendeu certo.

### Quando NÃO perguntar
- A resposta está no código, no `CLAUDE.md`, no README ou no card. **Leia.**
- É uma decisão puramente técnica sem impacto para o usuário (nome de variável, qual arquivo
  criar, se usa `for` ou `map`). **Decida você** e justifique com `[#N]`.
- A pergunta é sobre algo que já foi respondido em rodada anterior. **Consulte o histórico.**

---

## 7. Sem usuário para responder — perguntas viram premissas

Em modo loop ou num agente em segundo plano não há quem responda na hora. Então:

1. Para cada incógnita, **escolha a opção recomendada** — a mesma que você marcaria como
   `(recomendado)` se fosse perguntar.
2. Registre no plano, em **Premissas Assumidas**, no formato:
   `PREMISSA: <o que assumi> — porque <justificativa> [#N]. Se estiver errado, o impacto é <X> e o conserto é <Y>.`
3. **Pare o loop** e devolva a pergunta ao usuário **somente** se a incógnita for **bloqueante**:
   sem ela, qualquer caminho pode estar errado e a entrega vira retrabalho garantido
   (ex.: regra fiscal desconhecida, qual cliente é o dono do dado, qual dos dois comportamentos
   opostos é o correto). Entregar errado em silêncio é pior do que parar.
4. Premissas assumidas **sempre** aparecem no relatório de entrega, em destaque, para o usuário
   revisar depois.

---

## 8. Exemplos: ruim → bom

| ❌ Ruim | Por quê | ✅ Bom |
|---|---|---|
| "Qual a regra de negócio?" | Vago, sem opção, joga o trabalho ao usuário | "Quando o pedido passa de R$ 5.000, alguém precisa aprovar antes? (A) Sim, o gestor **(recomendado)** (B) Não, segue direto" |
| "Uso *soft delete* e qual o índice da tabela?" | Jargão + duas perguntas em uma | "Quando apagar um cliente, ele some para sempre ou fica guardado para poder recuperar? (A) Fica guardado **(recomendado)** (B) Some para sempre" |
| "Qual linguagem devo usar?" | Está no `package.json` — Checagem #1 | *(não pergunte; leia o projeto)* |
| "Você quer que fique bonito?" | Não muda o código — Checagem #7 | "Essa tela nova segue o visual da tela de Clientes, ou você quer que eu proponha um desenho novo antes? (A) Segue o padrão atual **(recomendado)** (B) Quero ver um mockup primeiro" |
| "Precisa de testes?" | A resposta é sempre sim [#41][#49] | *(não pergunte; escreva os testes)* |
