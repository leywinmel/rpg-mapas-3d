import { LAST_SEEN_STORAGE_PREFIX } from '../constants';
import { logger } from '@/lib/logger';

/** O pedaço do localStorage que a "última vista" usa (trocável nos testes). */
export type LastSeenStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function lastSeenKey(userId: string, roomId: string): string {
  return `${LAST_SEEN_STORAGE_PREFIX}:${userId}:${roomId}`;
}

/**
 * O localStorage existe, mas só o acesso já pode lançar erro (cookies bloqueados, janela
 * privada de alguns navegadores). Nulo = sem armazenamento: o contador vale só na sessão.
 */
export function browserStorage(): LastSeenStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function warnStorageUnavailable(error: unknown): void {
  logger.debug('Sem armazenamento local: a última leitura das anotações vale só nesta sessão.', {
    feature: 'notes',
    reason: error instanceof Error ? error.name : 'unknown',
  });
}

/** Momento (ISO) da anotação mais nova que a pessoa já viu nesta mesa; nulo se nunca ou sem armazenamento. */
export function readLastSeen(
  storage: LastSeenStorage | null,
  userId: string,
  roomId: string,
): string | null {
  if (!storage) return null;
  try {
    const stored = storage.getItem(lastSeenKey(userId, roomId));
    // Valor corrompido (editado à mão, versão antiga) conta como "nunca viu".
    return stored !== null && Number.isFinite(Date.parse(stored)) ? stored : null;
  } catch (error) {
    warnStorageUnavailable(error);
    return null;
  }
}

export function writeLastSeen(
  storage: LastSeenStorage | null,
  userId: string,
  roomId: string,
  seenAt: string,
): void {
  if (!storage) return;
  try {
    storage.setItem(lastSeenKey(userId, roomId), seenAt);
  } catch (error) {
    warnStorageUnavailable(error);
  }
}
