# rpgmaps

Mesa de RPG online com **mapas 3D estilo diorama**. O mestre monta o cenário como uma maquete,
encaixando chão, paredes e objetos, cria uma sala e manda o link; os jogadores entram e jogam juntos
em tempo real, com dados 3D, névoa e anotações enviadas pelo mestre.

> Projeto em desenvolvimento. As funções abaixo estão sendo construídas.

## ✨ Features

- Salas por link: o jogador entra com um apelido, e a conta é opcional.
- Editor de mapas 3D com peças prontas (uso livre) e envio de modelos `.glb` próprios.
- Fundos temáticos em volta do mapa: floresta com folhas caindo, deserto, cidade, masmorra ou mar.
- Gerador de vilas e cidades (medieval, moderna, sci-fi ou cyberpunk), masmorras, cavernas,
  desertos e portos, e casas prontas para pôr com um clique.
- Tokens com imagem ou boneco 3D, barra de vida e notas.
- Névoa que o mestre pinta e revela.
- Ferramentas da mesa: régua em casas e metros, ping ao vivo e ordem de iniciativa com vez e rodada.
- Clima da mesa: chuva, tempestade com relâmpagos e hora do dia (dia, entardecer, noite), escolhidos pelo mestre.
- Anotações do mestre, com texto e imagem, para a mesa toda ou para jogadores escolhidos; chegam na hora e ficam salvas na mesa.
- Dados 3D com física, que todos veem rolar; o mestre pode rolar escondido e a mesa guarda o histórico.
- Exportar mapas como arquivo do site, imagem PNG ou modelo 3D `.glb`.
- Contas com e-mail ou Google para salvar mapas e mesas.

## 🛠️ Tecnologias Utilizadas

- React + Vite + TypeScript
- three.js (React Three Fiber, Drei, Rapier)
- Supabase (contas, banco Postgres, tempo real e arquivos)
- Vercel (hospedagem)

## 🚀 Como Rodar o Projeto Localmente

### Pré-requisitos

- Node.js 22 ou mais novo
- Docker Desktop aberto e rodando (é nele que o Supabase local roda)
- Git

### Passo a Passo

1. Clone o repositório:
   `git clone https://github.com/leywinmel/rpg-mapas-3d.git`

2. Instale as dependências:
   `npm install`

3. (Opcional) Para o login com Google, copie `.env.example` para `.env` e preencha as chaves do Google:
   `cp .env.example .env`

4. Suba tudo com um comando (Supabase local + site):
   - Windows: `scripts\dev.bat start`
   - Linux/Mac: `./scripts/dev.sh start`

5. Abra http://localhost:5173 no navegador.

> Para parar ou reiniciar: use `stop` ou `restart` no mesmo script. `status` mostra os endereços e chaves locais.
> O painel do banco local fica em http://127.0.0.1:54323.

### Contas e mesas

- **Mestre:** crie uma conta com e-mail e senha (ou Google) na tela inicial. No início aparecem
  "Minhas mesas"; o botão de nova mesa cria a mesa e já abre a sala. A lixeira ao lado de uma mesa
  que você criou apaga a mesa (pede confirmação; não dá para desfazer).
- **Convite:** dentro da mesa, "Copiar link de convite" copia o endereço `/sala/<código>`. Quem abre
  o link vê o nome da mesa e entra com um apelido; a conta é opcional para o jogador.
- **Na mesa:** a barra do topo mostra quem está online. O mestre renomeia ou apaga a mesa; o
  jogador pode sair dela. O nome de exibição se troca em "Seu perfil".
- **Dados de exemplo:** o banco local já vem com uma conta de mestre (`mestre@rpgmaps.test`), uma de
  jogador (`jogador@rpgmaps.test`) e a mesa `/sala/demo`. A senha de teste está no comentário do
  `supabase/seed.sql`.
- **E-mails locais** (recuperação de senha): chegam no Mailpit, em http://127.0.0.1:54324.

### Editor de mapas

Dentro da mesa, o mestre monta os mapas e os jogadores acompanham.

- **Criar mapas:** na aba "Mapas", o botão "Novo mapa" pede o nome, o tamanho (até 100 × 100 casas)
  e o chão inicial. A mesa pode ter vários mapas; o botão com o olho mostra um deles aos jogadores.
- **Montar:** escolha uma peça na aba "Biblioteca" e clique na grade; para pintar o chão, dá para
  arrastar. A barra de baixo troca a ferramenta: chão, parede, objeto, apagar e elevar ou abaixar o
  chão. A tecla `R` gira a peça, e o botão de atalhos mostra todas as teclas.
- **Cena limpa:** o mestre esconde barras, painéis e ferramentas com a tecla `U` ou o botão do
  olho riscado na barra da mesa; um botão discreto no canto traz tudo de volta. Os jogadores nunca
  veem as ferramentas de construção.
  Entre os chãos há areia, chão rachado de deserto, lama, poças d'água sobre a pedra, neve e gelo.
- **Mapas prontos:** em "Novo mapa", a opção "Mapas prontos" abre a biblioteca de mapas montados à
  mão, casa por casa, sem sorteio. Escolha um, dê um nome e ele abre pronto para jogar ou editar.
  O primeiro é o "Navio de guerra" (27 × 46 casas, no mar): porão com redes, carga, paiol e cela,
  convés com canhões e dois mastros, e a cabine do capitão com o tombadilho e o timão em cima. As
  peças do navio (mastro com velas, timão, canhão, gurupés e rede de dormir) ficam na biblioteca.
  A "Cripta esquecida" (40 × 40 casas) desce em degraus: a entrada no alto, o salão de colunas, a
  prisão de grades e a capela do altar, e lá embaixo a cripta dos sarcófagos e uma sala secreta.
  Sarcófago, altar com velas e monte de ossos também entram na biblioteca.
  A "Caverna dos ecos" (44 × 44) tem o lago subterrâneo um degrau abaixo da margem, o acampamento
  dos saqueadores num patamar alto e a gruta dos cristais que brilham; estalagmites, cristais e
  fogueira entram na biblioteca.
  As "Areias do sol" (48 × 48) têm dunas em degraus, o oásis de palmeiras com a água abaixo da
  grama, as ruínas de um templo num platô, a caravana acampada e um rochedo com mirante.
  O "Porto da maré" (48 × 48) desce a encosta da cidade alta até o calçadão do cais, com
  armazém, taverna, mercado de peixe, três píeres com navio e barcos, e o farol no pontal.
  A "Vila da Ponte Velha" (48 × 48) é uma vila medieval em degraus: o rio um degrau abaixo das
  margens, a ponte de tábuas e as roças, as casas da beira-rio, a praça da fonte com a taverna,
  a igreja no patamar e a torre do senhor no morro murado. Os prédios usam a mesma planta do
  gerador, com mobília, escada e telhado.
  O "Burgo do Monte Alto" (48 × 48) é uma cidade murada que sobe a encosta em quatro degraus:
  roças e lago fora do muro, portões ao sul e a leste, a praça do mercado, as ruas de casas e
  lojas, a igreja no patamar e o castelo no topo, sobre o penhasco.
  O "Bairro da Orla" (48 × 48) é um bairro moderno que desce o morro até o mar: casas de
  reboco com telhado e quintal no alto, a avenida e o mercado com estacionamento no meio, a
  praça da fonte e, embaixo, o calçadão de areia com palmeiras, píer e barcos.
  O "Centro da Cidade" (48 × 48) é o miolo de uma cidade moderna: duas avenidas que se cruzam,
  torres de escritório com estacionamento, a praça cívica um degrau acima da rua, lojas com o
  beco das entregas, o prédio de apartamentos com jardim, o quartel dos bombeiros e o pátio da
  polícia.
  A "Colônia Astra" (48 × 48) é um posto avançado futurista em três conveses: torres e casas de
  habitação com a praça do terminal no alto, a avenida com lojas e garagens no meio, e o pátio
  de carga com o armazém e a pista de kart embaixo.
  A "Estação Vega" (44 × 44) é uma estação espacial vista por dentro, cercada pelo vazio: ponte
  de comando com o estrado do capitão, mirante, depósito, alojamentos, refeitório, laboratório,
  o reator com o poço do núcleo e o hangar com as naves e os jipes de superfície.
  O "Distrito Neon" (48 × 48) é um bairro cyberpunk à noite: a rua dos letreiros com lojas e
  torres de vitrine acesa, o mercado noturno de barracas, a praça do holograma um degrau acima
  da rua e o canal sujo, que a avenida cruza pela ponte.
  O "Cais Cromo" (48 × 48) é um porto industrial cyberpunk: o beco das agulhas entre os
  megaprédios, a boate com o estacionamento, o armazém, o pátio de contêineres com a plataforma
  do guindaste e dois píeres sobre o mar escuro.
  A "Ilha do Vulcão" (120 × 120) é o maior mapa pronto: a ilha cercada de mar, com praia de
  palmeiras, baixada de carvalhos, morros de mata subindo em degraus até o cume de cinzas com o
  ídolo, a vila de pescadores com píer e barcos, as ruínas do templo e o acampamento pirata.
  A "Academia do Monte Kasumi" (64 × 64) é uma escola-templo japonesa na encosta, em quatro
  patamares ligados por uma escadaria de pedra: o torii e o lago no pé do monte, o campo de treino
  com bonecos e as salas de aula, o pátio do incensário e do campanário entre os dormitórios e, no
  alto, o salão principal, o pagode e o bambuzal. As peças japonesas (paredes de madeira e reboco,
  telhados de beiral curvo, torii, lanterna de pedra, cerejeira, bambu, pagode, campanário,
  incensário e boneco de treino) também ficam na biblioteca do editor.
  A "Escola do Bairro Alto" (100 × 100) é uma escola inteira cercada, de frente para a avenida:
  pavilhões de dois andares com as salas de aula montadas (lousa, mesa do professor, fileiras de
  carteiras e armários), refeitório, campo de futebol com pista, quadra de basquete, enfermaria,
  secretaria na praça do mastro e estacionamento, com o ônibus escolar na porta. O "Hospital
  Central" (200 × 200) é um complexo hospitalar: alas de internação de cinco andares com
  enfermarias (leitos encostados nas paredes, soro, monitor e armário de remédios), torre principal
  com recepção, pronto-socorro com a baía das ambulâncias, heliponto, parque com lago e
  estacionamentos lotados. As peças de escola e hospital (carteira, lousa, armário de aço, tabela
  de basquete, trave, bebedouro, mastro, leito, soro, monitor, biombo, cadeira de rodas, maca,
  balcão de recepção e heliponto) também ficam na biblioteca do editor.
  O "Posto da Rodovia" (50 × 50) é um posto de gasolina na beira da estrada: duas coberturas sobre
  oito bombas com carros abastecendo, totem de preços, calibrador, loja de conveniência com o
  mercadinho montado, oficina e a carreta parada no canto. A cobertura fica três casas acima do
  pátio, apoiada nos pilares; o corte de andar a esconde para ver as bombas. As peças do posto
  (bomba, pilar, cobertura, calibrador, totem de preços e freezer de gelo) também ficam na
  biblioteca do editor.
  O "Bosque das Sombras" (48 × 48) é floresta fechada para emboscadas e viagens: uma trilha de terra
  cruza o mapa e passa o riacho numa ponte de tábuas; em volta, o círculo de pedras com o altar,
  o acampamento dos salteadores, a cabana da bruxa num morrote de lama e o anel de cogumelos.
  A "Taverna do Javali" (32 × 26) é a estalagem de beira de estrada para o grupo se encontrar: o
  salão com o balcão de chope, mesas com banquinhos e a mesa de banquete, a cozinha com a despensa,
  dois quartos de hóspede (o do dono com o baú de ouro) e, lá fora, a rua de calçamento com o chafariz.
  O "Cemitério da Colina" (40 × 40) é cercado de grade de ferro: a alameda de lanternas sobe do
  portão até o mausoléu, entre quatro quadras de túmulos, a cova violada com os ossos, a cabana do
  coveiro com os caixões e a horta de abóboras. O "Restaurante da Esquina" (40 × 36) é um quarteirão
  moderno: o restaurante com salão, bar e cozinha completa, a casa do vizinho com sala e dois quartos
  e a rua com carros parados. A "Base Ares" (64 × 64) é uma colônia em Marte: módulos ligados por
  túneis, hangar, mineração, painéis solares, turbinas, pátio de carga e duas plataformas de pouso.
  O "Reino de Valdouro" (80 × 80) é um reino inteiro: o castelo de torres azuis com quartel, campo
  de arqueiros e quatro torres no pátio; a vila com mercado, igreja, taverna, ferraria e uma obra de
  andaimes; o rio com a ponte de pedra e o moinho d'água; os trigais, o moinho de vento, a serraria,
  a entrada da mina e o bosque. A "Avenida Aurora" (64 × 64) é o centro de uma cidade grande: duas
  avenidas com semáforos, quatro quarteirões de prédios de tijolo, becos com caçambas, a praça, o
  estacionamento e uma perseguição policial no asfalto. O "Cerco de Rubraforte" (96 × 80) é uma batalha
  inteira: a fortaleza vermelha murada, com torres nos cantos, castelo, quartel e portão, e ao sul o
  acampamento azul com tendas, paliçada, torres de catapulta e pedras caídas no campo; em volta,
  montanhas, o lago, a aldeia queimada e os bosques. O "Vale das Duas Coroas" (128 × 112) é uma campanha
  inteira: o reino verde de Verdelar entre pinhais e o reino dourado de Auricampo com a mina de ouro,
  a praça neutra da feira na encruzilhada, o rio com três pontes, o acampamento dos viajantes e os trigais.
  A "Metrópole" (120 × 96) é o centro inteiro de uma cidade grande: quatro avenidas, oito quarteirões
  de prédios com becos e caçambas, o parque central com chafariz e estátuas, dois estacionamentos, o
  pátio da delegacia e uma batida no cruzamento.
  A "Vila Assombrada de Corvalha" (96 × 88) é uma aldeia abandonada: o cemitério murado com mausoléus e
  túmulos, a igreja e a torre, as casas em ruínas com o poço e a taverna, o pântano com a cabana da
  bruxa, o campo de abóboras e a mata morta.
  A "Colônia Nova Esperança" (112 × 96) é uma colônia inteira em Marte: o núcleo com o comando, os
  domos, o laboratório e o alojamento; o campo solar e as turbinas; o campo de pouso com naves e
  hangar; as estufas, o depósito de carga e o garimpo com as perfuratrizes.
  As "Profundezas de Ferro Negro" (80 × 72) são uma masmorra inteira: a escadaria da superfície, o
  depósito, o alojamento dos guardas, o grande salão de banquetes, a prisão de celas gradeadas, o
  arsenal com o tesouro, a galeria das armadilhas e o covil com o altar e os sarcófagos.
  A "Vila de Sakuragawa" (96 × 80) é uma vila japonesa inteira: o rio com a ponte de pedra, as casas
  de madeira das ruas de cima, o templo com o pagode, o campanário e o portal torii, o jardim do lago,
  o bambuzal, a rua do mercado e o dojo com os bonecos de treino.
  A "Fazenda do Vale Dourado" (104 × 88) é o campo inteiro: a sede, o celeiro e o terreiro com o
  poço, os trigais cercados, a horta de abóboras, o pasto, o pomar, o lago, o povoado com a ferraria
  e, do outro lado do rio, o moinho de vento, a serraria, o moinho d’água e o bosque.
  A "Enseada do Corsário" (104 × 88) é um refúgio pirata: a doca com o navio atracado entre os
  píeres, o cais, a vila com a taverna e o armazém, o forte de pedra com a torre e os canhões, o
  acampamento na praia e o tesouro enterrado.
  O "Fiorde de Hrafnvik" (104 × 88) é uma vila nórdica na neve: o fiorde com o barco longo entre os
  píeres, a fortaleza de paliçada com o grande salão e a torre de vigia, a vila com a ferraria, o
  acampamento dos caçadores, o círculo de pedras rúnicas, o lago congelado e as montanhas.
  O "Porto das Areias Douradas" (104 × 88) é uma cidade portuária no deserto: a doca com o navio
  mercante entre os píeres, o bazar com as bancas cobertas e o poço, o palácio murado do sultão com
  o jardim da fonte, o oásis com o lago e as palmeiras e o acampamento da caravana na praia.
  As "Catacumbas do Ossário" (104 × 88) são uma masmorra gigante: a capela dos ossos com os pilares e
  os sarcófagos, as galerias do ossário cheias de crânios, os túmulos dos nobres, o salão das
  armadilhas, os aposentos dos sacerdotes, a cripta do tesouro e o covil do lich entre dois lagos negros.
  O "Bosque de Lothariel" (104 × 88) é uma cidade élfica na floresta: o salão da rainha com as torres,
  a praça do conselho com o mercado, as casas dos elfos, o bairro dos guardiões, o lago da lua com a
  ilha da estátua e o moinho d’água, o bosque sagrado dos druidas e a mata fechada em volta.
  A "Ilha da Caveira" (104 × 88) é uma ilha pirata cercada de mar: a enseada com o navio no píer, a
  vila pirata com a taverna, o forte murado com os canhões, a selva com a ruína da caveira e o tesouro
  e o acampamento dos náufragos na praia leste.
  A "Fortaleza de Khazdur" (104 × 88) é uma cidade anã escavada na montanha: o salão do rei no pátio
  murado, o bairro das forjas, as casas dos clãs, a praça do mercado, a ponte de pedra sobre o abismo,
  as minas com os túneis e o lago subterrâneo com o quartel da guarda.
  O "Fortim de Grukmar" (104 × 88) é o acampamento de guerra de uma horda orc: a paliçada com o salão
  do chefe, as tendas, a arena e a forja; fora dela, a mata seca, as catapultas, a ruína saqueada e a
  ponte sobre o rio até o posto dos batedores.
  O "Burgo de Morvane" (104 × 88) é a cidade gótica de um conde vampiro: o castelo no pátio murado,
  a catedral com a torre do sino, o bairro velho, o rio com duas pontes, a praça do cadafalso com o
  mercado noturno, as vielas do sul, o cemitério cercado de ferro e a muralha com o portão.
- **Gerar mapa:** em "Novo mapa", a opção "Gerar mapa" escolhe o tipo. "Vila ou cidade" monta o mapa inteiro com ruas,
  casas mobiliadas (móveis encostados nas paredes, balcão e prateleiras nas lojas) com portas,
  janelas e telhados, postes e adereços nas calçadas e nos quintais, praças, árvores e veículos.
  Escolha o estilo, o tamanho (vila 64, cidadezinha 160, cidade 400 ou metrópole 1000 casas de lado) e a semente: a mesma
  semente gera sempre o mesmo mapa, e "Sortear" troca por outra. A prévia mostra a planta antes de
  salvar. Mapas grandes são salvos em partes, com barra de progresso; se uma parte falhar, dá para
  tentar de novo, deixar o mapa como está ou apagá-lo. Os exemplos prontos usam sementes fixas.
  "Masmorra" cava salas de pedra ligadas por corredores, com tochas, pilares, barris e baús;
  "Caverna" abre galerias tortas na rocha, com poças de água, lama, pedras e tochas; "Deserto"
  espalha areia e chão rachado com ruínas, oásis e rochas; "Porto" põe o mar no fundo do mapa,
  com calçadão de madeira, cais entrando na água, barcos atracados (bote, pesqueiro e navio) e
  armazéns. Todos usam o mesmo tamanho e a mesma semente, e todo chão da masmorra e da caverna se
  alcança andando. Os barcos também ficam na biblioteca, em Veículos. Onde há água, ela fica um
  degrau abaixo do chão: o cais e a margem sobem sobre o mar, e a poça da caverna e o oásis afundam.
- **Casas prontas:** a aba "Casas" (atalho `H`) traz casas inteiras de cada estilo, com móveis e
  telhado. Um clique põe a casa no cursor, `R` gira, e `Ctrl+Z` desfaz a casa toda de uma vez.
  O estilo moderno traz também a escola, o posto de saúde e o hospital, já com as salas de aula e
  as enfermarias montadas, e os prédios públicos: a delegacia (balcão do plantão, mesas dos
  investigadores e arquivos), os correios (balcão, triagem e pacotes), o mercado (caixas,
  corredores de prateleiras e geladeiras) e a lojinha. As cidades modernas geradas ganham, de vez
  em quando, um desses prédios no lugar de um prédio comum.
- **Pintar e acabamentos:** a ferramenta Pintar (atalho `T`) tinge paredes e objetos com uma
  paleta de cores ou troca o acabamento das paredes (tijolo, madeira, reboco, pedra), mantendo
  portas e janelas no lugar. Um clique numa parede pinta a casa inteira (as paredes ligadas a ela,
  em todos os andares); o botão da casa na barra troca para pintar só uma parede. A tinta aparece
  de perto, de longe e no .glb exportado.
- **Acionar peças:** a ferramenta Acionar (atalho `A`) abre e fecha as portas de trás da
  ambulância e da van e levanta ou baixa a pá do trator. Só o mestre aciona; a mesa vê a peça
  mudar quando o mapa é salvo, e o mapa guarda a peça aberta.
- **Mover carros e objetos durante o jogo:** com a ferramenta de seleção (`V`), o mestre arrasta um
  veículo ou objeto solto (barril, caixa, mesa, baú, modelo `.glb` próprio) para outra casa; `R` gira
  a peça escolhida e as setas a empurram uma casa. Paredes, chão, telhados e casas ficam no lugar. A
  mesa toda vê a peça deslizar até o lugar novo, e `Ctrl+Z` desfaz. O jogador não move peças: só
  tokens. Peça sob a névoa não é anunciada; ela aparece para o jogador quando a névoa sai.
- **Desfazer e refazer:** `Ctrl+Z` desfaz; `Ctrl+Y` (ou `Ctrl+Shift+Z`) refaz. O mapa se salva
  sozinho, e o canto de baixo avisa quando está "Salvando…" e "Salvo".
- **Estilos de peças:** a biblioteca tem peças medievais, modernas, sci-fi e cyberpunk, com filtro
  por estilo, busca por nome e miniaturas. Os estilos se misturam livremente no mesmo mapa; terra,
  grama, água, árvore, rocha e caixa aparecem em todos os filtros. Objetos maiores (carros, ruas,
  telhados) já ocupam o número certo de casas.
- **Modelos próprios:** em "Meus modelos", o botão "Enviar .glb" aceita modelos 3D `.glb` de até
  10 MB. O modelo é ajustado ao tamanho de uma casa e entra no mapa como as outras peças.
- **Jogadores:** veem só o mapa que o mestre mostrou, sem as ferramentas de edição. A troca de mapa e
  cada alteração salva aparecem na hora, sem recarregar a página.
- **Andares e corte:** as peças empilham (sobrados, torres) e o corte de andares esconde o que está
  acima de um andar para ver o lado de dentro. Só o mestre mexe nele, no controle do canto direito
  do mapa: em cima, o andar que ele mesmo vê (`Page Up` mostra um andar, `Page Down` esconde,
  `Home` mostra todos), para espiar outro andar sem mudar nada para a mesa; embaixo, o andar que os
  jogadores veem, com "mostrar aos jogadores o andar que você vê" e "mostrar todos os andares".
  O jogador não tem controle: vê exatamente o andar que o mestre escolheu e, sem escolha, tudo.
- **Qualidade da cena:** o botão com o velocímetro, no alto da mesa, troca entre automática, alta,
  média e baixa. Na automática, a cena baixa sozinha as sombras, a nitidez e a distância dos
  detalhes quando o computador não dá conta, e volta a subir quando sobra fôlego. A escolha fica
  guardada no navegador.

### Dados 3D

- **Abrir:** o botão de dados no canto inferior direito da sala abre o painel "Dados". Quando alguém
  rola em público, o painel abre sozinho para todos verem a mesma jogada.
- **Rolar (mestre e jogador):** clique nos dados (d4, d6, d8, d10, d12, d20 e d100) para montar a
  rolagem, tire um dado com o "−" do chip, ajuste o bônus ou digite a notação direto, como `2d6+3`,
  `4d6` ou `2d20kh1` (vantagem; `kl1` é desvantagem). Enter ou "Rolar" joga os dados na bandeja:
  todos veem os mesmos dados caírem e o mesmo total, e o dado descartado por `kh`/`kl` aparece
  apagado e riscado. O limite é de 50 dados por rolagem, e uma notação inválida mostra o motivo no
  próprio campo.
- **Rolagem escondida (só o mestre):** com a chave "Rolar escondido" ligada, só o mestre vê os dados
  e o resultado (marcado como "Escondida" no histórico). Os jogadores não recebem nada, nem o aviso
  de que houve rolagem.
- **Histórico:** a lista do painel mostra as últimas 30 rolagens da mesa, ao vivo: quem rolou, a
  notação, cada dado, o bônus, o total e a hora. O mestre limpa o histórico (lixeira do painel), com
  confirmação, e a lista esvazia para todos.
- **Testar sozinho:** abra http://localhost:5173 com a conta de mestre e http://127.0.0.1:5173 com a
  de jogador (origens diferentes guardam sessões separadas), entre os dois em `/sala/demo` e role
  numa aba olhando a outra. Se o `127.0.0.1` não abrir, suba o site com `npm run dev -- --host 127.0.0.1`.

### Anotações

- **Abrir:** o botão de caderno na barra do topo da sala abre o painel "Anotações", no mesmo canto
  do painel "Na mesa" (abrir um fecha o outro). Um selo no botão conta as anotações novas que você
  ainda não leu, e um aviso aparece quando chega uma nova com o painel fechado. Abrir o painel marca
  tudo como lido (o navegador guarda a última leitura por pessoa e por mesa).
- **Mestre:** "Nova anotação" pede o título, o texto (até 5000 caracteres) e, se quiser, uma imagem
  PNG, JPEG ou WebP de até 5 MB, e deixa escolher entre a mesa toda e jogadores escolhidos. Cada
  cartão tem editar (título e texto) e apagar; para trocar a imagem ou os destinatários, apague e
  mande de novo. O cartão mostra para quem foi, com o apelido dos escolhidos.
- **Jogador:** vê só o que é para ele (a mesa toda ou o que o mestre mandou só para ele), ao vivo e
  sem recarregar. Clicar na miniatura abre a imagem grande. A lista começa com as 20 mais novas, e
  "Ver mais antigas" traz o resto. O texto é sempre texto puro: tags e links digitados pelo mestre
  aparecem como estão.
- **Testar sozinho:** como nos dados, entre em `/sala/demo` com o mestre e a jogadora em duas origens
  diferentes e mande uma anotação olhando a outra aba.

### Tokens

- **Abrir:** o botão de pessoa na barra do topo da sala abre o painel "Tokens", com a lista do mapa
  na tela. Clicar num token (na lista ou na cena) mostra os detalhes dele.
- **Mestre:** "Novo" cria um boneco 3D ou uma imagem PNG, JPEG ou WebP (até 5 MB) em pé numa base
  de papel-cartão. Bonecos: os simples (aventureiro e criatura, com duas cores à escolha) e os
  prontos, animados, com as cores deles: cavaleiro, bárbaro, mago, ladino, ladino encapuzado,
  clérigo, monge, patrulheira, assassino encapuzado, guerreiro, arquimago, os esqueletos guerreiro,
  mago, ladino e servo, o zumbi e o fantasma, os monstros (morcego gigante, dragão filhote, goblin,
  orc, yeti, gosma, aranha gigante, rei cogumelo e diabrete), o horror (tentáculo e criatura
  cósmica), o moderno e cyberpunk (agente tático, mercenária, traje de proteção e drone de
  combate), a gente da cidade (fazendeiro, rei e bruxa) e, no grupo "Animais", gato,
  cachorro, rato, galinha, porco, ovelha, raposa, lobo, cervo, vaca e cavalo, no tamanho de cada
  bicho (KayKit e Quaternius, CC0;
  novos entram por
  `scripts/assets/convert-token.mjs` mais uma linha em `token_models` e em `TOKEN_MODELS`). O token nasce no ponto que a câmera olha, com nome,
  tamanho (1×1 a 4×4 casas), vida opcional e dono: só o mestre (NPC, monstro) ou um jogador. "Esconder
  dos jogadores" deixa o token só para o mestre (aparece meio apagado para ele).
- **Modelo enviado:** a terceira aparência do token usa um modelo `.glb` seu (até 10 MB): escolha um
  da sua biblioteca de modelos (a mesma do editor de mapas) ou envie um arquivo novo, que entra
  nela na hora. O modelo fica em pé na base, com a altura de um boneco e cabendo na casa, qualquer
  que seja a escala do arquivo; se ele tiver animação, a primeira toca. Os jogadores da mesa veem o
  modelo normalmente. Apagar o modelo da biblioteca deixa o token na mesa com uma caixa no lugar.
  No arquivo exportado o token guarda o modelo; importado por outro mestre, vira boneco simples.
- **Jogador:** move só os próprios tokens e mexe na vida e nas notas curtas deles; os outros ele só vê.
- **Mover:** arraste o token na cena; ele anda casa a casa e os outros veem o movimento ao vivo. Ao
  soltar, a posição é gravada (quem entra depois já vê o token no lugar novo). Se o banco recusar, o
  token volta para onde estava.

### Névoa

- **Abrir (só o mestre):** o botão de nuvem na barra do topo abre o painel "Névoa". Ligue "Névoa ligada
  neste mapa" e use "Cobrir tudo" para começar com o mapa todo escondido.
- **Pintar:** "Pintar no mapa" troca o clique na cena pelo pincel (de 1×1 a 21×21 casas) ou pelo
  retângulo, cobrindo ou revelando. Enquanto pinta, a câmera não gira com o botão esquerdo; fechar o
  painel larga o pincel.
- **O que cada um vê:** o mestre vê a névoa translúcida por cima de tudo. O jogador vê escuridão com a
  silhueta da cidade por cima: as paredes (com portas e janelas) e os telhados do catálogo continuam
  à vista mesmo na área coberta, mas o chão, o relevo, o que está dentro das casas (móveis, objetos,
  veículos, modelos enviados) e os tokens cobertos não chegam ao navegador dele; o banco nem manda
  (o próprio token do jogador continua visível). A mudança chega ao vivo para a mesa toda. A lista
  de peças que atravessam a névoa fica na tabela `fog_exempt_pieces` (hoje, os cinco telhados
  medievais); um teste confere que ela bate com o catálogo.
- **Antes de usar:** o mapa precisa estar salvo no formato novo (salve no editor uma vez).
- **Testar sozinho:** como nos dados, entre em `/sala/demo` com o mestre e a jogadora em duas origens
  diferentes, cubra tudo numa aba e revele um pedaço olhando a outra.

### Ferramentas da mesa

- **Régua:** o botão de régua na barra do topo liga a medida; arraste no mapa de uma casa a outra.
  Conta em casas e metros (1 casa = 1,5 m), com a diagonal valendo 1 casa (regra da 5ª edição).
  É só sua; o botão de antena no aviso do canto compartilha a régua ao vivo com a mesa. `Esc` apaga.
- **Ping:** `Alt` + clique no mapa (ou o botão de alfinete e um clique) mostra um marcador animado
  para todo mundo, com o seu apelido. Vai só pelo canal ao vivo, nada fica no banco, e há um limite
  de 3 pings a cada 3 segundos. Sob a névoa, o jogador só marca a casa: o ping não mostra o que
  está coberto.
- **Iniciativa:** o botão de espadas abre o painel "Iniciativa". O mestre põe tokens do mapa ou
  entradas livres (armadilha, reforços) com o valor, desempata com as setas, começa o combate, passa
  e volta a vez e encerra com a bandeira. A rodada conta sozinha, e um anel laranja marca no mapa o
  token da vez. O jogador vê a ordem ao vivo e muda só o valor do próprio token.
- **O que o jogador não vê:** token escondido ou sob a névoa não aparece na ordem do jogador (o banco
  nem manda a linha), e a entrada livre pode ser marcada como escondida.
- **Na imagem:** com "esconder a interface" no PNG, a régua, o ping e o anel da vez ficam de fora.
- **Clima da mesa:** o botão de nuvem com chuva abre o painel "Clima da mesa". O mestre escolhe o
  tempo (limpo, chuva ou tempestade) e a hora (a do mapa, dia, entardecer ou noite); a mesa toda vê
  na hora, e a escolha fica salva na mesa. Cada pessoa pode desligar a chuva só na própria tela
  ("Mostrar a chuva na minha tela"). Quem pediu menos movimento no sistema não vê os relâmpagos.
- **Fundo do mapa:** no editor, a aba "Ambiente" tem o campo "Fundo". Em vez da cor lisa, a cena
  ganha uma paisagem em volta do tabuleiro (floresta, deserto, masmorra, mar, ou a cidade de cada estilo: vila medieval, cidade moderna, futurista ou cyberpunk), que some na
  neblina. O chão em volta pega a cor do piso da borda do mapa. A cidade moderna é um bairro de casas
  e sobrados em quadras, com ruas até o horizonte. Vila medieval gerada já vem com floresta; bairro e
  cidade, com a cidade moderna. Em qualidade baixa a paisagem fica mais rala, e quem pediu menos movimento no sistema não vê as folhas caindo.

### Exportar e importar

- **Abrir:** o botão de download na barra do topo da sala abre o painel "Exportar", com três abas.
- **Arquivo (só o mestre):** baixa o mapa aberto como `.rpgmap.json`, o formato próprio do rpgmaps
  (versionado e validado na volta), com os tokens e a névoa se você marcar. Leva o mapa inteiro,
  inclusive o que a névoa cobre, por isso o jogador não tem essa aba.
- **Importar mapa (só o mestre):** na aba "Mapas" do editor. Escolha um `.rpgmap.json` (até 100 MB;
  um mapa no formato antigo também serve e é convertido). O mapa entra como mapa NOVO da mesa,
  gravado em lotes com barra de progresso. Se a gravação parar no meio, a janela mostra o erro e
  oferece "Tentar de novo" (continua do lote que caiu) ou "Cancelar e apagar o mapa incompleto".
  Token de imagem cuja imagem sumiu vira boneco 3D, com aviso.
- **Imagem:** baixa um PNG da vista atual, no tamanho e na qualidade da tela. "Esconder a grade e a
  interface" tira a grade, o cursor do editor e as etiquetas dos tokens. A imagem do jogador sai com
  a névoa escura por cima e sem nada do que ela cobre.
- **Modelo 3D:** baixa um `.glb` (em metros: 1 casa = 1,5 m) com chão, paredes e objetos, respeitando
  o corte de andares; os tokens ficam de fora. Escolha a área: a vista atual, um retângulo ou, só
  para o mestre, o mapa inteiro. O painel estima o tamanho e avisa acima de 30 MB. O jogador só
  exporta o que a névoa deixa ver. Medido: cidade gerada de 1000×1000 casas ≈ 150 MB em ~6 s; mapa
  de 1000×1000 só com chão ≈ 89 MB em ~5 s; vila de 256×256 ≈ 8 MB em < 1 s.

### Ligar o login com Google

O login com Google vem desligado no ambiente local. Para ligar:

1. No Google Cloud Console, crie uma credencial OAuth do tipo "Aplicativo da Web" e cadastre o
   endereço de retorno `http://127.0.0.1:54321/auth/v1/callback`.
2. Copie `.env.example` para `.env` e preencha `SUPABASE_AUTH_GOOGLE_CLIENT_ID` e
   `SUPABASE_AUTH_GOOGLE_SECRET`.
3. Em `supabase/config.toml`, na seção `[auth.external.google]`, troque `enabled = false` por
   `enabled = true` (não commite essa troca).
4. Reinicie: `scripts\dev.bat restart` (ou `./scripts/dev.sh restart`).

Na nuvem, o Google se liga no painel do Supabase (Authentication → Providers → Google), com o
endereço de retorno `https://<seu-projeto>.supabase.co/auth/v1/callback` cadastrado na credencial
OAuth e a tela de consentimento publicada ("Público-alvo" → "Publicar app"); sem publicar, só os
usuários de teste entram. O site no ar já tem o Google ligado. O ID e o segredo ficam só no painel:
nunca no Git. Antes de um `npx supabase config push`, confira no `config diff` que a seção do
Google não muda.

### Comandos úteis

- `npm test`: roda os testes.
- `npm run lint` e `npm run typecheck`: verificam o código.
- `npm run build`: gera a versão de produção em `dist/`.
- Com o site rodando, `http://localhost:5173/componentes` mostra todos os componentes visuais nos dois temas (só em desenvolvimento).
- Com o site rodando, `http://localhost:5173/dev/cena` gera uma cidade de teste de até 1000 × 1000
  casas e mostra quadros por segundo e tempo de montagem da cena (só em desenvolvimento, sem conta).
- `scripts/assets/close-roofs.mjs` e `scripts/assets/convert-wall.mjs`: convertem modelos brutos dos
  pacotes CC0 (pasta `rpgmaps-pacotes-3d`, fora do repositório) para o formato do site (geometria
  comprimida, texturas compartilhadas). As miniaturas saem do próprio renderizador do site
  (`renderPieceThumbnail`) e vão para `public/assets/<estilo>/thumbs/`.
- `scripts/assets/mirror-walls.mjs <modo> <entrada.gltf> <saída.gltf>`: deixa uma parede de pacote
  igual dos dois lados (`front`/`back` espelham uma metade, `dup` copia painéis de um lado só) ou
  estica uma peça no comprimento (`stretch:<fator>`). Rode sempre a partir do modelo original.
- `scripts/assets/brick-walls.mjs public/assets/modern`: gera as paredes de tijolo em relevo do
  estilo moderno (lisa e com janela) e a textura `textures/brick-relief.webp`.
- `scripts/assets/house-pieces.mjs public/assets/modern`: gera as casas de bairro do moderno
  (reboco em quatro cores, liso, com janela e com porta; telhados de ardósia e de barro em 2×2,
  2×4 e 4×4) e os enfeites do quintal (cerca branca, arbusto e caixa de correio).
- `scripts/assets/furniture-pieces.mjs public/assets/modern`: gera os móveis e adereços do moderno
  (sofá 2×1, cama 1×2, guarda-roupa, estante, geladeira, fogão, rack com TV 2×1, vaso de planta, balcão,
  prateleira de loja, poste de luz, hidrante, lixeira, banco de praça 2×1, placa de rua, banca de jornal e churrasqueira).
- `scripts/assets/vegetation-pieces.mjs public/assets/nature`: gera a vegetação que serve a todos
  os estilos (pinheiro, carvalho, bétula, árvore seca, palmeira, cacto, arbusto, roseira, flores,
  capim, folhas no chão, seixos, pedregulho, cogumelos, tronco caído e toco). Os geradores de
  mapa espalham essas plantas nos quintais, parques, desertos, cavernas e portos.
- `scripts/assets/plaza-pieces.mjs public/assets/plaza`: gera os enfeites de praça de qualquer
  estilo (fonte grande 3×3, chafariz 2×2, estátua do herói 2×2, obelisco, banco de pedra 2×1 e
  canteiro elevado 2×1). Na cidade gerada, a praça grande vira jardim com caminhos em cruz até o
  monumento, com bancos e canteiros, e a pequena ganha bancos em volta dele. As formas orgânicas
  (troncos, copas, pedras) dos dois scripts ficam em `scripts/assets/organic-mesh.mjs`.
- `scripts/assets/cyber-pieces.mjs public/assets/cyberpunk`: gera as peças do cyberpunk (paredes de
  concreto com faixa de neon rosa ou ciano, janela acesa, porta de enrolar e vitrine; asfalto com
  poças, calçada, piso de grade e praça de neon; poste de neon, letreiro, painel, holograma e
  máquina de venda). A malha e a gravação ficam em `scripts/assets/piece-mesh.mjs`, que também
  serve ao `house-pieces.mjs`.
- `scripts/assets/cyber-city.mjs <pasta dos .glb> public/assets/cyberpunk`: monta os prédios e os
  megaprédios do cyberpunk empilhando as seções do pacote Cyber City (papptimus, CC BY 4.0), que o
  Blender passa de FBX para `.glb` com o `fbx-to-glb.py`.
- `scripts/assets/kaykit-props.mjs <dungeon|furniture|halloween|restaurant|space|city|hexagon|hexagonNeutral|hexagonRed|hexagonGreen|hexagonYellow|hexagonProps|hexagonNature> <pasta gltf do pacote> <saída>`:
  converte as peças dos pacotes KayKit listados em `scripts/assets/kaykit-packs.mjs` (escala do pacote,
  malha em meshopt e a paleta do pacote numa WebP só) e imprime altura, footprint e cor de longe de cada peça para o catálogo.
- Veículos do moderno (pacote Rgsdev, CC0, em FBX): o Blender passa para `.glb` com
  `blender -b --factory-startup -P scripts/assets/fbx-to-glb.py -- <pasta do pacote> <saída>`, e
  `scripts/assets/convert-vehicle.mjs <entrada.glb> <saída.gltf> [comprimento máximo]` põe na
  escala do mapa (sedã com 3 × 5 casas, ônibus com 4 × 13 e carreta com 3 × 12). Uma peça pode
  ter até 16 casas de lado.
- `npm run db:reset`: recria o banco local do zero.
- `npm run test:db`: testa as regras de acesso do banco (quem vê e altera o quê).

## ☁️ Publicar na nuvem

O site está no ar em **https://rpgmaps-sepia.vercel.app**. Ele é estático e fica na Vercel;
contas, banco, tempo real e arquivos ficam no projeto Supabase `nxlnjnmryexavvsadbkz`. O plano
grátis dos dois dá conta: o site inteiro tem cerca de 7 MB, e a física dos dados só é baixada
quando alguém rola.

Para publicar uma versão nova, na pasta do projeto (uma vez por máquina, `npx supabase login`,
`npx vercel login` e `npx vercel link` ligam as contas; no Windows, use `npx.cmd`):

1. `npx supabase db push --linked` aplica as migrations novas (o `seed.sql` é só do ambiente local).
2. `npx supabase config push` aplica a configuração de Auth da nuvem: a seção
   `[remotes.production]` do `supabase/config.toml` sobrescreve o endereço do site e o que no plano
   Free fica melhor com o valor do painel. `npx supabase config diff` mostra antes o que mudaria.
3. `npx vercel --prod` publica. As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` já
   estão cadastradas na Vercel (`npx vercel env ls production`).

Para começar do zero (projeto novo): crie o projeto Free em
[supabase.com/dashboard](https://supabase.com/dashboard), rode `npx supabase link --project-ref <ref>`,
troque o `project_id` e o endereço em `[remotes.production]`, cadastre as duas variáveis com
`npx vercel env add <NOME> --environment production --type config --value <valor> --yes` e siga
os passos acima. Google: veja "Ligar o login com Google".

Decisão de produto: a confirmação de e-mail no cadastro fica desligada, porque o remetente padrão
do Supabase manda poucos e-mails por hora; com SMTP próprio dá para ligar
(`enable_confirmations` em `[auth.email]`).

Antes de publicar, `npm run build` e `npm run preview` servem a versão de produção em
`http://localhost:4173` com os mesmos cabeçalhos de segurança (CSP) do `vercel.json`.

Limites do plano grátis: o Supabase pausa o projeto após 7 dias sem uso (reativa no painel) e dá
500 MB de banco, 1 GB de arquivos e 200 conexões simultâneas no tempo real; a Vercel dá 100 GB de
tráfego por mês.

## 📝 Variáveis de Ambiente

O `scripts/dev.bat start` cria o `.env.local` sozinho com os valores locais. Na nuvem, configure na Vercel:

- `VITE_SUPABASE_URL`: endereço do projeto Supabase.
- `VITE_SUPABASE_ANON_KEY`: chave pública do Supabase (a proteção dos dados é feita pelas regras do banco).
- `SUPABASE_AUTH_GOOGLE_CLIENT_ID`: ID do app do Google para login (só no Supabase local).
- `SUPABASE_AUTH_GOOGLE_SECRET`: segredo do app do Google para login (só no Supabase local).

## 🎨 Créditos

Os modelos 3D dos estilos são gratuitos. Quase todos são de domínio público (CC0), com crédito por
cortesia; o Cyber City é CC BY 4.0 e exige o crédito. Os créditos também aparecem no site, na página `/creditos` (link no rodapé da tela inicial).

- **Quaternius** ([quaternius.com](https://quaternius.com)): Medieval Village MegaKit, Downtown
  City MegaKit e Modular Sci-Fi MegaKit; os bonecos e animais de token (RPG Characters, Animated
  Monster Pack e os animais animados).
- **papptimus** ([papptimus.itch.io/cyber-city](https://papptimus.itch.io/cyber-city)): Cyber City,
  sob [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Os prédios foram empilhados e
  reduzidos para a escala do mapa.
- **Kenney** ([kenney.nl](https://kenney.nl/assets/car-kit)): Car Kit.
- **Kay Lousberg** ([kaylousberg.itch.io](https://kaylousberg.itch.io)): KayKit Character Pack
  (Adventurers e Skeletons), bonecos de token, KayKit Dungeon Remastered, os móveis de taverna, e
  KayKit Furniture, Halloween, Restaurant, Space Base e City Builder Bits (casa, cemitério, cozinha,
  base espacial e cidade) e o KayKit Medieval Hexagon Pack (castelo, vila, muralhas, acampamento,
  montanhas e bosques).
- **Inter**, de Rasmus Andersson: fonte da interface (SIL Open Font License 1.1).

As peças ficam otimizadas em `public/assets/<estilo>/`: um `.gltf` com `.bin` em meshopt, as texturas
WebP compartilhadas em `textures/` e as miniaturas da biblioteca em `thumbs/`.
