# Quando Mockar

Mocke apenas em **fronteiras de sistema**:

- APIs externas (pagamento, e-mail etc.)
- Bancos de dados (às vezes — prefira um banco de teste)
- Tempo/aleatoriedade
- Sistema de arquivos (às vezes)

Não mocke:

- Suas próprias classes/módulos
- Colaboradores internos
- Qualquer coisa que você controla

## Projetando para ser mockável

Nas fronteiras de sistema, projete interfaces fáceis de mockar:

**1. Use injeção de dependência**

Passe as dependências externas por parâmetro em vez de criá-las internamente:

```typescript
// Fácil de mockar
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// Difícil de mockar
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

**2. Prefira interfaces estilo SDK a "fetchers" genéricos**

Crie funções específicas para cada operação externa, em vez de uma função genérica com lógica condicional:

```typescript
// BOM: cada função é mockável de forma independente
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch('/orders', { method: 'POST', body: data }),
};

// RUIM: mockar exige lógica condicional dentro do mock
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

A abordagem SDK significa:

- Cada mock retorna um formato específico
- Nenhuma lógica condicional na preparação do teste
- Mais fácil enxergar quais endpoints um teste exercita
- Segurança de tipos por endpoint
