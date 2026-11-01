import { reportError } from '@/lib/report-error';
import { authErrorCode, translateAuthError } from './auth-errors';

/**
 * Registra a falha no log (só o código, nunca e-mail ou senha) e devolve a frase
 * para a própria tela mostrar; por isso sem aviso no canto.
 */
export function reportAuthFailure(error: unknown, action: string): string {
  const message = translateAuthError(error);
  reportError(error, {
    userMessage: message,
    context: { feature: 'auth', action, code: authErrorCode(error) },
    severity: 'warn',
    toast: false,
  });
  return message;
}
