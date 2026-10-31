---
name: mago-de-scripts-mp
description: Gera um assistente (wizard) interativo em bash que conduz um humano por passos que só ele pode executar. Use ao provisionar infraestrutura, configurar credenciais ou segredos de CI, navegar por um painel de terceiros desconhecido, ou rodar uma migração ou virada de chave pontual. Não acione isto para passos que o próprio agente consegue executar.
---

# Mago de Scripts (Wizard)

Um **wizard** é um script bash que conduz um humano, passo a passo, por um procedimento manual que é tedioso de fazer na mão e tedioso de reexplicar para uma IA toda vez. Ele abre cada URL, diz exatamente o que clicar e copiar, captura os valores, escreve-os onde eles pertencem (`.env`, segredos do GitHub), confirma em cada etapa e mostra quantas etapas faltam. Ele pode configurar serviços de terceiros, rodar uma migração pontual, ou mover o projeto de um estado para outro.

A experiência de uso agradável já está resolvida pelo [assets/template.sh](assets/template.sh): progresso etapa a etapa, portões de confirmação, abertura de URL multiplataforma (incluindo WSL), entrada oculta de segredos, upserts idempotentes no `.env`, escrita via `gh secret`/`gh variable`, e um resumo de encerramento. **Seu trabalho é apenas delimitar o procedimento e escrever as etapas dele.** A biblioteca acima do marcador `STAGES` é idêntica em todo wizard; essa consistência é justamente o ponto: nunca a edite na mão.

Um wizard é efêmero por padrão: construído para uma execução, salvo em um caminho de rascunho ou em `scripts/`, apagado quando o trabalho termina. Comite-o apenas quando o usuário quiser um caminho de setup repetível que deva viver no repositório.

## Processo

### 1. Delimite o procedimento

Determine cada passo manual que o humano precisa dar e cada valor que é capturado pelo caminho. Leia o repositório primeiro, não pergunte no escuro:

- Para setup: `.env`, `.env.example`, `.env.*`, `README`, `docker-compose*`, configuração do framework, e `.github/workflows/*` (cada referência a `secrets.*` / `vars.*` é um valor que o wizard precisa produzir).
- Para uma migração ou transição: o estado atual, o estado-alvo, e as ações irreversíveis entre eles.

Depois mostre ao usuário a lista ordenada de etapas e os valores que cada uma produz, e confirme: ele pode adicionar, remover ou reordenar.

**Concluído quando:** cada etapa estiver nomeada em ordem e, para cada valor capturado, você souber (a) onde o humano o obtém, (b) onde ele é escrito (`.env`, um segredo do GitHub, ambos, ou lugar nenhum; algumas etapas são ações puras) e (c) se ele é secreto (entrada oculta) ou público.

### 2. Mapeie a jornada de cada etapa

Para cada etapa, escreva o caminho preciso que um humano percorre: qual URL abrir, o que fazer lá, onde um valor é exibido, qual variável ele preenche: por exemplo, "Dashboard → Developers → API keys → Reveal test key → copiar". Onde você não souber de fato como está a interface atual ou o comando exato, diga isso e pergunte ao usuário ou consulte a documentação: nunca invente passos que podem não existir.

**Concluído quando:** cada etapa se traduzir em instruções concretas que um estranho conseguiria seguir.

### 3. Escreva o wizard

Copie `assets/template.sh` para o caminho de destino. Substitua a etapa de exemplo por um `stage` por passo, em ordem de dependência. Use os helpers da biblioteca: `stage`, `say`/`step`, `open_url`, `ask`/`ask_secret`, `write_env`, `set_secret`/`set_var`, `pause`/`confirm`. Defina `TOTAL_STAGES` com o número de etapas que você escreveu.

Mantenha o padrão que o template estabelece: abra a URL antes de pedir o valor dela, use `ask_secret` para qualquer coisa secreta, `write_env` para todo valor persistido, `set_secret` apenas para os valores que o CI realmente precisa, e `confirm` antes de qualquer ação irreversível. Cada `stage` limpa a tela para que apenas o passo atual fique visível: mantenha uma etapa em uma única tarefa focada, para que nada de que o humano precise role para fora da tela. Não toque na biblioteca acima do marcador.

### 4. Verifique e entregue

- `bash -n <script>`; rode `shellcheck` se estiver disponível.
- `chmod +x <script>`.
- Não rode o script de ponta a ponta você mesmo: ele abre navegadores e trava esperando entrada humana. Em vez disso, percorra-o estaticamente: todo valor do passo 1 é capturado e vai parar onde o passo 1 disse, e todo nome em `set_secret` bate exatamente com uma referência `secrets.*` no CI.
- Diga ao usuário como rodá-lo. Se for um caminho de setup repetível, comite-o e referencie-o a partir do README, para que a próxima pessoa rode o script em vez de perguntar a uma IA.
