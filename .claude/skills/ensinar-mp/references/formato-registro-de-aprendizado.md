# Formato do Registro de Aprendizado

Os registros de aprendizado vivem em `./learning-records/` e usam numeração sequencial: `0001-slug.md`, `0002-slug.md` etc. Crie o diretório preguiçosamente: apenas quando o primeiro registro for escrito.

Eles são o equivalente pedagógico dos ADRs: capturam lições não óbvias, insights-chave e conhecimento prévio declarado que vão orientar sessões futuras. São usados para calcular a zona de desenvolvimento proximal.

## Template

```md
# {Título curto do que foi aprendido ou estabelecido}

{1 a 3 frases: o que foi aprendido (ou qual conhecimento prévio foi estabelecido) e por que isso importa para as sessões futuras.}
```

Esse é o formato inteiro. Um registro de aprendizado pode ser um único parágrafo. O valor está em registrar _que_ isto agora é conhecido e _por que_ isso muda o que ensinar em seguida, não em preencher seções.

## Seções opcionais

Inclua estas apenas quando agregarem valor genuíno. A maioria dos registros não vai precisar delas.

- Frontmatter de **Status** (`ativo | substituído pelo LR-NNNN`): útil quando um entendimento anterior se revela errado e é substituído.
- **Evidência**: como o usuário demonstrou o entendimento (uma pergunta respondida, um exercício concluído, experiência anterior citada). Útil quando a afirmação puder ser revisitada.
- **Implicações**: o que isso destrava ou descarta para sessões futuras. Vale registrar quando não for óbvio.

## Numeração

Varra `./learning-records/` procurando o maior número existente e incremente em um.

## Quando escrever um registro de aprendizado

Escreva um quando qualquer uma destas condições for verdadeira:

1. **O usuário demonstrou entendimento genuíno de algo não trivial**: não apenas exposição, mas evidência de que ele consegue usar o conceito corretamente. Isso estabelece um novo piso para o que ensinar em seguida.
2. **O usuário revelou conhecimento prévio**: "eu já sei X". Registre para que sessões futuras não reensinem aquilo. Registre também a _profundidade_ alegada.
3. **Um equívoco foi corrigido**: o usuário acreditava em algo errado e agora entende por quê. Esses são de alto valor: eles preveem tropeços futuros em temas relacionados.
4. **A missão mudou em resposta ao aprendizado**: o usuário descobriu que se importava com algo diferente do que pensava. Faça a referência cruzada com o [[MISSION.md]] e atualize-o.

### O que _não_ se qualifica

- Material que apenas foi coberto. Cobertura não é aprendizado. Espere pela evidência.
- Qualquer coisa já capturada de forma sucinta no [[GLOSSARY.md]] como definição de termo. Não duplique.
- Registros de atividade sessão a sessão. Registros de aprendizado não são um diário: são insights com peso de decisão.

## Substituição

Quando um registro posterior contradisser um anterior (o entendimento do usuário se aprofundou ou foi corrigido), marque o registro antigo como `Status: substituído pelo LR-NNNN`, em vez de apagá-lo. O histórico de como o entendimento evoluiu é, em si, um sinal útil.
