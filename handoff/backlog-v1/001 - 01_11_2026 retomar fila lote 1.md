# Handoff — retomar a fila do backlog-v1 (lote 1)

**Por que parou:** a janela de 5 horas do plano Pro chegou a 97% (regra de parada da `executar-projeto`).
A janela reinicia às **04:30 (horário local) de 01/11/2026**; a semanal estava em 42%.
O usuário está dormindo. Ele pediu para trabalhar ao máximo até ele acordar ("o pc é todo seu").
Merge continua sendo dele: ele autorizou só o merge dos PRs #2, #3 e #4, uma vez.

## Onde está tudo

- **Plano e fila:** `docs/planos/PLANO-backlog-v1.md`, seção 6. A tabela já tem o estado de cada fatia.
- **Decisões do usuário:** `answers/2026_10_31 rpgmaps-requisitos 001.md` e `answers/2026_10_31 rpgmaps-backlog-v1 001.md`.
- **Regras do projeto:** `CLAUDE.md`, incluindo a seção "Interface (base visual)".
- **Backlog:** `docs/backlog.md`.

## Estado das fatias

| Fatia             | Estado                               | Branch / PR                                    | Pasta de trabalho                        |
| ----------------- | ------------------------------------ | ---------------------------------------------- | ---------------------------------------- |
| F0 banco          | mergeada                             | #3                                             | —                                        |
| F1 domínio        | mergeada                             | #2                                             | —                                        |
| F2 visual base    | mergeada                             | #4                                             | —                                        |
| F3 contas e salas | **entregue, revisão pendente**       | `feature/RPG-3-contas-salas`, PR #5 (rascunho) | `F:\projetos\rpgmaps-RPG-3-contas-salas` |
| F4 cena e editor  | **interrompida no meio, sem commit** | `feature/RPG-6-editor`                         | `F:\projetos\rpgmaps-RPG-6-editor`       |
| F5 dados 3D       | na fila (próxima a lançar)           | `feature/RPG-13-dados`                         | —                                        |
| F7 anotações      | na fila                              | `feature/RPG-12-anotacoes`                     | —                                        |
| F6, F8, F9        | na fila                              | ver plano                                      | —                                        |

**Base das branches:**

- F3 e F4 começam com 2 commits do coordenador:
  - `1eaa801`: seed de dev, com as contas de teste e a mesa `/sala/demo`. A senha está no comentário de `supabase/seed.sql`.
  - `51a40e8`: cliente Supabase tipado.
- Enquanto o PR #5 não for mergeado, lance F5 e F7 **empilhadas sobre `feature/RPG-3-contas-salas`**, porque elas usam `useRoomSession()`.
- Depois do squash merge, rebaseie com `git rebase --onto main <ponta antiga da F3> <branch>`.

## Próximos passos, em ordem

1. **Revisar F3 (PR #5)** na pasta dela. O agente relatou tudo verde; confira você mesmo.
   - Rode a bateria completa: `npx tsc -b --noEmit && npx eslint . --max-warnings=0 && npx vitest run && npx vite build`.
   - Leia o diff com foco em segurança: `?voltar=` só aceita caminho interno, nada de HTML, nada de e-mail em log.
   - Pendências a fechar dentro do próprio PR #5:
     - `src/lib/supabase.ts` não passa no `prettier --check`. Rode o prettier.
     - **Migration nova:** `grant execute on function public.get_room_preview(text) to anon`, mais um teste pgTAP.
       - Sem isso, o visitante sem login vê "Mesa de RPG" em vez do nome da mesa.
       - E um link inválido só é detectado depois de criar um usuário anônimo.
       - O código já usa o nome sozinho quando a permissão existir.
       - Depois rode `npm run db:reset` e `npm run test:db`, avisando que o banco é compartilhado: não rode enquanto houver agente usando.
     - **Canal privado:**
       - Hoje o canal Realtime `room:<id>` é público; presença e broadcast vazam para quem souber o id da mesa.
       - Crie as regras em `realtime.messages`: select/insert só para membros (`public.is_room_member(split_part(realtime.topic(), ':', 2)::uuid)`).
       - Troque o cliente para `config: { private: true }`. O código está em `src/features/rooms/services/room-channel.ts`.
     - **README**, pelo protocolo do CLAUDE.md: módulo de contas e mesas, e como ligar o login Google.
   - Tudo verde: `gh pr ready 5`. Se sobrar pendência, liste no corpo do PR.
2. **Retomar F4.**
   - Tente primeiro mandar mensagem ao agente interrompido (SendMessage, nome "F4 cena e editor"; o id interno está no contexto do coordenador).
   - Se não der, relance um agente com o brief da fatia (seção 6 do plano e o backlog RPG-4 a RPG-7) e a instrução "continue do estado atual da pasta de trabalho".
   - Cópia de segurança do trabalho sem commit: `git show refs/wip/RPG-6-editor` (commit `21abc69`).
   - O que o agente já tinha feito, todo sem commit:
     - mudanças em `src/domain/grid.ts` e `src/domain/map-document.ts`;
     - a cena nova em `src/features/scene/` (catálogo, instancing, câmera, luzes, tochas, medidor de desempenho);
     - `src/features/map-editor/`;
     - a rota dev `/dev/mapa/:roomId`.
   - Ele estava criando um mapa de teste pela tela.
3. **Lançar F5 (dados 3D)** assim que houver vaga. São no máximo **2 agentes ao mesmo tempo** (decisão do usuário).
4. Quando F4 e F3 estiverem prontas: o coordenador liga o `MapWorkspace` ({ roomId, isGameMaster }) na sala (`RoomPage`) e lança F7.

## Avisos de ambiente

- **PATH:** Node e Docker não estão no PATH da sessão. Use `export PATH="/c/Program Files/nodejs:/c/Program Files/Docker/Docker/resources/bin:$PATH"`.
- **Máquina lenta** (16 GB). tsc e vitest levam minutos; use timeout longo ou rode em segundo plano.
- **node_modules nas pastas das fatias** é um atalho (junction) para `F:\projetos\rpgmaps\node_modules`.
  - Nunca rode `npm install` nelas.
  - Ao apagar uma pasta de fatia, rode antes `cmd /c rmdir <pasta>\node_modules` (só remove o atalho) e depois `git worktree remove --force`.
- **Vite nas pastas das fatias** recusa as fontes (erro 403) por causa do atalho. Só acontece em desenvolvimento.
- **Servidores esquecidos:** TaskStop não mata o processo node do Vite no Windows. Mate pelo comando (`Get-CimInstance Win32_Process`), conferindo a pasta.
- **Contêineres desligados de propósito:** Studio e pg_meta, para economizar memória. Religue com `docker start supabase_studio_rpgmaps supabase_pg_meta_rpgmaps` ou com `scripts\dev.bat restart`.
- **Dados de teste extras no banco local:** a conta `carla.f3@rpgmaps.test` e alguns convidados anônimos, criados pelo agente da F3.
- **Produção (RPG-18):** incluir a URL da Vercel em `site_url` e `additional_redirect_urls` do Auth.

## Skills sugeridas

- `executar-projeto`: continuar a fila (revisão, lançamento, PRs).
- `banco-de-dados-projeto`: a migration de `get_room_preview` e as regras do canal privado.
- `design-de-interface-projeto`: qualquer tela nova ou integração visual.
- `git-flow-projeto`: rebase das branches empilhadas depois do merge do #5.
