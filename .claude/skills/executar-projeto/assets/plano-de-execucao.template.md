# PLANO DE EXECUÇÃO — <ID>

> Salvar como `docs/planos/PLANO-<ID>.md`, onde `<ID>` é a chave do Jira (`PROJ-123`)
> ou um slug curto da tarefa (`filtro-clientes`).
> Preencha **todas** as seções. Seção sem conteúdo = etapa não pensada.

| Campo | Valor |
|---|---|
| **Tarefa** | `<PROJ-123>` / `<slug>` |
| **Origem** | Jira / descrição livre |
| **Tipo** | Bug / História / Task / Melhoria |
| **Modo de execução** | 💬 Interativo / 🔁 Loop (sem confirmação) |
| **Data** | `<AAAA-MM-DD>` |
| **Branch** | `feature/<ID>-<slug>` |

---

## 1. Enunciado Canônico

- **Problema:** <o que está errado ou faltando hoje, em uma frase>
- **Resultado esperado:** <o que passa a ser verdade quando a tarefa terminar>
- **Como validar:** <o teste de aceite em linguagem de negócio>

## 2. Escopo

**Vou fazer:**
- <item>
- <item>

**NÃO vou fazer (escopo negativo)** [#8]:
- <item que alguém poderia esperar, mas está fora>
- <item adiado para outra tarefa — cite a chave se existir>

## 3. Premissas Assumidas

> Obrigatório no 🔁 modo Loop. No modo Interativo, registre aqui o que o usuário respondeu
> "não sei" e você decidiu.

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | <o que assumi> | <justificativa> `[#N]` | <impacto> / <como consertar> |

## 4. Decisão Visual

- **Tem superfície visual?** Sim / Não
- **Precisa de mockup?** Sim / Não — **porquê:** <justificativa>
- **`design-de-interface-projeto` acionada?** Sim / Não — **o que ela definiu:** <resumo: tokens de tema, estados de loading/erro/vazio, componentes>
- **Referência visual existente:** <tela do próprio sistema / anexo do card / nenhuma>

## 5. Terreno (o que já existe)

| Arquivo | Papel hoje | O que muda |
|---|---|---|
| `caminho/arquivo.ext` | <o que ele faz> | <criar / alterar / remover> |

**Reaproveitamento** [#6]: <o que já existe pronto que será usado em vez de duplicar>
**Convenções locais a seguir** [#5][#13]: <padrão de camadas, nomenclatura, tratamento de erro>

## 6. Passos Atômicos

> Cada passo = **uma** mudança lógica, do tamanho de um commit atômico [#31].
> Passo que não cabe em uma frase objetiva precisa ser quebrado.

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `<arquivo>` | <mudança> | `[#N]` | <comando ou observação que prova que funcionou> |
| 2 | `<arquivo>` | <mudança> | `[#N]` | <…> |
| 3 | `<arquivo>` | <mudança> | `[#N]` | <…> |

## 7. Impacto em Dados e Contratos

- **Banco de dados:** <nenhum / migration `<nome>` versionada [#87] / índice novo [#71]>
- **Contrato de API:** <nenhum / campo novo opcional / mudança quebrando → versionar [#28]>
- **Configuração:** <nenhuma / variável de ambiente nova `<NOME>` — nunca literal no código [#37][#80]>
- **Dados pessoais (LGPD):** <nenhum / quais campos, quem acessa, mascaramento em log [#63]>

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | <regra de negócio isolada> | <entrada inválida / limite> |
| Integração [#42] | <módulo + banco / serviço externo> | <serviço fora do ar> |
| E2E [#43] | <fluxo crítico do usuário> | <erro exibido corretamente na tela> |

**Comando para rodar:** `<npm test / pytest / …>`

## 9. Riscos e Rollback

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| <o que pode quebrar> | Baixa/Média/Alta | <consequência> | <como evito> |

**Rollback** [#84]: <como voltar atrás rápido — reverter commit, desligar flag, restaurar migration>

## 10. Definição de Pronto

- [ ] Todos os passos da seção 6 executados
- [ ] Critérios de aceite do card atendidos
- [ ] Build passa
- [ ] Testes novos e existentes passam [#49]
- [ ] Aplicação subiu e o comportamento foi conferido de verdade
- [ ] Sem segredo em código [#37]
- [ ] Erros tratados e logados no nível certo [#92][#93]
- [ ] Commits atômicos com Conventional Commits + chave do Jira [#31][#32]
- [ ] `docs/planos/ENTREGA-<ID>.md` escrito
- [ ] `CLAUDE.md` atualizado (se surgiu regra nova)
- [ ] Card comentado/transicionado no Jira (se houver integração)
