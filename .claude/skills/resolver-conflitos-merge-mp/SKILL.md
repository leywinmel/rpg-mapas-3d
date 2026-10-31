---
name: resolver-conflitos-merge-mp
description: "Use quando precisar resolver um conflito de merge/rebase do git em andamento."
---

1. **Enxergue o estado atual** do merge/rebase. Verifique o histórico do git e os arquivos em conflito.

2. **Encontre as fontes primárias** de cada conflito. Entenda a fundo por que cada mudança foi feita e qual era a intenção original. Leia as mensagens de commit, verifique os PRs, verifique as issues/tickets originais.

3. **Resolva cada trecho (hunk).** Preserve as duas intenções onde for possível. Onde forem incompatíveis, escolha a que corresponde ao objetivo declarado do merge e registre o trade-off. **Não** invente comportamento novo. Sempre resolva; nunca use `--abort`.

4. Descubra as **verificações automatizadas** do projeto e rode-as, tipicamente typecheck, depois testes, depois formatação. Conserte tudo o que o merge quebrou.

5. **Conclua o merge/rebase.** Adicione tudo ao stage e faça o commit. Se estiver em rebase, continue o processo até que todos os commits tenham sido rebaseados.
