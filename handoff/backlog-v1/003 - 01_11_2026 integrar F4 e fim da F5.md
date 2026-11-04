# Handoff — integrar a F4 na sala e terminar a F5 (backlog-v1)

**Por que parou (última parada, 15:25 local):** a janela de 5 horas chegou a 81% e subia ~1,3% por minuto.
Pela regra de parada da `executar-projeto`, parei antes dos 90%, com folga para a própria parada.
A janela reinicia às **19:30 (horário local) de 01/11/2026** (22:30 UTC). A semanal está em 78% e reinicia
em 03/11 às 14:00 local.

Avisos de ambiente (PATH, atalho de `node_modules`, Vite nas pastas das fatias): ver
`001 - 01_11_2026 retomar fila lote 1.md`. Ids dos agentes e caminho do transcript com os briefs: ver
`002 - 01_11_2026 retomar F4 e F5.md`. Plano e tabela de fatias: `docs/planos/PLANO-backlog-v1.md`.

## Atualização (01/11/2026, 14:10 local)

- O PR #5 foi mergeado a pedido do usuário (squash `f091610` na `main`). A pasta da F3 foi removida.
- A F4 e a F5 foram rebaseadas na `main` e enviadas ao GitHub: F4 `ddd7241` (PR #6, base `main`), F5 `9922872`.
  O conteúdo de cada uma ficou idêntico; o ajuste sem commit da bandeja continua na pasta da F5.
- Nos passos abaixo, então: o PR #6 **fica com base `main`** (não troque); o PR da F5 abre com base `main`;
  a F7 sai da `main`; o passo 6 já foi feito. A F4 envia com push normal (a branch já está no GitHub).
- 14:55: agentes retomados às 14:31. **F5 revisada: pronta** (PR #7 pronto para revisão, base `main`, bateria e
  pgTAP conferidos pelo coordenador). F4 ainda trabalhando (agente `ab655bf8fcac1e3f2`).
- O usuário está acordado e usando a pré-visualização: abas tab-10 (localhost:5176, pasta da F4) e tab-11
  (localhost:5178, pasta da F5). Esses servidores usam `scratchpad/vite.preview.config.mjs` (cache próprio e acesso
  ao `node_modules` da pasta principal); não os derrube nem navegue nessas abas. O app abriu sozinho um Vite na 5177
  (pasta da F4, sem essa config): encerre quando a F4 terminar.
- Próximo: revisar a F4 (bateria, varredura, PR #6 pronto). A F7 entra no começo da próxima janela (19:30),
  se a semanal permitir (73% às 14:55).

## Atualização (01/11/2026, 15:05 local)

- **F4 revisada: pronta.** O agente terminou às 14:50 sem commit novo, porque os 2 testes já estavam no `e88da44`.
  - Minha revisão passou: bateria com 205 testes, 28 pgTAP e varredura do diff limpa.
  - O agente conferiu mestre e jogador em `/sala/demo`.
  - `gh pr ready 6` feito.
- **Servidores:**
  - os Vite soltos (5173, da pasta principal, e 5177, da F4) foram encerrados;
  - o usuário fechou o painel do navegador;
  - os servidores dele continuam de pé: 5176 e 5178, tarefas `bno4j1e1w` e `bskyg41r5`.
- **#6 e #7 juntos:**
  - a `RoomPage` mescla sozinha;
  - o README dá conflito, porque as duas seções caem no mesmo ponto. Resolva mantendo as duas.
  - Depois dos dois merges, ajuste o canto inferior direito da sala: o `saveSlot` da barra do editor (F4) e o `dock` dos dados (F5) ocupam o mesmo lugar.
- **F7 lançada** às 15:03: agente `ab65a572760b16218` (Sonnet), pasta `F:\projetos\rpgmaps-RPG-12-anotacoes`, branch a partir da `main` (`f091610`).
  - O brief está no transcript. Para extraí-lo, use `C:\Users\Theo\AppData\Local\Temp\claude\F--projetos-mexe-som\2f55e306-c369-4e2c-9aaa-d2625f526dee\scratchpad\extract-briefs.mjs`.
  - Decisões do brief:
    - a RPC `send_note` (migration) faz o envio atômico;
    - uma check constraint mantém o `image_path` na pasta da própria mesa;
    - o painel de anotações fica no canto superior direito, dividindo o lugar com o de presença;
    - o agente usa a porta 5182.
- **Uso às 15:02:**
  - janela de 5 horas em 56%, reinicia às 19:30;
  - semanal em 75%, reinicia em 03/11 às 14:00.
- **Próximo:**
  - revisar a F7 quando ela entregar;
  - pedir ao usuário o merge do #6 e do #7;
  - resolver o README e fazer o ajuste do canto;
  - lançar a F6 quando a semanal permitir.

## Atualização (01/11/2026, 15:25 local): parada

- **#6 e #7 mergeados** a pedido do usuário: squash `7ba8991` (editor) e `6f1c925` (dados) na `main`.
  - A `main` local foi atualizada.
  - Bateria com os dois juntos: 622 testes, build e 60 pgTAP.
- **Ajuste do canto: PR #8 mergeado** a pedido do usuário (squash `f700d6a`), branch `bugfix/RPG-13-canto-da-sala`.
  - A pedido do usuário, a sessão não se arquiva mais quando um PR fecha (para a retomada das 19:30).
  - A barra do editor termina antes do botão dos dados; o painel dos dados para abaixo da barra do topo.
  - Medido em 1440×900: o aviso "Salvo" termina a 14px do botão dos dados.
  - A pasta `F:\projetos\rpgmaps-RPG-13-dados` está nessa branch, e o servidor 5178 do usuário serve essa pasta.
- **F7 parada** com `TaskStop` (agente `ab65a572760b16218`):
  - 1 commit, `634e8ca` (envio atômico das anotações, com a migration);
  - `src/features/notes/` sem commit (11 arquivos, 714 linhas), com backup em `refs/wip/RPG-12-anotacoes`;
  - nenhum Vite dela de pé, nenhum `index.lock`;
  - a branch saiu da `f091610`, antes do #6 e do #7: no rebase, espere conflito em README, backlog e `RoomPage`.
- **Servidores ainda de pé**, do usuário: 5176 (pasta da F4, já mergeada, código velho) e 5178 (pasta da F5).
  Pergunte antes de derrubar o 5176 e remover a pasta da F4.
- **Pendência de layout:** o painel de presença (e o de anotações da F7) divide a coluna da direita com o dos dados.
  Com os dois abertos e altos, eles se sobrepõem. Resolva depois do merge da F7, numa coluna só.

## Estado das fatias

| Fatia                       | Estado                                                                   | Branch / PR                | Pasta de trabalho                      |
| --------------------------- | ------------------------------------------------------------------------ | -------------------------- | -------------------------------------- |
| F0 a F5 e o ajuste do canto | mergeados                                                                | #3, #2, #4, #5, #6, #7, #8 | —                                      |
| F7 anotações                | **parada** no limite de uso: 1 commit e `src/features/notes/` sem commit | `feature/RPG-12-anotacoes` | `F:\projetos\rpgmaps-RPG-12-anotacoes` |
| F6, F8, F9                  | na fila                                                                  | ver o plano                | —                                      |

## Na parada (01/11/2026, 10:04 local)

- Agentes interrompidos com `TaskStop`: F4 `ab655bf8fcac1e3f2` (Opus), F5 `afd43afc5dfd01e2c` (Sonnet).
  Vite encerrado nas duas pastas; nenhum `index.lock`.
- **F4:** já rebaseada sobre `origin/feature/RPG-3-contas-salas`, **só na máquina**: o GitHub ainda tem a ponta
  antiga `890acf9`. Pasta limpa, ponta `9c76f19`. Commits novos da integração:
  - `5093cbe` sala mostra o editor de mapas no lugar da cena de amostra
  - `02e510f` mapa novo passa pelo validador do domínio antes de gravar
  - `9c76f19` README explica o editor de mapas

  O agente estava acrescentando 2 testes de estado da área do mapa. Ainda faltam:
  - esses testes e a bateria;
  - a conferência no navegador, com mestre e jogador em `/sala/demo`;
  - `git push --force-with-lease` e `gh pr edit 6 --base feature/RPG-3-contas-salas`;
  - o corpo do PR.

  As instruções completas estão na última mensagem do coordenador ao agente.

- **F5:** ponta `7f4f91a`, enviada ao GitHub na parada. Já tem:
  - a simulação e o histórico ao vivo;
  - a bandeja 3D e o painel;
  - os dados montados na sala.

  A mudança sem commit na bandeja (`DieModel`, `PlaybackDice`, `label-atlas` e o novo `die-materials.ts`)
  **continua na pasta**, com cópia em `refs/wip/RPG-13-dados` (`94d472f`). Para restaurar, se precisar:
  `git -C F:\projetos\rpgmaps-RPG-13-dados restore --source=refs/wip/RPG-13-dados --worktree -- .`

- O backup antigo da F4 (`refs/wip/RPG-6-editor`) está obsoleto.

## Próximos passos, em ordem

0. **Pedidos novos do usuário (Épico 8 do backlog, RPG-22 a RPG-25):** site medieval, moderno e futurista;
   mapas prontos (cidades, bairros, casas); elevação; mapas do tamanho de vilas e cidades.
   - Antes de lançar a F6, faça a rodada de perguntas com `perguntas-simples`:
     novo tamanho máximo (contradiz "até 100×100" de 31/10), modelo de elevação, visual do site por estilo e a ordem.
   - Recomendação: elevação e tamanho antes de tokens e névoa, porque mudam o formato do mapa.
   - Baixar pacotes CC0 pede autorização do usuário (nome, fonte e tamanho).
1. Às 19:30, `get_usage`. Retome a F7 com SendMessage para `ab65a572760b16218`: "retome de onde parou; foi o
   limite de uso. A `main` mudou (#6 e #7 mergeados): antes do PR, rebase na `main`".
2. **Uso:** com um agente, a janela sobe ~1,3% por minuto. Cheque a cada 8–10 minutos e pare perto de 80–85%.
3. **Semanal:** 78%, reinicia em 03/11 às 14:00. Uma janela cheia custa ~10–12% da semanal, então cabe mais ou
   menos uma janela antes da regra dos 95%. Use-a para terminar e revisar a F7. A F6 (Opus, a maior) fica para
   depois do reinício da semanal.
4. **Entrega da F7:**
   - bateria, `npm run test:db` e o gate de migration (`npx supabase migration up`);
   - varredura do diff e conferência da Definição de Pronto do brief;
   - PR pronto para revisão.
5. **Docs na `main`:** o plano e os handoffs ainda estão sem commit. Faça um PR de docs no fim do lote.

## Skills sugeridas

- `executar-projeto`: continuar a fila (revisão, lançamento, PRs).
- `git-flow-projeto`: rebases das branches empilhadas depois do merge do #5.
- `handoff-mp`: se o limite apertar de novo.

## Pausa até 19:30 (01/11/2026, 17:30 local)

- O usuário pediu para parar e voltar às 19:30. A janela de 5 horas está em 92% e reinicia às 19:30; a semanal, em 79%.
- A sessão reiniciou antes disso: os servidores 5176 e 5178 caíram e o Docker Desktop está desligado, então o
  Supabase local também está parado.
- Para retomar:
  1. abra o Docker Desktop e suba o Supabase com `scripts\dev.bat start` (ou `npx supabase start`);
  2. `get_usage`;
  3. siga os "Próximos passos" acima, começando pelo passo 0 (perguntas do Épico 8).
- O scratchpad mudou de pasta com o reinício. A config de pré-visualização (`vite.preview.config.mjs`) e o
  `extract-briefs.mjs` continuam em
  `C:\Users\Theo\AppData\Local\Temp\claude\F--projetos-mexe-som\2f55e306-c369-4e2c-9aaa-d2625f526dee\scratchpad`.
