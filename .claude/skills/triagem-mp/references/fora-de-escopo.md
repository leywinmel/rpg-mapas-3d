# Base de Conhecimento "Fora de Escopo"

O diretório `.out-of-scope/` em um repositório guarda registros persistentes de pedidos de funcionalidade rejeitados. Ele serve a dois propósitos:

1. **Memória institucional**: por que uma funcionalidade foi rejeitada, para que o raciocínio não se perca quando a issue é fechada
2. **Deduplicação**: quando chega uma nova issue que corresponde a uma rejeição anterior, a skill consegue trazer à tona a decisão passada em vez de rediscuti-la

## Estrutura do diretório

```
.out-of-scope/
├── dark-mode.md
├── plugin-system.md
└── graphql-api.md
```

Um arquivo por **conceito**, não por issue. Várias issues pedindo a mesma coisa são agrupadas em um único arquivo.

## Formato do arquivo

O arquivo deve ser escrito em um estilo solto e legível, mais parecido com um pequeno documento de design do que com um registro de banco de dados. Use parágrafos, exemplos de código e ilustrações para deixar o raciocínio claro e útil para quem o encontra pela primeira vez.

```markdown
# Modo Escuro

Este projeto não suporta modo escuro nem temas para o usuário final.

## Por que isto está fora de escopo

O pipeline de renderização pressupõe uma única paleta de cores definida em
`ThemeConfig`. Suportar múltiplos temas exigiria:

- Um provedor de contexto de tema envolvendo toda a árvore de componentes
- Resolução de estilo ciente do tema em cada componente
- Uma camada de persistência para as preferências de tema do usuário

Essa é uma mudança arquitetural significativa, que não se alinha ao foco do
projeto em autoria de conteúdo. Tematização é uma preocupação de consumidores
a jusante, que embutem ou redistribuem a saída.

```ts
// A interface atual de ThemeConfig não foi projetada para troca em tempo de execução:
interface ThemeConfig {
  colors: ColorPalette; // paleta única, resolvida em tempo de build
  fonts: FontStack;
}
```

## Pedidos anteriores

- #42: "Adicionar suporte a modo escuro"
- #87: "Tema noturno por acessibilidade"
- #134: "Opção de tema escuro"
```

### Nomeando o arquivo

Use um nome curto e descritivo em kebab-case para o conceito: `dark-mode.md`, `plugin-system.md`, `graphql-api.md`. O nome deve ser reconhecível o bastante para que alguém navegando pelo diretório entenda o que foi rejeitado sem abrir o arquivo.

### Escrevendo o motivo

O motivo precisa ser substancial: não "não queremos isso", mas por quê. Bons motivos referenciam:

- Escopo ou filosofia do projeto ("Este projeto foca em X; tematização é uma preocupação a jusante")
- Restrições técnicas ("Suportar isso exigiria Y, o que conflita com a nossa arquitetura Z")
- Decisões estratégicas ("Escolhemos usar A em vez de B porque...")

O motivo precisa ser durável. Evite referenciar circunstâncias temporárias ("estamos muito ocupados agora"); isso não é rejeição de verdade, é adiamento.

## Quando consultar o `.out-of-scope/`

Durante a triagem (Passo 1: reunir contexto), leia todos os arquivos em `.out-of-scope/`. Ao avaliar uma nova issue:

- Verifique se o pedido corresponde a um conceito já fora de escopo
- A correspondência é por similaridade de conceito, não por palavra-chave: "tema noturno" corresponde a `dark-mode.md`
- Se houver correspondência, traga-a ao mantenedor: "Isto é parecido com `.out-of-scope/dark-mode.md`. Rejeitamos isto antes por [motivo]. Você ainda pensa o mesmo?"

O mantenedor pode:

- **Confirmar**: a nova issue é adicionada à lista "Pedidos anteriores" do arquivo existente e então fechada
- **Reconsiderar**: o arquivo de fora de escopo é apagado ou atualizado, e a issue segue pela triagem normal
- **Discordar**: as issues são relacionadas, porém distintas; siga com a triagem normal

## Quando escrever no `.out-of-scope/`

Somente quando um **enhancement** (não um bug) é *rejeitado* como `wontfix`. Isso vale para PRs de enhancement exatamente como vale para issues: um PR rejeitado é registrado aqui para que o mesmo pedido não volte na forma de código novo.

**Não** escreva aqui quando algo é fechado como `wontfix` por **já estar implementado**. Isso é uma funcionalidade construída, não uma rejeitada; registrá-la envenenaria as verificações de deduplicação com rejeições falsas. Em vez disso, o comentário de fechamento aponta para onde a funcionalidade já vive.

O fluxo:

1. O mantenedor decide que um pedido de funcionalidade está fora de escopo
2. Verifique se já existe um arquivo `.out-of-scope/` correspondente
3. Se sim: acrescente a nova issue à lista "Pedidos anteriores"
4. Se não: crie um arquivo novo com o nome do conceito, a decisão, o motivo e o primeiro pedido anterior
5. Publique um comentário na issue explicando a decisão e mencionando o arquivo `.out-of-scope/`
6. Feche a issue com a label `wontfix`

## Atualizando ou removendo arquivos de fora de escopo

Se o mantenedor mudar de ideia sobre um conceito rejeitado anteriormente:

- Apague o arquivo `.out-of-scope/`
- A skill não precisa reabrir issues antigas; elas são registros históricos
- A nova issue que provocou a reconsideração segue pela triagem normal
