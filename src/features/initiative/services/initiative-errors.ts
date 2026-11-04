import { INITIATIVE_VALUE_MAX, INITIATIVE_VALUE_MIN } from '@/domain';
import { createFailureReporter } from '@/lib/report-feature-failure';
import { classifySupabaseError, type SupabaseErrorTable } from '@/lib/supabase-error';

/** Falhas da ordem de iniciativa em categorias que a tela sabe explicar. O detalhe vai para o log. */
export type InitiativeErrorKind =
  'forbidden' | 'invalid' | 'duplicate' | 'network' | 'session' | 'unknown';

export const INITIATIVE_ERROR_MESSAGES: Record<InitiativeErrorKind, string> = {
  forbidden: 'Só o mestre monta a ordem. Você muda apenas o valor da sua entrada.',
  invalid: `Esse valor não foi aceito. Use um número inteiro entre ${INITIATIVE_VALUE_MIN} e ${INITIATIVE_VALUE_MAX}.`,
  duplicate: 'Esse token já está na ordem.',
  network: 'Sem conexão com o servidor. Confira sua internet e tente de novo.',
  session: 'Sua sessão expirou. Entre de novo para continuar.',
  unknown: 'Não deu para concluir agora. Tente de novo em instantes.',
};

const ERROR_TABLE: SupabaseErrorTable<InitiativeErrorKind> = {
  byPostgresCode: {
    '42501': 'forbidden',
    '22023': 'invalid',
    '22P02': 'invalid',
    '23502': 'invalid',
    '23503': 'invalid',
    '23514': 'invalid',
    '23505': 'duplicate',
  },
  network: 'network',
};

export class InitiativeError extends Error {
  readonly kind: InitiativeErrorKind;
  readonly code: string | null;

  constructor(kind: InitiativeErrorKind, code: string | null, options?: { cause?: unknown }) {
    super(INITIATIVE_ERROR_MESSAGES[kind], options);
    this.name = 'InitiativeError';
    this.kind = kind;
    this.code = code;
  }
}

export function toInitiativeError(error: unknown): InitiativeError {
  if (error instanceof InitiativeError) return error;
  const { kind, code } = classifySupabaseError(error, ERROR_TABLE, 'unknown');
  return new InitiativeError(kind, code, { cause: error });
}

export const initiativeFailures = createFailureReporter('initiative', (error) => {
  const failure = toInitiativeError(error);
  return { message: failure.message, kind: failure.kind, code: failure.code };
});
