import { ZodError } from 'zod';
import { createFailureReporter } from '@/lib/report-feature-failure';
import { classifySupabaseError, type SupabaseErrorTable } from '@/lib/supabase-error';

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

const SIZE_CONSTRAINTS = ['map_chunks_document_size', 'maps_document_size'];

/** Códigos do Postgres/PostgREST que as regras do mapa usam (ver migrations). */
const ERROR_TABLE: SupabaseErrorTable<MapErrorKind> = {
  byPostgresCode: {
    '42501': 'forbidden',
    '22023': 'invalid',
    '22P02': 'invalid',
    '23502': 'invalid',
    '23514': 'invalid',
    // "ON CONFLICT DO UPDATE" com o mesmo pedaço duas vezes na mesma gravação.
    '21000': 'invalid',
    PGRST116: 'not-found',
  },
  network: 'network',
  // Restrições de tamanho do banco viram "grande demais", e não um "não aceito" genérico.
  refine: (kind, { message }) =>
    kind === 'invalid' && SIZE_CONSTRAINTS.some((name) => message.includes(name))
      ? 'too-large'
      : kind,
};

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

/** Traduz o erro do Supabase (ou de validação) para uma categoria que a tela explica. */
export function toMapError(error: unknown): MapError {
  if (error instanceof MapError) return error;
  if (error instanceof ZodError) return new MapError('invalid', null, { cause: error });
  const { kind, code } = classifySupabaseError(error, ERROR_TABLE, 'unknown');
  return new MapError(kind, code, { cause: error });
}

export type ReportMapOptions = { action: string; mapId?: string; toast?: boolean };

// O mapa avisa no canto por padrão: o autosave roda sem formulário para mostrar a frase.
const reporter = createFailureReporter('map-editor', toMapError, { toastByDefault: true });

/** Registra a falha (com o código, sem dado pessoal) e devolve a frase amigável. */
export function reportMapFailure(error: unknown, { mapId, ...options }: ReportMapOptions) {
  return reporter.report(error, { ...options, context: { mapId } });
}
