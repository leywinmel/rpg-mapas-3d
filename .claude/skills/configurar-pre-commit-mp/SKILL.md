---
name: configurar-pre-commit-mp
description: Configura hooks de pre-commit com Husky, lint-staged (Prettier), checagem de tipos e testes no repositório atual. Use quando o usuário quiser adicionar hooks de pre-commit, configurar o Husky, configurar o lint-staged, ou adicionar formatação/typecheck/testes no momento do commit.
---

# Configurar Hooks de Pre-Commit

## O que isto configura

- Hook de pre-commit do **Husky**
- **lint-staged** rodando o Prettier em todos os arquivos no stage
- Configuração do **Prettier** (se estiver faltando)
- Scripts de **typecheck** e **test** no hook de pre-commit

## Passos

### 1. Detecte o gerenciador de pacotes

Procure por `package-lock.json` (npm), `pnpm-lock.yaml` (pnpm), `yarn.lock` (yarn), `bun.lockb` (bun). Use o que estiver presente. Use npm como padrão se não estiver claro.

### 2. Instale as dependências

Instale como devDependencies:

```
husky lint-staged prettier
```

### 3. Inicialize o Husky

```bash
npx husky init
```

Isso cria o diretório `.husky/` e adiciona `prepare: "husky"` ao package.json.

### 4. Crie o `.husky/pre-commit`

Escreva este arquivo (não é preciso shebang no Husky v9+):

```
npx lint-staged
npm run typecheck
npm run test
```

**Adapte**: substitua `npm` pelo gerenciador de pacotes detectado. Se o repositório não tiver script `typecheck` ou `test` no package.json, omita essas linhas e avise o usuário.

### 5. Crie o `.lintstagedrc`

```json
{
  "*": "prettier --ignore-unknown --write"
}
```

### 6. Crie o `.prettierrc` (se estiver faltando)

Só crie se não existir nenhuma configuração do Prettier. Use estes padrões:

```json
{
  "useTabs": false,
  "tabWidth": 2,
  "printWidth": 80,
  "singleQuote": false,
  "trailingComma": "es5",
  "semi": true,
  "arrowParens": "always"
}
```

### 7. Verifique

- [ ] `.husky/pre-commit` existe e é executável
- [ ] `.lintstagedrc` existe
- [ ] O script `prepare` no package.json é `"husky"`
- [ ] Existe configuração do Prettier
- [ ] Rode `npx lint-staged` para verificar que funciona

### 8. Comite

Adicione ao stage todos os arquivos alterados/criados e comite com a mensagem: `Add pre-commit hooks (husky + lint-staged + prettier)`

Isso vai passar pelos novos hooks de pre-commit: um bom teste de fumaça para confirmar que tudo funciona.

## Notas

- O Husky v9+ não precisa de shebang nos arquivos de hook
- `prettier --ignore-unknown` ignora arquivos que o Prettier não consegue interpretar (imagens etc.)
- O pre-commit roda o lint-staged primeiro (rápido, só o que está no stage), e depois o typecheck e os testes completos
