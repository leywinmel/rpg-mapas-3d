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
- Anotações do mestre para a mesa toda ou para jogadores escolhidos.
- Dados 3D com física, que todos veem rolar.
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

### Comandos úteis

- `npm test`: roda os testes.
- `npm run lint` e `npm run typecheck`: verificam o código.
- `npm run build`: gera a versão de produção em `dist/`.
- Com o site rodando, `http://localhost:5173/componentes` mostra todos os componentes visuais nos dois temas (só em desenvolvimento).
- `npm run db:reset`: recria o banco local do zero.
- `npm run test:db`: testa as regras de acesso do banco (quem vê e altera o quê).

## 📝 Variáveis de Ambiente

O `scripts/dev.bat start` cria o `.env.local` sozinho com os valores locais. Na nuvem, configure na Vercel:

- `VITE_SUPABASE_URL`: endereço do projeto Supabase.
- `VITE_SUPABASE_ANON_KEY`: chave pública do Supabase (a proteção dos dados é feita pelas regras do banco).
- `SUPABASE_AUTH_GOOGLE_CLIENT_ID`: ID do app do Google para login (só no Supabase local).
- `SUPABASE_AUTH_GOOGLE_SECRET`: segredo do app do Google para login (só no Supabase local).
