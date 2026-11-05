# Issue tracker: Markdown local

As issues e specs deste repositório vivem como arquivos markdown em `.scratch/`.

## Convenções

- Uma funcionalidade por diretório: `.scratch/<slug-da-funcionalidade>/`
- A spec é `.scratch/<slug-da-funcionalidade>/spec.md`
- As issues de implementação são um arquivo por ticket em `.scratch/<slug-da-funcionalidade>/issues/<NN>-<slug>.md`, numeradas a partir de `01`, nunca um único arquivo combinado de tickets
- O estado de triagem é registrado como uma linha `Status:` perto do topo de cada arquivo de issue (veja `triage-labels.md` para as strings dos papéis)
- Comentários e histórico de conversa são acrescentados ao final do arquivo, sob um título `## Comments`

## Quando uma skill disser "publique no issue tracker"

Crie um arquivo novo em `.scratch/<slug-da-funcionalidade>/` (criando o diretório, se necessário).

## Quando uma skill disser "busque o ticket relevante"

Leia o arquivo no caminho referenciado. Normalmente o usuário vai passar o caminho ou o número da issue diretamente.

## Operações de mapeamento de caminho (wayfinding)

Usadas pela `/mapear-caminho-mp`. O **mapa** é um arquivo com um arquivo **filho** por ticket.

- **Mapa**: `.scratch/<empreitada>/map.md` (o corpo com Notas / Decisões-até-aqui / Névoa).
- **Ticket filho**: `.scratch/<empreitada>/issues/NN-<slug>.md`, numerado a partir de `01`, com a pergunta no corpo. Uma linha `Type:` registra o tipo do ticket (`research`/`prototype`/`grilling`/`task`); uma linha `Status:` registra `claimed`/`resolved`.
- **Bloqueio**: uma linha `Blocked by: NN, NN` perto do topo. Um ticket está desbloqueado quando todo arquivo que ele lista está `resolved`.
- **Fronteira**: varra `.scratch/<empreitada>/issues/` procurando arquivos abertos, desbloqueados e não reivindicados; vence o de menor número.
- **Reivindicar**: defina `Status: claimed` e salve antes de qualquer trabalho.
- **Resolver**: acrescente a resposta sob um título `## Answer`, defina `Status: resolved` e então acrescente um ponteiro de contexto (resumo + link) ao Decisões-até-aqui do mapa, em `map.md`.
