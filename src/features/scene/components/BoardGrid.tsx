import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry, LineBasicMaterial } from 'three';
import type { GridSize } from '@/domain';
import { SCENE_PALETTE } from '../catalog/palette';
import { surfaceAt, type HeightMap } from '../layout';

/** Sobe a linha um fio acima do chão para não piscar brigando com a tampa (z-fighting). */
const GRID_LIFT = 0.006;
const GRID_OPACITY = 0.22;
const BORDER_OPACITY = 0.55;
const FLOATS_PER_CELL = 4 * 2 * 3;

/** Contorno de cada casa na altura do topo dela: a grade acompanha o chão empilhado. */
function buildGridGeometry(heights: HeightMap): BufferGeometry {
  const { width, depth } = heights.size;
  const positions = new Float32Array(width * depth * FLOATS_PER_CELL);
  let offset = 0;
  const push = (x: number, y: number, z: number) => {
    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;
    offset += 3;
  };
  for (let z = 0; z < depth; z += 1) {
    for (let x = 0; x < width; x += 1) {
      const y = surfaceAt(heights, { x, z }) + GRID_LIFT;
      push(x, y, z);
      push(x + 1, y, z);
      push(x + 1, y, z);
      push(x + 1, y, z + 1);
      push(x + 1, y, z + 1);
      push(x, y, z + 1);
      push(x, y, z + 1);
      push(x, y, z);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  return geometry;
}

function buildBorderGeometry(size: GridSize): BufferGeometry {
  const y = GRID_LIFT;
  const corners = [0, y, 0, size.width, y, 0, size.width, y, size.depth, 0, y, size.depth];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(corners), 3));
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

/** Grade do tabuleiro (uma única chamada de desenho para o mapa inteiro) e a moldura do mapa. */
export function BoardGrid({ heights }: { heights: HeightMap }) {
  const grid = useMemo(() => buildGridGeometry(heights), [heights]);
  const { width, depth } = heights.size;
  const border = useMemo(() => buildBorderGeometry({ width, depth }), [width, depth]);
  useEffect(() => () => grid.dispose(), [grid]);
  useEffect(() => () => border.dispose(), [border]);
  return (
    <>
      <lineSegments geometry={grid} material={gridMaterial} dispose={null} />
      <lineLoop geometry={border} material={borderMaterial} dispose={null} />
    </>
  );
}
