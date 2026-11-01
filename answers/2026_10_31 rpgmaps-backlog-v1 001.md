# Decisões — rpgmaps-backlog-v1 — 2026-10-31

**Contexto:** Rodada da executar-projeto antes de construir as funções RPG-1 a RPG-17.
**Modo:** levantar

| #   | Peso       | Pergunta               | Decisão                                       | Consequência                                                             |
| --- | ---------- | ---------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | Bloqueante | Força dos agentes      | Misto                                         | `alto` (Opus) para banco e regras difíceis; `medio` (Sonnet) para telas  |
| 2   | Importante | Agentes simultâneos    | 2 por vez                                     | Fila com no máximo 2 fatias rodando                                      |
| 3   | Importante | Mapas por mesa         | Vários por mesa; o mestre troca e todos mudam | Tabela de mapas por mesa + "mapa ativo" da sala                          |
| 4   | Importante | Rolagem escondida      | Sim, só o mestre pode esconder                | Rolagem com flag `oculta`; jogadores não recebem o resultado             |
| 5   | Importante | Imagem nas anotações   | Texto + imagem                                | Anotação com anexo de imagem no Storage                                  |
| 6   | Importante | Ferramentas extras     | Régua, ping e ordem de iniciativa             | Nova feature `table-tools` (RPG-19, RPG-20, RPG-21)                      |
| 7   | Detalhe    | Tamanho máximo do mapa | Até 100×100 casas                             | Renderização com instancing obrigatória; medir desempenho com mapa cheio |
| 8   | Detalhe    | Formato da grade       | Quadrado                                      | Grade quadrada apenas                                                    |

**Confirmações:** nenhuma

**Premissas** (não perguntadas, recomendação assumida; revisar depois):

- Limite de upload: modelo `.glb` até 10 MB; imagem até 5 MB (PNG, JPG, WebP). Cabe no plano gratuito do Supabase (1 GB).
- Dados disponíveis: d4, d6, d8, d10, d12, d20 e d100.

**Ainda em aberto:** nenhuma
