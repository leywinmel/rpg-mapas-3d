# Protótipo de Lógica

Um único arquivo HTML autocontido (uma **demo compartilhável**) que permite a qualquer pessoa conduzir um modelo de estado clicando em botões. Use isto quando a pergunta for sobre **regra de negócio, transições de estado ou formato dos dados**: aquele tipo de coisa que parece razoável no papel e só soa errada quando você a empurra por casos reais.

Como é um arquivo só, sem nada a instalar, você pode entregá-lo a uma pessoa não desenvolvedora (um designer, um PM, um especialista de domínio) e deixá-la sentir o modelo por conta própria. Por isso ele fala a língua dela, não a do código.

## Quando este é o formato certo

- "Não tenho certeza se esta máquina de estados trata o caso de borda em que acontece X e depois Y."
- "Este modelo de dados de fato me permite representar o caso em que..."
- "Quero tatear como a API deveria ser antes de escrevê-la."
- Qualquer coisa em que alguém queira **apertar botões e ver o estado mudar**.

Se a pergunta for "como isto deveria parecer", esta é a ramificação errada. Use [ui.md](ui.md).

## Processo

### 1. Enuncie a pergunta

Antes de escrever código, anote qual modelo de estado e qual pergunta você está prototipando. Um parágrafo, no topo da demo (em uma introdução visível, não apenas em um comentário). Um protótipo de lógica que responde à pergunta errada é puro desperdício, então torne a pergunta explícita para que possa ser verificada depois, esteja o usuário assistindo agora ou voltando a ela mais tarde.

### 2. Isole a lógica em um módulo portátil

Coloque a lógica de verdade (a parte que responde à pergunta) em um único bloco `<script>`, escrito como um módulo pequeno e puro que poderia ser retirado dali e colocado na base de código real depois. A página em volta é descartável; este módulo não é.

O formato certo depende da pergunta:

- **Um reducer puro**: `(state, action) => state`. Bom quando as ações são eventos discretos e o estado é um valor único.
- **Uma máquina de estados**: estados e transições explícitos. Bom quando "quais ações sequer são legais agora" faz parte da pergunta.
- **Um pequeno conjunto de funções puras** sobre um tipo de dado simples. Bom quando não há estado atual implícito, apenas transformações.
- **Uma classe ou módulo com uma superfície de métodos clara**, quando a lógica genuinamente é dona de um estado interno contínuo.

Escolha o formato que melhor se encaixa na pergunta feita, *não* o que for mais fácil de ligar a uma página. Mantenha-o puro: sem DOM, sem `document`, sem handlers de botão enfiando a mão lá dentro. A página chama para dentro dele; nada flui na direção contrária. É isso que torna o protótipo útil além da própria vida útil: respondida a pergunta, o reducer / máquina / conjunto de funções validado sobe sozinho para o módulo real.

### 3. Construa o arquivo HTML compartilhável

Um arquivo, HTML/CSS/JS puros: sem framework, sem bundler, sem servidor, tudo embutido, para que ele abra com dois cliques e sobreviva a ser enviado por e-mail. Qualquer pessoa deve conseguir rodá-lo apenas abrindo-o.

Escreva para uma pessoa não desenvolvedora. Todo rótulo está em **linguagem de domínio**, não em código: botões e estado se leem como o negócio, não como o reducer. Explique em palavras simples o que está acontecendo.

Disponha em uma hierarquia limpa, de cima para baixo:

1. **Título e explicação de uma linha** sobre o que esta demo permite explorar (a pergunta do passo 1).
2. **Estado atual**: todo o estado relevante, renderizado como um painel legível (campos rotulados, não um despejo bruto de JSON), re-renderizado após cada clique, para que a mudança fique visível. Onde ajudar uma pessoa não desenvolvedora a acompanhar, destaque o que acabou de mudar.
3. **Botões de uso livre**: um botão por ação, sempre disponíveis, para que qualquer pessoa possa cutucar o modelo em qualquer ordem. Cada clique despacha a ação e re-renderiza o estado.
4. **Passeios guiados**: um conjunto de **cenários**, um por aba. Cada aba contém uma descrição curta em linguagem simples do cenário (a situação que ele monta e o que observar) e, abaixo, os **botões a apertar** naquele cenário, em ordem. Cada passo é um botão de verdade: clicar nele executa aquela ação e avança para o passo seguinte. Iniciar um passeio reinicia para um estado inicial conhecido, para que o cenário rode igual todas as vezes.

Escolha cenários que demonstrem os casos incômodos, os difíceis de raciocinar no papel: o caminho feliz, um caso de borda espinhoso, uma tentativa de fazer algo que deveria ser ilegal.

Mantenha bonito, porém contido: tipografia limpa, espaçamento generoso, uma cor de acento. Sem animações, sem truques: nada que compita com o estado e os botões.

### 4. Entregue

Mande o arquivo, ou abra-o para a pessoa. Ela vai clicar pelos passeios e brincar livremente quando puder; os momentos interessantes são quando ela diz "espera, isso não deveria ser possível" ou "hmm, eu presumia que X fosse diferente" — esses são os bugs na _ideia_, que é justamente o ponto. Se ela quiser novas ações ou um novo cenário, adicione. Protótipos evoluem.

### 5. Capture a resposta e o protótipo

Assim que o protótipo tiver respondido à pergunta dele, capture a resposta e depois capture o protótipo do jeito que o [SKILL](../SKILL.md) descreve. O mapeamento específico da lógica: o reducer / máquina / conjunto de funções validado sobe para o módulo real (a decisão, absorvida); a casca HTML vai junto para a branch descartável que guarda o protótipo como fonte primária e, sendo um arquivo autocontido, continua trivialmente reexecutável lá.

## Antipadrões

- **Não adicione testes.** Um protótipo que precisa de testes deixou de ser um protótipo.
- **Não o ligue ao banco de dados real.** Use estado em memória, a menos que a pergunta seja especificamente sobre persistência.
- **Não generalize.** Nada de "e se quisermos suportar X depois". O protótipo responde a uma pergunta.
- **Não misture a lógica com a página.** Se o módulo puro referencia o DOM, `document` ou handlers de botão, ele deixou de ser transportável. Mantenha a página como uma casca fina sobre um módulo puro.
- **Não recorra a framework, bundler ou servidor.** Um arquivo em que o destinatário dá dois cliques; um app React ou um servidor de desenvolvimento destroem o "compartilhável".
- **Não leve a casca HTML para produção.** A página é otimizada para ser clicada na mão. O módulo de lógica por trás dela é a parte que vale a pena guardar.
