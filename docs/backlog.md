# Backlog do rpgmaps

Lista de tarefas do projeto (o Jira foi dispensado). Cada tarefa tem um código `RPG-N` para
referência em branches e commits (ex: `feature/RPG-3-editor-diorama`). Status: `[ ]` a fazer,
`[~]` em andamento, `[x]` pronto.

Decisões de produto: [answers/2026_10_31 rpgmaps-requisitos 001.md](../answers/2026_10_31%20rpgmaps-requisitos%20001.md).

## Épico 0: Fundação

- [x] **RPG-0** Scaffold (Vite + React + TS + three.js + Supabase CLI), scripts locais, CLAUDE.md, README.

## Épico 1: Contas e salas

- [x] **RPG-1** Modelagem do banco: perfis, mesas, membros, mapas, tokens, anotações, névoa, rolagens, com RLS.
- [x] **RPG-2** Contas: cadastro e login por e-mail e Google; perfil com nome e avatar.
- [x] **RPG-3** Salas: mestre cria a mesa, gera o link; jogador entra com apelido (conta opcional); presença online; vários mapas por mesa com troca de cena.

## Épico 2: Mapa 3D

- [x] **RPG-4** Cena base: câmera girável, luz baixa, neblina, grade do tabuleiro (visual low-poly sombrio).
- [x] **RPG-5** Biblioteca de peças: selecionar e importar pacotes 3D CC0 (chão, paredes, móveis, props).
- [x] **RPG-6** Editor de diorama: colocar, girar, empilhar e apagar peças na grade; desfazer/refazer; salvar.
- [x] **RPG-7** Upload de modelos `.glb` do mestre (limite de tamanho, validação, miniatura).

## Épico 3: Tokens e névoa

- [x] **RPG-8** Tokens de imagem em pé numa base e bonecos 3D com cores.
- [x] **RPG-9** Vida e notas no token; dono do token; regras de quem move o quê.
- [x] **RPG-10** Movimento sincronizado em tempo real entre todos da sala.
- [x] **RPG-11** Névoa: o mestre pinta e revela áreas; jogadores não veem o que está coberto.

## Épico 4: Anotações e dados

- [x] **RPG-12** Anotações do mestre: enviar para a mesa toda ou para jogadores escolhidos; texto + imagem; histórico salvo.
- [x] **RPG-13** Dados 3D com física (d4, d6, d8, d10, d12, d20, d100), notação tipo `2d6+3`, resultado sincronizado, rolagem escondida do mestre e histórico.

## Épico 5: Exportação

- [x] **RPG-14** Exportar e importar o mapa no formato próprio (JSON versionado).
- [x] **RPG-15** Exportar imagem PNG da vista atual.
- [x] **RPG-16** Exportar o mapa como modelo 3D `.glb`.

## Épico 7: Ferramentas de mesa

- [x] **RPG-19** Régua de distância em casas.
- [x] **RPG-20** Ping no mapa visível para todos.
- [x] **RPG-21** Ordem de iniciativa (lista de turnos do combate).

## Épico 6: Acabamento e lançamento

- [ ] **RPG-17** Polimento visual e de interação (tema, estados de carregamento e erro).
- [ ] **RPG-18** Publicação: projeto Supabase na nuvem, Vercel, domínio, login Google em produção.

## Épico 8: Mundos maiores e outros estilos (pedido do usuário em 01/11)

O site não é só medieval: a mesa pode ser medieval, moderna ou futurista.
Decisões em `answers/2026_11_01 rpgmaps-backlog-v1 002.md`. O formato novo do mapa (RPG-24 e RPG-25) entra
antes de tokens e névoa (RPG-8 a RPG-11).

- [x] **RPG-22** Três estilos de mundo: bibliotecas de peças CC0 medievais, modernas e futuristas/cyberpunk, com filtro por estilo e mistura livre. A interface fica neutra e sóbria para todos os estilos (sai a fonte de títulos de cara medieval).
- [x] **RPG-23** Mapas prontos: gerador de vilas e cidades (o mestre escolhe estilo e tamanho; o resultado é editável) e uma coleção de casas e prédios inteiros para pôr com um clique. Os mapas de exemplo (vila medieval, bairro moderno, cidade cyberpunk, casas) saem do gerador.
- [x] **RPG-24** Altura e andares: cada casa tem altura (morros, degraus, plataformas, escadas, rampas), as peças empilham (sobrados, torres, prédios) e um corte esconde o que está acima de uma altura para ver o lado de dentro. Cada jogador mexe no próprio corte; o mestre trava ou libera.
- [x] **RPG-25** Mapas de até 1000×1000 casas, guardados e desenhados em pedaços. Em PC fraco a qualidade se ajusta sozinha (menos detalhe ao longe, sombras simples), com um botão para trocar.
- [x] **RPG-26** Objetos maiores que uma casa: carros, carroças, carruagens, árvores grandes, fontes e afins ocupam várias casas (ex.: 2×4) e giram de 90 em 90 graus. Pedido do usuário em 01/11.
