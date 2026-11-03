import { useMemo, useState } from 'react';
import type { GridSize, MapDocument } from '@/domain';
import { convertCheckedMapV1, type MapModel } from '@/domain/map-v2';
import { reuseUnchangedChunks } from '../chunks/stable-model';

/** Guarda o último modelo convertido, para o próximo reaproveitar os pedaços que não mudaram. */
function createModelStabilizer() {
  let previous: MapModel | null = null;
  return (next: MapModel): MapModel => {
    previous = reuseUnchangedChunks(previous, next);
    return previous;
  };
}

/**
 * O documento v1 (que o editor e o banco ainda usam) visto como mapa v2, para a cena desenhar
 * pelo caminho dos pedaços. A conversão não muda a aparência. O documento já chega conferido
 * (o carregamento passa pelo parseMapDocument e o editor só muda por operações conferidas),
 * então a conversão não confere de novo: isso custaria ~9 ms a cada passo do pincel.
 */
export function useMapModelFromV1(document: MapDocument, size: GridSize): MapModel {
  const [stabilize] = useState(createModelStabilizer);
  const { width, depth } = size;
  return useMemo(
    () => stabilize(convertCheckedMapV1(document, { width, depth })),
    [document, width, depth, stabilize],
  );
}
