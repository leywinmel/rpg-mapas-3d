import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry, LineBasicMaterial } from 'three';
import type { GridSize } from '@/domain';
import type { MapChunk } from '@/domain/map-v2';
import { SCENE_PALETTE } from '../catalog/palette';
import { chunkGridPositions } from '../chunks/chunk-instances';

/** Sobe a linha um fio acima do chão para não piscar brigando com a tampa (z-fighting). */
const GRID_LIFT = 0.006;
const GRID_OPACITY = 0.22;
const BORDER_OPACITY = 0.55;
const FLOATS_PER_VERTEX = 3;

function buildBorderGeometry(size: GridSize): BufferGeometry {
  const y = GRID_LIFT;
  const corners = [0, y, 0, size.width, y, 0, size.width, y, size.depth, 0, y, size.depth];
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(corners), FLOATS_PER_VERTEX),
  );
  return geometry;
}

const gridMaterial = new LineBasicMaterial({
  color: SCENE_PALETTE.grid,
  transparent: true,
  opacity: GRID_OPACITY,
  depthWrite: false,
});
const borderMaterial = new LineBasicMaterial({
  color: SCENE_PALETTE.gridBorder,
  transparent: true,
  opacity: BORDER_OPACITY,
});

/** Grade de um pedaço numa única chamada de desenho; acompanha a altura do terreno. */
export function ChunkGrid({ chunk }: { chunk: MapChunk }) {
  const geometry = useMemo(() => {
    const built = new BufferGeometry();
    built.setAttribute(
      'position',
      new BufferAttribute(chunkGridPositions(chunk, GRID_LIFT), FLOATS_PER_VERTEX),
    );
    return built;
  }, [chunk]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <lineSegments geometry={geometry} material={gridMaterial} dispose={null} />;
}

/** A moldura do mapa inteiro. */
export function MapBorder({ size }: { size: GridSize }) {
  const { width, depth } = size;
  const border = useMemo(() => buildBorderGeometry({ width, depth }), [width, depth]);
  useEffect(() => () => border.dispose(), [border]);
  return <lineLoop geometry={border} material={borderMaterial} dispose={null} />;
}
