---
name: diagnosticar-bugs-mp
description: Ciclo de diagnóstico para bugs difíceis e regressões de performance. Use quando o usuário disser "diagnostique"/"debug isso", ou relatar algo quebrado/lançando erro/falhando/lento.
---

# Diagnosticando Bugs

Uma disciplina para bugs difíceis. Pule fases apenas quando houver justificativa explícita.

Ao explorar a base de código, leia o `CONTEXT.md` (se existir) para formar um modelo mental claro dos módulos relevantes, e verifique os ADRs da área que você estiver tocando.

## Suprima informações sensíveis

Esta skill faz você mostrar comandos, saídas e artefatos capturados. **Suprima todo segredo primeiro**: escreva `<REDACTED>` no lugar. Construa os ciclos usando variáveis de ambiente, para que a credencial fique no ambiente e não naquilo que você mostra. Artefatos capturados carregam cabeçalhos de autenticação: cite apenas as linhas que carregam o sinal relevante.

Se a saída suprimida não for suficiente para diagnosticar o bug, diga isso e pergunte ao usuário.

## Fase 1: Construa um ciclo de feedback

**Isto é a skill.** Todo o resto é mecânico. Se você tiver um sinal **apertado** de passa/falha para o bug (um que fique vermelho _neste_ bug), você vai encontrar a causa; bisseção, teste de hipóteses e instrumentação apenas consomem esse sinal. Se você não tiver um, nenhuma quantidade de tempo encarando o código vai te salvar.

Gaste um esforço desproporcional aqui. **Seja agressivo. Seja criativo. Recuse-se a desistir.**

### Maneiras de construir um, mais ou menos nesta ordem

1. **Teste que falha** na costura que alcança o bug: unitário, integração, e2e.
2. **Script curl / HTTP** contra um servidor de desenvolvimento rodando.
3. **Invocação de CLI** com uma entrada fixa (fixture), comparando o stdout com um snapshot sabidamente correto.
4. **Script de navegador headless** (Playwright / Puppeteer) que dirige a UI e faz asserções sobre DOM/console/rede.
5. **Reproduza um trace capturado.** Salve em disco uma requisição de rede / payload / log de eventos real; reproduza-o pelo caminho de código isoladamente.
6. **Bancada descartável.** Suba um subconjunto mínimo do sistema (um serviço, dependências mockadas) que exercite o caminho de código do bug com uma única chamada de função.
7. **Ciclo de propriedade / fuzz.** Se o bug é "às vezes a saída sai errada", rode 1000 entradas aleatórias e procure o modo de falha.
8. **Bancada de bisseção.** Se o bug apareceu entre dois estados conhecidos (commit, dataset, versão), automatize "inicie no estado X, verifique, repita" para poder rodar `git bisect run`.
9. **Ciclo diferencial.** Rode a mesma entrada na versão antiga vs. na nova (ou em duas configurações) e compare as saídas.
10. **Script bash com humano no ciclo (HITL).** Último recurso. Se um humano precisa clicar, dirija _ele_ com `assets/hitl-loop.template.sh`, para que o ciclo continue estruturado. A saída capturada volta para você.

Construa o ciclo de feedback certo e o bug está 90% resolvido.

### Aperte o ciclo

Trate o ciclo como um produto. Assim que tiver _um_ ciclo, **aperte-o**:

- Consigo deixá-lo mais rápido? (Cachear o setup, pular inicializações não relacionadas, estreitar o escopo do teste.)
- Consigo deixar o sinal mais nítido? (Fazer asserção sobre o sintoma específico, não sobre "não estourou".)
- Consigo deixá-lo mais determinístico? (Fixar o tempo, semear o gerador aleatório, isolar o sistema de arquivos, congelar a rede.)

Um ciclo instável de 30 segundos é pouco melhor do que nenhum ciclo; um determinístico de 2 segundos é apertado — um superpoder de depuração.

### Bugs não determinísticos

O objetivo não é uma reprodução limpa, e sim uma **taxa de reprodução mais alta**. Rode o gatilho 100×, paralelize, adicione estresse, estreite as janelas de tempo, injete sleeps. Um bug que falha 50% das vezes é depurável; 1% não é, então continue aumentando a taxa até ficar depurável.

### Quando você genuinamente não consegue construir um ciclo

Pare e diga isso explicitamente. Liste o que você tentou. Peça ao usuário: (a) acesso a qualquer ambiente que reproduza o problema, (b) um artefato capturado e com dados sensíveis suprimidos (arquivo HAR, dump de log, core dump, gravação de tela com timestamps), ou (c) permissão para adicionar instrumentação temporária em produção. **Não** avance para levantar hipóteses sem um ciclo.

### Critério de conclusão: um ciclo apertado que fica vermelho

A Fase 1 termina quando o ciclo estiver **apertado** e **capaz de ficar vermelho**: você consegue nomear **um comando** (um caminho de script, uma invocação de teste, um curl) que você **já rodou pelo menos uma vez** (mostre a invocação e a saída, com os dados sensíveis suprimidos), e que seja:

- [ ] **Capaz de ficar vermelho**: ele percorre o caminho de código real do bug e faz asserção sobre o **sintoma exato do usuário**, de modo que possa ficar vermelho neste bug e verde depois de corrigido. Não basta "roda sem dar erro"; ele precisa ser capaz de _pegar este bug específico_.
- [ ] **Determinístico**: o mesmo veredicto a cada execução (para bugs instáveis: uma taxa de reprodução alta e fixada, conforme acima).
- [ ] **Rápido**: segundos, não minutos.
- [ ] **Executável por um agente**: você consegue rodá-lo sem supervisão; humano no ciclo apenas via `assets/hitl-loop.template.sh`.

Se você se pegar lendo código para montar uma teoria antes desse comando existir, **pare: pular direto para uma hipótese é exatamente a falha que esta skill previne.** Sem comando capaz de ficar vermelho, não há Fase 2.

## Fase 2: Reproduza + minimize

Rode o ciclo. Observe-o ficar vermelho quando o bug aparecer.

Confirme:

- [ ] O ciclo produz o modo de falha que o **usuário** descreveu, e não uma falha diferente que por acaso está por perto. Bug errado = correção errada.
- [ ] A falha é reproduzível em múltiplas execuções (ou, para bugs não determinísticos, reproduzível a uma taxa alta o bastante para depurar).
- [ ] Você capturou o sintoma exato (mensagem de erro, saída errada, tempo lento) para que as fases seguintes possam verificar que a correção realmente o resolve.

### Minimize

Uma vez vermelho, encolha a reprodução até o **menor cenário que ainda fica vermelho**. Corte entradas, chamadores, configuração, dados e passos **um de cada vez**, rodando o ciclo novamente após cada corte, e mantenha apenas o que é estrutural para a falha.

Por que se dar ao trabalho: uma reprodução mínima encolhe o espaço de hipóteses na Fase 3 (menos peças móveis restam sob suspeita) e vira o teste de regressão limpo da Fase 5.

Concluído quando **cada elemento restante for estrutural**: remover qualquer um deles faz o ciclo ficar verde.

Não prossiga até ter reproduzido **e** minimizado.

## Fase 3: Levante hipóteses

Gere **3–5 hipóteses ranqueadas** antes de testar qualquer uma delas. Gerar uma hipótese única ancora você na primeira ideia plausível.

Cada hipótese precisa ser **falseável**: enuncie a previsão que ela faz.

> Formato: "Se <X> é a causa, então <mudar Y> fará o bug desaparecer / <mudar Z> o tornará pior."

Se você não consegue enunciar a previsão, a hipótese é só um palpite: descarte-a ou afie-a.

**Mostre a lista ranqueada ao usuário antes de testar.** Ele frequentemente tem conhecimento de domínio que reordena tudo na hora ("acabamos de fazer deploy de uma mudança no item 3"), ou conhece hipóteses que já foram descartadas. Ponto de checagem barato, grande economia de tempo. Não trave por causa disso; prossiga com o seu ranqueamento se o usuário estiver ausente.

## Fase 4: Instrumente

Cada sonda precisa mapear para uma previsão específica da Fase 3. **Mude uma variável por vez.**

Preferência de ferramenta:

1. **Depurador / inspeção via REPL**, se o ambiente permitir. Um breakpoint vale mais que dez logs.
2. **Logs direcionados** nas fronteiras que distinguem as hipóteses.
3. Nunca "logue tudo e faça grep".

**Marque todo log de depuração** com um prefixo único, por exemplo `[DEBUG-a4f2]`. A limpeza no final vira um único grep. Logs sem marcação sobrevivem; logs marcados morrem.

**Ramo de performance.** Para regressões de performance, logs geralmente são a ferramenta errada. Em vez disso: estabeleça uma medição de linha de base (bancada de cronometragem, `performance.now()`, profiler, plano de consulta) e então bissecione. Meça primeiro, corrija depois.

## Fase 5: Correção + teste de regressão

Escreva o teste de regressão **antes da correção**, mas apenas se existir uma **costura correta** para ele.

Uma costura correta é aquela em que o teste exercita o **padrão real do bug** como ele ocorre no ponto de chamada. Se a única costura disponível for rasa demais (teste de um único chamador quando o bug exige múltiplos chamadores; teste unitário que não consegue replicar a cadeia que disparou o bug), um teste de regressão ali dá falsa confiança.

**Se não existe costura correta, isso em si é o achado.** Registre. A arquitetura da base de código está impedindo que o bug seja travado. Sinalize isso para a fase seguinte.

Se existir uma costura correta:

1. Transforme a reprodução minimizada em um teste que falha naquela costura.
2. Observe-o falhar.
3. Aplique a correção.
4. Observe-o passar.
5. Rode novamente o ciclo de feedback da Fase 1 contra o cenário original (não minimizado).

## Fase 6: Limpeza

Obrigatório antes de declarar concluído:

- [ ] A reprodução original não reproduz mais (rode novamente o ciclo da Fase 1)
- [ ] O teste de regressão passa (ou a ausência de costura está documentada)
- [ ] Toda instrumentação `[DEBUG-...]` foi removida (faça `grep` do prefixo)
- [ ] Protótipos descartáveis foram apagados (ou movidos para um local de depuração claramente marcado)
- [ ] A hipótese que se mostrou correta está registrada na mensagem de commit / PR, para que o próximo a depurar aprenda com isso
