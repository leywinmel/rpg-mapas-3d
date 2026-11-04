import { create } from 'zustand';
import type { TieMove } from '@/domain';
import type {
  InitiativeBoard,
  InitiativeItem,
  InitiativePatch,
  NewInitiativeEntry,
} from '../types';

export type InitiativeStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * O que fala com o banco e o canal; o InitiativeSync monta para a mesa aberta. Cada uma avisa a
 * falha (log e aviso na tela) e devolve se deu certo, para o painel limpar o formulário só então.
 */
export type InitiativeActions = {
  add: (entries: readonly NewInitiativeEntry[]) => Promise<boolean>;
  update: (entry: InitiativeItem, patch: InitiativePatch) => Promise<boolean>;
  moveTie: (entry: InitiativeItem, move: TieMove) => Promise<boolean>;
  remove: (entry: InitiativeItem) => Promise<boolean>;
  next: () => Promise<boolean>;
  previous: () => Promise<boolean>;
  /** Encerra o combate; lança a falha (a janela de confirmação a mostra). */
  clear: () => Promise<void>;
  reload: () => void;
};

type InitiativeState = {
  status: InitiativeStatus;
  error: unknown;
  board: InitiativeBoard;
  actions: InitiativeActions | null;
};

type InitiativeMutations = {
  setLoading: () => void;
  setBoard: (board: InitiativeBoard) => void;
  setFailed: (error: unknown) => void;
  setActions: (actions: InitiativeActions | null) => void;
  reset: () => void;
};

const EMPTY_BOARD: InitiativeBoard = { entries: [], round: 0 };

const INITIAL: InitiativeState = {
  status: 'idle',
  error: null,
  board: EMPTY_BOARD,
  actions: null,
};

/** A ordem da mesa. Fora do React: o painel e a cena (o destaque do token da vez) leem o mesmo. */
export const useInitiativeStore = create<InitiativeState & InitiativeMutations>()((set) => ({
  ...INITIAL,
  // Releitura com a lista já na tela não volta a "carregando" (a lista não pisca).
  setLoading: () => set((state) => ({ status: state.status === 'ready' ? 'ready' : 'loading' })),
  setBoard: (board) => set({ board, status: 'ready', error: null }),
  setFailed: (error) => set({ status: 'error', error }),
  setActions: (actions) => set({ actions }),
  reset: () => set(INITIAL),
}));

/** Token da vez (para o destaque no mapa); nulo sem combate ou com uma entrada livre na vez. */
export function useCurrentTokenId(): string | null {
  return useInitiativeStore(
    (state) => state.board.entries.find((entry) => entry.isCurrent)?.tokenId ?? null,
  );
}
