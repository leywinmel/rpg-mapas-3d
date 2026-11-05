---
name: triagem-mp
description: Move issues e PRs externos por uma máquina de estados de papéis de triagem, categoriza, verifica, sabatina quando preciso e escreve briefings prontos para agentes.
disable-model-invocation: true
---

# Triagem

Mova as issues do issue tracker do projeto por uma pequena máquina de estados de papéis de triagem.

Se este repositório trata pull requests externos como uma superfície de solicitação (veja a configuração do issue tracker), a triagem cobre esses PRs também: **um PR é uma issue com código anexado**, usando os mesmos papéis, os mesmos estados e a mesma máquina, com algumas diferenças marcadas como "para um PR" abaixo. Resolva um `#42` solto para uma issue ou um PR conforme a configuração do tracker.

Todo comentário ou issue publicado no issue tracker durante a triagem **precisa** começar com este aviso:

```
> *Isto foi gerado por IA durante a triagem.*
```

## Documentos de referência

- [references/briefing-de-agente.md](references/briefing-de-agente.md): como escrever briefings de agente duráveis
- [references/fora-de-escopo.md](references/fora-de-escopo.md): como funciona a base de conhecimento `.out-of-scope/`

## Papéis

Dois papéis de **categoria**:

- `bug`: alguma coisa está quebrada
- `enhancement`: nova funcionalidade ou melhoria

Cinco papéis de **estado**:

- `needs-triage`: o mantenedor precisa avaliar
- `needs-info`: aguardando mais informações de quem reportou
- `ready-for-agent`: totalmente especificado, pronto para um agente AFK
- `ready-for-human`: precisa de implementação humana
- `wontfix`: não será tratado

Para um PR, os mesmos estados são lidos contra o código anexado: `ready-for-agent` significa que há um briefing anexado e que um agente deve dar o próximo passo no diff; `ready-for-human` significa que está pronto para um humano fazer o merge.

Toda issue triada deve carregar exatamente um papel de categoria e um papel de estado. Se papéis de estado conflitarem, sinalize e pergunte ao mantenedor antes de fazer qualquer outra coisa.

Esses são os nomes canônicos dos papéis. As strings de label efetivamente usadas no issue tracker podem ser diferentes. O mapeamento deveria ter sido fornecido a você. Se não foi, diga ao usuário para rodar `/configurar-skills-matt-pocock-mp`.

Transições de estado: uma issue sem label normalmente vai primeiro para `needs-triage`; dali ela vai para `needs-info`, `ready-for-agent`, `ready-for-human` ou `wontfix`. `needs-info` volta para `needs-triage` assim que quem reportou responde. O mantenedor pode sobrepor a qualquer momento; sinalize transições que pareçam incomuns e pergunte antes de prosseguir.

## Invocação

O mantenedor invoca `/triagem-mp` e descreve o que quer em linguagem natural. Interprete o pedido e aja. Exemplos:

- "Me mostre qualquer coisa que precise da minha atenção"
- "Vamos olhar a #42" (issue ou PR)
- "Mova a #42 para ready-for-agent"
- "O que está pronto para os agentes pegarem?"

## Mostre o que precisa de atenção

Consulte o issue tracker e apresente três baldes, do mais antigo para o mais recente:

1. **Sem label**: nunca triadas.
2. **`needs-triage`**: avaliação em andamento.
3. **`needs-info` com atividade de quem reportou desde as últimas notas de triagem**: precisa de reavaliação.

Quando PRs estiverem no escopo, inclua os PRs externos nesses baldes e marque cada linha com `[PR]` ou `[issue]`. A descoberta traz apenas PRs *externos* (a configuração do tracker define quem conta como externo), então o PR em andamento de um colaborador não é trabalho de triagem. Esse filtro vale só para a descoberta; um PR nomeado explicitamente é sempre triado, independentemente do autor.

Mostre as contagens e um resumo de uma linha por item. Deixe o mantenedor escolher.

## Triar uma issue ou PR específico

1. **Reúna o contexto.** Leia a issue ou o PR por inteiro (corpo, comentários, labels, autor, datas; para um PR, o diff também). Interprete quaisquer notas de triagem anteriores, para não refazer perguntas já resolvidas. Explore a base de código usando o glossário de domínio do projeto, respeitando os ADRs da área. Rode duas verificações contra a base de código: (a) **redundância**: procure uma implementação existente do comportamento solicitado pelo conceito de domínio (não apenas pelas palavras do pedido) e relate onde você procurou. Se encontrar, é um `wontfix` do tipo "já implementado" (passo 5). (b) **rejeição anterior**: leia `.out-of-scope/*.md` e traga à tona qualquer registro que se pareça com este pedido.

2. **Recomende.** Diga ao mantenedor sua recomendação de categoria e de estado, com o raciocínio, mais um resumo curto da base de código relevante ao pedido (incluindo se aquilo já está implementado). Aguarde orientação.

3. **Verifique a alegação.** Antes de qualquer sabatina, confira se a alegação se sustenta. Para um bug, reproduza-o a partir dos passos de quem reportou. Para um PR, confirme que o diff faz o que alega: faça o checkout, rode os testes ou comandos relevantes. Relate o que aconteceu: confirmado (com o caminho de código), falhou, ou detalhe insuficiente (um forte sinal de `needs-info`). Uma verificação confirmada gera um briefing de agente muito mais forte.

4. **Sabatine (se necessário).** Se o pedido precisar ser desenvolvido, chame a ferramenta Skill duas vezes, para "sabatina-mp" e "modelagem-de-dominio-mp", e sabatine-o até dar forma, uma rodada de perguntas por vez, afiando termos de domínio e atualizando `CONTEXT.md`/ADRs na hora, conforme as decisões forem entrando.

5. **Aplique o desfecho:**
   - `ready-for-agent`: publique um comentário com o briefing de agente ([references/briefing-de-agente.md](references/briefing-de-agente.md)).
   - `ready-for-human`: mesma estrutura de um briefing de agente, mas registre por que aquilo não pode ser delegado (julgamentos, acesso externo, decisões de design, teste manual).
   - `needs-info`: publique as notas de triagem (template abaixo).
   - Para `wontfix`, feche a issue, com o comentário dependendo do *porquê*:
     - **Já implementado**: a mudança já existe na base de código. Aponte onde ela vive; **não** escreva em `.out-of-scope/` (aquela base de conhecimento é para pedidos *rejeitados*, não para os já construídos).
     - **Rejeitado (bug)**: dê uma explicação educada e feche.
     - **Rejeitado (enhancement)**: escreva em `.out-of-scope/`, referencie o registro em um comentário e feche ([references/fora-de-escopo.md](references/fora-de-escopo.md)).
   - `needs-triage`: aplique o papel. Comentário opcional, se houver progresso parcial.

## Sobreposição rápida de estado

Se o mantenedor disser "mova a #42 para ready-for-agent", confie nele e aplique o papel diretamente. Confirme o que você está prestes a fazer (mudanças de papel, comentário, fechamento) e então aja. Pule a sabatina. Se estiver movendo para `ready-for-agent` sem uma sessão de sabatina, pergunte se ele quer que você escreva um briefing de agente.

## Template de needs-info

```markdown
## Notas de Triagem

**O que estabelecemos até aqui:**

- ponto 1
- ponto 2

**O que ainda precisamos de você (@reporter):**

- pergunta 1
- pergunta 2
```

Registre tudo o que foi resolvido durante a sabatina em "o que estabelecemos até aqui", para que o trabalho não se perca. As perguntas precisam ser específicas e acionáveis, não "por favor, forneça mais informações".

## Retomando uma sessão anterior

Se existirem notas de triagem anteriores na issue ou no PR, leia-as, verifique se quem reportou respondeu alguma pergunta pendente e apresente um quadro atualizado antes de continuar. Não refaça perguntas já resolvidas.
