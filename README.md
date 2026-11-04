# rpgmaps

Mesa de RPG online com **mapas 3D estilo diorama**. O mestre monta o cenário como uma maquete,
encaixando chão, paredes e objetos, cria uma sala e manda o link; os jogadores entram e jogam juntos
em tempo real, com dados 3D, névoa e anotações enviadas pelo mestre.

> Projeto em desenvolvimento. As funções abaixo estão sendo construídas.

## ✨ Features

- Salas por link: o jogador entra com um apelido, e a conta é opcional.
- Editor de mapas 3D com peças prontas (uso livre) e envio de modelos `.glb` próprios.
- Tokens com imagem ou boneco 3D, barra de vida e notas.
- Névoa que o mestre pinta e revela.
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
- **Desfazer e refazer:** `Ctrl+Z` desfaz; `Ctrl+Y` (ou `Ctrl+Shift+Z`) refaz. O mapa se salva
  sozinho, e o canto de baixo avisa quando está "Salvando…" e "Salvo".
- **Estilos de peças:** a biblioteca tem peças medievais, modernas e futuristas, com filtro por
  estilo, busca por nome e miniaturas. Os estilos se misturam livremente no mesmo mapa; terra,
  grama, água, árvore, rocha e caixa aparecem em todos os filtros. Objetos maiores (carros, ruas,
  telhados) já ocupam o número certo de casas.
- **Modelos próprios:** em "Meus modelos", o botão "Enviar .glb" aceita modelos 3D `.glb` de até
  10 MB. O modelo é ajustado ao tamanho de uma casa e entra no mapa como as outras peças.
- **Jogadores:** veem só o mapa que o mestre mostrou, sem as ferramentas de edição. A troca de mapa e
  cada alteração salva aparecem na hora, sem recarregar a página.
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
- **Mestre:** "Novo" cria um boneco 3D (aventureiro ou criatura, com duas cores) ou uma imagem PNG,
  JPEG ou WebP (até 5 MB) em pé numa base de papel-cartão. O token nasce no ponto que a câmera olha, com nome,
  tamanho (1×1 a 4×4 casas), vida opcional e dono: só o mestre (NPC, monstro) ou um jogador. "Esconder
  dos jogadores" deixa o token só para o mestre (aparece meio apagado para ele).
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
- **O que cada um vê:** o mestre vê a névoa translúcida por cima de tudo. O jogador vê escuridão, e o
  banco nem manda o que está embaixo: peças, paredes e tokens cobertos não chegam ao navegador dele
  (o próprio token do jogador continua visível). A mudança chega ao vivo para a mesa toda.
- **Antes de usar:** o mapa precisa estar salvo no formato novo (salve no editor uma vez).
- **Testar sozinho:** como nos dados, entre em `/sala/demo` com o mestre e a jogadora em duas origens
  diferentes, cubra tudo numa aba e revele um pedaço olhando a outra.

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
- `npm run db:reset`: recria o banco local do zero.
- `npm run test:db`: testa as regras de acesso do banco (quem vê e altera o quê).

## 📝 Variáveis de Ambiente

O `scripts/dev.bat start` cria o `.env.local` sozinho com os valores locais. Na nuvem, configure na Vercel:

- `VITE_SUPABASE_URL`: endereço do projeto Supabase.
- `VITE_SUPABASE_ANON_KEY`: chave pública do Supabase (a proteção dos dados é feita pelas regras do banco).
- `SUPABASE_AUTH_GOOGLE_CLIENT_ID`: ID do app do Google para login (só no Supabase local).
- `SUPABASE_AUTH_GOOGLE_SECRET`: segredo do app do Google para login (só no Supabase local).

## 🎨 Créditos

Os modelos 3D dos estilos são gratuitos e de domínio público (CC0). O crédito é por cortesia e
também aparece no site, na página `/creditos` (link no rodapé da tela inicial).

- **Quaternius** ([quaternius.com](https://quaternius.com)): Medieval Village MegaKit, Downtown
  City MegaKit e Modular Sci-Fi MegaKit.
- **Kenney** ([kenney.nl](https://kenney.nl/assets/car-kit)): Car Kit.
- **Inter**, de Rasmus Andersson: fonte da interface (SIL Open Font License 1.1).

As peças ficam otimizadas em `public/assets/<estilo>/`: um `.gltf` com `.bin` em meshopt, as texturas
WebP compartilhadas em `textures/` e as miniaturas da biblioteca em `thumbs/`.
