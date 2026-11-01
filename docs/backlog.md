# Backlog do rpgmaps

Lista de tarefas do projeto (o Jira foi dispensado). Cada tarefa tem um código `RPG-N` para
referência em branches e commits (ex: `feature/RPG-3-editor-diorama`). Status: `[ ]` a fazer,
`[~]` em andamento, `[x]` pronto.

Decisões de produto: [answers/2026_10_31 rpgmaps-requisitos 001.md](../answers/2026_10_31%20rpgmaps-requisitos%20001.md).

## Épico 0: Fundação

- [x] **RPG-0** Scaffold (Vite + React + TS + three.js + Supabase CLI), scripts locais, CLAUDE.md, README.

## Épico 1: Contas e salas

- [ ] **RPG-1** Modelagem do banco: perfis, mesas, membros, mapas, tokens, anotações, névoa, rolagens, com RLS.
- [ ] **RPG-2** Contas: cadastro e login por e-mail e Google; perfil com nome e avatar.
- [ ] **RPG-3** Salas: mestre cria a mesa, gera o link; jogador entra com apelido (conta opcional); presença online; vários mapas por mesa com troca de cena.

## Épico 2: Mapa 3D

- [ ] **RPG-4** Cena base: câmera girável, luz baixa, neblina, grade do tabuleiro (visual low-poly sombrio).
- [ ] **RPG-5** Biblioteca de peças: selecionar e importar pacotes 3D CC0 (chão, paredes, móveis, props).
- [ ] **RPG-6** Editor de diorama: colocar, girar, empilhar e apagar peças na grade; desfazer/refazer; salvar.
- [ ] **RPG-7** Upload de modelos `.glb` do mestre (limite de tamanho, validação, miniatura).

## Épico 3: Tokens e névoa

- [ ] **RPG-8** Tokens de imagem em pé numa base e bonecos 3D com cores.
- [ ] **RPG-9** Vida e notas no token; dono do token; regras de quem move o quê.
- [ ] **RPG-10** Movimento sincronizado em tempo real entre todos da sala.
- [ ] **RPG-11** Névoa: o mestre pinta e revela áreas; jogadores não veem o que está coberto.

## Épico 4: Anotações e dados

- [ ] **RPG-12** Anotações do mestre: enviar para a mesa toda ou para jogadores escolhidos; texto + imagem; histórico salvo.
- [ ] **RPG-13** Dados 3D com física (d4, d6, d8, d10, d12, d20, d100), notação tipo `2d6+3`, resultado sincronizado, rolagem escondida do mestre e histórico.

## Épico 5: Exportação

- [ ] **RPG-14** Exportar e importar o mapa no formato próprio (JSON versionado).
- [ ] **RPG-15** Exportar imagem PNG da vista atual.
- [ ] **RPG-16** Exportar o mapa como modelo 3D `.glb`.

## Épico 7: Ferramentas de mesa

- [ ] **RPG-19** Régua de distância em casas.
- [ ] **RPG-20** Ping no mapa visível para todos.
- [ ] **RPG-21** Ordem de iniciativa (lista de turnos do combate).

## Épico 6: Acabamento e lançamento

- [ ] **RPG-17** Polimento visual e de interação (tema, estados de carregamento e erro).
- [ ] **RPG-18** Publicação: projeto Supabase na nuvem, Vercel, domínio, login Google em produção.
