/**
 * Como cada pessoa prefere ver os tokens na cena, guardado no navegador dela (pedido de 11/11:
 * "dá a opção de tirar a base deles ou manter na visão"). É só a vista de quem escolhe: os
 * outros da mesa continuam vendo do jeito deles. Fica fora do store dos tokens porque aquele
 * zera ao trocar de mapa, e a preferência vale para todas as mesas.
 */
import { create } from 'zustand';
import { logger } from '@/lib/logger';

export const TOKEN_BASES_STORAGE_KEY = 'rpgmaps.token-bases';
const HIDDEN_VALUE = 'hidden';
const SHOWN_VALUE = 'shown';

/** O pedaço do localStorage que a preferência usa (trocável nos testes). */
export type TokenViewStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Só o acesso ao localStorage já pode lançar erro (janela privada, cookies bloqueados). */
function browserStorage(): TokenViewStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function logStorageProblem(action: string, error: unknown): void {
  // Sem armazenamento a escolha vale só nesta aba: nada a avisar na tela.
  logger.debug('Sem armazenamento local para a vista dos tokens.', {
    feature: 'tokens',
    action,
    reason: error instanceof Error ? error.name : 'unknown',
  });
}

/** A base aparece por padrão; só um "escondida" salvo de propósito a tira. */
export function readShowBases(storage: TokenViewStorage | null): boolean {
  if (!storage) return true;
  try {
    return storage.getItem(TOKEN_BASES_STORAGE_KEY) !== HIDDEN_VALUE;
  } catch (error) {
    logStorageProblem('read-token-bases', error);
    return true;
  }
}

export function writeShowBases(storage: TokenViewStorage | null, show: boolean): void {
  if (!storage) return;
  try {
    storage.setItem(TOKEN_BASES_STORAGE_KEY, show ? SHOWN_VALUE : HIDDEN_VALUE);
  } catch (error) {
    logStorageProblem('write-token-bases', error);
  }
}

type TokenViewState = {
  /** A base redonda escura embaixo de cada token aparece? */
  showBases: boolean;
  toggleBases: () => void;
};

export const useTokenViewStore = create<TokenViewState>((set, get) => ({
  showBases: readShowBases(browserStorage()),
  toggleBases: () => {
    const showBases = !get().showBases;
    writeShowBases(browserStorage(), showBases);
    set({ showBases });
  },
}));
