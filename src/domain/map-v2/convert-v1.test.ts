import {
  createEmptyDocument,
  parseMapDocument,
  type MapDocument,
  type Prop,
  type Wall,
} from '../map-document';
import { convertCheckedMapV1, convertMapV1ToV2 } from './convert-v1';
import { createEmptyMap, getChunk, piecesOccupyingCell, terrainAt } from './model';
import { stepsToWorld } from './height';
import { loadMapModel, serializeMapModel } from './storage';
import { errorsOf, unwrap } from './test-fixtures';
import type { MapPiece, MapWall } from './schema';
import type { MapModel } from './types';
import { wallOwnerChunk } from './walls';

// 70×40 casas: 3 colunas de pedaços (32, 32 e 6 casas) e 2 linhas (32 e 8 casas).
const size = { width: 70, depth: 40 };
/** Degrau de chão do v1 (o antigo FLOOR_STEP_HEIGHT da cena), em unidades do mundo. */
const V1_STEP = 0.5;
const UPLOAD_ID = '123e4567-e89b-42d3-a456-426614174000';

const barrel = { source: 'catalog', key: 'barril' } as const;

/**
 * Mapa v1 feito como o editor faz: objetos no centro da casa, giro de 90 em 90, elevação igual
 * ao topo do chão. Tem morro, buraco, chão trocado, paredes de vários tipos e objetos girados.
 */
function richDocument(): MapDocument {
  const empty = createEmptyDocument(size);
  const floors = empty.floors
    .filter((floor) => !(floor.x >= 60 && floor.x <= 61 && floor.z >= 30 && floor.z <= 31))
    .map((floor) => {
      if (floor.x >= 30 && floor.x <= 34 && floor.z >= 3 && floor.z <= 4)
        return { ...floor, height: 6 };
      if (floor.x === 10 && floor.z === 10) return { ...floor, height: 10 };
      if (floor.x === 41 && floor.z === 35) return { ...floor, height: 1 };
      if (floor.x >= 40 && floor.x <= 45 && floor.z === 20)
        return { ...floor, tile: 'piso-madeira' };
      return floor;
    });
  const walls: Wall[] = [
    { x: 31, z: 3, side: 'north', style: 'parede-pedra', height: 2 },
    { x: 33, z: 3, side: 'west', style: 'parede-pedra', height: 3 },
    { x: 35, z: 3, side: 'west', style: 'parede-madeira', height: 1 },
    { x: 60, z: 30, side: 'north', style: 'parede-pedra', height: 4 },
    { x: 70, z: 5, side: 'west', style: 'parede-pedra', height: 2 },
    { x: 5, z: 40, side: 'north', style: 'parede-pedra', height: 2 },
    { x: 32, z: 8, side: 'west', style: 'parede-pedra', height: 4 },
    { x: 10, z: 10, side: 'north', style: 'parede-pedra', height: 1 },
  ];
  const props: Prop[] = [
    { id: 'barril-1', asset: barrel, x: 5.5, z: 5.5, elevation: 0, rotation: 0, scale: 1 },
    {
      id: 'tocha-1',
      asset: { source: 'catalog', key: 'tocha' },
      x: 31.5,
      z: 3.5,
      elevation: 3,
      rotation: 90,
      scale: 1,
    },
    { id: 'barril-2', asset: barrel, x: 41.5, z: 35.5, elevation: 0.5, rotation: 270, scale: 1.5 },
    {
      id: 'modelo-1',
      asset: { source: 'upload', assetId: UPLOAD_ID },
      x: 50.5,
      z: 12.5,
      elevation: 0,
      rotation: 180,
      scale: 1,
    },
    { id: 'barril-3', asset: barrel, x: 10.5, z: 10.5, elevation: 5, rotation: 0, scale: 0.5 },
  ];
  return {
    ...empty,
    ambience: { preset: 'taverna', fogColor: '#221a10', light: 1.2 },
    floors,
    walls,
    props,
  };
}

function convert(document: MapDocument): MapModel {
  return unwrap(convertMapV1ToV2(document, size));
}

function allWalls(model: MapModel): MapWall[] {
  return [...model.chunks.values()].flatMap((chunk) => chunk.walls);
}

function allPieces(model: MapModel): MapPiece[] {
  return [...model.chunks.values()].flatMap((chunk) => chunk.pieces);
}

describe('converting an empty v1 map', () => {
  it('shouldGiveTheSameMapAsANewV2Map', () => {
    const converted = convert(createEmptyDocument(size));
    expect(serializeMapModel(converted)).toEqual(serializeMapModel(createEmptyMap(size)));
  });

  it('shouldKeepEveryFloorAtLevelZeroWithoutWallsOrPieces', () => {
    const converted = convert(createEmptyDocument(size, 'piso-madeira'));
    expect(terrainAt(converted, { x: 0, z: 0 })).toEqual({ tile: 'piso-madeira', height: 0 });
    expect(terrainAt(converted, { x: 69, z: 39 })).toEqual({ tile: 'piso-madeira', height: 0 });
    expect(allWalls(converted)).toEqual([]);
    expect(allPieces(converted)).toEqual([]);
  });

  it('shouldConvertTheLargestV1MapIntoSixteenChunks', () => {
    const big = { width: 100, depth: 100 };
    const converted = unwrap(convertMapV1ToV2(createEmptyDocument(big), big));
    expect(converted.chunks.size).toBe(16);
    expect(serializeMapModel(converted)).toEqual(serializeMapModel(createEmptyMap(big)));
  });
});

describe('converting a v1 map with walls, turned objects and raised floors', () => {
  const document = richDocument();
  const converted = convert(document);

  it('shouldCarryTheAmbienceOver', () => {
    expect(converted.header).toEqual({ version: 2, ambience: document.ambience });
    expect(converted.size).toEqual(size);
  });

  it('shouldKeepEveryCellOfTheTerrain', () => {
    const floors = new Map(document.floors.map((floor) => [`${floor.x},${floor.z}`, floor]));
    const mismatches: string[] = [];
    for (let z = 0; z < size.depth; z += 1) {
      for (let x = 0; x < size.width; x += 1) {
        const floor = floors.get(`${x},${z}`);
        // Casa sem chão no v1 vira buraco de altura zero no v2 (o surfaceAt da cena v1 também lê zero).
        const expected = { tile: floor?.tile ?? null, height: floor?.height ?? 0 };
        const actual = terrainAt(converted, { x, z });
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          mismatches.push(
            `(${x}, ${z}): ${JSON.stringify(actual)} em vez de ${JSON.stringify(expected)}`,
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
    expect(terrainAt(converted, { x: 31, z: 3 })).toEqual({ tile: 'piso-pedra', height: 6 });
    expect(terrainAt(converted, { x: 60, z: 30 })).toEqual({ tile: null, height: 0 });
  });

  it('shouldKeepEveryWallWithTheSameBaseAndTopInTheWorld', () => {
    const floors = new Map(document.floors.map((floor) => [`${floor.x},${floor.z}`, floor.height]));
    // Topo do chão em unidades do mundo; fora do mapa ou sem chão é zero, como no v1.
    const top = (x: number, z: number) => (floors.get(`${x},${z}`) ?? 0) * V1_STEP;
    const walls = allWalls(converted);
    expect(walls).toHaveLength(document.walls.length);
    for (const legacy of document.walls) {
      const neighbor =
        legacy.side === 'north'
          ? { x: legacy.x, z: legacy.z - 1 }
          : { x: legacy.x - 1, z: legacy.z };
      const base = Math.max(top(legacy.x, legacy.z), top(neighbor.x, neighbor.z));
      const wall = walls.find(
        (item) => item.x === legacy.x && item.z === legacy.z && item.side === legacy.side,
      );
      expect(wall, `parede (${legacy.x}, ${legacy.z}) ${legacy.side}`).toBeDefined();
      expect(wall?.style).toBe(legacy.style);
      expect(stepsToWorld(wall!.level)).toBe(base);
      expect(stepsToWorld(wall!.level + wall!.height)).toBe(base + legacy.height);
      // Cada parede está no pedaço dono da aresta.
      const owner = getChunk(converted, wallOwnerChunk(size, legacy));
      expect(owner.walls).toContainEqual(wall);
    }
  });

  it('shouldStartEachWallOnTheHigherSideOfItsEdge', () => {
    const level = (x: number, z: number, side: 'north' | 'west') =>
      allWalls(converted).find((wall) => wall.x === x && wall.z === z && wall.side === side);
    // Entre o morro (6 degraus) e o chão baixo, a parede sobe pelo lado alto.
    expect(level(31, 3, 'north')).toMatchObject({ level: 6, height: 4 });
    expect(level(35, 3, 'west')).toMatchObject({ level: 6, height: 2 });
    expect(level(33, 3, 'west')).toMatchObject({ level: 6, height: 6 });
    expect(level(10, 10, 'north')).toMatchObject({ level: 10, height: 2 });
    // Casa sem chão e borda do mapa contam zero.
    expect(level(60, 30, 'north')).toMatchObject({ level: 0, height: 8 });
    expect(level(70, 5, 'west')).toMatchObject({ level: 0, height: 4 });
    expect(level(5, 40, 'north')).toMatchObject({ level: 0, height: 4 });
  });

  it('shouldKeepEveryObjectAsAOneCellPieceInTheSameSpot', () => {
    const pieces = allPieces(converted);
    expect(pieces).toHaveLength(document.props.length);
    for (const prop of document.props) {
      const piece = pieces.find((item) => item.id === prop.id);
      expect(piece, `objeto ${prop.id}`).toBeDefined();
      // O centro da peça (âncora + meia casa) cai exatamente onde o objeto do v1 estava.
      expect(piece!.x + 0.5).toBe(prop.x);
      expect(piece!.z + 0.5).toBe(prop.z);
      expect(stepsToWorld(piece!.level)).toBe(prop.elevation);
      expect(piece!.rotation * 90).toBe(prop.rotation);
      expect(piece!.footprint).toEqual({ width: 1, depth: 1 });
      expect(piece!.scale).toBe(prop.scale);
      expect(piece!.asset).toEqual(prop.asset);
      expect(piecesOccupyingCell(converted, { x: piece!.x, z: piece!.z })).toContainEqual(piece);
    }
  });

  it('shouldKeepTheObjectOnTheHillAtTheTopOfItsFloor', () => {
    // O v1 já grava a altura do chão na elevação do objeto: nada é somado de novo.
    const torch = allPieces(converted).find((piece) => piece.id === 'tocha-1');
    expect(torch).toMatchObject({ x: 31, z: 3, level: 6, rotation: 1 });
    expect(terrainAt(converted, { x: 31, z: 3 })?.height).toBe(torch?.level);
  });

  it('shouldProduceAMapThatSurvivesSerializing', () => {
    const stored = JSON.parse(JSON.stringify(serializeMapModel(converted))) as ReturnType<
      typeof serializeMapModel
    >;
    const loaded = loadMapModel({ size, header: stored.header, chunks: stored.chunks });
    expect(loaded.ok).toBe(true);
    expect(loaded.ok && serializeMapModel(loaded.value)).toEqual(serializeMapModel(converted));
  });

  it('shouldGiveTheSameMapWhenTheDocumentWasAlreadyChecked', () => {
    const checked = unwrap(parseMapDocument(document, size));
    expect(serializeMapModel(convertCheckedMapV1(checked, size))).toEqual(
      serializeMapModel(converted),
    );
  });

  it('shouldNotChangeTheV1Document', () => {
    const before = JSON.stringify(document);
    convert(document);
    expect(JSON.stringify(document)).toBe(before);
    expect(parseMapDocument(document, size).ok).toBe(true);
  });
});

describe('converting a v1 file edited by hand', () => {
  function handEdited(props: Prop[], walls: Wall[] = []): MapModel {
    return convert({ ...createEmptyDocument(size), props, walls });
  }

  it('shouldCenterObjectsOutsideTheCenterAndRoundBrokenAngles', () => {
    // Única perda da conversão: posição livre e giro quebrado só existem em arquivo editado à mão.
    const model = handEdited([
      { id: 'a', asset: barrel, x: 5.9, z: 7.2, elevation: 0.7, rotation: 100, scale: 1 },
      { id: 'b', asset: barrel, x: 9.5, z: 9.5, elevation: 0, rotation: 359, scale: 1 },
      { id: 'c', asset: barrel, x: 12.5, z: 9.5, elevation: 0, rotation: 134.9, scale: 1 },
    ]);
    const byId = (id: string) => allPieces(model).find((piece) => piece.id === id);
    expect(byId('a')).toMatchObject({ x: 5, z: 7, level: 1, rotation: 1 });
    expect(byId('b')).toMatchObject({ rotation: 0 });
    expect(byId('c')).toMatchObject({ rotation: 1 });
  });

  it('shouldPutAnObjectOnTheEastAndSouthBordersInTheLastCell', () => {
    const model = handEdited([
      { id: 'borda', asset: barrel, x: 70, z: 40, elevation: 0, rotation: 0, scale: 1 },
    ]);
    expect(allPieces(model)[0]).toMatchObject({ x: 69, z: 39 });
  });

  it('shouldKeepTheLastOfTwoWallsOnTheSameEdge', () => {
    const model = handEdited(
      [],
      [
        { x: 1, z: 1, side: 'north', style: 'parede-pedra', height: 1 },
        { x: 1, z: 1, side: 'north', style: 'parede-madeira', height: 3 },
      ],
    );
    expect(allWalls(model)).toEqual([
      { x: 1, z: 1, side: 'north', style: 'parede-madeira', height: 6, level: 0 },
    ]);
  });
});

describe('converting something that is not a valid v1 map', () => {
  it('shouldExplainWhyTheV1DocumentWasRejected', () => {
    expect(errorsOf(convertMapV1ToV2(null, size))[0]).toMatch(/não está num formato reconhecido/);
    const outside = { ...createEmptyDocument({ width: 4, depth: 4 }) };
    expect(errorsOf(convertMapV1ToV2(outside, { width: 2, depth: 2 }))[0]).toMatch(
      /Chão fora do mapa/,
    );
    expect(errorsOf(convertMapV1ToV2({ version: 2 }, size))[0]).toMatch(/mais nova/);
  });

  it('shouldRejectASizeThatV2DoesNotAccept', () => {
    const result = convertMapV1ToV2(createEmptyDocument({ width: 2, depth: 2 }), {
      width: 1001,
      depth: 2,
    });
    expect(errorsOf(result)[0]).toMatch(/Tamanho 1001×2 inválido/);
  });
});
