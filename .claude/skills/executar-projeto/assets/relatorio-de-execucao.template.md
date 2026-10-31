# ENTREGA — <ID>

> Salvar como `docs/planos/ENTREGA-<ID>.md`. É o fechamento da etapa 8.
> No 🔁 modo Loop, este arquivo é a **prestação de contas** do que foi feito sem confirmação.

| Campo | Valor |
|---|---|
| **Tarefa** | `<PROJ-123>` / `<slug>` |
| **Plano** | [`PLANO-<ID>.md`](PLANO-<ID>.md) |
| **Modo** | 💬 Interativo / 🔁 Loop |
| **Data** | `<AAAA-MM-DD>` |
| **Branch / Commits** | `feature/<ID>-<slug>` — `<hash1>`, `<hash2>` |
| **Status** | ✅ Entregue / ⚠️ Entregue com pendências / ⛔ Bloqueado |

---

## 1. O que foi feito

<2 a 4 linhas em linguagem de negócio: o que mudou na prática para quem usa o sistema.>

## 2. Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `caminho/arquivo.ext` | <criado / alterado: o que mudou> |

## 3. Como validar

<Passo a passo que qualquer pessoa consegue seguir para conferir o resultado.>

1. <abrir tal tela / rodar tal comando>
2. <fazer tal ação>
3. <o que deve acontecer>

**Comandos:**

```bash
<comando de build>
<comando de teste>
<comando para subir a aplicação>
```

## 4. Verificações executadas

- [ ] Build — <resultado real>
- [ ] Testes — <quantos passaram / falharam>
- [ ] Aplicação subiu e o comportamento foi conferido — <o que eu vi>
- [ ] Critérios de aceite do card — <todos / quais faltaram>

> Registre o resultado **real**. Se algo falhou ou foi pulado, diga aqui — não maquie.

## 5. ⚠️ Premissas assumidas (revisar)

> Copie da seção 3 do plano. **Sempre em destaque** — é aqui que o usuário descobre
> o que eu decidi sozinho.

| # | Premissa | Por quê | Como mudar se estiver errada |
|---|---|---|---|
| P1 | <o que assumi> | `[#N]` <justificativa> | <o que precisaria ser alterado> |

## 6. Decisão visual

- **Mockup:** sim / não — <porquê>
- **`design-de-interface-projeto`:** acionada / não aplicável — <o que ela definiu>

## 7. Pendências e fora de escopo

- <o que ficou de fora e por quê — cite a chave do card novo, se foi aberto>
- <dívida técnica que eu vi de passagem mas não era desta tarefa [#8]>

## 8. Próximo passo natural

<A próxima skill da suíte ou a próxima ação: `testes-projeto`, `revisar-projeto`,
`rodar-projeto`, abrir PR, mover o card, etc.>

## 9. Rastreabilidade

- **Jira:** <comentário postado / transição feita / texto pronto para copiar>
- **`CLAUDE.md`:** <atualizado com X / nada novo>
