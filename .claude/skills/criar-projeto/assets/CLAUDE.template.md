# Diretrizes do Projeto (CLAUDE.md)

> Documento vivo de regras. Toda decisão arquitetural deste projeto deriva do
> arquivo de referência **"100 Melhores Práticas de Programação"**. Os números
> entre colchetes (ex: `[#11]`, `[#22]`) referenciam a prática que justifica a regra.

## 🎯 Objetivo e Escopo
<!-- Descrição técnica do que o software faz, focada em regras de negócio e nos
     limites do sistema. Deixe explícito o que está FORA do escopo (YAGNI [#8]). -->

## 🚀 Stack Tecnológica e Ferramentas
* **Frontend/Mobile:** <!-- Ex: React, Vite, React Native, TypeScript -->
* **Backend:** <!-- Ex: Node.js, Fastify/Express -->
* **Banco de Dados/BaaS:** <!-- Ex: PostgreSQL, Supabase -->
* **Infraestrutura/DevOps:** <!-- Ex: Docker, Docker Compose -->

## 🏗️ Arquitetura e Padrões (Baseado nas 100 Melhores Práticas)
* **Design Pattern Principal:** <!-- Ex: Arquitetura em Camadas [#22] ou Clean Architecture [#30] -->
* **Regras Estritas:**
  - Tipagem forte OBRIGATÓRIA — nada de `any` implícito. [#11]
  - Early returns para reduzir aninhamento. [#9]
  - Injeção de dependências em serviços; proibido instanciar serviço dentro de classe. [#20][#21]
  - Funções com responsabilidade única; máximo de 3–4 parâmetros (agrupe em objeto/interface acima disso). [#2][#10]
  - DRY e KISS: sem duplicação de regra de negócio, sem solução mais complexa que o necessário. [#6][#7]
  - Sem magic numbers/strings — use constantes ou enums nomeados. [#3]
  - Comentar o "porquê", nunca o "o quê". [#4]
  - Nomenclatura descritiva (idioma definido para o projeto: <!-- PT-BR / EN -->). [#1]
  - Linter + formatter (ESLint + Prettier) como gate. [#5]
  - Zero segredos no código ou no Git; config sensível só via variável de ambiente. [#37][#80]

## 📂 Estrutura de Diretórios
<!-- Árvore de pastas com explicação do papel de cada camada. O domínio (regras
     de negócio) fica isolado de frameworks e do banco. [#30] -->
```
<!-- cole aqui a árvore de diretórios -->
```

## 🔐 Diretrizes de Segurança Mínimas
<!-- Aplicáveis se houver entrada de usuário ou API. -->
- Sanitização e validação de todo input do cliente. [#51]
- Parameterized queries / ORM — nunca concatenar SQL. [#52]
- Hashing de senha com bcrypt/Argon2. [#54]
- Rate limiting e CORS restrito em endpoints públicos. [#57][#58]
- PII mascarada nos logs. [#63]

## 🐳 Ambiente Local (Docker)
<!-- Serviços acessórios sobem via docker-compose.yml; credenciais só por .env [#80][#81]. -->
* **Serviços do compose:** <!-- Ex: db (PostgreSQL), cache (Redis), queue (RabbitMQ) -->
* **Subir / parar / reiniciar:**
  - Windows: `scripts\dev.bat start` | `stop` | `restart`
  - Linux/Mac: `./scripts/dev.sh start` | `stop` | `restart`
* **Healthchecks:** o app só deve depender de serviços já "healthy". [#82]

## 🔄 Protocolo de Atualização do README.md (CRÍTICO)
O arquivo `README.md` é a documentação pública deste projeto. **Sempre que ocorrer
uma das mudanças abaixo durante o desenvolvimento, o `README.md` DEVE ser atualizado
no mesmo ciclo de trabalho:** [#96]
1. Adição de novas variáveis de ambiente (`.env`).
2. Mudança nos comandos de instalação ou execução.
3. Adição de integração de terceiros essencial.
4. Finalização de um módulo principal.

> Falha em manter o README sincronizado é tratada como bug de documentação.
