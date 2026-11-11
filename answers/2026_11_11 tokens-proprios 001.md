# Decisões — tokens-proprios — 2026-11-11

**Contexto:** o usuário achou os bonecos prontos (RPG-32) simples demais e mandou 13 imagens de
personagens e criaturas para virarem modelos 3D de token. A máquina (GTX 1650, 4 GB) não roda IA de
imagem para 3D, e o token 3D hoje só aceita os bonecos prontos.
**Modo:** levantar

| #   | Peso       | Pergunta                           | Decisão                                                                               | Consequência                                                                                                                |
| --- | ---------- | ---------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | Bloqueante | Como transformar as imagens em 3D? | IA aberta grátis, sem conta (TRELLIS ou Hunyuan3D no Hugging Face), rodada por script | Modelo texturizado parecido com a imagem, parado (sem animação), detalhe médio; limite diário de uso                        |
| 2   | Bloqueante | Onde ficam os modelos?             | Só nas mesas do usuário                                                               | Nada entra na biblioteca pública: parte das imagens é arte de terceiros. Os modelos vão como token próprio (`.glb`) da mesa |

**Confirmações** (decisões antigas que continuam valendo): tokens da biblioteca pública são arquétipos
genéricos, sem marca registrada (`answers/2026_11_05 epico-9 001.md`).
**Premissas:** o site ganha o token com modelo `.glb` próprio, enviado pelo mestre para a mesa. As
imagens originais não entram no repositório.
**Ainda em aberto:** nenhuma.
