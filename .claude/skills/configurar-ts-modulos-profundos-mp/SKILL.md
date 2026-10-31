---
name: configurar-ts-modulos-profundos-mp
description: Integra o dependency-cruiser a um repositório TypeScript para que cada pacote seja um módulo profundo, com a implementação escondida em subpastas e alcançável apenas pelos arquivos de ponto de entrada. Invocada pelo usuário.
disable-model-invocation: true
---

# Configurar Módulos Profundos em TS

Faça de cada pacote deste repositório um **módulo profundo**: muito comportamento atrás de uma interface pequena. A superfície pública de um pacote são seus **pontos de entrada** (os arquivos na raiz do pacote), e tudo o que estiver nas subpastas fica escondido. Esta skill instala o [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) e as regras que tornam os pontos de entrada a única porta de acesso, e depois comprova que as regras mordem.

Para o vocabulário (módulo profundo, interface, costura, profundidade), chame a ferramenta Skill com "design-de-codebase-mp" e use a linguagem dela em todo o processo.

## O formato que isto impõe

```
src/packages/
  <nome>/
    index.ts        ← um ponto de entrada (público). Importe este de fora.
    client.ts       ← outro ponto de entrada. Pacotes podem expor VÁRIOS.
    lib/            ← implementação: escondida de fora, livre para importar entre si.
    tests/          ← testes + fixtures colocalizados (uma subpasta, portanto privada).
```

A superfície pública são os **arquivos da raiz** do pacote, não um único `index.ts` designado. Por convenção, a implementação fica em `lib/` e os testes em `tests/`, dando a todo pacote o mesmo formato de duas pastas. A regra em si, porém, é geral: *qualquer coisa* em *qualquer* subpasta é privada, então você nunca precisa estender a configuração para adicionar uma pasta.

Quatro regras, todas em nível `error`:

1. **Fronteira de ponto de entrada**: código fora de um pacote (código da aplicação ou outro pacote) só pode importar os pontos de entrada daquele pacote (os arquivos da raiz dele), nunca nada nas subpastas.
2. **Liberdade intrapacote**: os arquivos de um mesmo pacote se importam livremente.
3. **Testes através dos pontos de entrada**: arquivos sob `<pkg>/tests/` podem importar os pontos de entrada de qualquer pacote e os próprios fixtures em `tests/`, mas nunca as entranhas em subpastas de qualquer pacote (nem as do próprio). Testes de integração entre pacotes são permitidos; imports profundos não.
4. **Sem ciclos**: nenhum ciclo de dependência.

**Pontos de entrada, não um barril.** Como a superfície pública é *todo* arquivo da raiz, um pacote pode expor vários pontos de entrada pequenos (`index.ts`, `client.ts`, `server.ts`) em vez de afunilar tudo por um `index.ts` gigante. Arquivos-barril que reexportam uma subárvore inteira são desencorajados; mantenha os pontos de entrada pequenos e esconda a implementação em subpastas.

O empilhamento em camadas (quais pacotes podem depender de quais) é uma preocupação *diferente* e fica como um trecho comentado na configuração, para este repositório preencher.

## Passos

### 1. Detecte o ambiente

- **Gerenciador de pacotes**: `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb` → bun, senão npm. Use-o em todos os comandos abaixo (`pnpm`/`yarn`/`npm run`/`bunx`).
- **Raiz dos pacotes**: se `src/` existir, use `src/packages`; senão, `packages`. Confirme a escolha com o usuário se o repositório já tiver outra convenção óbvia.
- **Configuração existente**: verifique se há um arquivo `.dependency-cruiser.*`. Se houver, **não** o sobrescreva: funda as quatro regras e as opções nele e diga ao usuário o que você adicionou.

**Concluído quando:** o gerenciador de pacotes, a raiz dos pacotes e a situação da configuração existente forem todos conhecidos.

### 2. Instale o dependency-cruiser

Instale o `dependency-cruiser` como devDependency com o gerenciador de pacotes detectado.

**Concluído quando:** `dependency-cruiser` estiver em `devDependencies`.

### 3. Escreva a configuração

Copie [`assets/dependency-cruiser.config.cjs`](assets/dependency-cruiser.config.cjs) para a raiz do repositório como `.dependency-cruiser.cjs`. Defina `PACKAGES_ROOT` com a raiz detectada no passo 1. As regras são baseadas em profundidade de caminho e agnósticas de extensão, então nada mais precisa ser adaptado.

**Concluído quando:** `.dependency-cruiser.cjs` existir com o `PACKAGES_ROOT` correto e as quatro regras de proibição estiverem presentes.

### 4. Integre às verificações

- Adicione um script `lint:boundaries`: `depcruise <raiz-dos-pacotes>` (ou `depcruise src`).
- Encaixe-o no comando guarda-chuva de verificação do repositório, aquele que já roda o typecheck (por exemplo, um script `check` / `ci` / `validate`). **Não** mexa no `tsconfig` nem adicione aliases de caminho.
- Se não houver script guarda-chuva, adicione o `lint:boundaries` e diga ao usuário para incluí-lo no CI.

**Concluído quando:** `lint:boundaries` existir e rodar como parte do mesmo comando que o typecheck.

### 5. Crie o pacote de exemplo

Crie um `<raiz-dos-pacotes>/example/` versionado, como um template do tipo "copie-me":

- `index.ts` é um ponto de entrada. Exporte uma função que delega para um arquivo interno (para que o pacote seja visivelmente *profundo*, não um mero repasse).
- `lib/impl.ts`: um arquivo interno em uma **subpasta**, importado pelo `index.ts`, inalcançável de fora.
- `tests/example.test.ts` importa **apenas** `../index` (um ponto de entrada) e faz asserções contra a função pública.

Diga ao usuário que isso é um template inicial para copiar ou apagar.

**Concluído quando:** o pacote de exemplo existir, expuser seu comportamento por um ponto de entrada na raiz e esconder o `impl` em uma subpasta.

### 6. Comprove que as regras mordem

Este é o critério de conclusão de toda a skill: uma configuração que não falha diante de uma violação não vale nada.

1. Rode `lint:boundaries`. Ele precisa **passar** no exemplo limpo.
2. Adicione temporariamente um import profundo em `tests/example.test.ts` (por exemplo, `import { thing } from "../lib/impl"`). Rode `lint:boundaries` de novo; ele precisa **falhar** com `tests-through-entrypoints`.
3. Reverta o import profundo. Rode mais uma vez, e ele precisa **passar**.

**Concluído quando:** você tiver observado uma aprovação, depois uma falha no import profundo, e depois uma aprovação novamente. Se o passo 2 não falhar, as regras não estão corretamente integradas — conserte antes de terminar.

### 7. Documente a convenção

Escreva um `README.md` **na pasta de pacotes** (`<raiz-dos-pacotes>/README.md`, ao lado dos pacotes que ele governa) cobrindo: o layout `src/packages/<nome>/` (pontos de entrada na raiz, `lib/` para implementação, `tests/` para testes), "importe apenas pelos pontos de entrada de um pacote (os arquivos da raiz dele)", e como rodar o `lint:boundaries`. **Desencoraje arquivos-barril** explicitamente: exponha vários pontos de entrada pequenos em vez de reexportar uma subárvore inteira por um índice. Mantenha o texto no trecho "copie-me" mais as quatro regras em um parágrafo cada.

Depois adicione um **ponteiro de contexto** para ele a partir do arquivo de instruções de agente do repositório (`CLAUDE.md`, se existir; senão `AGENTS.md`, criando `AGENTS.md` se nenhum existir). Uma linha basta, por exemplo: `Pacotes são módulos profundos: veja [src/packages/README.md](./src/packages/README.md) antes de adicionar ou importar um.` É isso que faz um agente descobrir a regra de fronteira em vez de tropeçar nela.

**Concluído quando:** `<raiz-dos-pacotes>/README.md` existir e desencorajar barris, e o `CLAUDE.md`/`AGENTS.md` do repositório apontar para ele.

## Notas

- As retrorreferências `$1` da configuração (o casamento por grupos do dependency-cruiser) são o que permite que um pacote alcance as próprias entranhas enquanto os de fora não conseguem. Não as achate em regras separadas por pacote.
- Público vs. privado é decidido pela **profundidade**: os arquivos da raiz de um pacote são pontos de entrada; qualquer coisa em uma subpasta é privada. As subpastas convencionais são `lib/` (implementação) e `tests/`, mas a regra não as fixa em código: qualquer subpasta é privada, então uma pasta nova nunca exige mudança de configuração. Adicionar um ponto de entrada é apenas adicionar um arquivo na raiz (sem barril).
- Os pacotes são **planos**: um único nível de filhos imediatos sob a raiz. As entranhas de um pacote podem aninhar o quanto você quiser; um pacote não pode conter outro pacote.
- Use `.cjs` (não `.js`), para que o `module.exports` da configuração funcione mesmo em repositórios com `"type": "module"`.
