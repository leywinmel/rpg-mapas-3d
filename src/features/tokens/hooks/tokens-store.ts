import { create } from 'zustand';
import type { Cell } from '@/domain';
import type { PieceMovedMessage } from '@/domain/map-v2';
import type { MapView } from '@/features/map-editor';
import type { NewTokenInput, Token, TokenPatch } from '../types';

/** O mapa que está na tela agora (o do editor do mestre ou o da mesa, para o jogador). */
export type TableView = MapView;

export type TokensStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Novo token sem o mapa e o lugar: o provider põe no mapa aberto, perto do centro da câmera. */
export type NewTokenDraft = Omit<NewTokenInput, 'mapId' | 'x' | 'z' | 'level'>;

/** Ações que falam com o banco e o canal; o TokensSync as monta para a mesa aberta. */
export type TokenActions = {
  createToken: (draft: NewTokenDraft) => Promise<Token>;
  updateToken: (token: Token, patch: TokenPatch) => Promise<void>;
  deleteToken: (token: Token) => Promise<void>;
  /** Arraste em andamento: avisa os outros (só se o token estiver à vista deles). */
  dragToken: (token: Token, anchor: Cell) => void;
  /** Soltou: grava a casa nova; o andar acompanha o chão. */
  dropToken: (token: Token, anchor: Cell) => Promise<void>;
  /** Avisa a mesa que o mestre moveu um carro ou objeto solto (quem chama já conferiu a névoa). */
  announcePieceMoved: (message: PieceMovedMessage) => void;
  getImageUrl: (path: string) => Promise<string>;
  reload: () => void;
};

type TokensState = {
  view: TableView | null;
  status: TokensStatus;
  error: unknown;
  tokens: readonly Token[];
  /** Onde estão os tokens que outra pessoa arrasta agora (antes de ela soltar). */
  remoteDrags: Readonly<Record<string, Cell>>;
  selectedId: string | null;
  actions: TokenActions | null;
  /** A área está toda sob a névoa? A névoa registra; sem ela, nada está coberto. */
  fogCovers: ((anchor: Cell, size: number) => boolean) | null;
};

type TokensMutations = {
  setView: (view: TableView | null) => void;
  setLoading: () => void;
  setFailed: (error: unknown) => void;
  setTokens: (tokens: readonly Token[]) => void;
  upsertToken: (token: Token) => void;
  removeToken: (tokenId: string) => void;
  setRemoteDrag: (tokenId: string, cell: Cell | null) => void;
  select: (tokenId: string | null) => void;
  setActions: (actions: TokenActions | null) => void;
  setFogCovers: (fogCovers: ((anchor: Cell, size: number) => boolean) | null) => void;
  reset: () => void;
};

const INITIAL: TokensState = {
  view: null,
  status: 'idle',
  error: null,
  tokens: [],
  remoteDrags: {},
  selectedId: null,
  actions: null,
  fogCovers: null,
};

function withoutKey<T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const next = { ...record };
  delete next[key];
  return next;
}

/**
 * Tokens do mapa aberto. Fica fora do React para a cena (dentro do Canvas) e o painel da barra
 * lerem o mesmo estado sem um provider em volta dos dois.
 */
export const useTokensStore = create<TokensState & TokensMutations>()((set) => ({
  ...INITIAL,
  setView: (view) =>
    set((state) => {
      // Mesmo mapa com o modelo editado: só troca o modelo (a lista de tokens continua valendo).
      if (view && state.view?.mapId === view.mapId) return { view };
      return { view, tokens: [], remoteDrags: {}, selectedId: null, status: 'idle', error: null };
    }),
  setLoading: () => set((state) => ({ status: state.status === 'ready' ? 'ready' : 'loading' })),
  setFailed: (error) => set({ status: 'error', error }),
  setTokens: (tokens) =>
    set((state) => ({
      tokens,
      status: 'ready',
      error: null,
      selectedId: tokens.some((token) => token.id === state.selectedId) ? state.selectedId : null,
    })),
  upsertToken: (token) =>
    set((state) => {
      if (state.view?.mapId !== token.mapId) return {};
      const exists = state.tokens.some((item) => item.id === token.id);
      return {
        tokens: exists
          ? state.tokens.map((item) => (item.id === token.id ? token : item))
          : [...state.tokens, token],
        remoteDrags: withoutKey(state.remoteDrags, token.id),
      };
    }),
  removeToken: (tokenId) =>
    set((state) => ({
      tokens: state.tokens.filter((token) => token.id !== tokenId),
      remoteDrags: withoutKey(state.remoteDrags, tokenId),
      selectedId: state.selectedId === tokenId ? null : state.selectedId,
    })),
  setRemoteDrag: (tokenId, cell) =>
    set((state) => ({
      remoteDrags: cell
        ? { ...state.remoteDrags, [tokenId]: cell }
        : withoutKey(state.remoteDrags, tokenId),
    })),
  select: (selectedId) => set({ selectedId }),
  setActions: (actions) => set({ actions }),
  setFogCovers: (fogCovers) => set({ fogCovers }),
  reset: () => set(INITIAL),
}));

export function useSelectedToken(): Token | null {
  return useTokensStore(
    (state) => state.tokens.find((token) => token.id === state.selectedId) ?? null,
  );
}

/** Ações dos tokens; nulas só no instante antes do TokensSync montar. */
export function useTokenActions(): TokenActions | null {
  return useTokensStore((state) => state.actions);
}
