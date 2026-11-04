import { create } from 'zustand';
import { fillFog, paintFogRect, setFogEnabled, type FogState } from '@/domain';
import type { CellRect } from '@/domain/map-v2';
import {
  FOG_BRUSH_DEFAULT_RADIUS,
  FOG_BRUSH_MAX_RADIUS,
  FOG_BRUSH_MIN_RADIUS,
  type FogMode,
  type FogShape,
} from '../constants';

export type FogStatus = 'idle' | 'loading' | 'ready' | 'error';
export type FogSaveStatus = 'saved' | 'pending' | 'saving' | 'error';

/** Ferramenta do mestre: pintando ou não, pincel ou retângulo, cobrir ou revelar. */
export type FogTool = { painting: boolean; shape: FogShape; mode: FogMode; radius: number };

type FogStoreState = {
  mapId: string | null;
  status: FogStatus;
  error: unknown;
  /** Névoa na tela (a do mestre já com as pinceladas que ainda não foram gravadas). */
  fog: FogState | null;
  /** Último estado gravado no banco: a gravação manda só a diferença. */
  saved: FogState | null;
  saveStatus: FogSaveStatus;
  saveError: unknown;
  tool: FogTool;
  /** Sobe a cada mudança de névoa que chega do mestre: o jogador relê o mapa. */
  revision: number;
  /** Sobe quando a pessoa pede para ler de novo depois de uma falha. */
  loadAttempt: number;
};

type FogMutations = {
  setMap: (mapId: string | null) => void;
  setLoading: () => void;
  setLoaded: (fog: FogState) => void;
  setFailed: (error: unknown) => void;
  /** Muda a névoa na tela (pincelada, cobrir tudo); a gravação vem depois. */
  edit: (change: (fog: FogState) => FogState) => void;
  paintRect: (rect: CellRect, covered: boolean) => void;
  fill: (covered: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  setSaveStatus: (status: FogSaveStatus, error?: unknown) => void;
  markSaved: (fog: FogState) => void;
  setTool: (patch: Partial<FogTool>) => void;
  bumpRevision: () => void;
  retryLoad: () => void;
  reset: () => void;
};

const INITIAL: FogStoreState = {
  mapId: null,
  status: 'idle',
  error: null,
  fog: null,
  saved: null,
  saveStatus: 'saved',
  saveError: null,
  tool: { painting: false, shape: 'brush', mode: 'cover', radius: FOG_BRUSH_DEFAULT_RADIUS },
  revision: 0,
  loadAttempt: 0,
};

function clampRadius(radius: number): number {
  return Math.min(Math.max(Math.round(radius), FOG_BRUSH_MIN_RADIUS), FOG_BRUSH_MAX_RADIUS);
}

/** Névoa do mapa aberto, lida pela cena (dentro do Canvas) e pelo painel do mestre. */
export const useFogStore = create<FogStoreState & FogMutations>()((set) => ({
  ...INITIAL,
  setMap: (mapId) =>
    set((state) =>
      state.mapId === mapId
        ? {}
        : { mapId, fog: null, saved: null, status: 'idle', error: null, saveStatus: 'saved' },
    ),
  setLoading: () => set((state) => ({ status: state.fog ? state.status : 'loading' })),
  setLoaded: (fog) => set({ fog, saved: fog, status: 'ready', error: null, saveStatus: 'saved' }),
  setFailed: (error) => set({ status: 'error', error }),
  edit: (change) =>
    set((state) => {
      if (!state.fog) return {};
      const fog = change(state.fog);
      return fog === state.fog ? {} : { fog, saveStatus: 'pending' };
    }),
  paintRect: (rect, covered) =>
    useFogStore.getState().edit((fog) => paintFogRect(fog, rect, covered)),
  fill: (covered) => useFogStore.getState().edit((fog) => fillFog(fog, covered)),
  setEnabled: (enabled) => useFogStore.getState().edit((fog) => setFogEnabled(fog, enabled)),
  setSaveStatus: (saveStatus, saveError = null) => set({ saveStatus, saveError }),
  markSaved: (saved) =>
    set((state) => ({
      saved,
      saveStatus: state.fog === saved ? 'saved' : 'pending',
      saveError: null,
    })),
  setTool: (patch) =>
    set((state) => {
      const tool = { ...state.tool, ...patch };
      return { tool: { ...tool, radius: clampRadius(tool.radius) } };
    }),
  bumpRevision: () => set((state) => ({ revision: state.revision + 1 })),
  retryLoad: () => set((state) => ({ loadAttempt: state.loadAttempt + 1 })),
  reset: () => set(INITIAL),
}));
