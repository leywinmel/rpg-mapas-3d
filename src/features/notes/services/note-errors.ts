import { NOTE_IMAGE_MAX_MEGABYTES } from '../constants';

/** Falhas das anotações em categorias que a tela sabe explicar. O detalhe técnico vai para o log. */
export type NoteErrorKind =
  | 'forbidden'
  | 'invalid'
  | 'not-found'
  | 'recipient'
  | 'network'
  | 'image-too-large'
  | 'image-type'
  | 'image-upload'
  | 'image-url'
  | 'unknown';

export const NOTE_ERROR_MESSAGES: Record<NoteErrorKind, string> = {
  forbidden: 'Só o mestre da mesa pode enviar, editar ou apagar anotações.',
  invalid: 'Alguma informação não foi aceita. Confira o título, o texto e os destinatários.',
  'not-found': 'Essa anotação não existe mais.',
  recipient: 'Um dos jogadores escolhidos saiu da mesa. Escolha os destinatários de novo.',
  network: 'Sem conexão com o servidor. Confira sua internet e tente de novo.',
  'image-too-large': `A imagem passa de ${NOTE_IMAGE_MAX_MEGABYTES} MB. Escolha uma menor.`,
  'image-type': 'Use uma imagem PNG, JPEG ou WebP.',
  'image-upload': 'Não deu para enviar a imagem. Tente de novo.',
  'image-url': 'Não deu para carregar a imagem.',
  unknown: 'Não deu para concluir agora. Tente de novo em instantes.',
};

/** Códigos do Postgres/PostgREST que o banco usa nas anotações (ver migrations). */
const KIND_BY_POSTGRES_CODE: Record<string, NoteErrorKind> = {
  '42501': 'forbidden',
  '22023': 'invalid',
  '22P02': 'invalid',
  '23502': 'invalid',
  '23514': 'invalid',
  PGRST116: 'not-found',
};

/** O Storage responde com o status HTTP em `statusCode`. */
const KIND_BY_STORAGE_STATUS: Record<string, NoteErrorKind> = {
  '401': 'forbidden',
  '403': 'forbidden',
  '413': 'image-too-large',
  '415': 'image-type',
};

const NETWORK_FAILURE_MARKERS = ['failed to fetch', 'networkerror', 'load failed', 'fetch failed'];
const RECIPIENTS_TABLE = 'note_recipients';

export class NoteError extends Error {
  readonly kind: NoteErrorKind;
  /** Código original, para o log. */
  readonly code: string | null;

  constructor(kind: NoteErrorKind, code: string | null, options?: { cause?: unknown }) {
    super(NOTE_ERROR_MESSAGES[kind], options);
    this.name = 'NoteError';
    this.kind = kind;
    this.code = code;
  }
}

type ErrorLike = { code?: unknown; statusCode?: unknown; message?: unknown };

function asText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function kindOfPostgresCode(code: string, message: string): NoteErrorKind | null {
  const kind = KIND_BY_POSTGRES_CODE[code];
  if (!kind) return null;
  // A política de note_recipients é a que recusa quem não é mais membro da mesa.
  if (kind === 'forbidden' && message.includes(RECIPIENTS_TABLE)) return 'recipient';
  return kind;
}

/**
 * Traduz o erro do Supabase (banco ou Storage) para uma categoria. `fallback` é o que
 * vale quando nada reconhece o erro: o envio da imagem pede 'image-upload', por exemplo.
 */
export function toNoteError(error: unknown, fallback: NoteErrorKind = 'unknown'): NoteError {
  if (error instanceof NoteError) return error;
  const { code, statusCode, message } = (
    error && typeof error === 'object' ? error : {}
  ) as ErrorLike;
  const messageText = asText(message) ?? '';
  const storageStatus = asText(statusCode);
  const postgresCode = asText(code);

  const storageKind = storageStatus ? KIND_BY_STORAGE_STATUS[storageStatus] : undefined;
  if (storageKind) return new NoteError(storageKind, storageStatus, { cause: error });

  const postgresKind = postgresCode ? kindOfPostgresCode(postgresCode, messageText) : null;
  if (postgresKind) return new NoteError(postgresKind, postgresCode, { cause: error });

  const lowered = messageText.toLowerCase();
  if (NETWORK_FAILURE_MARKERS.some((marker) => lowered.includes(marker))) {
    return new NoteError('network', postgresCode ?? storageStatus, { cause: error });
  }
  return new NoteError(fallback, postgresCode ?? storageStatus, { cause: error });
}

export function noteErrorMessage(error: unknown): string {
  return toNoteError(error).message;
}
