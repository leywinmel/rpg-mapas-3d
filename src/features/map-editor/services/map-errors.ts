import { ZodError } from 'zod';
import { reportError } from '@/lib/report-error';

/** Falhas do mapa em categorias que a tela sabe explicar. O detalhe técnico vai para o log. */
export type MapErrorKind =
  | 'forbidden'
  | 'invalid'
  | 'too-large'
  | 'not-found'
  | 'unreadable'
  | 'session'
  | 'network'
  | 'unknown';

export const MAP_ERROR_MESSAGES: Record<MapErrorKind, string> = {
  forbidden: 'Só o mestre da mesa pode editar este mapa.',
  invalid: 'O mapa tem algo que não foi aceito, e a mudança não foi gravada.',
  'too-large': 'Uma parte do mapa ficou grande demais para gravar. Tire algumas peças ou paredes.',
  'not-found': 'Esse mapa não existe mais.',
  unreadable: 'Este mapa está num formato que não reconhecemos.',
  session: 'Sessão expirada: entre de novo para continuar.',
  network: 'Sem conexão com o servidor. Confira sua internet e tente de novo.',
  unknown: 'Não deu para concluir agora. Tente de novo em instantes.',
};

/** Códigos do Postgres/PostgREST que as regras do mapa usam (ver migrations). */
const KIND_BY_CODE: Record<string, MapErrorKind> = {
  '42501': 'forbidden',
  '22023': 'invalid',
  '22P02': 'invalid',
  '23502': 'invalid',
  '23514': 'invalid',
  // "ON CONFLICT DO UPDATE" com o mesmo pedaço duas vezes na mesma gravação.
  '21000': 'invalid',
  PGRST116: 'not-found',
};

/** Restrições de tamanho do banco: viram "grande demais", e não um "não aceito" genérico. */
const SIZE_CONSTRAINTS = ['map_chunks_document_size', 'maps_document_size'];
const NETWORK_FAILURE_MARKERS = ['failed to fetch', 'networkerror', 'load failed', 'fetch failed'];

export class MapError extends Error {
  readonly kind: MapErrorKind;
  /** Código original, para o log. */
  readonly code: string | null;

  constructor(kind: MapErrorKind, code: string | null, options?: { cause?: unknown }) {
    super(MAP_ERROR_MESSAGES[kind], options);
    this.name = 'MapError';
    this.kind = kind;
    this.code = code;
  }
}

type PostgrestLike = { code?: unknown; message?: unknown };

function kindOfCode(code: string, message: string): MapErrorKind | undefined {
  const kind = KIND_BY_CODE[code];
  if (kind !== 'invalid') return kind;
  return SIZE_CONSTRAINTS.some((name) => message.includes(name)) ? 'too-large' : kind;
}

/** Traduz o erro do Supabase (ou de validação) para uma categoria que a tela explica. */
export function toMapError(error: unknown): MapError {
  if (error instanceof MapError) return error;
  if (error instanceof ZodError) return new MapError('invalid', null, { cause: error });
  const { code, message } = (error && typeof error === 'object' ? error : {}) as PostgrestLike;
  const codeText = typeof code === 'string' ? code : null;
  const messageText = typeof message === 'string' ? message : '';
  const kindFromCode = codeText ? kindOfCode(codeText, messageText) : undefined;
  if (kindFromCode) return new MapError(kindFromCode, codeText, { cause: error });
  const lowered = messageText.toLowerCase();
  if (NETWORK_FAILURE_MARKERS.some((marker) => lowered.includes(marker))) {
    return new MapError('network', codeText, { cause: error });
  }
  return new MapError('unknown', codeText, { cause: error });
}

export type ReportMapOptions = {
  action: string;
  mapId?: string;
  /** Falso quando a própria tela (janela, painel) mostra a frase devolvida. */
  toast?: boolean;
};

/** Registra a falha (com o código, sem dado pessoal) e devolve a frase amigável. */
export function reportMapFailure(
  error: unknown,
  { action, mapId, toast = true }: ReportMapOptions,
) {
  const mapError = toMapError(error);
  reportError(error, {
    userMessage: mapError.message,
    context: { feature: 'map-editor', action, mapId, kind: mapError.kind, code: mapError.code },
    severity: mapError.kind === 'unknown' ? 'error' : 'warn',
    toast,
  });
  return mapError.message;
}
