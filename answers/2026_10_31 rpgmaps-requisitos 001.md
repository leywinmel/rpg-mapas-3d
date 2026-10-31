# Decisões — rpgmaps-requisitos — 2026-10-31

**Contexto:** Projeto novo: site de mesa de RPG estilo Owlbear Rodeo, com mapas 3D (estilo Hecatombe do Cellbit), editor de mapas e tokens, anotações por sala, contas, dados, exportação e publicação na web.
**Modo:** levantar

| #   | Peso       | Pergunta                       | Decisão                                                          | Consequência                                                                                                                                              |
| --- | ---------- | ------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Bloqueante | Como montar os mapas 3D        | Blocos estilo diorama (chão, paredes, objetos de uma biblioteca) | Editor por grade/encaixe; precisa de biblioteca de peças 3D                                                                                               |
| 2   | Bloqueante | Custo mensal de hospedagem     | Grátis no começo (Vercel + Supabase)                             | R$0 para dezenas de usuários; respeitar limites dos planos gratuitos                                                                                      |
| 3   | Bloqueante | Prioridade de lançamento       | Tudo caprichado                                                  | Só publica com todas as funções polidas; prazo maior                                                                                                      |
| 4   | Importante | Nome do site                   | rpgmaps                                                          | Nome do site e da pasta local                                                                                                                             |
| 5   | Importante | Login                          | E-mail + Google                                                  | Supabase Auth com senha e OAuth Google                                                                                                                    |
| 6   | Importante | Jogadores precisam de conta    | Opcional                                                         | Entra com link + apelido; quem tem conta guarda anotações recebidas                                                                                       |
| 7   | Importante | Quem move tokens               | Cada um o seu; mestre move tudo                                  | Permissão de token por dono                                                                                                                               |
| 8   | Importante | Névoa                          | Mestre pinta/revela áreas                                        | Camada de névoa manual por sala                                                                                                                           |
| 9   | Importante | Envio de anotações             | Para todos ou jogadores escolhidos                               | Anotações com destinatários; salvas na sala                                                                                                               |
| 10  | Importante | Dados                          | Dados 3D com física, todos veem                                  | Motor de física no navegador, rolagem sincronizada                                                                                                        |
| 11  | Importante | Ficha de personagem            | Só vida e notas no token                                         | Sem ficha de sistema específico                                                                                                                           |
| 12  | Importante | Formato de exportação          | Arquivo do site + PNG + modelo 3D (.glb)                         | Importar/exportar JSON próprio, captura de imagem e exportador glTF                                                                                       |
| 13  | Importante | Visual dos tokens              | Os dois: foto em base e bonecos 3D                               | Suporte a token de imagem e a miniatura 3D com cores                                                                                                      |
| 14  | Importante | Onde guardar o código          | GitHub                                                           | Deploy automático na Vercel a cada push                                                                                                                   |
| 15  | Detalhe    | Jira                           | Não; lista de tarefas no projeto                                 | Pular jira-projeto; backlog em `docs/backlog.md`                                                                                                          |
| 16  | Detalhe    | Celular                        | Só computador                                                    | Layout pensado para desktop                                                                                                                               |
| 17  | Importante | Repositório do código          | https://github.com/leywinmel/rpg-mapas-3d                        | O site se chama rpgmaps; o repositório mantém o nome `rpg-mapas-3d`; pasta local `F:\projetos\rpgmaps`                                                    |
| 18  | Importante | Conteúdo antigo do repositório | Excluir e ignorar                                                | Commit `1dc1f48` removeu README e .gitignore da `main` (histórico mantido). O PR #1 e a branch `adicionar-skills` foram ignorados e não entram no projeto |
| 19  | Bloqueante | Ambiente de desenvolvimento    | Node + Docker, tudo local                                        | Node.js e Docker Desktop instalados via winget em 2026-10-31; Supabase local roda no Docker                                                               |

**Confirmações** (decisões antigas que continuam valendo): nenhuma

**Premissas** (o usuário respondeu com outra mensagem, então ficou a recomendada; revisar depois):

- Estilo visual dos blocos e bonecos 3D: low-poly sombrio (luz baixa, neblina, clima de investigação/terror)
- Origem dos objetos 3D: pacotes gratuitos de uso livre (CC0) + upload de .glb pelo mestre

**Ainda em aberto:**

- Fechar o PR #1 e apagar a branch `adicionar-skills` no GitHub: o filtro de segurança do app bloqueou a ação; o usuário fecha pelo site ou autoriza depois
