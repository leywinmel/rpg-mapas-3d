# Protocolo Jira — Puxar, Interpretar e Fechar um Card

Referência normativa da **etapa 1** (Captura da Tarefa) e do fechamento da **etapa 8** da skill
`executar-projeto`. Enquanto a skill `jira-projeto` **cria** o board (épicos, histórias, pipeline),
esta skill **consome** um card já existente: lê, executa e devolve o resultado ao ticket.

---

## 1. Reconhecendo uma chave de issue

Padrão Atlassian: `^[A-Z][A-Z0-9]+-\d+$` — letras maiúsculas, hífen, número.

| Entrada do usuário | Interpretação |
|---|---|
| `PROJ-123`, `ABC-4517` | Chave de issue → puxe o card |
| `https://<org>.atlassian.net/browse/PROJ-123` | Chave na URL → extraia `PROJ-123` |
| "faz o card 123" | Chave **incompleta** → o prefixo está no `CLAUDE.md` (a `jira-projeto` grava lá). Se não estiver, pergunte o prefixo. |
| "criar filtro na tela de clientes" | Descrição livre → não é Jira, siga por descrição |

> Se o `CLAUDE.md` registrar `Jira: configuração recusada pelo usuário`, **não** reabra a
> questão da integração — trate tudo como descrição livre.

---

## 2. Puxando o card (MCP / plugin Atlassian)

As ferramentas do Atlassian costumam vir **deferidas** (só o nome está carregado). Carregue-as
antes de chamar, em **uma única** busca:

```
ToolSearch → query: "select:getJiraIssue,searchJiraIssuesUsingJql,getTransitionsForJiraIssue,transitionJiraIssue,addCommentToJiraIssue"
```

Os nomes reais vêm prefixados (`mcp__<id>__getJiraIssue`). Use o nome exato que o `ToolSearch`
devolver.

| Preciso de | Ferramenta |
|---|---|
| Ler um card pela chave | `getJiraIssue` |
| Achar cards por filtro (sprint, responsável, status) | `searchJiraIssuesUsingJql` |
| Descobrir para quais status posso mover | `getTransitionsForJiraIssue` |
| Mover o card (Em andamento / Concluído) | `transitionJiraIssue` |
| Comentar o resultado no card | `addCommentToJiraIssue` |
| Lançar horas | `addWorklogToJiraIssue` |
| Alterar campos (resumo, descrição, estimativa) | `editJiraIssue` |
| Ver links para outros sistemas | `getJiraIssueRemoteIssueLinks` |
| Descobrir o `cloudId` / sites acessíveis | `getAccessibleAtlassianResources` |

**Servidor não autorizado?** O Atlassian exige OAuth. Se a chamada falhar por autenticação,
**avise o usuário** que ele precisa autorizar o conector (nas configurações de conectores do
claude.ai, ou via `claude mcp` / `/mcp` numa sessão interativa) e **caia no fallback da seção 5**.
Nunca peça token, código de autorização ou URL de callback ao usuário.

---

## 3. O que extrair do card (checklist)

Leia o card inteiro. Registre no Enunciado Canônico:

- **Chave e tipo** — `Bug`, `História`, `Task`, `Sub-tarefa`. O tipo muda o banco de perguntas
  (ver o `references/protocolo-de-perguntas.md` da skill `perguntas-simples`, seções 5.1 e 5.2).
- **Resumo (título)** — o que a pessoa quis dizer em uma linha.
- **Descrição** — vem em **ADF** (Atlassian Document Format, um JSON com `content`/`type`).
  Converta para texto legível: parágrafos, listas, tabelas e blocos de código importam.
- **Critérios de aceite** — normalmente uma lista dentro da descrição ou um campo customizado.
  **São o seu contrato**: eles viram a `Definição de Pronto` do plano. Se não existirem,
  **essa é a sua primeira pergunta ao usuário**.
- **Prioridade e prazo** (`duedate`, sprint) — alimenta a pergunta de prazo.
- **Responsável e relator** — quem tira dúvida sobre o card.
- **Status atual** — se já está `Concluído`, confirme com o usuário antes de trabalhar.
- **Anexos** — prints, planilhas, mockups. **Um mockup anexado muda a etapa 5**: já existe
  referência visual, então o design parte dela em vez de propor do zero.
- **Links e issues relacionadas** (`blocks`, `is blocked by`, `relates to`) — se o card está
  **bloqueado por outro**, avise antes de começar.
- **Comentários** — quase sempre a regra de negócio real está no comentário, não na descrição.
  Leia todos, do mais antigo ao mais recente.

> **Regra dura:** nunca invente conteúdo de card. Se não conseguiu ler, diga que não conseguiu.

---

## 4. Ambiguidades típicas de card (que viram pergunta)

Cards reais são curtos e assumem contexto. Vasculhe estes buracos:

| Sintoma no card | Pergunta que ele esconde |
|---|---|
| "Ajustar o relatório" | Ajustar **o quê** exatamente? Qual coluna/valor está errado hoje? |
| "Melhorar a performance da tela X" | Qual ação está lenta e quanto seria aceitável? |
| "Igual ao que já fizemos no sistema Y" | Onde eu vejo esse "igual"? Tem print/tela de referência? |
| Sem critério de aceite | Como você vai testar para dizer que ficou pronto? |
| "Erro ao salvar" | Qual registro? Qual mensagem apareceu? Sempre ou às vezes? |
| Menção a perfil/permissão | Quem pode fazer isso? Todo mundo logado ou só um perfil? |
| Card de bug sem dado de origem | Tem um caso concreto (id/CPF/pedido) para eu reproduzir? |

---

## 5. Fallback — sem integração ativa

Se não há MCP Atlassian autorizado, **não trave a tarefa**:

1. Peça ao usuário: *"Cola aqui o conteúdo do card `PROJ-123` — título, descrição, critérios de
   aceite e os comentários, se houver."*
2. Se ele preferir, ofereça o comando de CLI pronto para ele rodar e colar o resultado:

```bash
acli jira workitem view --key PROJ-123
```

3. Trate o texto colado exatamente como o card: mesma checklist da seção 3.
4. No fechamento, entregue o **texto do comentário pronto para copiar** em vez de postar
   automaticamente.

---

## 6. Durante a execução — rastreabilidade

- **Smart Commits** em toda mensagem de commit, com a chave da issue [#31][#32]:

```bash
git commit -m "feat: adiciona filtro por período na lista de clientes PROJ-123"
```

  Comandos opcionais do Smart Commit (quando o Jira estiver configurado para aceitá-los):
  `PROJ-123 #comment texto`, `PROJ-123 #time 2h`, `PROJ-123 #in-progress`.

- **Branch** nomeada com a chave, seguindo o padrão do projeto [#33]:
  `feature/PROJ-123-filtro-clientes` — quem cria/organiza branch é a `git-flow-projeto`.
- **PR/MR descritivo** referenciando a chave e explicando o **porquê** e **como testar** [#35].

---

## 7. Fechamento do card (etapa 8)

Ao terminar a execução, **antes** de declarar entregue:

1. **Comente no card** (`addCommentToJiraIssue`) com o resumo da entrega:
   o que foi feito, quais arquivos/áreas mudaram, **as premissas assumidas** e como validar.
2. **Transicione o status** — sempre consulte `getTransitionsForJiraIssue` primeiro (os nomes
   de status variam por projeto: `Em Revisão`, `Code Review`, `Pronto para Teste`…) e só então
   `transitionJiraIssue`. **Nunca chute o id da transição.**
3. **Não mova para `Concluído` por conta própria** se o fluxo do time exige revisão/teste —
   pare no status de revisão e diga isso ao usuário.
4. **Horas** (`addWorklogToJiraIssue`) só se o usuário pedir ou se o `CLAUDE.md` registrar que
   o time exige apontamento.
5. **Modo Loop:** comentar e transicionar é permitido (é o registro do trabalho). O que **não**
   é permitido sem confirmação continua sendo o irreversível: fechar card de outra pessoa,
   apagar issue, mexer em release/produção.

---

## 8. Registro no `CLAUDE.md`

Se durante a execução surgir uma decisão que vira **regra do projeto** (prefixo da chave,
padrão de branch, fluxo de status, quem aprova), grave no `CLAUDE.md`. Ele é a memória
compartilhada entre `executar-projeto`, `git-flow-projeto` e `jira-projeto` [#96].
