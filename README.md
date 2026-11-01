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
- `npm run db:reset`: recria o banco local do zero.
- `npm run test:db`: testa as regras de acesso do banco (quem vê e altera o quê).

## 📝 Variáveis de Ambiente

O `scripts/dev.bat start` cria o `.env.local` sozinho com os valores locais. Na nuvem, configure na Vercel:

- `VITE_SUPABASE_URL`: endereço do projeto Supabase.
- `VITE_SUPABASE_ANON_KEY`: chave pública do Supabase (a proteção dos dados é feita pelas regras do banco).
- `SUPABASE_AUTH_GOOGLE_CLIENT_ID`: ID do app do Google para login (só no Supabase local).
- `SUPABASE_AUTH_GOOGLE_SECRET`: segredo do app do Google para login (só no Supabase local).
