/**
 * Leva a pessoa ao primeiro problema do formulário depois de um envio recusado: foca o campo
 * inválido ou, quando o erro é de um grupo (imagem, destinatários), traz o aviso para a vista,
 * já que a janela rola por dentro e o aviso pode estar abaixo da dobra.
 */
export function revealFirstError(form: HTMLFormElement | null): void {
  if (!form) return;
  const invalidField = form.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (invalidField) {
    invalidField.focus();
    return;
  }
  form.querySelector<HTMLElement>('[role="alert"]')?.scrollIntoView?.({ block: 'nearest' });
}
