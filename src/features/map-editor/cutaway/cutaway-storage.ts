/**
 * O corte de andares que o mestre olha sozinho, guardado no navegador dele, um por mesa: no
 * mesmo navegador, uma mesa com prédios altos não muda a vista de outra. O andar que os jogadores
 * veem fica no banco (rooms.cutaway_lock); aqui fica só a vista pessoal do mestre.
 */
import { isValidCutaway, NO_CUTAWAY, type Cutaway } from '@/domain/map-v2';
import { logger } from '@/lib/logger';

const STORAGE_PREFIX = 'rpgmaps.cutaway.';

/** O pedaço do localStorage que o corte usa (trocável nos testes). */
export type CutawayStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function cutawayStorageKey(roomId: string): string {
  return `${STORAGE_PREFIX}${roomId}`;
}

/** Só o acesso ao localStorage já pode lançar erro (janela privada, cookies bloqueados). */
export function browserCutawayStorage(): CutawayStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function logStorageProblem(action: string, error: unknown): void {
  // Sem armazenamento o corte vale só nesta aba: nada a avisar na tela.
  logger.debug('Sem armazenamento local para o corte de andares.', {
    feature: 'map-editor',
    action,
    reason: error instanceof Error ? error.name : 'unknown',
  });
}

/** O corte salvo; valor estranho (editado à mão, versão antiga) vale "sem corte". */
export function readOwnCutaway(storage: CutawayStorage | null, roomId: string): Cutaway {
  if (!storage) return NO_CUTAWAY;
  try {
    const saved = storage.getItem(cutawayStorageKey(roomId));
    if (saved === null) return NO_CUTAWAY;
    const value: unknown = JSON.parse(saved);
    return isValidCutaway(value) ? value : NO_CUTAWAY;
  } catch (error) {
    logStorageProblem('read-cutaway', error);
    return NO_CUTAWAY;
  }
}

export function writeOwnCutaway(
  storage: CutawayStorage | null,
  roomId: string,
  cut: Cutaway,
): void {
  if (!storage) return;
  try {
    storage.setItem(cutawayStorageKey(roomId), JSON.stringify(cut));
  } catch (error) {
    logStorageProblem('write-cutaway', error);
  }
}
