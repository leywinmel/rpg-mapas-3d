---
name: pesquisa
description: "Versão evoluída do /pesquisa com 4 melhorias: (1) Nível 3 paralelo por sub-tópico, (2) reflection gate antes de fechar o relatório, (3) output salvo como arquivo .md, (4) source credibility scoring. Mantém human-in-the-loop e zero setup. Use quando quiser pesquisa profunda com relatório final persistente."
---

# Pesquisa em Funil v2

Evolução do `/pesquisa` original com 4 melhorias baseadas em comparação com os melhores sistemas open source (langchain-ai, togethercomputer, smolagents).

## O que mudou vs. `/pesquisa` original

| Feature | pesquisa (v1) | pesquisa2 (v2) |
|---|---|---|
| Human-in-the-loop | Sim | Sim (mantido) |
| Zero setup | Sim | Sim (mantido) |
| Firecrawl no Nível 3 | Sim | Sim (mantido) |
| Nível 3 paralelo | Não | **Sim — múltiplos research em paralelo** |
| Reflection gate | Não | **Sim — avalia suficiência antes de fechar** |
| Output persistente | Não | **Sim — salva como arquivo .md** |
| Source credibility | Não | **Sim — classifica fontes por autoridade** |

## O Funil v2

```
Nível 1: Varredura (perplexity_search paralelo) — mapeia o terreno
    │ Apresentar → usuário aprova direção
    ▼
Nível 2: Análise (perplexity_reason) — compara, identifica sub-tópicos para Nível 3
    │ Apresentar + listar sub-tópicos identificados → usuário escolhe/confirma
    ▼
Nível 3: Deep Dive PARALELO (N × perplexity_research + firecrawl)
    │ Reflection Gate: "isso foi suficiente?"
    │ Se não → rodada adicional focada nos gaps
    ▼
Relatório final → salvo como ~/pesquisas/[tema]-[data].md
```

**Regra inviolável:** human-in-the-loop entre cada nível. Não pular de 1 pra 3 sem aprovação.

---

## Nível 1 — Varredura

Idêntico ao `/pesquisa` original.

**Ferramenta:** `perplexity_search`
**Velocidade:** ~5 segundos por query
**Objetivo:** Mapear o terreno com 3-5 ângulos paralelos.

### Como executar

1. Decompor o tema em 3-5 ângulos complementares
2. Rodar TODAS em paralelo no mesmo turno
3. Usar `sources` estrategicamente: `web`, `scholar`, `social`

### Entrega do Nível 1

```
📡 Varredura: [tema]

Pesquisei [N] ângulos. Resumo:
1. [Ângulo 1]: [achado principal]
2. [Ângulo 2]: [achado principal]
...

Padrões: [padrões emergentes]
Gaps: [o que ainda não sei]

Quer que eu aprofunde em alguma direção?
```

**Não prosseguir sem resposta do usuário.**

---

## Nível 2 — Análise

Idêntico ao `/pesquisa` original, com uma adição: **identificar explicitamente os sub-tópicos candidatos para o Nível 3 paralelo.**

**Ferramenta:** `perplexity_reason`
**Velocidade:** ~15 segundos

### Como executar

1. Construir query analítica com achados do Nível 1 + contexto do usuário
2. Pedir comparação direta e tabela de trade-offs
3. **Novo:** Ao final, identificar 2-4 sub-tópicos independentes que merecem deep dive separado

### Entrega do Nível 2

```
🔍 Análise: [tema]

Comparativo:
| Critério | Opção A | Opção B | Opção C |
|----------|---------|---------|---------|
...

Recomendação preliminar: [opção] porque [razão]

Sub-tópicos para deep dive paralelo:
① [sub-tópico A] — ex: "assistência técnica real no Brasil"
② [sub-tópico B] — ex: "consumo energético real vs declarado"
③ [sub-tópico C] — ex: "histórico de problemas Reclame Aqui"

Confirma esses 3 sub-tópicos para o deep dive, ou quer ajustar?
```

**Não prosseguir sem resposta do usuário.**

---

## Nível 3 — Deep Dive Paralelo ★ NOVO

**Ferramentas:** N × `perplexity_research` em paralelo + `firecrawl_scrape`
**Velocidade:** ~60-90s (paralelo, não sequencial)
**Objetivo:** Investigação completa e simultânea de todos os sub-tópicos aprovados.

### Como executar

**Passo 1 — Disparar em paralelo**

Para cada sub-tópico aprovado no Nível 2, criar uma `perplexity_research` query específica. Disparar TODAS no mesmo turno:

```
# Exemplo: 3 sub-tópicos → 3 research simultâneos
perplexity_research("análise completa assistência técnica Electrolux Brasil 2025 reclamações tempo resolução")
perplexity_research("consumo real geladeira frost free Electrolux vs declarado medições independentes")
perplexity_research("problemas recorrentes Electrolux IF45S compressor vazamento histórico Reclame Aqui")
```

**Passo 2 — Scraping de URLs identificadas**

Após receber os resultados do research, identificar 2-3 URLs de maior valor e raspar. Usar a seguinte ordem de fallback — cada camada só é tentada se a anterior falhar:

1. `firecrawl_scrape(url)` — primeira opção, melhor para sites complexos
2. `WebFetch("https://r.jina.ai/" + url)` — fallback via Jina Reader, converte qualquer página em Markdown sem MCP adicional
3. Pular a URL, anotar como indisponível e seguir em frente

URLs que valem o scraping:
- Reviews detalhados com dados concretos
- Páginas de especificações técnicas
- Threads de fóruns com casos reais

**Passo 3 — Source Credibility Scoring ★ NOVO**

Ao organizar as fontes, classificá-las por autoridade:

| Tier | Tipo | Peso |
|---|---|---|
| A | Papers, órgãos oficiais, fabricante | Alto |
| B | Portais especializados, reviews técnicos | Médio-alto |
| C | Blogs, mídia geral, Reddit | Médio |
| D | Fontes anônimas, sem data | Baixo — mencionar com ressalva |

Priorizar Tier A/B nas conclusões. Mencionar contradições entre tiers.

**Passo 4 — Reflection Gate ★ NOVO**

Antes de escrever o relatório final, executar internamente:

```
Checklist de suficiência:
□ As sub-perguntas definidas no Nível 2 foram respondidas?
□ Há dados concretos (números, datas, casos) além de generalidades?
□ Fontes de Tier A ou B confirmam as principais conclusões?
□ Contradições entre fontes foram identificadas e endereçadas?
```

- Se **≥ 3 checks**: prosseguir para o relatório
- Se **< 3 checks**: para cada gap identificado, avaliar o tipo:
  - Gap **factual pontual** (ex: "não tenho o kWh real", "não sei o preço atual") → usar `perplexity_ask` — mais rápido, qualidade equivalente para fatos únicos
  - Gap **analítico ou comparativo** (ex: "não comparei A vs B", "não entendi o trade-off") → usar `perplexity_search` — alimenta nova rodada de análise

**Regra de ouro do `ask`:** só usar se a pergunta tem UMA resposta correta e factual. Se a resposta começa com "depende" ou precisa de comparação, não é para o `ask`.

### Entrega do Nível 3

```
📋 Relatório: [tema]
Gerado em: [data] | Sub-tópicos cobertos: [N] | Fontes: [N]

## Resumo Executivo
[2-3 frases com a conclusão principal e confiança]

## [Sub-tópico A]
[Achados com dados concretos]
Fontes: [Tier A/B com URLs]

## [Sub-tópico B]
[Achados com dados concretos]
Fontes: [Tier A/B com URLs]

## [Sub-tópico C]
[Achados com dados concretos]
Fontes: [Tier A/B com URLs]

## Comparativo Final
| Critério | Opção A | Opção B |
|----------|---------|---------|
| [dado concreto] | ... | ... |

## Recomendação
[Opção recomendada + justificativa baseada nos dados + nível de confiança]

## Contradições Identificadas
[Pontos onde fontes divergem — mencionar os dois lados]

## Fontes por Tier
**Tier A/B:**
- [fonte com URL e data]
**Tier C/D (com ressalva):**
- [fonte com URL]
```

**Passo 5 — Salvar como arquivo ★ NOVO**

Após apresentar o relatório na conversa, salvar automaticamente:

```bash
# Criar diretório se não existir
mkdir -p ~/pesquisas

# Salvar o relatório
# Nome: pesquisa-[tema-slug]-[YYYY-MM-DD].md
```

Usar a ferramenta `Write` para criar o arquivo em `~/pesquisas/pesquisa-[tema]-[data].md`.

Informar o usuário:
```
Relatório salvo em: ~/pesquisas/pesquisa-[tema]-[data].md
```

---

## Adaptação por contexto

| Tipo | Nível 1 (ângulos) | Nível 2 (foco) | Nível 3 (sub-tópicos paralelos) |
|------|-------------------|----------------|----------------------------------|
| **Compra** | Opções, preços, reviews, problemas | Comparativo + trade-offs | Produto A fundo / Produto B fundo / Problemas reais |
| **Tecnologia** | Frameworks, alternativas, benchmarks | Comparativo técnico | Docs oficiais / Issues produção / Comunidade |
| **Mercado** | Tamanho, players, tendências | Análise competitiva | Player A / Player B / Regulação |
| **Aprendizado** | Conceitos, fontes, abordagens | Síntese + gaps | Paper principal / Implementações / Casos reais |
| **Decisão** | Opções, critérios, riscos | Matriz de decisão | Risco A / Risco B / Validação |

## Atalhos

- **Pergunta simples** ("quanto custa X?"): Nível 1 basta.
- **Comparação rápida** ("A vs B"): Níveis 1+2 sem arquivo.
- **Investigação séria**: Os 3 níveis + arquivo salvo.

Se o usuário já está satisfeito no Nível 1 ou 2, não forçar o funil. Perguntar.

## Ferramentas

| Ferramenta | Quando usar | Sources |
|-----------|-------------|---------|
| `perplexity_search` | Nível 1, queries rápidas | web, scholar, social |
| `perplexity_ask` | Reflection Gate: gaps factuais pontuais com resposta única | web, scholar, social |
| `perplexity_reason` | Nível 2, análise/comparação/trade-offs | web, scholar, social |
| `perplexity_research` | Nível 3, por sub-tópico (paralelo) | web, scholar, social |
| `firecrawl_scrape` | Nível 3, URLs específicas de alta relevância (1ª opção) | qualquer URL |
| `WebFetch` + Jina | Nível 3, fallback quando Firecrawl falha — usar `https://r.jina.ai/` + URL | qualquer URL |
| `firecrawl_map` | Descobrir URLs de um site | qualquer URL |
| `Write` | Salvar relatório final como .md | — |

**Quando NÃO usar `ask`:** comparativos, trade-offs, análises qualitativas, qualquer pergunta cuja resposta comece com "depende". Nesses casos sempre `reason`.

## Fallback: tokens expirados

Se `perplexity_search` falhar com erro de autenticação:

```
⚠️ Tokens do Perplexity expiraram. Para renovar:

1. Abrir perplexity.ai no browser (logado)
2. DevTools (F12) → Application → Cookies → https://www.perplexity.ai
3. Copiar:
   - __Secure-next-auth.session-token
   - next-auth.csrf-token
4. Atualizar em: ~/.claude/plugins/marketplaces/danycouto-plugins/.mcp.json
5. Reiniciar sessão do Claude Code
```

Firecrawl continua funcionando sem os tokens do Perplexity.
