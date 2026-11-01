import { useMemo } from 'react';
import { createEmptyDocument, type GridSize, type MapDocument } from '@/domain';
import { MapScene } from './SceneCanvas';

const PREVIEW_SIZE: GridSize = { width: 12, depth: 12 };

/** Cripta pequena de amostra: mostra chão, degraus, paredes, objetos e tochas. */
function buildPreviewDocument(): MapDocument {
  const document = createEmptyDocument(PREVIEW_SIZE);
  const floors = document.floors.map((floor) => {
    const isAltar = floor.x >= 4 && floor.x <= 7 && floor.z <= 2;
    const isPool = floor.x >= 8 && floor.z >= 8;
    if (isAltar) return { ...floor, height: 1 };
    if (isPool) return { ...floor, tile: 'agua' };
    return floor;
  });
  const walls: MapDocument['walls'] = [];
  for (let x = 0; x < PREVIEW_SIZE.width; x += 1) {
    walls.push({ x, z: 0, side: 'north', style: 'parede-pedra', height: 2 });
  }
  for (let z = 0; z < PREVIEW_SIZE.depth; z += 1) {
    walls.push({ x: 0, z, side: 'west', style: 'parede-pedra', height: 2 });
  }
  const catalog = (key: string) => ({ source: 'catalog' as const, key });
  const props: MapDocument['props'] = [
    {
      id: 'estatua',
      asset: catalog('estatua'),
      x: 6,
      z: 1.5,
      elevation: 0.5,
      rotation: 0,
      scale: 1,
    },
    { id: 'tocha-1', asset: catalog('tocha'), x: 3.5, z: 1.5, elevation: 0, rotation: 0, scale: 1 },
    { id: 'tocha-2', asset: catalog('tocha'), x: 8.5, z: 1.5, elevation: 0, rotation: 0, scale: 1 },
    { id: 'pilar-1', asset: catalog('pilar'), x: 2.5, z: 5.5, elevation: 0, rotation: 0, scale: 1 },
    { id: 'pilar-2', asset: catalog('pilar'), x: 9.5, z: 5.5, elevation: 0, rotation: 0, scale: 1 },
    { id: 'bau', asset: catalog('bau'), x: 1.5, z: 10.5, elevation: 0, rotation: 90, scale: 1 },
    { id: 'barril', asset: catalog('barril'), x: 1.5, z: 9.5, elevation: 0, rotation: 0, scale: 1 },
    { id: 'rocha', asset: catalog('rocha'), x: 7.5, z: 9.5, elevation: 0, rotation: 30, scale: 1 },
  ];
  return { ...document, floors, walls, props };
}

/** Cena de amostra da sala enquanto o mapa ativo não é integrado (mantida para quem já importa). */
export function DioramaPreview() {
  const document = useMemo(() => buildPreviewDocument(), []);
  return <MapScene document={document} size={PREVIEW_SIZE} label="Mapa de amostra" />;
}
