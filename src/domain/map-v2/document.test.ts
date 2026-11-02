import { chunkBounds } from './chunks';
import { MAX_LEVEL, MAX_REPORTED_ERRORS } from './constants';
import { parseChunk, parseMapHeader, serializeChunk } from './document';
import type { ChunkDocument, MapPiece, MapWall } from './schema';
import { createUniformTerrain } from './terrain';
import type { MapChunk } from './types';

// 70×40 casas: 3 colunas de pedaços (32, 32 e 6 casas) e 2 linhas (32 e 8 casas).
const size = { width: 70, depth: 40 };
const origin = { cx: 0, cz: 0 };

function chunkDoc(overrides: Partial<ChunkDocument> = {}): ChunkDocument {
  return {
    version: 2,
    terrain: { palette: ['piso-pedra'], tiles: [1, 1024], heights: [0, 1024] },
    walls: [],
    pieces: [],
    ...overrides,
  };
}

function wall(overrides: Partial<MapWall> = {}): MapWall {
  return { x: 1, z: 1, side: 'north', style: 'parede-pedra', height: 8, level: 0, ...overrides };
}

function piece(overrides: Partial<MapPiece> = {}): MapPiece {
  return {
    id: 'barril-1',
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

function errorsOf(input: unknown, coord = origin): string[] {
  const result = parseChunk(input, { size, coord });
  return result.ok ? [] : result.errors;
}

describe('map header', () => {
  const ambience = { preset: 'masmorra', fogColor: '#0d0b14', light: 0.6 };

  it('shouldAcceptAValidHeader', () => {
    expect(parseMapHeader({ version: 2, ambience })).toEqual({
      ok: true,
      value: { version: 2, ambience },
    });
  });

  it('shouldExplainWhyAHeaderWasRejected', () => {
    const errorOf = (input: unknown) => {
      const result = parseMapHeader(input);
      return result.ok ? '' : result.errors[0];
    };
    expect(errorOf('texto')).toMatch(/não está num formato reconhecido/);
    expect(errorOf({ ambience })).toMatch(/não informa a versão/);
    expect(errorOf({ version: 3, ambience })).toMatch(/mais nova/);
    expect(errorOf({ version: 1, ambience })).toMatch(/formato antigo.*versão 1.*convertido/);
    expect(errorOf({ version: 2, ambience: { ...ambience, fogColor: 'azul' } })).toMatch(
      /ambience\.fogColor/,
    );
  });
});

describe('chunk document', () => {
  it('shouldReadAUniformChunk', () => {
    const result = parseChunk(chunkDoc(), { size, coord: origin });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.bounds).toEqual({ x: 0, z: 0, width: 32, depth: 32 });
    expect(result.value.terrain.palette).toEqual(['piso-pedra']);
  });

  it('shouldRoundTripWallsAndPieces', () => {
    const doc = chunkDoc({
      walls: [wall(), wall({ level: 8, height: 4 }), wall({ x: 2, z: 3, side: 'west' })],
      pieces: [piece(), piece({ id: 'carro-1', x: 10, z: 10, footprint: { width: 2, depth: 4 } })],
    });
    const result = parseChunk(doc, { size, coord: origin });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(serializeChunk(result.value)).toEqual(doc);
  });

  it('shouldReadChunksCutAtTheMapBorder', () => {
    const corner = { cx: 2, cz: 1 };
    const bounds = chunkBounds(size, corner);
    expect(bounds).toMatchObject({ width: 6, depth: 8 });
    const doc = chunkDoc({
      terrain: { palette: ['piso-pedra'], tiles: [1, 48], heights: [0, 48] },
    });
    expect(parseChunk(doc, { size, coord: corner }).ok).toBe(true);
    // O documento de um pedaço inteiro não serve para um pedaço de borda.
    expect(errorsOf(chunkDoc(), corner)[0]).toMatch(/passam das 48 casas/);
  });

  it('shouldKeepAUniformChunkSmall', () => {
    const terrain = createUniformTerrain(1024, 'piso-pedra');
    const chunk: MapChunk = {
      coord: origin,
      bounds: chunkBounds(size, origin),
      terrain,
      walls: [],
      pieces: [],
    };
    const json = JSON.stringify(serializeChunk(chunk));
    expect(json.length).toBeLessThan(150);
  });

  it('shouldRejectAChunkThatIsNotInTheMap', () => {
    expect(errorsOf(chunkDoc(), { cx: 3, cz: 0 })[0]).toMatch(/Pedaço \(3, 0\).*não existe/);
  });

  it('shouldRejectOtherVersionsAndShapes', () => {
    expect(errorsOf({ ...chunkDoc(), version: 1 })[0]).toMatch(/Pedaço \(0, 0\): .*formato antigo/);
    expect(errorsOf(null)[0]).toMatch(/não está num formato reconhecido/);
    expect(errorsOf({ version: 2 })[0]).toMatch(/terrain/);
  });

  it('shouldExplainInvalidFieldsInPortuguese', () => {
    const errors = errorsOf(chunkDoc({ walls: [wall({ height: 99 })] }));
    expect(errors[0]).toMatch(
      /walls\.0\.height: A altura da parede precisa ser um número inteiro de 1 a 16/,
    );
    const piecesErrors = errorsOf(
      chunkDoc({ pieces: [piece({ footprint: { width: 9, depth: 1 } })] }),
    );
    expect(piecesErrors[0]).toMatch(/A largura da peça precisa ser um número inteiro de 1 a 8/);
  });

  it('shouldRejectUnsafeCatalogKeys', () => {
    const doc = chunkDoc({ walls: [wall({ style: '../../etc' })] });
    expect(errorsOf(doc)[0]).toMatch(/Peça desconhecida/);
  });

  it('shouldRejectTerrainThatDoesNotAddUp', () => {
    const doc = chunkDoc({
      terrain: { palette: ['piso-pedra'], tiles: [1, 1000], heights: [0, 1024] },
    });
    expect(errorsOf(doc)[0]).toMatch(
      /Pedaço \(0, 0\): Terreno.*somam 1000 casas, mas o pedaço tem 1024/,
    );
  });
});

describe('level of walls and pieces', () => {
  it('shouldKeepTheLevelOfStackedWallsAndPieces', () => {
    const doc = chunkDoc({
      walls: [wall({ level: 0 }), wall({ level: MAX_LEVEL, height: 4 })],
      pieces: [piece({ level: 4 }), piece({ id: 'torre-1', x: 9, level: MAX_LEVEL })],
    });
    const result = parseChunk(doc, { size, coord: origin });
    expect(result.ok && result.value.walls.map((item) => item.level)).toEqual([0, MAX_LEVEL]);
    expect(result.ok && result.value.pieces.map((item) => item.level)).toEqual([4, MAX_LEVEL]);
  });

  it('shouldRejectLevelsOutsideTheLimitOrNotWhole', () => {
    const levelError = (doc: ChunkDocument) => errorsOf(doc)[0];
    expect(levelError(chunkDoc({ walls: [wall({ level: MAX_LEVEL + 1 })] }))).toMatch(
      /walls\.0\.level: O degrau da base precisa ser um número inteiro de 0 a 255/,
    );
    expect(levelError(chunkDoc({ walls: [wall({ level: -1 })] }))).toMatch(/walls\.0\.level/);
    expect(levelError(chunkDoc({ pieces: [piece({ level: 2.5 })] }))).toMatch(/pieces\.0\.level/);
    expect(levelError(chunkDoc({ pieces: [piece({ level: MAX_LEVEL + 1 })] }))).toMatch(
      /pieces\.0\.level/,
    );
  });

  it('shouldRejectDocumentsWithoutALevel', () => {
    // Uma parede no jeito do v1 (altura em metros, sem degrau da base) não é um documento v2.
    const legacyWall = { x: 1, z: 1, side: 'north', style: 'parede-pedra', height: 2 };
    const errors = errorsOf({ ...chunkDoc(), walls: [legacyWall] });
    expect(errors[0]).toMatch(/walls\.0\.level/);
  });
});

describe('wall ownership', () => {
  it('shouldKeepAWallInTheChunkOfItsCell', () => {
    expect(errorsOf(chunkDoc({ walls: [wall({ x: 31, z: 31 })] }))).toEqual([]);
    // A aresta oeste de x = 32 é da casa (32, z): pertence ao pedaço seguinte.
    expect(errorsOf(chunkDoc({ walls: [wall({ x: 32, z: 5, side: 'west' })] }))[0]).toMatch(
      /é de outro pedaço/,
    );
  });

  it('shouldGiveTheEastAndSouthBorderEdgesToTheInnerNeighbor', () => {
    const lastColumn = { cx: 2, cz: 0 };
    const lastRow = { cx: 0, cz: 1 };
    const columnDoc = (walls: MapWall[]) =>
      chunkDoc({ terrain: { palette: ['piso-pedra'], tiles: [1, 192], heights: [0, 192] }, walls });
    const rowDoc = (walls: MapWall[]) =>
      chunkDoc({ terrain: { palette: ['piso-pedra'], tiles: [1, 256], heights: [0, 256] }, walls });
    // x = largura (70) é a borda leste: a casa de dentro é (69, z), do pedaço (2, 0).
    expect(errorsOf(columnDoc([wall({ x: 70, z: 3, side: 'west' })]), lastColumn)).toEqual([]);
    // z = profundidade (40) é a borda sul: a casa de dentro é (x, 39), do pedaço (cx, 1).
    expect(errorsOf(rowDoc([wall({ x: 4, z: 40, side: 'north' })]), lastRow)).toEqual([]);
    // E não do pedaço onde o número da aresta cairia.
    expect(errorsOf(chunkDoc({ walls: [wall({ x: 70, z: 3, side: 'west' })] }))[0]).toMatch(
      /é de outro pedaço/,
    );
  });

  it('shouldRejectWallsOutsideTheMap', () => {
    const errors = errorsOf(chunkDoc({ walls: [wall({ x: 71, z: 0, side: 'north' })] }));
    expect(errors[0]).toMatch(/Parede fora do mapa em \(71, 0\)/);
  });

  it('shouldAllowStackedWallsOnTheSameEdgeButNotTwoAtTheSameLevel', () => {
    const stacked = chunkDoc({ walls: [wall({ level: 0 }), wall({ level: 8 })] });
    expect(errorsOf(stacked)).toEqual([]);
    const repeated = chunkDoc({ walls: [wall(), wall({ style: 'parede-madeira' })] });
    expect(errorsOf(repeated)[0]).toMatch(/Duas paredes iguais em \(1, 1\)/);
  });
});

describe('piece placement in the document', () => {
  it('shouldRejectAPieceAnchoredInAnotherChunk', () => {
    const errors = errorsOf(chunkDoc({ pieces: [piece({ x: 40, z: 4 })] }));
    expect(errors[0]).toMatch(/"barril-1" tem a âncora fora deste pedaço/);
  });

  it('shouldRejectRepeatedIdsInTheSameChunk', () => {
    const errors = errorsOf(chunkDoc({ pieces: [piece(), piece({ x: 9 })] }));
    expect(errors[0]).toMatch(/Peça repetida: "barril-1"/);
  });

  it('shouldAllowOverlappingPiecesWithDifferentIds', () => {
    const overlapped = chunkDoc({ pieces: [piece(), piece({ id: 'barril-2' })] });
    expect(errorsOf(overlapped)).toEqual([]);
  });
});

describe('error reporting', () => {
  it('shouldReportOnlyTheFirstErrors', () => {
    const outside = Array.from({ length: 12 }, (_, index) => wall({ x: 100 + index }));
    const errors = errorsOf(chunkDoc({ walls: outside }));
    expect(errors).toHaveLength(MAX_REPORTED_ERRORS);
    expect(errors.every((error) => error.startsWith('Pedaço (0, 0): '))).toBe(true);
  });
});
