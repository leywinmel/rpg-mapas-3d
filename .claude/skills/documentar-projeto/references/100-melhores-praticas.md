# Melhores Práticas de Programação

## 🟢 Clean Code e Legibilidade

1. **Nomes descritivos:** Variáveis, funções e classes devem revelar sua intenção claramente, sem necessidade de decifrá-las.
2. **Funções com propósito único (SRP):** Uma função deve fazer apenas uma coisa, e fazê-la bem.
3. **Sem "Magic Numbers" ou "Magic Strings":** Substitua valores literais soltos no código por constantes ou enums nomeados.
4. **Comente o "porquê", não o "o quê":** O código em si deve explicar o que está sendo feito; os comentários servem para justificar decisões de negócios ou lógicas complexas.
5. **Formatação consistente:** Use linters e formatadores (como Prettier e ESLint) para manter o estilo do código padronizado.
6. **DRY (Don't Repeat Yourself):** Evite duplicidade lógica. Se você escreveu a mesma regra de negócio duas vezes, isole-a em uma função compartilhada.
7. **KISS (Keep It Simple, Stupid):** Priorize a solução mais simples possível para o problema atual.
8. **YAGNI (You Aren't Gonna Need It):** Não implemente funcionalidades ou arquiteturas complexas prevendo problemas que ainda não existem.
9. **Early Return:** Evite aninhamentos profundos (muitos `if/else`) retornando erros ou casos base logo no início da função.
10. **Limite parâmetros:** Funções não devem ter muitos parâmetros. Se passarem de 3 ou 4, considere agrupar em um objeto ou interface.
11. **Tipagem forte:** Sempre que a linguagem permitir (ou usando TypeScript), utilize tipagem para evitar erros em tempo de execução e melhorar o intellisense.
12. **Remova código morto:** Código não utilizado, variáveis ociosas e comentários antigos devem ser deletados.
13. **Coesão alta, acoplamento baixo:** Módulos devem ser independentes uns dos outros e focados em um único conceito.
14. **A Regra do Escoteiro:** Deixe o código sempre um pouco mais limpo do que estava quando você o encontrou.
15. **Refatoração como rotina:** Refatorar não é uma etapa separada, mas parte do fluxo contínuo de desenvolvimento.

## 🏗️ Arquitetura e Design de Software

16. **SOLID - Responsabilidade Única (SRP):** Uma classe deve ter um, e apenas um, motivo para mudar.
17. **SOLID - Aberto/Fechado (OCP):** Entidades devem estar abertas para extensão, mas fechadas para modificação.
18. **SOLID - Substituição de Liskov (LSP):** Classes derivadas devem poder substituir suas classes base sem quebrar o programa.
19. **SOLID - Segregação de Interfaces (ISP):** Muitas interfaces específicas são melhores do que uma interface geral.
20. **SOLID - Inversão de Dependência (DIP):** Dependa de abstrações, não de implementações concretas.
21. **Injeção de Dependências:** Não instancie serviços diretamente dentro das classes; passe-os como parâmetros ou injete-os.
22. **Arquitetura em Camadas:** Separe claramente rotas, controladores, regras de negócio e acesso ao banco de dados.
23. **Padrões de Projeto (Design Patterns):** Use padrões (Factory, Singleton, Observer, Strategy) apenas quando eles resolverem um problema claro, sem forçá-los.
24. **APIs RESTful:** Utilize verbos HTTP de forma semântica (GET, POST, PUT, PATCH, DELETE) e retorne status codes adequados.
25. **Event-Driven Design:** Utilize mensageria ou eventos para desacoplar ações secundárias do fluxo principal.
26. **Monolito Primeiro:** Não comece com microsserviços por padrão. Um monolito modularizado atende a esmagadora maioria dos projetos em fase inicial.
27. **Stateless (Sem Estado):** Servidores de API não devem armazenar estado localmente (em memória), permitindo escalabilidade horizontal simples.
28. **Versionamento de API:** Planeje rotas versionadas (ex: `/v1/users`) desde o primeiro dia para não quebrar integrações de clientes no futuro.
29. **Documentação de API Viva:** Use ferramentas como Swagger/OpenAPI para documentar endpoints em sincronia com o código.
30. **Clean Architecture:** Mantenha o domínio (regras de negócio) ao centro, isolado de frameworks, bibliotecas e banco de dados.

## 🐙 Controle de Versão e Colaboração

31. **Commits atômicos:** Cada commit deve representar uma única mudança lógica ou funcionalidade.
32. **Conventional Commits:** Use prefixos claros nas mensagens de commit (ex: `feat:`, `fix:`, `chore:`, `refactor:`).
33. **Nomenclatura de branches:** Padronize as branches da equipe (ex: `feature/nome-da-tarefa`, `bugfix/erro-critico`).
34. **Revisões de Código (Code Review):** Revise a lógica e a segurança, não o estilo de código (que deve ser coberto pelo linter).
35. **Pull Requests / Merge Requests descritivos:** Explique o "porquê" das mudanças e como testá-las na descrição do PR.
36. **Branches de curta duração:** Integre suas mudanças na branch principal frequentemente para evitar conflitos enormes (Merge Hell).
37. **Zero segredos no Git:** Nunca comite senhas, tokens ou chaves de API, nem mesmo em repositórios privados.
38. **Não reescreva a história pública:** Evite `git push -f` em branches compartilhadas com outros desenvolvedores.
39. **Squash commits:** Condense commits de "correção rápida" antes de fazer o merge para a branch principal, mantendo o histórico legível.
40. **Gitignore abrangente:** Configure o `.gitignore` na criação do projeto para evitar envios de pastas de build (`node\_modules`, `.next`) e arquivos de sistema.

## 🧪 Testes e Qualidade

41. **Testes de Unidade:** Teste funções isoladas e regras de negócio complexas para garantir que cada peça funciona sozinha.
42. **Testes de Integração:** Valide se módulos, banco de dados ou serviços externos estão se comunicando corretamente.
43. **Testes End-to-End (E2E):** Simule o comportamento real do usuário cobrindo o fluxo crítico da aplicação.
44. **TDD (Desenvolvimento Orientado a Testes):** Escrever o teste antes do código pode ajudar a desenhar APIs e funções mais limpas.
45. **Mock e Stub:** Simule APIs de terceiros e serviços caros/lentos durante os testes.
46. **Nomenclatura de testes:** O nome do teste deve dizer a condição e o resultado esperado (ex: `shouldReturnErrorWhenUserIsUnderage`).
47. **Cobertura inteligente:** Foque em cobrir caminhos críticos e regras de negócio, sem obsessão por 100% de cobertura geral.
48. **Independência nos testes:** Um teste nunca deve depender do resultado de outro teste anterior.
49. **Pipelines de teste:** Automatize a execução de testes no CI/CD; um código que não passa não deve ser feito o deploy.
50. **Mutant Testing:** Avalie a qualidade dos seus testes introduzindo bugs intencionais (mutações) para ver se os testes falham.

## 🔐 Segurança da Informação

51. **Sanitização de Inputs:** Nunca confie nos dados vindos do cliente. Valide e limpe todas as entradas.
52. **Prevenção de SQL Injection:** Sempre use *Parameterized Queries* ou ORMs em vez de concatenar strings no banco de dados.
53. **Defesa contra XSS (Cross-Site Scripting):** Escape ou encode dados renderizados em aplicações frontend.
54. **Hashing seguro:** Senhas devem usar algoritmos lentos de hash com "salt" (como bcrypt ou Argon2), nunca criptografia reversível ou MD5.
55. **Princípio do Menor Privilégio:** Dê às credenciais do banco, chaves de API e contêineres apenas os acessos estritamente necessários.
56. **Autenticação moderna:** Prefira JWTs (bem configurados e com expiração), OAuth2 ou tokens seguros, evitando armazenar sessões de forma vulnerável.
57. **CORS Restrito:** Configure o Cross-Origin Resource Sharing para aceitar requisições apenas de domínios confiáveis.
58. **Rate Limiting:** Proteja APIs contra ataques de força bruta e DDoS limitando o número de requisições por IP ou token.
59. **Headers de Segurança HTTP:** Utilize Content Security Policy (CSP), HSTS, entre outros headers para blindar a resposta web.
60. **HTTPS Everywhere:** Todo o tráfego em rede, mesmo o tráfego interno entre microsserviços na nuvem, deve ser encriptado.
61. **Evitar CSRF:** Utilize tokens Anti-CSRF em aplicações que dependem de sessões baseadas em cookies de navegador.
62. **Atualização de dependências:** Use ferramentas como Dependabot ou Snyk para auditar pacotes vulneráveis em tempo real.
63. **Mascaramento de logs (PII):** Certifique-se de que informações pessoalmente identificáveis (CPFs, cartões de crédito, senhas) nunca vão parar nos logs do sistema.
64. **Auditoria Estática de Segurança (SAST):** Incorpore análises de segurança de código no pipeline CI/CD.
65. **Limitação de Payload:** Restrinja o tamanho dos arquivos e JSONs aceitos no backend para evitar esgotamento de memória.

## ⚡ Performance e Escalabilidade

66. **Cache Estratégico:** Armazene resultados de consultas frequentes e custosas em memória (ex: Redis, Memcached).
67. **Paginação Incondicional:** Nunca retorne "todos os registros" do banco de dados em endpoints de listagem.
68. **Lazy Loading:** Carregue imagens, componentes e dados somente quando entrarem na área de visualização do usuário ou forem necessários.
69. **Otimização de Assets:** Comprima e sirva imagens/arquivos em formatos modernos (WebP) via CDNs.
70. **Problema N+1:** Monitore e evite loops no backend que executam uma consulta separada no banco de dados para cada item de uma lista.
71. **Indexação:** Crie índices em bancos de dados relacionais e NoSQL focados nas colunas mais usadas em `WHERE`, `JOIN` e `ORDER BY`.
72. **Processamento Assíncrono:** Mova o envio de e-mails, processamento de relatórios pesados e integrações lentas para filas em background (ex: RabbitMQ, Bull).
73. **Conexões em Pool (Connection Pooling):** Não crie e destrua conexões com o banco de dados a cada requisição; gerencie um pool de conexões reutilizáveis.
74. **Minificação e Bundling:** Compacte CSS, HTML e JavaScript para reduzir o peso da aplicação servida aos clientes.
75. **WebSockets no lugar de Polling:** Se precisar de dados em tempo real, use conexões bidirecionais contínuas em vez de "perguntar" repetidamente ao servidor.

## 🚀 Infraestrutura, DevOps e CI/CD

76. **Integração Contínua (CI):** Testes e linter devem rodar automaticamente a cada push.
77. **Entrega/Deploy Contínuo (CD):** A subida para ambientes de validação ou produção deve acontecer com um único clique (ou de forma automática após aprovação).
78. **Infraestrutura como Código (IaC):** Use ferramentas (Terraform, AWS CDK) para provisionar servidores em vez de configurá-los manualmente pela interface.
79. **Contêinerização Constante:** Use Docker para empacotar o código e suas dependências; "funciona na minha máquina, funciona na nuvem".
80. **Configuração via Variáveis de Ambiente:** (Baseado no 12-Factor App) Separe completamente o código de configurações dinâmicas ou sensíveis (URLs de banco, senhas).
81. **Paridade de Ambientes:** Ambiente de desenvolvimento, *staging* (homologação) e produção devem ser os mais idênticos possíveis.
82. **Health Checks / Readiness Probes:** Suas aplicações devem possuir rotas (ex: `/health`) para orquestradores como Kubernetes verificarem se estão vivas.
83. **Blue-Green Deployment / Canary:** Implante atualizações em uma fatia pequena de usuários primeiro para monitorar erros antes de liberar globalmente.
84. **Rollback Rápido:** O pipeline deve ter um fluxo predefinido e rápido para reverter para a versão anterior se houver falha após o deploy.
85. **Imagens Docker Enxutas (Multi-stage build):** A imagem de produção deve conter apenas o código compilado e o runtime, não ferramentas de desenvolvimento.

## 🗄️ Banco de Dados e Dados

86. **Escolha a ferramenta certa:** Relacional (SQL) para integridade transacional rigorosa; NoSQL para esquemas muito flexíveis e leitura de alto volume em documentos.
87. **Migrations:** Todo o esquema de banco de dados (tabelas, colunas, índices) deve ser versionado em código e aplicado programaticamente.
88. **Normalização Responsável:** Normalize dados para evitar anomalias de atualização, mas não tenha medo de desnormalizar estrategicamente se for vital para performance de leitura.
89. **Transações ACID:** Agrupe operações críticas (como transferência de saldo) em blocos transacionais. Se um passo falhar, reverta (rollback) a transação inteira.
90. **Backups testados:** Não basta ter backups agendados; é necessário simular restaurações periodicamente para garantir que os dados não estão corrompidos.

## 📊 Observabilidade e Logs

91. **Logs Estruturados:** Prefira salvar logs no formato JSON para que ferramentas (Datadog, ELK) possam filtrá-los, pesquisá-los e agrupá-los facilmente.
92. **Níveis de Log Adequados:** Use `DEBUG` para testes, `INFO` para fluxos de negócio, `WARN` para situações inesperadas mas contornáveis, e `ERROR` para falhas graves.
93. **Tratamento Global de Erros (Global Error Handler):** Capture falhas num único ponto da arquitetura (middleware) e retorne mensagens limpas para o cliente, sem expor *stack traces*.
94. **Distributed Tracing (Rastreamento):** Atribua um "ID de Correlação" (`Trace ID`) no início de uma requisição e passe-o por todos os serviços para rastrear a jornada de um erro complexo.
95. **Monitoramento Ativo e Alertas:** Não espere o usuário reclamar. Configure alertas no Slack/E-mail para picos de uso de CPU, banco fora do ar ou taxas anormais de erro 5xx.

## 🧠 Mentalidade e Soft Skills do Desenvolvedor

96. **Documentação Clara e Acessível:** O arquivo `README.md` deve conter no mínimo como instalar, configurar e rodar o projeto localmente.
97. **Propriedade Coletiva (Code Ownership):** O código é da equipe, não do indivíduo. Qualquer um deve poder tocar em qualquer parte do sistema.
98. **Atenção ao Valor do Negócio:** Código limpo é fantástico, mas o objetivo de todo software é resolver um problema real para um usuário ou gerar lucro para uma empresa.
99. **Evite Otimização Prematura:** Escreva o código legível primeiro. Meça a performance depois. Se, e somente se houver um gargalo, otimize o trecho específico.
100. **Feedback Contínuo e Ego Zero:** Abrace os comentários no Code Review como oportunidade de evolução técnica e jamais leve críticas sobre o código para o lado pessoal.

