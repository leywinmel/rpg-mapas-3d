import { useCallback } from 'react';
import type { MapModel } from '@/domain/map-v2';
import { applyGlides } from '../services/scenery-runtime';
import { useSceneryStore } from './scenery-store';

/**
 * O ajuste que a área do mapa aplica ao que a cena desenha (TableBinding.adjustModel): muda só
 * quando o cenário em movimento muda, e devolve o mesmo modelo quando nada se move.
 */
export function useSceneryAdjuster(): (mapId: string, model: MapModel) => MapModel {
  const glides = useSceneryStore((state) => state.glides);
  return useCallback(
    (mapId: string, model: MapModel) => applyGlides(model, mapId, glides),
    [glides],
  );
}
