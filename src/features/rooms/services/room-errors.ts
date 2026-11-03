import { classifySupabaseError, type SupabaseErrorTable } from '@/lib/supabase-error';

/** Falhas das mesas em categorias que a tela sabe explicar. O detalhe técnico vai para o log. */
export type RoomErrorKind = 'not-found' | 'forbidden' | 'invalid' | 'network' | 'unknown';

export const ROOM_ERROR_MESSAGES: Record<RoomErrorKind, string> = {
  'not-found': 'Mesa não encontrada. Confira o link ou peça um novo ao mestre.',
  forbidden: 'Você não tem permissão para fazer isso nesta mesa.',
  invalid: 'Algum dado não foi aceito. Confira o que digitou.',
  network: 'Sem conexão com o servidor. Confira sua internet e tente de novo.',
  unknown: 'Não deu para concluir agora. Tente de novo em instantes.',
};

const ERROR_TABLE: SupabaseErrorTable<RoomErrorKind> = {
  byPostgresCode: {
    '42501': 'forbidden',
    P0002: 'not-found',
    PGRST116: 'not-found',
    '22023': 'invalid',
    '23502': 'invalid',
    '23514': 'invalid',
  },
  network: 'network',
};

export class RoomError extends Error {
  readonly kind: RoomErrorKind;
  /** Código original, para o log. */
  readonly code: string | null;

  constructor(kind: RoomErrorKind, code: string | null, options?: { cause?: unknown }) {
    super(ROOM_ERROR_MESSAGES[kind], options);
    this.name = 'RoomError';
    this.kind = kind;
    this.code = code;
  }
}

export function toRoomError(error: unknown): RoomError {
  if (error instanceof RoomError) return error;
  const { kind, code } = classifySupabaseError(error, ERROR_TABLE, 'unknown');
  return new RoomError(kind, code, { cause: error });
}

export function roomErrorMessage(error: unknown): string {
  return toRoomError(error).message;
}
