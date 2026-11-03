/**
 * Leitura comum dos erros que o Supabase devolve (Postgres/PostgREST, Storage e rede).
 * Cada feature entrega a sua tabela de códigos e fica com as próprias mensagens.
 */

/** O que o banco, o Storage e o fetch põem no erro; nada disso é garantido, por isso `unknown`. */
type ErrorLike = { code?: unknown; statusCode?: unknown; message?: unknown };

/** O fetch fala de falha de rede com textos diferentes em cada navegador. */
const NETWORK_FAILURE_MARKERS = ['failed to fetch', 'networkerror', 'load failed', 'fetch failed'];

export type FailureDetails = {
  postgresCode: string | null;
  /** O Storage responde com o status HTTP em `statusCode`. */
  storageStatus: string | null;
  message: string;
};

export type SupabaseErrorTable<Kind extends string> = {
  /** Códigos do Postgres/PostgREST que as regras do banco da feature usam (ver migrations). */
  byPostgresCode: Readonly<Record<string, Kind>>;
  byStorageStatus?: Readonly<Record<string, Kind>>;
  /** A categoria de "sem conexão" da feature. */
  network: Kind;
  /** Ajuste fino da categoria achada pelo código, olhando a mensagem (ex: qual tabela recusou). */
  refine?: (kind: Kind, details: FailureDetails) => Kind;
};

export type ClassifiedFailure<Kind extends string> = {
  kind: Kind;
  /** Código original (do banco ou status do Storage), para o log. */
  code: string | null;
};

function asText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function readFailureDetails(error: unknown): FailureDetails {
  const { code, statusCode, message } = (
    error && typeof error === 'object' ? error : {}
  ) as ErrorLike;
  return {
    postgresCode: asText(code),
    storageStatus: asText(statusCode),
    message: asText(message) ?? '',
  };
}

export function isNetworkFailure(message: string): boolean {
  const lowered = message.toLowerCase();
  return NETWORK_FAILURE_MARKERS.some((marker) => lowered.includes(marker));
}

/**
 * Traduz um erro do Supabase para a categoria da feature: Storage, depois código do
 * Postgres, depois falha de rede. `fallback` vale quando nada reconhece o erro.
 */
export function classifySupabaseError<Kind extends string>(
  error: unknown,
  table: SupabaseErrorTable<Kind>,
  fallback: Kind,
): ClassifiedFailure<Kind> {
  const details = readFailureDetails(error);
  const { postgresCode, storageStatus, message } = details;

  const storageKind = storageStatus ? table.byStorageStatus?.[storageStatus] : undefined;
  if (storageKind) return { kind: storageKind, code: storageStatus };

  const postgresKind = postgresCode ? table.byPostgresCode[postgresCode] : undefined;
  if (postgresKind)
    return { kind: table.refine?.(postgresKind, details) ?? postgresKind, code: postgresCode };

  const code = postgresCode ?? storageStatus;
  if (isNetworkFailure(message)) return { kind: table.network, code };
  return { kind: fallback, code };
}
