import { ZodError } from 'zod';
import { createFailureReporter, type ReportFailureOptions } from '@/lib/report-feature-failure';
import { classifySupabaseError, type SupabaseErrorTable } from '@/lib/supabase-error';

/** Falhas dos dados em categorias que a tela sabe explicar. O detalhe técnico vai para o log. */
export type DiceErrorKind = 'forbidden' | 'invalid' | 'network' | 'unknown';

export const DICE_ERROR_MESSAGES: Record<DiceErrorKind, string> = {
  forbidden: 'Você não tem permissão para fazer isso nesta mesa.',
  invalid: 'Essa rolagem não foi aceita. Confira os dados e tente de novo.',
  network: 'Sem conexão com o servidor. Confira sua internet e tente de novo.',
  unknown: 'Não deu para concluir agora. Tente de novo em instantes.',
};

/** Códigos do Postgres/PostgREST que as regras de dice_rolls usam (ver migrations). */
const ERROR_TABLE: SupabaseErrorTable<DiceErrorKind> = {
  byPostgresCode: {
    '42501': 'forbidden',
    '22023': 'invalid',
    '23502': 'invalid',
    '23514': 'invalid',
    '22P02': 'invalid',
  },
  network: 'network',
};

export class DiceError extends Error {
  readonly kind: DiceErrorKind;
  /** Código original, para o log. */
  readonly code: string | null;

  constructor(kind: DiceErrorKind, code: string | null, options?: { cause?: unknown }) {
    super(DICE_ERROR_MESSAGES[kind], options);
    this.name = 'DiceError';
    this.kind = kind;
    this.code = code;
  }
}

export function toDiceError(error: unknown): DiceError {
  if (error instanceof DiceError) return error;
  if (error instanceof ZodError) return new DiceError('invalid', null, { cause: error });
  const { kind, code } = classifySupabaseError(error, ERROR_TABLE, 'unknown');
  return new DiceError(kind, code, { cause: error });
}

export type ReportDiceOptions = ReportFailureOptions;

// Os dados avisam no canto por padrão: a rolagem acontece com o painel fechado ou sem formulário.
const reporter = createFailureReporter('dice', toDiceError, { toastByDefault: true });

/** Registra a falha (com o código, sem dado pessoal) e devolve a frase amigável. */
export const reportDiceFailure = reporter.report;
