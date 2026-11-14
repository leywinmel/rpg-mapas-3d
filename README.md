# rpgmaps

Mesa de RPG online com **mapas 3D estilo diorama**. O mestre monta o cenário como uma maquete,
encaixando chão, paredes e objetos, cria uma sala e manda o link; os jogadores entram e jogam juntos
em tempo real, com dados 3D, névoa e anotações enviadas pelo mestre.

> Projeto em desenvolvimento. As funções abaixo estão sendo construídas.

## ✨ Features

- Salas por link: o jogador entra com um apelido, e a conta é opcional.
- Editor de mapas 3D com peças prontas (uso livre) e envio de modelos `.glb` próprios.
- Fundos temáticos em volta do mapa: floresta com folhas caindo, deserto, cidade, masmorra ou mar.
- Gerador de vilas e cidades (medieval, moderna, sci-fi ou cyberpunk) e casas prontas para pôr com um clique.
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
  "Minhas mesas"; o botão de nova mesa cria a mesa e já abre a sala.
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
  Entre os chãos há areia, chão rachado de deserto, lama e poças d'água sobre a pedra.
- **Gerar vila ou cidade:** em "Novo mapa", a opção "Vila ou cidade" monta o mapa inteiro com ruas,
  casas mobiliadas (móveis encostados nas paredes, balcão e prateleiras nas lojas) com portas,
  janelas e telhados, postes e adereços nas calçadas e nos quintais, praças, árvores e veículos.
  Escolha o estilo, o tamanho (vila 64, cidadezinha 160, cidade 400 ou metrópole 1000 casas de lado) e a semente: a mesma
  semente gera sempre o mesmo mapa, e "Sortear" troca por outra. A prévia mostra a planta antes de
  salvar. Mapas grandes são salvos em partes, com barra de progresso; se uma parte falhar, dá para
  tentar de novo, deixar o mapa como está ou apagá-lo. Os exemplos prontos usam sementes fixas.
- **Casas prontas:** a aba "Casas" (atalho `H`) traz casas inteiras de cada estilo, com móveis e
  telhado. Um clique põe a casa no cursor, `R` gira, e `Ctrl+Z` desfaz a casa toda de uma vez.
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
  mago, ladino e servo e os monstros morcego gigante e dragão filhote (KayKit e Quaternius, CC0;
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
  ganha uma paisagem em volta do tabuleiro (floresta, deserto, cidade, masmorra ou mar), que some na
  neblina. Vila medieval gerada já vem com floresta; bairro e cidade, com prédios. Em qualidade baixa
  a paisagem fica mais rala, e quem pediu menos movimento no sistema não vê as folhas caindo.

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
endereço de retorno `https://<seu-projeto>.supabase.co/auth/v1/callback`.

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
  (sofá, cama, guarda-roupa, estante, geladeira, fogão, rack com TV, vaso de planta, balcão,
  prateleira de loja, poste de luz, hidrante, lixeira, banco de praça e churrasqueira).
- `scripts/assets/cyber-pieces.mjs public/assets/cyberpunk`: gera as peças do cyberpunk (paredes de
  concreto com faixa de neon rosa ou ciano, janela acesa, porta de enrolar e vitrine; asfalto com
  poças, calçada, piso de grade e praça de neon; poste de neon, letreiro, painel, holograma e
  máquina de venda). A malha e a gravação ficam em `scripts/assets/piece-mesh.mjs`, que também
  serve ao `house-pieces.mjs`.
- `scripts/assets/cyber-city.mjs <pasta dos .glb> public/assets/cyberpunk`: monta os prédios e os
  megaprédios do cyberpunk empilhando as seções do pacote Cyber City (papptimus, CC BY 4.0), que o
  Blender passa de FBX para `.glb` com o `fbx-to-glb.py`.
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
  City MegaKit e Modular Sci-Fi MegaKit.
- **papptimus** ([papptimus.itch.io/cyber-city](https://papptimus.itch.io/cyber-city)): Cyber City,
  sob [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Os prédios foram empilhados e
  reduzidos para a escala do mapa.
- **Kenney** ([kenney.nl](https://kenney.nl/assets/car-kit)): Car Kit.
- **Inter**, de Rasmus Andersson: fonte da interface (SIL Open Font License 1.1).

As peças ficam otimizadas em `public/assets/<estilo>/`: um `.gltf` com `.bin` em meshopt, as texturas
WebP compartilhadas em `textures/` e as miniaturas da biblioteca em `thumbs/`.
