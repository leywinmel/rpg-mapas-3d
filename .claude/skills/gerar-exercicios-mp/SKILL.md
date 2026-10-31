---
name: gerar-exercicios-mp
description: Cria estruturas de diretório de exercícios com seções, problemas, soluções e explicações que passam no lint. Use quando o usuário quiser gerar o esqueleto de exercícios, criar stubs de exercícios, ou montar uma nova seção de curso.
---

# Gerar Exercícios

Crie estruturas de diretório de exercícios que passem em `pnpm ai-hero-cli internal lint`, e depois comite com `git commit`.

## Nomenclatura de diretórios

- **Seções**: `XX-nome-da-secao/` dentro de `exercises/` (ex.: `01-retrieval-skill-building`)
- **Exercícios**: `XX.YY-nome-do-exercicio/` dentro de uma seção (ex.: `01.03-retrieval-with-bm25`)
- Número da seção = `XX`, número do exercício = `XX.YY`
- Os nomes são em dash-case (minúsculas, hifens)

## Variantes de exercício

Cada exercício precisa de pelo menos uma destas subpastas:

- `problem/` — área de trabalho do aluno, com TODOs
- `solution/` — implementação de referência
- `explainer/` — material conceitual, sem TODOs

Ao criar stubs, use `explainer/` por padrão, salvo se o plano especificar outra coisa.

## Arquivos obrigatórios

Cada subpasta (`problem/`, `solution/`, `explainer/`) precisa de um `readme.md` que:

- **Não** esteja vazio (precisa ter conteúdo real; até uma única linha de título serve)
- Não tenha links quebrados

Ao criar stubs, crie um readme mínimo com título e descrição:

```md
# Título do Exercício

Descrição aqui
```

Se a subpasta tiver código, ela também precisa de um `main.ts` (com mais de 1 linha). Mas, para stubs, um exercício só com readme está ok.

## Fluxo de trabalho

1. **Interprete o plano** — extraia nomes de seções, nomes de exercícios e tipos de variante
2. **Crie os diretórios** — `mkdir -p` para cada caminho
3. **Crie os readmes de stub** — um `readme.md` por pasta de variante, com um título
4. **Rode o lint** — `pnpm ai-hero-cli internal lint` para validar
5. **Corrija os erros** — itere até o lint passar

## Resumo das regras de lint

O linter (`pnpm ai-hero-cli internal lint`) verifica:

- Cada exercício tem subpastas (`problem/`, `solution/`, `explainer/`)
- Pelo menos uma de `problem/`, `explainer/` ou `explainer.1/` existe
- `readme.md` existe e não está vazio na subpasta principal
- Nenhum arquivo `.gitkeep`
- Nenhum arquivo `speaker-notes.md`
- Nenhum link quebrado nos readmes
- Nenhum comando `pnpm run exercise` nos readmes
- `main.ts` obrigatório por subpasta, exceto quando ela for só de readme

## Mover/renomear exercícios

Ao renumerar ou mover exercícios:

1. Use `git mv` (não `mv`) para renomear diretórios — preserva o histórico do git
2. Atualize o prefixo numérico para manter a ordem
3. Rode o lint novamente após as movimentações

Exemplo:

```bash
git mv exercises/01-retrieval/01.03-embeddings exercises/01-retrieval/01.04-embeddings
```

## Exemplo: criando stubs a partir de um plano

Dado um plano como:

```
Seção 05: Memory Skill Building
- 05.01 Introduction to Memory
- 05.02 Short-term Memory (explainer + problem + solution)
- 05.03 Long-term Memory
```

Crie:

```bash
mkdir -p exercises/05-memory-skill-building/05.01-introduction-to-memory/explainer
mkdir -p exercises/05-memory-skill-building/05.02-short-term-memory/{explainer,problem,solution}
mkdir -p exercises/05-memory-skill-building/05.03-long-term-memory/explainer
```

Depois crie os stubs de readme:

```
exercises/05-memory-skill-building/05.01-introduction-to-memory/explainer/readme.md -> "# Introduction to Memory"
exercises/05-memory-skill-building/05.02-short-term-memory/explainer/readme.md -> "# Short-term Memory"
exercises/05-memory-skill-building/05.02-short-term-memory/problem/readme.md -> "# Short-term Memory"
exercises/05-memory-skill-building/05.02-short-term-memory/solution/readme.md -> "# Short-term Memory"
exercises/05-memory-skill-building/05.03-long-term-memory/explainer/readme.md -> "# Long-term Memory"
```
