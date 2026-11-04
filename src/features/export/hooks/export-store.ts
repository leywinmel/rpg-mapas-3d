import { create } from 'zustand';
import type { CellRect } from '@/domain/map-v2';

export type PngOptions = {
  /** Esconde a grade, o cursor do editor, o anel de seleção e as etiquetas dos tokens. */
  hideUi: boolean;
};

/**
 * O que a cena aberta sabe fazer para a exportação. Mora dentro do Canvas (precisa do
 * renderizador e da câmera) e se registra aqui ao montar; o painel, fora do Canvas, só chama.
 */
export type SceneCapture = {
  capturePng: (options: PngOptions) => Promise<Blob>;
  /** Casas do chão que a câmera vê agora (até onde a neblina deixa), ou null se não der para medir. */
  visibleRect: () => CellRect | null;
};

type ExportStore = {
  scene: SceneCapture | null;
  /** Registra a cena; a função devolvida a tira (se ainda for a mesma). */
  attach: (scene: SceneCapture) => () => void;
};

/** Ponte entre a cena 3D (carregada sob demanda) e o painel "Exportar". */
export const useExportStore = create<ExportStore>()((set, get) => ({
  scene: null,
  attach: (scene) => {
    set({ scene });
    return () => {
      if (get().scene === scene) set({ scene: null });
    };
  },
}));
