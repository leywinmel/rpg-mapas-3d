import { createFailureReporter } from '@/lib/report-feature-failure';
import { classifySupabaseError, type SupabaseErrorTable } from '@/lib/supabase-error';
import { TOKEN_IMAGE_MAX_MEGABYTES } from '../constants';

/** Falhas dos tokens em categorias que a tela sabe explicar. O detalhe técnico vai para o log. */
export type TokenErrorKind =
  | 'forbidden'
  | 'invalid'
  | 'not-found'
  | 'network'
  | 'session'
  | 'image-too-large'
  | 'image-type'
  | 'image-upload'
  | 'model-upload'
  | 'unknown';

export const TOKEN_ERROR_MESSAGES: Record<TokenErrorKind, string> = {
  forbidden: 'Você só pode mexer nos seus tokens. O mestre mexe em todos.',
  invalid: 'Alguma informação não foi aceita. O token precisa caber no mapa e o dono ser da mesa.',
  'not-found': 'Esse token não existe mais.',
  network: 'Sem conexão com o servidor. Confira sua internet e tente de novo.',
  session: 'Sua sessão expirou. Entre de novo para continuar.',
  'image-too-large': `A imagem passa de ${TOKEN_IMAGE_MAX_MEGABYTES} MB. Escolha uma menor.`,
  'image-type': 'Use uma imagem PNG, JPEG ou WebP.',
  'image-upload': 'Não deu para enviar a imagem. Tente de novo.',
  'model-upload': 'Não deu para enviar o modelo. Tente de novo.',
  unknown: 'Não deu para concluir agora. Tente de novo em instantes.',
};

const ERROR_TABLE: SupabaseErrorTable<TokenErrorKind> = {
  byPostgresCode: {
    '42501': 'forbidden',
    '22023': 'invalid',
    '22P02': 'invalid',
    '23502': 'invalid',
    '23503': 'invalid',
    '23514': 'invalid',
    PGRST116: 'not-found',
  },
  byStorageStatus: {
    '401': 'forbidden',
    '403': 'forbidden',
    '413': 'image-too-large',
    '415': 'image-type',
  },
  network: 'network',
};

export class TokenError extends Error {
  readonly kind: TokenErrorKind;
  readonly code: string | null;

  constructor(kind: TokenErrorKind, code: string | null, options?: { cause?: unknown }) {
    super(TOKEN_ERROR_MESSAGES[kind], options);
    this.name = 'TokenError';
    this.kind = kind;
    this.code = code;
  }
}

export function toTokenError(error: unknown, fallback: TokenErrorKind = 'unknown'): TokenError {
  if (error instanceof TokenError) return error;
  const { kind, code } = classifySupabaseError(error, ERROR_TABLE, fallback);
  return new TokenError(kind, code, { cause: error });
}

export const tokenFailures = createFailureReporter('tokens', (error) => {
  const failure = toTokenError(error);
  return { message: failure.message, kind: failure.kind, code: failure.code };
});
