import { ZodError } from 'zod';
import { reportError } from '@/lib/report-error';

/** Falhas dos dados em categorias que a tela sabe explicar. O detalhe técnico vai para o log. */
export type DiceErrorKind = 'forbidden' | 'invalid' | 'network' | 'unknown';

export const DICE_ERROR_MESSAGES: Record<DiceErrorKind, string> = {
  forbidden: 'Você não tem permissão para fazer isso nesta mesa.',
  invalid: 'Essa rolagem não foi aceita. Confira os dados e tente de novo.',
  network: 'Sem conexão com o servidor. Confira sua internet e tente de novo.',
  unknown: 'Não deu para concluir agora. Tente de novo em instantes.',
};

/** Códigos do Postgres/PostgREST que as regras de dice_rolls usam (ver migrations). */
const KIND_BY_CODE: Record<string, DiceErrorKind> = {
  '42501': 'forbidden',
  '22023': 'invalid',
  '23502': 'invalid',
  '23514': 'invalid',
  '22P02': 'invalid',
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

type PostgrestLike = { code?: unknown; message?: unknown };

export function toDiceError(error: unknown): DiceError {
  if (error instanceof DiceError) return error;
  if (error instanceof ZodError) return new DiceError('invalid', null, { cause: error });
  const { code, message } = (error && typeof error === 'object' ? error : {}) as PostgrestLike;
  const codeText = typeof code === 'string' ? code : null;
  const kindFromCode = codeText ? KIND_BY_CODE[codeText] : undefined;
  if (kindFromCode) return new DiceError(kindFromCode, codeText, { cause: error });
  if (typeof message === 'string' && message.toLowerCase().includes('failed to fetch')) {
    return new DiceError('network', codeText, { cause: error });
  }
  return new DiceError('unknown', codeText, { cause: error });
}

export type ReportDiceOptions = {
  action: string;
  /** Falso quando a própria tela (janela, formulário) mostra a frase devolvida. */
  toast?: boolean;
  /** Próximo passo sugerido, mostrado junto do aviso. */
  hint?: string;
};

/** Registra a falha (com o código, sem dado pessoal) e devolve a frase amigável. */
export function reportDiceFailure(
  error: unknown,
  { action, toast = true, hint }: ReportDiceOptions,
): string {
  const diceError = toDiceError(error);
  reportError(error, {
    userMessage: diceError.message,
    hint,
    context: { feature: 'dice', action, kind: diceError.kind, code: diceError.code },
    severity: diceError.kind === 'unknown' ? 'error' : 'warn',
    toast,
  });
  return diceError.message;
}
