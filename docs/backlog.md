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

- [x] **RPG-17** Polimento visual e de interação (tema, estados de carregamento e erro).
      Revisão em 20/11: nenhuma cor fora dos tokens, nenhum erro engolido sem aviso, lint limpo.
- [~] **RPG-18** Publicação: projeto Supabase na nuvem, Vercel, domínio, login Google em produção.
  No ar em https://rpgmaps-sepia.vercel.app desde 10/11 (migrations, auth e variáveis aplicadas).
  Faltam: login Google em produção, domínio próprio, SMTP próprio para ligar a confirmação de e-mail.

## Épico 8: Mundos maiores e outros estilos (pedido do usuário em 01/11)

O site não é só medieval: a mesa pode ser medieval, moderna ou futurista.
Decisões em `answers/2026_11_01 rpgmaps-backlog-v1 002.md`. O formato novo do mapa (RPG-24 e RPG-25) entra
antes de tokens e névoa (RPG-8 a RPG-11).

- [x] **RPG-22** Três estilos de mundo: bibliotecas de peças CC0 medievais, modernas e futuristas/cyberpunk, com filtro por estilo e mistura livre. A interface fica neutra e sóbria para todos os estilos (sai a fonte de títulos de cara medieval).
- [x] **RPG-23** Mapas prontos: gerador de vilas e cidades (o mestre escolhe estilo e tamanho; o resultado é editável) e uma coleção de casas e prédios inteiros para pôr com um clique. Os mapas de exemplo (vila medieval, bairro moderno, cidade cyberpunk, casas) saem do gerador.
- [x] **RPG-24** Altura e andares: cada casa tem altura (morros, degraus, plataformas, escadas, rampas), as peças empilham (sobrados, torres, prédios) e um corte esconde o que está acima de uma altura para ver o lado de dentro. (A escolha do corte pelo jogador saiu no RPG-30: só o mestre escolhe o andar que a mesa vê.)
- [x] **RPG-25** Mapas de até 1000×1000 casas, guardados e desenhados em pedaços. Em PC fraco a qualidade se ajusta sozinha (menos detalhe ao longe, sombras simples), com um botão para trocar.
- [x] **RPG-26** Objetos maiores que uma casa: carros, carroças, carruagens, árvores grandes, fontes e afins ocupam várias casas (ex.: 2×4) e giram de 90 em 90 graus. Pedido do usuário em 01/11.
- [x] **RPG-27** O mestre move carros e objetos soltos do cenário durante o jogo (arrastar, `R` e setas); a mesa vê a peça deslizar até o lugar novo e o jogador continua movendo só tokens. Pedido do usuário em 01/11.

## Épico 9: Detalhe e ambientação (pedido do usuário em 05/11)

Decisões em `answers/2026_11_05 epico-9 001.md`. Ordem (pedido do usuário em 10/11): correções (A),
tokens (B), clima e pisos (E: chuva, dia e noite, areia), e só então os lugares grandes prontos (G) e o resto.

**Fase A: correções**

- [x] **RPG-28** Telhado fecha com a parede: oitão triangular nas pontas do telhado de duas águas, também nas casas prontas e no gerador. (O oitão de tijolo do kit entrou dentro dos três telhados; `scripts/assets/close-roofs.mjs`.)
- [x] **RPG-29** Andares com acabamento igual: sem cores ou texturas diferentes entre andares nem faixas soltas sobre as janelas; quinas que se fecham. (A parede "Tijolo com janela" trocou de modelo: mesmo tijolo da parede lisa e sem a faixa; `scripts/assets/convert-wall.mjs`.)
- [x] **RPG-30** Só o mestre escolhe o andar (corte de altura) que a mesa vê; o controle do jogador sai (muda a decisão do RPG-24).
- [x] **RPG-31** Telhados imunes à névoa: na área escondida o jogador vê os telhados e as paredes (o lado de fora dos prédios); chão, relevo, interior e tokens continuam escondidos e nem saem do banco.

**Fase B: tokens**

- [x] **RPG-32** (parte 1 em 11/11: cavaleiro, bárbaro, mago, ladinos e 4 esqueletos do KayKit, animados; parte 2 em 20/11: goblin, orc, yeti, gosma, aranha, rei cogumelo, diabrete, zumbi, fantasma, tentáculo, criatura cósmica, agente tático, mercenária, traje de proteção, drone, fazendeiro, rei e bruxa, do Quaternius; sem modelo animado CC0 achado para homem das cavernas, cultista e mercador, que podem entrar como `.glb` próprio do mestre) Tokens 3D prontos e fofos: heróis de fantasia (elfo arqueiro, guerreiro, mago, ladino, anão, clérigo, bárbaro), monstros clássicos (goblin, orc, esqueleto, lobo, dragão), horror paranormal e cósmico (cultista, investigador, criatura de tentáculos), cyberpunk (mercenário, netrunner), pré-história (homem das cavernas) e NPCs da cidade (guarda, mercador, policial). Arquétipos genéricos, sem personagens com marca registrada.
- [x] **RPG-48** Token com modelo `.glb` próprio ("Modelo enviado"): o mestre escolhe um modelo da biblioteca dele ou envia um novo; encaixa na base em qualquer escala. Usado para os personagens que o usuário transformou de imagem em 3D (ficam só nas mesas dele, fora da biblioteca pública: `answers/2026_11_11 tokens-proprios 001.md`).

**Fase C: paredes**

- [x] **RPG-33** Acabamentos (tijolo, madeira, reboco, pedra) e paleta para tingir; a casa inteira fica com a mesma cor.

**Fase D: cidade viva**

- [x] **RPG-34** Prédios públicos: delegacia, hospital, correios, lojinhas e mercado, nas casas prontas e no gerador de cidade.
- [x] **RPG-35** Praças com fonte, caminhos, bancos, canteiros e estátuas grandes; o gerador põe praça nas cidades.
- [x] **RPG-36** Decoração de rua: postes, hidrantes, lixeiras, placas, bancas, cones e caixas de correio.
- [x] **RPG-37** Vegetação: tipos de árvores, arbustos, flores, folhas e pedras no chão.

**Fase E: clima e ambiente**

- [x] **RPG-38** Dia e noite (luz e céu), escolhidos pelo mestre.
- [x] **RPG-39** Chuva passando na tela; cada jogador pode desligar na própria tela.
- [x] **RPG-40** Fundos temáticos no lugar da cor única: floresta com folhas, deserto, cidade, masmorra, mar. Campo "Fundo" na aba Ambiente; paisagem espalhada com semente em volta do mapa, mar com ondas, folhas caindo; o gerador escolhe pelo estilo.
- [x] **RPG-41** Pisos novos: areia, deserto, poça e lama.

**Fase F: estilos, mapas e interação**

- [x] **RPG-42** Estilo cyberpunk (neon, letreiros, hologramas, megaprédios, máquinas de venda) como estilo novo; o futurista atual continua como "sci-fi".
- [x] **RPG-43** Mapas prontos de masmorra, caverna e deserto no gerador, além de vilas e cidades.
- [x] **RPG-44** Peças com interação: garra do trator, portas traseiras de ambulância e van; só o mestre aciona e a mesa vê.

**Fase G: lugares grandes prontos (pedido do usuário em 10/11)**

- [ ] **RPG-45** (escola 100×100 e hospital 200×200 feitos no RPG-65; faltam posto de gasolina, delegacia e prédios) Lugares prontos de verdade, mobiliados e com adereços: escola (100×100), posto de gasolina (50×50), hospital (200×200), delegacia, prédios inteiros; entram como "casa pronta" de um clique e como mapa pronto. O usuário vai mandar a lista de mapas que quer para uma sessão.
- [x] **RPG-46** Barcos e navios (pequeno, pesqueiro, navio grande) e um gerador de porto/cais com água.
- [x] **RPG-47** Muito mais adereços em cada lugar (dentro e fora): o gerador e as casas prontas enchem os cômodos, as calçadas e os pátios, em vez de deixar cenário vazio.

**Fase H: correções e modelos mais limpos (pedido do usuário em 11/11)**

- [x] **RPG-49** Paredes iguais dos dois lados (nenhuma mostra o lado de dentro para a rua), escada que vai do começo ao fim das casas sem buraco e parede de tijolo com relevo de verdade, da mesma cor na parede lisa e na com janela.
- [x] **RPG-50** Carros realistas sem marca (sedã, SUV, picape, van, caminhão, muscle car), maiores: 3×4 ou 3×5 casas.
- [x] **RPG-53** Ônibus e carreta do pacote Rgsdev (13 e 12 casas): pedem subir o limite de peça do mapa (hoje 8 casas).
- [x] **RPG-55** Admin do site: entra em qualquer mesa como mestre e vê mapas, tokens e modelos de todos. Quem é admin fica só no banco (tabela `admins`), nunca no Git.
- [x] **RPG-56** Botão na barra da sala para esconder ou mostrar a base redonda dos tokens. Vale só para quem clica e fica salvo no navegador; sem base, o token desce e pisa no chão.
- [x] **RPG-57** Modelo enviado pode dizer no próprio arquivo para onde olha (extras da cena, `rpgmapsFront`); o app confia nisso antes de adivinhar pelos pés, que erra em bicho de tentáculos ou galhos. O `clean-model.mjs` ganhou `--smooth`, que tira o facetado dos rostos gerados por IA.
- [x] **RPG-54** Token vira o rosto para onde anda, sozinho, ao ser movido (o rumo não é salvo: ao recarregar, volta a olhar para o sul).
- [x] **RPG-51** Animais como tokens, numa categoria separada de jogadores e NPCs: gato, cachorro, cavalo, vaca, rato e outros.
- [x] **RPG-52** Mais casas modernas, menos secas, algumas com telhado, com as paredes da mesma cor das paredes com janela. Casas de reboco (branca, amarela, azul e verde) com janela de veneziana e porta na mesma cor, telhado de duas águas de ardósia ou barro, arbusto e caixa de correio no quintal; quatro casas prontas novas. A parede lisa marrom deixou de sair com janela de tijolo.
- [x] **RPG-58** Mestre esconde o HUD (barras, painéis e ferramentas de construção) com um botão ou atalho, para ver a cena limpa. Jogador nunca vê as ferramentas de construção do mestre.

### Para a semana de 17/11 (pedidos do usuário em 14/11)

- [x] **RPG-59** Tokens andando de costas: os 5 heróis e os 2 monstros novos andam virados para trás. Conferir a frente de cada modelo e corrigir o giro.
- [ ] **RPG-60** O rosto do lobisomem continua virado para o lado errado (o RPG-42 não resolveu). Conferir o modelo na cena e corrigir. Conferido em 19/11: o arquivo no ar (v3) olha para +z e marca `rpgmapsFront: +z`; de cima, o focinho aponta para +z. Ele vira para onde anda. Falta o usuário dizer o que ainda vê errado (print com a direção do movimento).
- [x] **RPG-61** Relevo nos mapas: quem gera ou monta um mapa pensa na altura do terreno. No porto, a água fica abaixo do cais de madeira, e não no mesmo nível. Vale para o gerador e para os mapas prontos.
      Feito no gerador: em mapa com água, a terra, a areia e o cais sobem um degrau (meio metro) e a água fica no zero; peças e paredes pousam na altura da casa delas. Os mapas prontos (RPG-63) seguem a mesma regra.
- [x] **RPG-62** Barcos de verdade: os barcos atuais são pequenos e só estruturas soltas. Fazer barcos em tamanho de mapa: casco, convés, cabine, mastro e porão, montados para jogar dentro.
      Feito: "Navio de guerra" de 27 × 46 casas, montado à mão em três pisos: porão (redes, carga, paiol e cela de grades), convés com 12 canhões e dois mastros, e a cabine do capitão na popa com o tombadilho em cima (timão e mastro de mezena). Peças novas na biblioteca: mastro com velas, timão, canhão, gurupés e rede de dormir. É o primeiro mapa da aba "Mapas prontos" (RPG-63).
- [x] **RPG-63** Nova aba "Mapas prontos" no editor, separada do gerador: uma biblioteca de mapas pensados e montados à mão, peça por peça, sem sorteio. Primeira leva:
  - 2 mapas diferentes de cada estilo de cidade (medieval, moderna, futurista, cyberpunk); medievais feitos: "Vila da Ponte Velha" (48 × 48, rio com ponte, roças, praça da fonte, igreja e torre murada) e "Burgo do Monte Alto" (48 × 48, cidade murada em degraus com mercado, igreja e castelo no penhasco); modernos feitos: "Bairro da Orla" (48 × 48, bairro em degraus até a praia, com avenida, mercado, estacionamento, píer e calçadão) e "Centro da Cidade" (48 × 48, cruzamento de avenidas com torres, praça cívica, lojas, bombeiros e polícia); futuristas feitos: "Colônia Astra" (48 × 48, três conveses com habitação, praça do terminal, avenida, pátio de carga e pista de kart) e "Estação Vega" (44 × 44, estação espacial por dentro com ponte, alojamentos, laboratório, reator e hangar); cyberpunks feitos: "Distrito Neon" (48 × 48, rua dos letreiros, mercado noturno, praça do holograma e canal com ponte) e "Cais Cromo" (48 × 48, beco entre megaprédios, boate, armazém, pátio de contêineres e píeres);
  - 1 masmorra (feita: "Cripta esquecida", 40 × 40, com sarcófago, altar e ossos novos na biblioteca), 1 caverna (feita: "Caverna dos ecos", 44 × 44, com lago, patamar e gruta de cristais), 1 deserto (feito: "Areias do sol", 48 × 48, dunas, oásis, templo, caravana e rochedo) e 1 porto (feito: "Porto da maré", 48 × 48, encosta, cais, píeres e farol);
  - 1 mapa de barco (ver RPG-62); feito;
  - 1 ilha gigante; feita: "Ilha do Vulcão" (120 × 120, praia, baixada, morros de mata em degraus até o cume do vulcão com o ídolo, vila de pescadores com píer, ruínas do templo e acampamento pirata).
    Base feita com o RPG-62: a aba "Mapas prontos" em "Novo mapa" (o gerador virou "Gerar mapa") e o esboço que monta chão, paredes e peças casa por casa (`src/domain/map-gen/ready/`).
- [x] **RPG-64** Escola de feiticeiros grande, inspirada no estilo de Jujutsu Kaisen: campus de templos japoneses na montanha, com pátio, dormitórios, salas e campo de treino. Só a inspiração: nada de nome, personagem ou arte da obra.
      Feito: "Academia do Monte Kasumi" (64 × 64) na aba de mapas prontos, em quatro patamares de um andar cada ligados pela escadaria de pedra (torii e lago no pé; campo de treino e salas de aula; pátio do incensário e do campanário entre os dormitórios de dois andares; salão principal, pagode e bambuzal no alto). Peças novas na biblioteca: paredes japonesas (lisa, shoji e porta de correr), telhados de beiral curvo 2×2, 2×4 e 4×4, torii, lanterna de pedra, cerejeira, bambuzal, pagode, campanário, incensário e boneco de treino.
- [x] **RPG-65** Escolas e hospitais (continuação do RPG-45): o mapa grande de cada um e versões menores que entram nas cidades geradas.
- [x] **RPG-66** Móveis na escala do personagem: cama, sofá e TV estão pequenos perto do boneco. Pensar o tamanho de cada um (ex: cama 1×2, sofá 2×1, TV larga) e refazer os que ficam em 1×1. Bancos de praça passam a 2×1. Estantes lado a lado se juntam numa estante só, sem a lateral dupla no meio.
      Feito: sofá de três lugares 2×1, cama de solteiro 1×2 (1,8 de comprimento), rack 2×1 com TV de 1,2 e os dois bancos de praça 2×1; a estante vai de borda a borda da casa. O gerador encosta o móvel comprido na parede sem sair do prédio nem sobrepor outro. Mapas salvos antes guardam o móvel como 1×1: o modelo novo aparece maior, por cima da casa vizinha.
