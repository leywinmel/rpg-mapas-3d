# Documentos de Domínio

Como as skills de engenharia devem consumir a documentação de domínio deste repositório ao explorar a base de código.

## Antes de explorar, leia isto

- **`CONTEXT.md`** na raiz do repositório, ou
- **`CONTEXT-MAP.md`** na raiz do repositório, se existir: ele aponta para um `CONTEXT.md` por contexto. Leia cada um que seja relevante ao tema.
- **`docs/adr/`**: leia os ADRs que tocam a área na qual você está prestes a trabalhar. Em repositórios com múltiplos contextos, verifique também `src/<contexto>/docs/adr/` para decisões restritas ao contexto.

Se algum desses arquivos não existir, **prossiga em silêncio**. Não sinalize a ausência deles; não sugira criá-los de antemão. A skill `/modelagem-de-dominio-mp` (alcançada via `/sabatina-com-docs-mp` e `/melhorar-arquitetura-mp`) os cria preguiçosamente, quando termos ou decisões de fato são resolvidos.

## Estrutura de arquivos

Repositório de contexto único (a maioria dos repositórios):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-pedidos-event-sourced.md
│   └── 0002-postgres-para-o-modelo-de-escrita.md
└── src/
```

Repositório com múltiplos contextos (presença de `CONTEXT-MAP.md` na raiz):

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← decisões de todo o sistema
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← decisões específicas do contexto
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## Use o vocabulário do glossário

Quando a sua saída nomear um conceito de domínio (em um título de issue, uma proposta de refatoração, uma hipótese, um nome de teste), use o termo como definido no `CONTEXT.md`. Não derive para sinônimos que o glossário explicitamente manda evitar.

Se o conceito de que você precisa ainda não estiver no glossário, isso é um sinal: ou você está inventando uma linguagem que o projeto não usa (reconsidere), ou há uma lacuna real (anote-a para a `/modelagem-de-dominio-mp`).

## Sinalize conflitos com ADRs

Se a sua saída contradiz um ADR existente, traga isso à tona explicitamente, em vez de sobrepor em silêncio:

> _Contradiz o ADR-0007 (pedidos event-sourced), mas vale reabrir porque…_
