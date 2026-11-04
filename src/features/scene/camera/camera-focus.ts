/**
 * Ponte entre a câmera (dentro do Canvas, no pacote do three) e o minimapa (HTML, no pacote
 * leve): a câmera conta para onde está olhando e o minimapa pede para ela ir a outro ponto.
 * Só guarda casas inteiras, para o minimapa não redesenhar a cada quadro do giro da câmera.
 */
import { create } from 'zustand';

/** Ponto do chão, em casas. */
export type GroundPoint = { readonly x: number; readonly z: number };

/** Pedido de ida: o número muda a cada clique, mesmo que o ponto se repita. */
export type FocusRequest = GroundPoint & { readonly id: number };

type CameraFocusState = {
  /** Casa que a câmera está olhando agora (nulo sem cena aberta). */
  view: GroundPoint | null;
  request: FocusRequest | null;
  reportView: (point: GroundPoint | null) => void;
  requestFocus: (point: GroundPoint) => void;
};

function sameCell(a: GroundPoint | null, b: GroundPoint | null): boolean {
  return a?.x === b?.x && a?.z === b?.z;
}

export const useCameraFocus = create<CameraFocusState>()((set, get) => ({
  view: null,
  request: null,
  reportView: (point) => {
    const view = point && { x: Math.floor(point.x), z: Math.floor(point.z) };
    if (!sameCell(view, get().view)) set({ view });
  },
  requestFocus: (point) => set({ request: { ...point, id: (get().request?.id ?? 0) + 1 } }),
}));
