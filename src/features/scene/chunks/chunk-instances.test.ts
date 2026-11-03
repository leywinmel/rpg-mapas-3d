import { describe, expect, it } from 'vitest';
import { createEmptyDocument, type MapDocument } from '@/domain';
import {
  convertMapV1ToV2,
  createEmptyMap,
  getChunk,
  type MapChunk,
  type MapModel,
  type MapPiece,
} from '@/domain/map-v2';
import {
  assetGroupKey,
  buildHeightMap,
  floorCapTransform,
  floorColumnTransform,
  propTransform,
  wallSegmentTransforms,
  type InstanceTransform,
} from '../layout';
import { SCENE_PALETTE } from '../catalog/palette';
import {
  chunkGridPositions,
  chunkLightSources,
  farInstances,
  pieceGroups,
  pieceTransform,
  terrainInstances,
  wallGroups,
  wallTransforms,
} from './chunk-instances';

// 70×40: pedaços de 32, 32 e 6 casas de largura, 32 e 8 de profundidade.
const size = { width: 70, depth: 40 };

/** Um mapa v1 como o editor faz: morro, buraco, piso trocado, paredes e objetos girados. */
function editorDocument(): MapDocument {
  const empty = createEmptyDocument(size);
  const floors = empty.floors
    .filter((floor) => !(floor.x === 60 && floor.z === 30))
    .map((floor) => {
      if (floor.x >= 30 && floor.x <= 34 && floor.z >= 3 && floor.z <= 4) {
        return { ...floor, height: 6 };
      }
      if (floor.x >= 40 && floor.x <= 45 && floor.z === 20) {
        return { ...floor, tile: 'piso-madeira' };
      }
      return floor;
    });
  return {
    ...empty,
    floors,
    walls: [
      { x: 31, z: 3, side: 'north', style: 'parede-pedra', height: 2 },
      { x: 33, z: 3, side: 'west', style: 'parede-pedra', height: 3 },
      { x: 32, z: 8, side: 'west', style: 'parede-madeira', height: 4 },
      { x: 70, z: 5, side: 'west', style: 'parede-pedra', height: 1 },
    ],
    props: [
      {
        id: 'barril-1',
        asset: { source: 'catalog', key: 'barril' },
        x: 5.5,
        z: 5.5,
        elevation: 0,
        rotation: 0,
        scale: 1,
      },
      {
        id: 'tocha-1',
        asset: { source: 'catalog', key: 'tocha' },
        x: 31.5,
        z: 3.5,
        elevation: 3,
        rotation: 90,
        scale: 1.5,
      },
      {
        id: 'mesa-1',
        asset: { source: 'catalog', key: 'mesa' },
        x: 65.5,
        z: 38.5,
        elevation: 0,
        rotation: 270,
        scale: 1,
      },
    ],
  };
}

function convert(document: MapDocument): MapModel {
  const result = convertMapV1ToV2(document, size);
  if (!result.ok) throw new Error(result.errors.join(' | '));
  return result.value;
}

/** Lista de instâncias por grupo, em ordem estável: compara o que aparece, não a ordem. */
type Drawn = Record<string, string[]>;

function add(drawn: Drawn, group: string, transforms: readonly InstanceTransform[]): void {
  const list = drawn[group] ?? (drawn[group] = []);
  for (const transform of transforms) list.push(JSON.stringify(transform));
}

function sorted(drawn: Drawn): Drawn {
  return Object.fromEntries(
    Object.entries(drawn)
      .map(([group, list]) => [group, [...list].sort()] as const)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

/** O que a cena v1 desenhava, montado com as funções da cena v1. */
function drawnByV1(document: MapDocument): Drawn {
  const drawn: Drawn = {};
  const heights = buildHeightMap(document.floors, size);
  add(drawn, 'column', document.floors.map(floorColumnTransform));
  for (const floor of document.floors) add(drawn, `cap:${floor.tile}`, [floorCapTransform(floor)]);
  for (const wall of document.walls) {
    add(drawn, `wall:${wall.style}`, wallSegmentTransforms(heights, wall));
  }
  for (const prop of document.props) {
    add(drawn, `piece:${assetGroupKey(prop.asset)}`, [propTransform(prop)]);
  }
  return sorted(drawn);
}

/** O que a cena v2 desenha, pedaço a pedaço. */
function drawnByV2(model: MapModel): Drawn {
  const drawn: Drawn = {};
  for (const chunk of model.chunks.values()) {
    const terrain = terrainInstances(chunk);
    add(drawn, 'column', terrain.columns.transforms);
    for (const cap of terrain.caps) add(drawn, `cap:${cap.tile}`, cap.transforms);
    for (const group of wallGroups(chunk, null))
      add(drawn, `wall:${group.style}`, group.transforms);
    for (const group of pieceGroups(chunk, null))
      add(drawn, `piece:${group.key}`, group.transforms);
  }
  return sorted(drawn);
}

function piece(overrides: Partial<MapPiece> = {}): MapPiece {
  return {
    id: 'p',
    asset: { source: 'catalog', key: 'barril' },
    x: 3,
    z: 4,
    level: 0,
    rotation: 0,
    footprint: { width: 1, depth: 1 },
    scale: 1,
    ...overrides,
  };
}

function withContent(chunk: MapChunk, content: Partial<MapChunk>): MapChunk {
  return { ...chunk, ...content };
}

const firstChunk = () => getChunk(createEmptyMap({ width: 40, depth: 40 }), { cx: 0, cz: 0 });

describe('drawing a converted v1 map chunk by chunk', () => {
  it('shouldDrawExactlyTheSameInstancesAsTheV1Scene', () => {
    const document = editorDocument();
    expect(drawnByV2(convert(document))).toEqual(drawnByV1(document));
  });

  it('shouldLightTheTorchWhereTheV1SceneLitIt', () => {
    const model = convert(editorDocument());
    const sources = [...model.chunks.values()].flatMap((chunk) => chunkLightSources(chunk, null));
    expect(sources).toHaveLength(1);
    // v1: (x, elevation + offsetY · escala, z), com o alcance multiplicado pela escala.
    expect(sources[0]).toMatchObject({ x: 31.5, z: 3.5 });
    expect(sources[0]!.y).toBeGreaterThan(3);
  });
});

describe('terrain instances', () => {
  it('shouldSkipCellsWithoutFloorAndColorColumnsByTile', () => {
    const chunk = firstChunk();
    const tiles = Uint16Array.from(chunk.terrain.tiles);
    tiles[0] = 0;
    const terrain = terrainInstances(withContent(chunk, { terrain: { ...chunk.terrain, tiles } }));
    expect(terrain.columns.transforms).toHaveLength(32 * 32 - 1);
    expect(terrain.columns.colors).toHaveLength(32 * 32 - 1);
    expect(terrain.caps.map((cap) => cap.tile)).toEqual(['piso-pedra']);
  });
});

describe('piece placement', () => {
  it('shouldCenterAOneCellPieceInItsCell', () => {
    expect(pieceTransform(piece({ level: 3 }))).toEqual({
      x: 3.5,
      y: 1.5,
      z: 4.5,
      rotationY: 0,
      scale: 1,
    });
  });

  it('shouldCenterAMultiCellPieceInItsTurnedRectangle', () => {
    const car = piece({ footprint: { width: 2, depth: 4 } });
    expect(pieceTransform(car)).toMatchObject({ x: 4, z: 6, rotationY: 0 });
    // Um quarto de volta troca largura e profundidade: ocupa 4×2 a partir da mesma âncora.
    expect(pieceTransform({ ...car, rotation: 1 })).toMatchObject({ x: 5, z: 5, rotationY: 90 });
  });

  it('shouldGroupPiecesByModelAndHideThoseAtOrAboveTheCut', () => {
    const chunk = withContent(firstChunk(), {
      pieces: [
        piece({ id: 'a', level: 0 }),
        piece({ id: 'b', level: 4 }),
        piece({ id: 'c', asset: { source: 'catalog', key: 'mesa' }, level: 0 }),
      ],
    });
    expect(pieceGroups(chunk, null).map((group) => group.transforms.length)).toEqual([2, 1]);
    const cut = pieceGroups(chunk, 4);
    expect(cut.map((group) => [group.key, group.transforms.length])).toEqual([
      ['catalog:barril', 1],
      ['catalog:mesa', 1],
    ]);
  });
});

describe('wall segments with the cutaway', () => {
  const wall = { x: 2, z: 3, side: 'north', style: 'parede-pedra', height: 8, level: 2 } as const;

  it('shouldStackOneSegmentPerWorldUnitFromTheWallLevel', () => {
    const segments = wallTransforms(wall, null);
    expect(segments.map((segment) => segment.y)).toEqual([1, 2, 3, 4]);
    expect(segments[0]).toMatchObject({ x: 2.5, z: 3, rotationY: 0 });
  });

  it('shouldShortenAWallTheCutPassesThroughAndFlattenTheOddStep', () => {
    // Corte no degrau 5: a parede começa no 2, então só 3 degraus (1,5 unidade) aparecem.
    const segments = wallTransforms(wall, 5);
    expect(segments.map((segment) => [segment.y, segment.scaleY ?? 1])).toEqual([
      [1, 1],
      [2, 0.5],
    ]);
  });

  it('shouldHideAWallThatStartsAtTheCutAndDropEmptyStyles', () => {
    expect(wallTransforms(wall, 2)).toEqual([]);
    const chunk = withContent(firstChunk(), { walls: [wall] });
    expect(wallGroups(chunk, 2)).toEqual([]);
    expect(wallGroups(chunk, null)[0]?.transforms).toHaveLength(4);
  });
});

describe('the chunk seen from afar', () => {
  const wall = { x: 2, z: 3, side: 'west', style: 'parede-madeira', height: 8, level: 2 } as const;

  it('shouldTurnEachFloorCellIntoOneBlockFromTheBaseToTheTopInTheTopColor', () => {
    const chunk = firstChunk();
    const heights = Uint8Array.from(chunk.terrain.heights);
    heights[0] = 4;
    const far = farInstances(withContent(chunk, { terrain: { ...chunk.terrain, heights } }), null);
    expect(far.terrain.transforms).toHaveLength(32 * 32);
    // Topo da casa no degrau 4 (2 unidades), descendo até o fundo do diorama.
    expect(far.terrain.transforms[0]).toEqual({
      x: 0.5,
      y: 2,
      z: 0.5,
      rotationY: 0,
      scale: 1,
      scaleY: 2.3,
    });
    expect(far.terrain.colors[0]).toBe(SCENE_PALETTE.stoneTop);
  });

  it('shouldTurnEachWallIntoOnePlateAsTallAsTheCutLetsItBe', () => {
    const chunk = withContent(firstChunk(), { walls: [wall] });
    expect(farInstances(chunk, null).walls).toEqual({
      transforms: [{ x: 2, y: 1, z: 3.5, rotationY: 90, scale: 1, scaleY: 4 }],
      colors: [SCENE_PALETTE.wallWood],
    });
    expect(farInstances(chunk, 5).walls.transforms[0]?.scaleY).toBe(1.5);
    expect(farInstances(chunk, 2).walls.transforms).toEqual([]);
  });
});

describe('torch lights', () => {
  it('shouldNotLightATorchHiddenByTheCut', () => {
    const torch = piece({ asset: { source: 'catalog', key: 'tocha' }, level: 8 });
    const chunk = withContent(firstChunk(), { pieces: [torch, piece({ id: 'barril' })] });
    expect(chunkLightSources(chunk, null)).toHaveLength(1);
    expect(chunkLightSources(chunk, 8)).toEqual([]);
  });
});

describe('chunk grid', () => {
  it('shouldOutlineEveryCellAtTheTopOfItsTerrain', () => {
    const chunk = firstChunk();
    const heights = Uint8Array.from(chunk.terrain.heights);
    heights[1] = 4;
    const positions = chunkGridPositions(
      withContent(chunk, { terrain: { ...chunk.terrain, heights } }),
      0.01,
    );
    expect(positions).toHaveLength(32 * 32 * 24);
    // A segunda casa (x = 1) começa no float 24, com y = 4 degraus = 2 unidades + o fio.
    expect([positions[24], positions[25], positions[26]]).toEqual([1, expect.closeTo(2.01), 0]);
  });
});
