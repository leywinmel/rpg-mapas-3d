---
name: tdd-mp
description: Desenvolvimento guiado por testes (TDD). Use quando o usuário quiser construir funcionalidades ou corrigir bugs começando pelos testes, mencionar "red-green-refactor" (vermelho-verde-refatorar), ou quiser testes de integração.
---

# Desenvolvimento Guiado por Testes (TDD)

TDD é o ciclo vermelho → verde. Esta skill é a referência que faz esse ciclo produzir testes que valem a pena manter: o que é um bom teste, onde os testes ficam, os antipadrões e as regras do ciclo. Toda seção se aplica em todo ciclo: consulte-as antes e durante o ciclo, não depois.

Ao explorar a base de código, leia o `CONTEXT.md` (se existir), para que os nomes dos testes e o vocabulário das interfaces correspondam à linguagem de domínio do projeto, e respeite os ADRs da área que você estiver tocando.

## O que é um bom teste

Testes verificam comportamento através de interfaces públicas, não detalhes de implementação. O código pode mudar por completo; os testes não deveriam. Um bom teste se lê como uma especificação: "usuário consegue finalizar a compra com um carrinho válido" diz exatamente qual capacidade existe, e sobrevive a refatorações porque não se importa com a estrutura interna.

Veja [references/testes.md](references/testes.md) para exemplos e [references/mocking.md](references/mocking.md) para diretrizes de mock.

## Costuras (seams): onde os testes ficam

Uma **costura** (seam) é a fronteira pública na qual você testa: a interface onde você observa comportamento sem enfiar a mão por dentro. Testes vivem em costuras, nunca contra o que é interno.

**Teste apenas em costuras acordadas previamente.** Antes de escrever qualquer teste, escreva quais costuras estão sob teste e confirme-as com o usuário. Nenhum teste é escrito em uma costura não confirmada. Você não consegue testar tudo, então acordar as costuras de antemão é como o esforço de teste vai parar nos caminhos críticos e na lógica complexa em vez de em cada caso de borda.

Pergunte: "Qual é a interface pública, e quais costuras devemos testar?"

Quando o próprio formato dessa interface estiver em questão (quão profundo é o módulo, onde a costura pertence, o que a interface deveria expor), chame a ferramenta Skill com "design-de-codebase-mp" para pegar o vocabulário. Ela é a fonte compartilhada dos termos módulo, interface, profundidade, costura, adaptador, alavancagem e localidade, e é uma referência a consultar, não uma sessão a executar.

## Antipadrões

- **Acoplado à implementação**: mocka colaboradores internos, testa métodos privados, ou verifica por um canal paralelo (consultando o banco de dados em vez de usar a interface). O sinal: o teste quebra quando você refatora, mesmo sem o comportamento ter mudado.
- **Tautológico**: a asserção recalcula o valor esperado do mesmo jeito que o código faz (`expect(add(a, b)).toBe(a + b)`, um snapshot derivado na mão da mesma forma, uma constante afirmada igual a si mesma), então ele passa por construção e nunca pode discordar do código. Valores esperados precisam vir de uma fonte de verdade independente: um literal sabidamente correto, um exemplo resolvido, a spec.
- **Fatiamento horizontal**: escrever todos os testes primeiro e depois toda a implementação. Testes em massa verificam comportamento _imaginado_: você testa a _forma_ das coisas em vez do comportamento visível ao usuário, os testes ficam insensíveis a mudanças reais, e você se compromete com a estrutura de testes antes de entender a implementação. Trabalhe em **fatias verticais**: um teste → uma implementação → repetir, cada teste sendo uma **bala traçante** que responde ao que o ciclo anterior ensinou.

## Regras do ciclo

- **Vermelho antes de verde.** Escreva primeiro o teste que falha, e só depois o código mínimo para fazê-lo passar. Não antecipe testes futuros nem adicione funcionalidades especulativas.
- **Uma fatia por vez.** Uma costura, um teste, uma implementação mínima por ciclo.
- **Refatoração não faz parte do ciclo.** Ela pertence à etapa de revisão (veja a skill `revisar-codigo-mp`), não ao ciclo de implementação vermelho → verde.
