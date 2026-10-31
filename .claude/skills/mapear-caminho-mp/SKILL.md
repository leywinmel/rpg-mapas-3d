---
name: mapear-caminho-mp
description: Planeja um bloco enorme de trabalho (grande demais para caber em uma sessão de agente) como um mapa compartilhado de tickets de decisão no seu issue tracker, e resolve um de cada vez até que o caminho até o destino fique claro.
disable-model-invocation: true
---

Chegou uma ideia solta, grande demais para uma sessão de agente e envolta em neblina: o caminho daqui até o **destino** ainda não está visível. Mapear o caminho é encontrar esse trajeto, não avançar de cabeça em direção ao destino. Esta skill traça o caminho como um **mapa compartilhado** no issue tracker do repositório e depois trabalha os **tickets de decisão** dele (perguntas cuja resolução é uma decisão, não fatias de uma construção a executar) um de cada vez, até a rota ficar clara.

O destino varia a cada empreitada, e nomeá-lo é o primeiro ato do mapeamento: ele molda cada ticket. Pode ser uma spec para repassar e iterar, uma decisão a travar antes do planejamento começar, ou uma mudança feita no lugar, como uma migração de estrutura de dados. O mapa é agnóstico de domínio: trabalho de engenharia, conteúdo de curso, o que couber no formato.

## Planeje, não execute

Mapear o caminho é **planejamento** por padrão: cada ticket resolve uma decisão, e o mapa está pronto quando o caminho está claro, sem nada a decidir antes que alguém vá e faça a coisa. A vontade de simplesmente fazer o trabalho normalmente é o sinal de que você chegou à borda do mapa e é hora de repassar. Uma empreitada pode sobrepor isso nas **Notas** dela, trazendo a execução para dentro do mapa; mas, na ausência disso, produza decisões, não entregáveis.

## Refira-se pelo nome

Todo mapa e todo ticket é uma issue, então tem um **nome**: o título dela. Em tudo o que o humano lê (narrativa, o "Decisões até aqui" do mapa), refira-se a ele por esse nome, nunca por um id, número ou slug pelado. Uma parede de `#42, #43, #44` é ilegível; nomes se leem de relance. O id e a URL não somem; um nome envolve o link dele, mas eles viajam _dentro_ do nome, nunca no lugar dele.

## O Mapa

O mapa é uma única issue no issue tracker deste repositório, com a label `wayfinder:map`, o artefato canônico. Os tickets dele são issues-filhas do mapa.

O mapa é um **índice**, não um depósito. Ele lista as decisões tomadas e aponta para os tickets que contêm os detalhes delas; uma decisão vive em exatamente um lugar, o ticket dela, então o mapa nunca a repete — apenas a resume e a referencia.

**Onde o mapa, os tickets-filhos, o bloqueio e as consultas de fronteira vivem fisicamente é específico de cada tracker.** O issue tracker deveria ter sido fornecido a você. Se não foi, diga ao usuário para rodar `/configurar-skills-matt-pocock-mp`. Consulte a seção "Wayfinding operations" do documento do tracker para saber como _este_ repositório expressa isso. Se nenhum tracker tiver sido fornecido, use por padrão o tracker em markdown local.

### O corpo do mapa

O mapa inteiro em baixa resolução, carregado uma vez por sessão. Tickets abertos **não** são listados: eles são issues-filhas abertas, encontradas por consulta.

```markdown
## Destino

<como é chegar ao fim deste mapa: a spec, decisão ou mudança que esta empreitada está buscando alcançar. Uma ou duas linhas; toda sessão se orienta por isso antes de escolher um ticket.>

## Notas

<domínio; skills que toda sessão deve consultar; preferências permanentes para esta empreitada>

## Decisões até aqui

<!-- o índice: uma linha por ticket fechado, o suficiente para julgar a relevância, e então o link amplia para o detalhe que o ticket guarda -->

- [<título do ticket fechado>](link): <resumo de uma linha da resposta>

## Ainda não especificado

<!-- veja "Névoa da guerra": névoa dentro do escopo que você ainda não consegue transformar em ticket; ela se gradua conforme a fronteira avança -->

## Fora de escopo

<!-- veja "Fora de escopo": trabalho declarado além do destino; encerrado, nunca se gradua -->
```

### Tickets

Cada ticket é uma **issue-filha** do mapa; o id da issue no tracker é a identidade dele. O corpo dele é a pergunta, dimensionada para uma sessão de agente de 100 mil tokens:

```markdown
## Pergunta

<a decisão ou investigação que este ticket resolve>
```

Cada ticket carrega uma label `wayfinder:<tipo>`, uma dentre `research`, `prototype`, `grilling`, `task` (veja [Tipos de Ticket](#tipos-de-ticket)).

Uma sessão **reivindica** um ticket atribuindo-o ao desenvolvedor que conduz o mapa, **primeiro**, antes de qualquer trabalho, para que sessões concorrentes o pulem. Esse responsável _é_ a reivindicação: um ticket aberto e sem responsável está sem dono.

O bloqueio usa a relação de dependência **nativa** do tracker: essencial porque ela renderiza a fronteira _visualmente_ na própria interface do tracker, para que o humano veja o que é pegável sem abrir o mapa. Somente um tracker que não tenha bloqueio nativo recorre a uma convenção no corpo do texto. Um ticket está **desbloqueado** quando todo ticket que o bloqueia está fechado; a **fronteira** são os filhos abertos, desbloqueados e não reivindicados — a borda do que se conhece.

A resposta não faz parte do corpo; ela é registrada na resolução (veja [Percorrer o mapa](#percorrer-o-mapa)). Artefatos criados ao resolver um ticket são referenciados a partir da issue, não colados dentro dela.

## Tipos de Ticket

Todo ticket é ou **HITL** (humano no ciclo, trabalhado _com_ um humano que fala por si mesmo) ou **AFK**, conduzido pelo agente sozinho. Um ticket HITL só se resolve por essa troca ao vivo; o agente nunca substitui o lado humano dela (um agente de sabatina que responde às próprias perguntas quebrou essa regra).

- **Research / Pesquisa** (AFK): ler documentação, APIs de terceiros ou recursos locais, como bases de conhecimento, para trazer à tona um fato do qual uma decisão depende. Resolvido por um subagente que chama a ferramenta Skill com "pesquisar-mp". Use quando for necessário conhecimento fora do diretório de trabalho atual.
- **Prototype / Protótipo** (HITL): eleve a fidelidade da discussão fazendo um artefato barato, tosco e concreto para reagir a ele (um esboço, uma versão grosseira, um stub, ou código de UI/lógica), chamando a ferramenta Skill com "prototipar-mp". Referencia o protótipo como um artefato. Use quando "como isto deve parecer" ou "como isto deve se comportar" for a pergunta central.
- **Grilling / Sabatina** (HITL): conversa. O caso padrão. Sempre chame a ferramenta Skill duas vezes, para "sabatina-mp" e "modelagem-de-dominio-mp".
- **Task / Tarefa** (HITL ou AFK): trabalho manual que precisa acontecer antes que uma _decisão_ possa ser tomada: não há nada a decidir, prototipar ou pesquisar, mas a discussão está travada até que aquilo seja feito. Cadastrar-se em um serviço para poder avaliar a API dele, provisionar acesso, mover dados para poder enxergar o formato deles. Este é o único tipo que _faz_ em vez de decidir, e ele conquista seu lugar por desbloquear uma decisão, não por entregar o destino. O agente o conduz sozinho quando consegue (AFK); caso contrário, entrega ao humano uma lista de verificação precisa (HITL). Resolvido quando o trabalho é feito; a resposta registra o que foi feito e quaisquer fatos resultantes (onde ficam as credenciais, novas URLs, contagens de linhas) dos quais tickets posteriores dependam.

## Névoa da guerra

O mapa é _deliberadamente_ incompleto: não trace o que você ainda não consegue enxergar. Além dos tickets vivos está a **névoa da guerra**: a visão turva de decisões e investigações que você percebe que estão vindo, mas ainda não consegue precisar, porque dependem de perguntas ainda abertas. Resolver um ticket dissipa a névoa à frente dele, graduando o que agora é especificável em tickets novos, um de cada vez, até que o caminho até o destino esteja claro e não reste nenhum ticket.

A seção **Ainda não especificado** do mapa é onde essa visão turva é anotada: a pergunta suspeita, a área a revisitar mais tarde. É a fronteira ainda não descoberta _em direção_ ao destino: tudo aqui está dentro do escopo, apenas não está nítido o bastante para virar ticket. Escreva de forma tão solta ou tão completa quanto a visão permitir; isso funciona também como uma placa de sinalização para colaboradores que queiram ler para onde a empreitada está indo.

**Névoa ou ticket?** O teste é se você consegue enunciar a pergunta com precisão agora, _não_ se consegue respondê-la agora.

- **Ticket quando** a pergunta já está nítida, mesmo que esteja bloqueada e você ainda não possa agir sobre ela.
- **Ainda não especificado quando** você ainda não consegue formulá-la com essa nitidez. Não pré-fatie a névoa em pedaços do tamanho de tickets: ela é mais grossa que um ticket, e um mesmo trecho pode se graduar em vários tickets, ou em nenhum, quando a fronteira chegar até ele.

**Ainda não especificado** exclui o que já foi decidido (Decisões até aqui), o que já é um ticket vivo, e o que está fora de escopo (a próxima seção).

## Fora de escopo

A névoa só se acumula _em direção_ ao destino. O destino fixa o escopo, então trabalho além dele está **fora de escopo**: não é névoa e não pertence a **Ainda não especificado**. Ele ganha a própria seção **Fora de escopo** no mapa: trabalho que você conscientemente excluiu _desta_ empreitada. É o escopo, e não a falta de nitidez, que o coloca aqui.

Trabalho fora de escopo nunca se gradua (a fronteira para no destino), então ele só retorna se o destino for redesenhado, e aí como uma empreitada nova, não como uma retomada.

Declarar algo fora de escopo é um ato de delimitação, não um passo da rota. Quando um ticket que já existe se revela além do destino (mal escopado durante o mapeamento, ou exposto por uma resolução), **feche-o** (um ticket fechado está inequivocamente fora da fronteira) e deixe uma linha na seção **Fora de escopo**: o resumo mais o motivo de estar fora de escopo, referenciando o ticket fechado. Ele fica de fora de **Decisões até aqui**, que registra a rota efetivamente percorrida; uma fronteira de escopo não é um passo dela.

## Invocação

Dois modos. Em ambos, **nunca resolva mais de um ticket por sessão**, com exceção dos tickets de pesquisa.

### Traçar o mapa

O usuário invoca com uma ideia solta.

1. **Nomeie o destino.** Chame a ferramenta Skill duas vezes, para "sabatina-mp" e "modelagem-de-dominio-mp", para fixar o que este mapa está buscando alcançar: a spec, a decisão ou a mudança. O destino fixa o escopo, então é resolvido primeiro.
2. **Mapeie a fronteira.** Sabatine de novo, desta vez em **largura**: espalhe-se por todo o espaço em vez de aprofundar em um único fio, trazendo à tona as decisões abertas e os primeiros passos que já são pegáveis. **Se isso não revelar névoa alguma** (o caminho até o destino já está claro, a jornada inteira pequena o suficiente para uma sessão), você não precisa de um mapa. Pare e pergunte ao usuário como ele quer prosseguir.
3. **Crie o mapa** (label `wayfinder:map`): Destino e Notas preenchidos, Decisões-até-aqui vazio, a névoa esboçada em **Ainda não especificado**.
4. **Crie os tickets que você já consegue especificar** como issues-filhas do mapa, e depois conecte as arestas de bloqueio em uma **segunda passada** (issues precisam de ids antes de poderem referenciar umas às outras). A conexão os separa entre fronteira e bloqueados; tudo o que você ainda não consegue especificar fica na névoa: a seção **Ainda não especificado**.
5. **Dispare os subagentes de pesquisa.** Para cada ticket `research` que você acabou de criar, suba um subagente que chame a ferramenta Skill com "pesquisar-mp" para resolvê-lo em paralelo, registrando os achados em uma branch descartável `research/<nome>` com um ponteiro de contexto a partir do ticket.
6. Pare: traçar o mapa é o trabalho de uma sessão; ele não resolve nada por conta própria.

### Percorrer o mapa

O usuário invoca com um mapa (URL ou número). Um ticket é **opcional**: sem um, quem escolhe a próxima decisão é você, não o usuário.

1. Carregue o **mapa**: a visão em baixa resolução, não o corpo de cada ticket.
2. Escolha o ticket. Se o usuário nomeou um, use-o. Caso contrário, pegue o primeiro ticket da fronteira, em ordem. **Reivindique-o**: atribua-o a si mesmo antes de qualquer trabalho.
3. Resolva-o. **Amplie conforme necessário**: busque o corpo completo de qualquer ticket relacionado ou fechado sob demanda; chame a ferramenta Skill para as skills que o bloco `## Notas` nomear. Na dúvida, chame a ferramenta Skill duas vezes, para "sabatina-mp" e "modelagem-de-dominio-mp".
4. Registre a resolução: publique a resposta como um **comentário de resolução**, **feche** a issue e **acrescente um ponteiro de contexto** ao Decisões-até-aqui do mapa.
5. Adicione os tickets recém-revelados (crie e depois conecte); gradue qualquer névoa que a resposta tenha tornado especificável, limpando cada trecho graduado de **Ainda não especificado**, para que ele passe a existir apenas como o novo ticket dele. Se a resposta revelar que um ticket (este ou outro) está além do destino, **declare-o fora de escopo** em vez de resolvê-lo na rota. Se a decisão invalidar outras partes do mapa, atualize ou apague aqueles tickets.

O usuário pode rodar tickets desbloqueados em paralelo, então espere que outras sessões estejam editando o tracker simultaneamente.
