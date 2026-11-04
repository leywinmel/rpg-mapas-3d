import { createFailureReporter } from '@/lib/report-feature-failure';
import { classifySupabaseError, type SupabaseErrorTable } from '@/lib/supabase-error';

export type FogErrorKind = 'forbidden' | 'needs-save' | 'network' | 'unknown';

export const FOG_ERROR_MESSAGES: Record<FogErrorKind, string> = {
  forbidden: 'Só o mestre da mesa pode mexer na névoa.',
  'needs-save': 'Salve o mapa no editor antes de usar a névoa.',
  network: 'Sem conexão com o servidor. Confira sua internet e tente de novo.',
  unknown: 'Não deu para concluir agora. Tente de novo em instantes.',
};

const ERROR_TABLE: SupabaseErrorTable<FogErrorKind> = {
  byPostgresCode: { '42501': 'forbidden', '22023': 'needs-save' },
  network: 'network',
};

export class FogError extends Error {
  readonly kind: FogErrorKind;
  readonly code: string | null;

  constructor(kind: FogErrorKind, code: string | null, options?: { cause?: unknown }) {
    super(FOG_ERROR_MESSAGES[kind], options);
    this.name = 'FogError';
    this.kind = kind;
    this.code = code;
  }
}

export function toFogError(error: unknown): FogError {
  if (error instanceof FogError) return error;
  const { kind, code } = classifySupabaseError(error, ERROR_TABLE, 'unknown');
  return new FogError(kind, code, { cause: error });
}

export const fogFailures = createFailureReporter('fog', (error) => {
  const failure = toFogError(error);
  return { message: failure.message, kind: failure.kind, code: failure.code };
});
