import { memo, useMemo, useState } from 'react';
import { chunkKey, NO_CUTAWAY, type Cutaway, type MapModel } from '@/domain/map-v2';
import { fogRange } from '../ambience';
import { chunkLightSources } from '../chunks/chunk-instances';
import type { ModelUrls } from './AssetPieces';
import { MapBorder } from './BoardGrid';
import { ChunkCuller } from './ChunkCuller';
import { ChunkView, type ChunkRegistry } from './ChunkView';
import { TorchLights } from './TorchLights';
import { useTableWeather } from '../weather/weather-store';

export type MapRendererProps = {
  model: MapModel;
  /** Corte de andares: paredes e peças a partir deste degrau somem. Sem corte, tudo aparece. */
  cutaway?: Cutaway;
  modelUrls?: ModelUrls;
  showGrid?: boolean;
};

/**
 * Desenha o diorama v2 pedaço a pedaço. Cada pedaço é um componente memo pela referência,
 * e o recorte esconde os que a câmera não vê; as tochas mais perto do centro da vista viram luz.
 */
export const MapRenderer = memo(function MapRenderer({
  model,
  cutaway = NO_CUTAWAY,
  modelUrls,
  showGrid = true,
}: MapRendererProps) {
  const [registry] = useState<ChunkRegistry>(() => new Map());
  const chunks = useMemo(() => [...model.chunks.values()], [model.chunks]);
  const lights = useMemo(
    () => chunks.flatMap((chunk) => chunkLightSources(chunk, cutaway)),
    [chunks, cutaway],
  );
  const span = Math.max(model.size.width, model.size.depth);
  const table = useTableWeather();
  const fog = fogRange(model.header.ambience, span, table);
  return (
    <>
      {showGrid && <MapBorder size={model.size} />}
      {chunks.map((chunk) => (
        <ChunkView
          key={chunkKey(chunk.coord)}
          chunk={chunk}
          cutaway={cutaway}
          modelUrls={modelUrls}
          showGrid={showGrid}
          registry={registry}
        />
      ))}
      <ChunkCuller registry={registry} maxDistance={fog.far} />
      <TorchLights sources={lights} />
    </>
  );
});
