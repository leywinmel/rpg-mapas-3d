# Testes Bons e Ruins

## Testes Bons

**Estilo integração**: teste através de interfaces reais, não de mocks de partes internas.

```typescript
// BOM: testa comportamento observável
test("user can checkout with valid cart", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

Características:

- Testa comportamento com o qual usuários/chamadores se importam
- Usa apenas a API pública
- Sobrevive a refatorações internas
- Descreve O QUE, não COMO
- Uma asserção lógica por teste

## Testes Ruins

**Testes de detalhe de implementação**: acoplados à estrutura interna.

```typescript
// RUIM: testa detalhes de implementação
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});
```

Sinais de alerta:

- Mockar colaboradores internos
- Testar métodos privados
- Fazer asserções sobre contagem/ordem de chamadas
- Teste quebra ao refatorar sem mudança de comportamento
- Nome do teste descreve COMO e não O QUE
- Verificar por meios externos em vez de pela interface

```typescript
// RUIM: contorna a interface para verificar
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// BOM: verifica através da interface
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```

**Testes tautológicos**: o valor esperado apenas repete a implementação, então o teste passa por construção.

```typescript
// RUIM: o valor esperado é recalculado do mesmo jeito que o código calcula
test("calculateTotal sums line items", () => {
  const items = [{ price: 10 }, { price: 5 }];
  const expected = items.reduce((sum, i) => sum + i.price, 0);
  expect(calculateTotal(items)).toBe(expected);
});

// BOM: o valor esperado é um literal independente e conhecido
test("calculateTotal sums line items", () => {
  expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
});
```
