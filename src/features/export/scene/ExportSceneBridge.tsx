import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { fogRange } from '@/features/scene';
import { useTokensStore } from '@/features/tokens';
import { useExportStore } from '../hooks/export-store';
import { capturePng } from './png-capture';
import { visibleGroundRect } from './visible-area';

/**
 * Dentro do Canvas: registra no painel "Exportar" como capturar a imagem e medir a área vista.
 * Não desenha nada. Lê o renderizador e a câmera na hora do pedido (a câmera muda a cada quadro).
 */
export default function ExportSceneBridge() {
  const get = useThree((state) => state.get);

  useEffect(
    () =>
      useExportStore.getState().attach({
        capturePng: (options) => {
          const { gl, scene, camera } = get();
          return capturePng({ gl, scene, camera }, options);
        },
        visibleRect: () => {
          const model = useTokensStore.getState().view?.model;
          if (!model) return null;
          const span = Math.max(model.size.width, model.size.depth);
          const { far } = fogRange(model.header.ambience, span);
          return visibleGroundRect(get().camera, model.size, far);
        },
      }),
    [get],
  );

  return null;
}
