import { createFailureReporter } from '@/lib/report-feature-failure';
import { authErrorCode, translateAuthError } from './auth-errors';

/** O Auth não usa categorias: a frase vem do código dele, e a falha é sempre só um aviso no log. */
const AUTH_FAILURE_KIND = 'auth';

const reporter = createFailureReporter('auth', (error) => ({
  message: translateAuthError(error),
  kind: AUTH_FAILURE_KIND,
  code: authErrorCode(error),
}));

/**
 * Registra a falha no log (só o código, nunca e-mail ou senha) e devolve a frase
 * para a própria tela mostrar; por isso sem aviso no canto.
 */
export function reportAuthFailure(error: unknown, action: string): string {
  return reporter.report(error, { action });
}
