---
name: implementar-spec-mp
description: "Implementa uma especificação em código."
disable-model-invocation: true
---

Você recebeu uma spec. Essa spec deve ter tickets associados a ela, descrevendo como implementá-la.

O objetivo é um PR que implemente a spec inteira em uma única branch.

Os tickets não são uma lista de passos. Eles são um **grafo de tarefas** com relações de bloqueio entre si. Isso significa que sempre existe uma **fronteira** de tickets prontos para serem pegos.

A comunicação de e para os subagentes deve ser econômica. Comunique-se principalmente por **ponteiros de contexto**: para a spec, os tickets, as notas de pesquisa e os commits anteriores. Não duplique informação já acessível por ponteiro.

**Subagentes implementadores** devem rodar em segundo plano sempre que possível, para **concorrência máxima**.

## Passos

1. Leia a spec e os tickets. Leia o suficiente para entender o grafo de tarefas.

2. (opcional) Use um **subagente de exploração** para conduzir qualquer exploração exigida pelos tickets — arquivos relevantes da base de código ou documentação externa. Garanta que o subagente de exploração consiga salvar arquivos: ele deve gravar as notas em markdown em um diretório fora do repositório, acessível por todos os subagentes futuros. Isso permite que os **subagentes implementadores** foquem em implementação em vez de exploração.

3. Crie uma branch e um PR em rascunho. O PR deve estar marcado como "fechando" a issue da spec e os tickets.

4. Use **subagentes implementadores** para implementar cada ticket. Cada subagente implementador deve trabalhar no próprio worktree, na própria branch.

5. Assim que um **subagente implementador** terminar, funda o trabalho dele na branch do PR com um **subagente de merge**.

6. Se isso mudar a **fronteira** de tickets disponíveis, dispare mais **subagentes implementadores** para trabalhar nos novos tickets. Isso permite concorrência máxima.

7. Quando todos os tickets estiverem concluídos, rode /revisar-codigo-mp na branch do PR. Corrija todos os problemas levantados pela revisão em um único **subagente implementador**.

8. Marque o PR como pronto para revisão.

9. Limpe todos os worktrees dos **subagentes implementadores**.
