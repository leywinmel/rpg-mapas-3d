# Formato de ADR

Os ADRs vivem em `docs/adr/` e usam numeração sequencial: `0001-slug.md`, `0002-slug.md` etc.

Crie o diretório `docs/adr/` preguiçosamente: apenas quando o primeiro ADR for necessário.

## Template

```md
# {Título curto da decisão}

{1 a 3 frases: qual é o contexto, o que decidimos e por quê.}
```

É isso. Um ADR pode ser um único parágrafo. O valor está em registrar *que* uma decisão foi tomada e *por quê*, não em preencher seções.

## Seções opcionais

Inclua estas apenas quando agregarem valor genuíno. A maioria dos ADRs não vai precisar delas.

- Frontmatter de **Status** (`proposto | aceito | descontinuado | substituído pelo ADR-NNNN`): útil quando decisões são revisitadas
- **Opções Consideradas**: apenas quando as alternativas rejeitadas valem a pena ser lembradas
- **Consequências**: apenas quando efeitos colaterais não óbvios precisam ser destacados

## Numeração

Varra `docs/adr/` procurando o maior número existente e incremente em um.

## Quando oferecer um ADR

As três condições precisam ser verdadeiras:

1. **Difícil de reverter**: o custo de mudar de ideia depois é relevante
2. **Surpreendente sem contexto**: um leitor futuro vai olhar o código e se perguntar "por que diabos fizeram desse jeito?"
3. **Resultado de um trade-off real**: havia alternativas genuínas e você escolheu uma por razões específicas

Se uma decisão é fácil de reverter, pule: você simplesmente vai revertê-la. Se ela não é surpreendente, ninguém vai se perguntar por quê. Se não havia alternativa real, não há nada a registrar além de "fizemos o óbvio".

### O que se qualifica

- **Formato arquitetural.** "Estamos usando um monorepo." "O modelo de escrita é event-sourced, o modelo de leitura é projetado no Postgres."
- **Padrões de integração entre contextos.** "Pedidos e Faturamento se comunicam por eventos de domínio, não por HTTP síncrono."
- **Escolhas de tecnologia que geram aprisionamento (lock-in).** Banco de dados, barramento de mensagens, provedor de autenticação, alvo de deploy. Não toda biblioteca: apenas aquelas que levariam um trimestre para trocar.
- **Decisões de fronteira e escopo.** "Os dados de Cliente pertencem ao contexto de Cliente; outros contextos os referenciam apenas por ID." Os "nãos" explícitos valem tanto quanto os "sins".
- **Desvios deliberados do caminho óbvio.** "Estamos usando SQL manual em vez de um ORM por causa de X." Qualquer coisa em que um leitor razoável presumiria o oposto. Isso impede que o próximo engenheiro "conserte" algo que era deliberado.
- **Restrições não visíveis no código.** "Não podemos usar AWS por causa de requisitos de compliance." "Os tempos de resposta precisam ficar abaixo de 200ms por causa do contrato da API do parceiro."
- **Alternativas rejeitadas quando a rejeição não é óbvia.** Se você considerou GraphQL e escolheu REST por razões sutis, registre; caso contrário, alguém vai sugerir GraphQL de novo em seis meses.
