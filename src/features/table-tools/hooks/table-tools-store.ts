import { create } from 'zustand';
import type { Cell } from '@/domain';
import { MAX_VISIBLE_PINGS } from '../constants';

/** Ferramenta ligada no mapa: o clique esquerdo mede, marca ou fica com o mapa (nenhuma). */
export type TableTool = 'none' | 'ruler' | 'ping';

export type RulerLine = { readonly from: Cell; readonly to: Cell };

/** Régua que outra pessoa está mostrando à mesa. */
export type SharedRuler = RulerLine & { readonly userId: string; readonly mapId: string };

export type Ping = {
  readonly id: string;
  readonly userId: string;
  readonly mapId: string;
  readonly cell: Cell;
};

/** O que fala com o canal; o TableToolsSync monta para a mesa aberta. */
export type TableToolsActions = {
  ping: (cell: Cell) => void;
};

type TableToolsState = {
  tool: TableTool;
  /** A régua desta pessoa aparece ao vivo para a mesa. */
  shareRuler: boolean;
  /** Régua desta pessoa (fica na tela depois de soltar, até começar outra ou desligar). */
  ruler: RulerLine | null;
  measuring: boolean;
  sharedRulers: Readonly<Record<string, SharedRuler>>;
  pings: readonly Ping[];
  actions: TableToolsActions | null;
};

type TableToolsMutations = {
  setTool: (tool: TableTool) => void;
  toggleTool: (tool: Exclude<TableTool, 'none'>) => void;
  setShareRuler: (share: boolean) => void;
  startRuler: (cell: Cell) => void;
  moveRuler: (cell: Cell) => void;
  endRuler: () => void;
  clearRuler: () => void;
  putSharedRuler: (ruler: SharedRuler) => void;
  dropSharedRuler: (userId: string) => void;
  addPing: (ping: Ping) => void;
  removePing: (id: string) => void;
  setActions: (actions: TableToolsActions | null) => void;
  reset: () => void;
};

const INITIAL: TableToolsState = {
  tool: 'none',
  shareRuler: false,
  ruler: null,
  measuring: false,
  sharedRulers: {},
  pings: [],
  actions: null,
};

function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.z === b.z;
}

/**
 * Régua e ping da mesa. Fora do React, como os tokens: a cena (dentro do Canvas) e a barra da
 * sala leem o mesmo estado.
 */
export const useTableToolsStore = create<TableToolsState & TableToolsMutations>()((set) => ({
  ...INITIAL,
  // Trocar de ferramenta apaga a régua: ela é da ferramenta, não do mapa.
  setTool: (tool) =>
    set((state) =>
      tool === state.tool
        ? {}
        : { tool, ruler: tool === 'ruler' ? state.ruler : null, measuring: false },
    ),
  toggleTool: (tool) =>
    set((state) => {
      const next = state.tool === tool ? 'none' : tool;
      return { tool: next, ruler: next === 'ruler' ? state.ruler : null, measuring: false };
    }),
  setShareRuler: (shareRuler) => set({ shareRuler }),
  startRuler: (cell) => set({ ruler: { from: cell, to: cell }, measuring: true }),
  moveRuler: (cell) =>
    set((state) => {
      if (!state.measuring || !state.ruler || sameCell(state.ruler.to, cell)) return {};
      return { ruler: { from: state.ruler.from, to: cell } };
    }),
  endRuler: () => set({ measuring: false }),
  clearRuler: () => set({ ruler: null, measuring: false }),
  putSharedRuler: (ruler) =>
    set((state) => ({ sharedRulers: { ...state.sharedRulers, [ruler.userId]: ruler } })),
  dropSharedRuler: (userId) =>
    set((state) => {
      if (!(userId in state.sharedRulers)) return {};
      const next = { ...state.sharedRulers };
      delete next[userId];
      return { sharedRulers: next };
    }),
  addPing: (ping) => set((state) => ({ pings: [...state.pings, ping].slice(-MAX_VISIBLE_PINGS) })),
  removePing: (id) => set((state) => ({ pings: state.pings.filter((ping) => ping.id !== id) })),
  setActions: (actions) => set({ actions }),
  reset: () => set(INITIAL),
}));
