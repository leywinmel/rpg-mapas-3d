# Protótipo de UI

Gere **várias variações de UI radicalmente diferentes** em uma única rota, alternáveis por uma barra flutuante embaixo. O usuário alterna entre as variantes no navegador, escolhe uma (ou rouba pedaços de cada) e joga o resto fora.

Se a pergunta for sobre lógica/estado em vez de aparência, esta é a ramificação errada. Use [logica.md](logica.md).

## Quando este é o formato certo

- "Como esta página deveria parecer?"
- "Quero ver algumas opções para este dashboard antes de me comprometer."
- "Tente um layout diferente para a tela de configurações."
- Sempre que o usuário, de outro modo, gastaria um dia escolhendo entre três mockups vagos na cabeça dele.

## Dois subformatos: prefira fortemente o subformato A

Um protótipo de UI é muito mais fácil de julgar quando está **encostado no resto do app**: cabeçalho real, barra lateral real, dados reais, densidade real. Uma rota descartável isolada é um vácuo: toda variante parece boa no vazio. Use o subformato A por padrão sempre que houver uma página existente plausível para hospedar as variantes. Só recorra ao subformato B se o protótipo genuinamente não tiver um lar por perto.

### Subformato A: ajuste em uma página existente (preferido)

A rota já existe. As variantes são renderizadas **na mesma rota**, controladas por um parâmetro de busca `?variant=` na URL. A busca de dados, os parâmetros e a autenticação existentes permanecem. Só a renderização troca. Este é o padrão; escolha-o a menos que haja um motivo específico para não fazê-lo.

Se o protótipo for para algo que ainda não tem página mas que *naturalmente viveria dentro de uma* (uma nova seção do dashboard, um novo cartão na tela de configurações, um novo passo em um fluxo existente), ainda é subformato A. Monte as variantes dentro da página hospedeira.

### Subformato B: uma página nova (último recurso)

Só use isto quando aquilo que está sendo prototipado genuinamente não tiver página existente para viver dentro (por exemplo, uma superfície de topo inteiramente nova, ou um fluxo que não pode ser embutido em lugar algum sensato).

Crie uma **rota descartável** seguindo a convenção de rotas que o projeto já usa. Não invente uma nova estrutura de topo. Nomeie-a de modo que fique óbvio que é um protótipo (por exemplo, inclua a palavra `prototype` no caminho ou no nome do arquivo). Mesmo padrão `?variant=`.

Antes de se comprometer com o subformato B, verifique: não existe mesmo nenhuma página onde isto pudesse ser embutido? Uma rota vazia esconde problemas de design que uma povoada exporia.

Nos dois subformatos, a barra flutuante inferior é idêntica.

## Processo

### 1. Enuncie a pergunta e escolha N

Use **3 variantes** por padrão. Mais que 5 deixa de ser radicalmente diferente e vira ruído, então pare aí.

Anote o plano em uma linha, no local do protótipo ou em um comentário no topo do arquivo:

> "Três variantes da página de configurações, alternáveis via `?variant=`, na rota `/settings` existente."

Isso funciona tanto se o usuário estiver presente para contestar quanto se não estiver.

### 2. Gere variantes radicalmente diferentes

Rascunhe cada variante. Cobre de cada uma:

- O propósito da página e os dados aos quais ela tem acesso.
- A biblioteca de componentes / o sistema de estilo do projeto (TailwindCSS, shadcn, MUI, CSS puro, o que for).
- Um nome de componente exportado claro, por exemplo `VariantA`, `VariantB`, `VariantC`.

As variantes precisam ser **estruturalmente diferentes**: layout diferente, hierarquia de informação diferente, affordance principal diferente — não apenas cores diferentes. Três grades de cartões levemente ajustadas não são um protótipo de UI, são papel de parede. Se dois rascunhos saírem parecidos demais, refaça um com a orientação explícita de "não use uma grade de cartões".

### 3. Conecte tudo

Crie um único componente alternador na rota:

```tsx
// pseudocódigo, adapte ao framework do projeto
const variant = searchParams.get('variant') ?? 'A';
return (
  <>
    {variant === 'A' && <VariantA {...data} />}
    {variant === 'B' && <VariantB {...data} />}
    {variant === 'C' && <VariantC {...data} />}
    <PrototypeSwitcher variants={['A','B','C']} current={variant} />
  </>
);
```

Para o subformato A (página existente): mantenha toda a busca de dados existente acima do alternador; apenas a subárvore renderizada muda por variante.

Para o subformato B (página nova): a rota descartável em `/prototype/<nome>` monta o mesmo alternador.

### 4. Construa o alternador flutuante

Uma pequena barra de posição fixa na parte inferior central da tela, com três peças:

- **Seta para a esquerda**: cicla para a variante anterior (dá a volta).
- **Rótulo da variante**: mostra a chave da variante atual e, se a variante exportar um nome, também esse nome. Por exemplo: `B (layout com barra lateral)`.
- **Seta para a direita**: cicla para a frente (dá a volta).

Comportamento:

- Clicar em uma seta atualiza o parâmetro de busca na URL (use o roteador do framework, por exemplo `router.replace` no Next, `navigate` no React Router etc.), para que a variante seja compartilhável e sobreviva ao recarregamento.
- Teclado: as setas `←` e `→` também ciclam. Não intercepte as setas quando um `<input>`, `<textarea>` ou `[contenteditable]` estiver em foco.
- Visualmente distinta da página (por exemplo, uma pílula de alto contraste, com sombra sutil), para que fique óbvio que ela não faz parte do design sendo avaliado.
- Escondida em builds de produção: proteja com `process.env.NODE_ENV !== 'production'` ou verificação equivalente, para que um merge acidental de protótipo não entregue a barra aos usuários.

Coloque o alternador em um único componente compartilhado, para que os dois subformatos possam reutilizá-lo. Posicione-o onde a UI compartilhada vive no projeto.

### 5. Entregue

Informe a URL (e as chaves de `?variant=`). O usuário vai folhear as variantes quando puder. O retorno mais interessante costuma ser **"quero o cabeçalho da B com a barra lateral da C"**, que é o design que ele de fato quer.

### 6. Capture a resposta e limpe

Assim que uma variante vencer, capture a resposta (qual variante e por quê) e depois capture o protótipo do jeito que o [SKILL](../SKILL.md) descreve. Incorpore a vencedora ao código real e mova o resto para a branch descartável, não para a main:

- **Subformato A**: incorpore a vencedora à página existente; remova da main as variantes perdedoras e o alternador.
- **Subformato B**: promova a variante vencedora a uma rota real; remova da main a rota descartável e o alternador.

O conjunto completo de variantes é a fonte primária, então ele vai parar na branch descartável, não no lixo — variantes e alternadores deixados na branch main apodrecem rápido e confundem o próximo leitor.

## Antipadrões

- **Variantes que diferem apenas em cor ou texto.** Isso é um ajuste, não um protótipo. Variantes de verdade discordam sobre a estrutura.
- **Compartilhar código demais entre as variantes.** Um `<Header>` compartilhado é aceitável; um `<Layout>` compartilhado destrói o propósito. Cada variante deve ser livre para jogar fora o layout.
- **Conectar variantes a mutações reais.** Protótipos somente leitura estão ótimos. Se uma variante precisar mutar, aponte-a para um stub: a pergunta é "como isto deveria parecer", não "o backend funciona?".
- **Promover o protótipo direto para produção.** O código da variante foi escrito sob restrições de protótipo (sem testes, tratamento de erros mínimo). Reescreva-o direito ao incorporá-lo.
