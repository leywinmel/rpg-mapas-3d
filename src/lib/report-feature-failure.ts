import { reportError } from './report-error';

/** A falha já traduzida para a tela: frase amigável, categoria e código original. */
export type ReportableFailure = { message: string; kind: string; code: string | null };

export type ReportFailureOptions = {
  action: string;
  /** Falso quando a própria tela (janela, formulário, lista) mostra a frase devolvida. */
  toast?: boolean;
  /** Próximo passo sugerido, mostrado junto do aviso. */
  hint?: string;
  /** Dados extras do log (ex: id do mapa); nunca dado pessoal. */
  context?: Record<string, unknown>;
};

export type FailureReporterConfig = {
  /** Avisar no canto quando a chamada não diz nada. Padrão: a tela mostra a frase sozinha. */
  toastByDefault?: boolean;
};

export type FailureReporter = {
  /** Registra a falha (com o código, sem dado pessoal) e devolve a frase amigável. */
  report: (error: unknown, options: ReportFailureOptions) => string;
  /** Para cargas que a tela mostra com ErrorState: registra no log e repassa a falha. */
  logAndRethrow: (action: string) => (error: unknown) => never;
};

/**
 * Relator de falhas de uma feature: `toFailure` traduz o erro cru, e o resto (log com
 * contexto, severidade, aviso na tela) é igual para todas.
 */
export function createFailureReporter(
  feature: string,
  toFailure: (error: unknown) => ReportableFailure,
  { toastByDefault = false }: FailureReporterConfig = {},
): FailureReporter {
  function report(
    error: unknown,
    { action, toast = toastByDefault, hint, context }: ReportFailureOptions,
  ): string {
    const failure = toFailure(error);
    reportError(error, {
      userMessage: failure.message,
      hint,
      context: { feature, action, ...context, kind: failure.kind, code: failure.code },
      severity: failure.kind === 'unknown' ? 'error' : 'warn',
      toast,
    });
    return failure.message;
  }

  function logAndRethrow(action: string) {
    return (error: unknown): never => {
      report(error, { action });
      throw error;
    };
  }

  return { report, logAndRethrow };
}
