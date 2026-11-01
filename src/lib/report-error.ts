/**
 * Ponto único para falhas: registra no log (com o detalhe técnico) e avisa o
 * usuário com uma mensagem limpa. A tela nunca mostra stack trace nem fica
 * calada.
 */
import { notify } from '@/components/toast/toast-store';
import { logger } from './logger';

export type ReportOptions = {
  /** O que o usuário lê, em português simples. */
  userMessage: string;
  /** Próximo passo sugerido ao usuário (ex: "Tente de novo em instantes."). */
  hint?: string;
  /** Onde aconteceu, para achar no log (ex: { feature: 'rooms', action: 'join' }). */
  context?: Record<string, unknown>;
  /** "warn" para o que dá para contornar; "error" (padrão) para falha grave. */
  severity?: 'warn' | 'error';
  /** Falso quando a própria tela já mostra o erro (ex: ErrorState), para não duplicar. */
  toast?: boolean;
};

export function reportError(error: unknown, options: ReportOptions): void {
  const { userMessage, hint, context, severity = 'error', toast = true } = options;
  logger[severity](userMessage, context, error);
  if (!toast) return;
  if (severity === 'warn') notify.warning(userMessage, hint);
  else notify.error(userMessage, hint);
}
