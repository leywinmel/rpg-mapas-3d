---
name: modelagem-de-dominio-mp
description: Constrói e afia o modelo de domínio de um projeto. Use ao discutir a terminologia da base de código, ao escrever ou editar um CONTEXT.md, ou ao registrar ou editar um ADR.
---

# Modelagem de Domínio

Construa e afie ativamente o modelo de domínio do projeto enquanto você projeta. Esta é a disciplina *ativa*: questionar termos, inventar cenários de borda e escrever o glossário e as decisões no momento em que elas cristalizam. (Meramente *ler* o `CONTEXT.md` em busca de vocabulário não é esta skill: isso é um hábito de uma linha que qualquer skill pode ter. Esta skill é para quando você está mudando o modelo, não apenas consumindo-o.)

## Estrutura de arquivos

A maioria dos repositórios tem um único contexto:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-pedidos-event-sourced.md
│       └── 0002-postgres-para-o-modelo-de-escrita.md
└── src/
```

Se existir um `CONTEXT-MAP.md` na raiz, o repositório tem múltiplos contextos. O mapa aponta para onde cada um vive:

```
/
├── CONTEXT-MAP.md
├── docs/
│   └── adr/                          ← decisões de todo o sistema
├── src/
│   ├── ordering/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/                 ← decisões específicas do contexto
│   └── billing/
│       ├── CONTEXT.md
│       └── docs/adr/
```

Crie os arquivos preguiçosamente: apenas quando houver algo a escrever. Se não existir `CONTEXT.md`, crie um quando o primeiro termo for resolvido. Se não existir `docs/adr/`, crie-o quando o primeiro ADR for necessário.

## Durante a sessão

### Questione contra o glossário

Quando o usuário usar um termo que conflita com a linguagem existente no `CONTEXT.md`, aponte isso imediatamente. "Seu glossário define 'cancelamento' como X, mas você parece querer dizer Y. Qual dos dois é?"

### Afie linguagem imprecisa

Quando o usuário usar termos vagos ou sobrecarregados, proponha um termo canônico preciso. "Você está dizendo 'conta': você quer dizer o Cliente ou o Usuário? Essas são coisas diferentes."

### Discuta cenários concretos

Quando relações de domínio estiverem em discussão, coloque-as à prova com cenários específicos. Invente cenários que sondem casos de borda e forcem o usuário a ser preciso sobre as fronteiras entre conceitos.

### Cruze com o código

Quando o usuário afirmar como algo funciona, verifique se o código concorda. Se encontrar uma contradição, traga-a à tona: "Seu código cancela Pedidos inteiros, mas você acabou de dizer que cancelamento parcial é possível. Qual está certo?"

### Atualize o CONTEXT.md na hora

Quando um termo for resolvido, atualize o `CONTEXT.md` ali mesmo. Não acumule isso em lote: capture no momento em que acontece. Use o formato descrito em [references/formato-context.md](references/formato-context.md).

O `CONTEXT.md` deve estar totalmente livre de detalhes de implementação. Não trate o `CONTEXT.md` como uma spec, um rascunho ou um repositório de decisões de implementação. Ele é um glossário e nada mais.

### Ofereça ADRs com parcimônia

Só ofereça criar um ADR quando as três condições forem verdadeiras:

1. **Difícil de reverter**: o custo de mudar de ideia depois é relevante
2. **Surpreendente sem contexto**: um leitor futuro vai se perguntar "por que fizeram desse jeito?"
3. **Resultado de um trade-off real**: havia alternativas genuínas e você escolheu uma por razões específicas

Se qualquer uma das três faltar, pule o ADR. Use o formato descrito em [references/formato-adr.md](references/formato-adr.md).
