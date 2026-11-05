import { create } from 'zustand';
import type { SceneryGlide } from '../types';

type SceneryState = {
  /** Peças que mudaram de lugar há pouco, pelo id da peça. */
  glides: Readonly<Record<string, SceneryGlide>>;
};

type SceneryMutations = {
  /** Começa (ou recomeça, se a peça já deslizava) o deslize. */
  start: (glide: SceneryGlide) => void;
  /** Terminou de deslizar: a peça volta a ser desenhada pelo pedaço do mapa. */
  settle: (pieceId: string, serial: number) => void;
  /** O banco já teve tempo de confirmar: a tela volta a mostrar só o que ele diz. */
  drop: (pieceId: string, serial: number) => void;
  reset: () => void;
};

function without(
  glides: Readonly<Record<string, SceneryGlide>>,
  pieceId: string,
): Record<string, SceneryGlide> {
  const next = { ...glides };
  delete next[pieceId];
  return next;
}

/**
 * Cenário em movimento na tela. Fica fora do React, como o dos tokens: a cena (dentro do
 * Canvas) e a área do mapa leem o mesmo estado sem um provider em volta dos dois.
 */
export const useSceneryStore = create<SceneryState & SceneryMutations>()((set) => ({
  glides: {},
  start: (glide) => set((state) => ({ glides: { ...state.glides, [glide.piece.id]: glide } })),
  settle: (pieceId, serial) =>
    set((state) => {
      const glide = state.glides[pieceId];
      if (!glide || glide.serial !== serial || !glide.gliding) return {};
      return { glides: { ...state.glides, [pieceId]: { ...glide, gliding: false } } };
    }),
  drop: (pieceId, serial) =>
    set((state) => {
      if (state.glides[pieceId]?.serial !== serial) return {};
      return { glides: without(state.glides, pieceId) };
    }),
  reset: () => set({ glides: {} }),
}));
