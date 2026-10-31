# Aprofundamento

Como aprofundar com segurança um agrupamento de módulos rasos, a partir das dependências dele. Pressupõe o vocabulário do [SKILL.md](../SKILL.md): **módulo**, **interface**, **costura**, **adaptador**.

## Categorias de dependência

Ao avaliar um candidato a aprofundamento, classifique as dependências dele. A categoria determina como o módulo aprofundado é testado através da costura.

### 1. No mesmo processo

Computação pura, estado em memória, sem I/O. Sempre aprofundável: funda os módulos e teste diretamente através da nova interface. Nenhum adaptador é necessário.

### 2. Substituível localmente

Dependências que têm substitutos locais para teste (PGLite no lugar do Postgres, sistema de arquivos em memória). Aprofundável se o substituto existir. O módulo aprofundado é testado com o substituto rodando na suíte de testes. A costura é interna; não há porta na interface externa do módulo.

### 3. Remoto porém próprio (Ports & Adapters)

Serviços seus atravessando uma fronteira de rede (microsserviços, APIs internas). Defina uma **porta** (interface) na costura. O módulo profundo é dono da lógica; o transporte é injetado como um **adaptador**. Os testes usam um adaptador em memória. A produção usa um adaptador HTTP/gRPC/fila.

Formato da recomendação: *"Defina uma porta na costura, implemente um adaptador HTTP para produção e um adaptador em memória para teste, para que a lógica fique em um único módulo profundo mesmo estando implantada através de uma rede."*

### 4. Verdadeiramente externo (Mock)

Serviços de terceiros (Stripe, Twilio etc.) que você não controla. O módulo aprofundado recebe a dependência externa como uma porta injetada; os testes fornecem um adaptador mock.

## Disciplina de costura

- **Um adaptador significa uma costura hipotética. Dois adaptadores significam uma costura real.** Não introduza uma porta a menos que pelo menos dois adaptadores se justifiquem (tipicamente produção + teste). Uma costura de adaptador único é apenas indireção.
- **Costuras internas vs. costuras externas.** Um módulo profundo pode ter costuras internas (privadas à implementação dele, usadas pelos próprios testes) além da costura externa na interface. Não exponha costuras internas através da interface só porque os testes as usam.

## Estratégia de teste: substitua, não empilhe

- Testes unitários antigos sobre módulos rasos viram desperdício assim que existirem testes na interface do módulo aprofundado; apague-os.
- Escreva testes novos na interface do módulo aprofundado. A **interface é a superfície de teste**.
- Os testes fazem asserções sobre resultados observáveis através da interface, não sobre estado interno.
- Os testes devem sobreviver a refatorações internas, já que descrevem comportamento e não implementação. Se um teste precisa mudar quando a implementação muda, ele está testando além da interface.
