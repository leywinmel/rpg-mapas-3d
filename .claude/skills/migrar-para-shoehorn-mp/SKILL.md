---
name: migrar-para-shoehorn-mp
description: Migra arquivos de teste de asserções de tipo com `as` para @total-typescript/shoehorn. Use quando o usuário mencionar shoehorn, quiser substituir `as` em testes, ou precisar de dados de teste parciais.
---

# Migrar para o Shoehorn

## Por que shoehorn?

O `shoehorn` permite passar dados parciais em testes mantendo o TypeScript satisfeito. Ele substitui asserções `as` por alternativas type-safe.

**Apenas em código de teste.** Nunca use shoehorn em código de produção.

Problemas do `as` em testes:

- Somos treinados a não usá-lo
- Obriga a especificar manualmente o tipo de destino
- Exige `as` duplo (`as unknown as Type`) para dados intencionalmente errados

## Instalação

```bash
npm i @total-typescript/shoehorn
```

## Padrões de migração

### Objetos grandes com poucas propriedades necessárias

Antes:

```ts
type Request = {
  body: { id: string };
  headers: Record<string, string>;
  cookies: Record<string, string>;
  // ...mais 20 propriedades
};

it("gets user by id", () => {
  // Só importa body.id, mas é preciso falsificar o Request inteiro
  getUser({
    body: { id: "123" },
    headers: {},
    cookies: {},
    // ...falsificar todas as 20 propriedades
  });
});
```

Depois:

```ts
import { fromPartial } from "@total-typescript/shoehorn";

it("gets user by id", () => {
  getUser(
    fromPartial({
      body: { id: "123" },
    }),
  );
});
```

### `as Type` → `fromPartial()`

Antes:

```ts
getUser({ body: { id: "123" } } as Request);
```

Depois:

```ts
import { fromPartial } from "@total-typescript/shoehorn";

getUser(fromPartial({ body: { id: "123" } }));
```

### `as unknown as Type` → `fromAny()`

Antes:

```ts
getUser({ body: { id: 123 } } as unknown as Request); // tipo errado de propósito
```

Depois:

```ts
import { fromAny } from "@total-typescript/shoehorn";

getUser(fromAny({ body: { id: 123 } }));
```

## Quando usar cada uma

| Função          | Caso de uso                                                    |
| --------------- | -------------------------------------------------------------- |
| `fromPartial()` | Passar dados parciais que ainda passam na checagem de tipos     |
| `fromAny()`     | Passar dados intencionalmente errados (mantém o autocomplete)   |
| `fromExact()`   | Forçar o objeto completo (trocar por fromPartial depois)        |

## Fluxo de trabalho

1. **Levante os requisitos** — pergunte ao usuário:
   - Quais arquivos de teste têm asserções `as` causando problemas?
   - Eles lidam com objetos grandes em que apenas algumas propriedades importam?
   - Eles precisam passar dados intencionalmente errados para testar erros?

2. **Instale e migre**:
   - [ ] Instale: `npm i @total-typescript/shoehorn`
   - [ ] Encontre arquivos de teste com asserções `as`: `grep -r " as [A-Z]" --include="*.test.ts" --include="*.spec.ts"`
   - [ ] Substitua `as Type` por `fromPartial()`
   - [ ] Substitua `as unknown as Type` por `fromAny()`
   - [ ] Adicione os imports de `@total-typescript/shoehorn`
   - [ ] Rode a checagem de tipos para verificar
