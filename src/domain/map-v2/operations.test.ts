import { chunkKey } from './chunks';
import { MAX_PIECES_PER_CHUNK, MAX_WALLS_PER_CHUNK } from './constants';
import { serializeChunk } from './document';
import { changedChunks, createEmptyMap, getChunk, piecesOccupyingCell, terrainAt } from './model';
import {
  paintTerrainCell,
  paintTerrainRect,
  placePiece,
  placePieces,
  placeWall,
  removePiece,
  removeWall,
} from './operations';
import { setTerrainHeight } from './terrain-height';
import { changedKeys, errorsOf, makePiece, makeWall, unwrap, withChunk } from './test-fixtures';

// 100×100 casas: 4×4 pedaços (a última coluna e a última linha têm 4 casas).
const size = { width: 100, depth: 100 };
const base = createEmptyMap(size);
const FLOOR = 'piso-pedra';
const OTHER_FLOOR = 'piso-madeira';

/** Pedaços que não estão em `touched` precisam ser exatamente os mesmos objetos de antes. */
function expectOnlyChunksChanged(before: typeof base, after: typeof base, touched: string[]): void {
  for (const [key, chunk] of after.chunks) {
    if (touched.includes(key)) expect(chunk).not.toBe(before.chunks.get(key));
    else expect(chunk).toBe(before.chunks.get(key));
  }
  expect(changedKeys(before, after).sort()).toEqual([...touched].sort());
}

describe('terrain operations', () => {
  it('shouldChangeOnlyTheChunkOfThePaintedCell', () => {
    const after = unwrap(paintTerrainCell(base, { cell: { x: 40, z: 5 }, tile: OTHER_FLOOR }));
    expect(terrainAt(after, { x: 40, z: 5 })).toEqual({ tile: OTHER_FLOOR, height: 0 });
    expect(terrainAt(after, { x: 41, z: 5 })?.tile).toBe(FLOOR);
    expectOnlyChunksChanged(base, after, ['1,0']);
  });

  it('shouldNeverChangeTheOriginalModel', () => {
    paintTerrainCell(base, { cell: { x: 40, z: 5 }, tile: OTHER_FLOOR });
    expect(terrainAt(base, { x: 40, z: 5 })?.tile).toBe(FLOOR);
  });

  it('shouldReturnTheSameModelWhenNothingChanges', () => {
    const same = unwrap(paintTerrainCell(base, { cell: { x: 1, z: 1 }, tile: FLOOR }));
    expect(same).toBe(base);
    const sameRect = unwrap(
      paintTerrainRect(base, { from: { x: 0, z: 0 }, to: { x: 40, z: 40 }, tile: FLOOR }),
    );
    expect(sameRect).toBe(base);
  });

  it('shouldPaintARectangleAcrossFourChunksAndTouchOnlyThose', () => {
    const after = unwrap(
      // Cantos na ordem inversa: arrastar de baixo para cima também vale.
      paintTerrainRect(base, { from: { x: 33, z: 33 }, to: { x: 30, z: 30 }, tile: OTHER_FLOOR }),
    );
    expectOnlyChunksChanged(base, after, ['0,0', '1,0', '0,1', '1,1']);
    for (let z = 30; z <= 33; z += 1) {
      for (let x = 30; x <= 33; x += 1) expect(terrainAt(after, { x, z })?.tile).toBe(OTHER_FLOOR);
    }
    expect(terrainAt(after, { x: 29, z: 30 })?.tile).toBe(FLOOR);
    expect(terrainAt(after, { x: 34, z: 33 })?.tile).toBe(FLOOR);
  });

  it('shouldKeepChunksWhereTheRectangleChangesNothing', () => {
    const first = unwrap(
      paintTerrainRect(base, { from: { x: 30, z: 5 }, to: { x: 31, z: 5 }, tile: OTHER_FLOOR }),
    );
    const second = unwrap(
      paintTerrainRect(first, { from: { x: 30, z: 5 }, to: { x: 33, z: 5 }, tile: OTHER_FLOOR }),
    );
    // O pedaço (0, 0) já tinha a peça nessas casas: continua o mesmo objeto.
    expectOnlyChunksChanged(first, second, ['1,0']);
  });

  it('shouldCutTheRectangleAtTheMapBorder', () => {
    const after = unwrap(
      paintTerrainRect(base, { from: { x: 98, z: 98 }, to: { x: 105, z: 105 }, tile: OTHER_FLOOR }),
    );
    expectOnlyChunksChanged(base, after, ['3,3']);
    expect(terrainAt(after, { x: 99, z: 99 })?.tile).toBe(OTHER_FLOOR);
    expect(terrainAt(after, { x: 97, z: 98 })?.tile).toBe(FLOOR);
    expect(terrainAt(after, { x: 100, z: 99 })).toBeNull();
  });

  it('shouldPaintTheWholeMapTouchingEveryChunk', () => {
    const after = unwrap(
      paintTerrainRect(base, { from: { x: 0, z: 0 }, to: { x: 99, z: 99 }, tile: OTHER_FLOOR }),
    );
    expect(changedChunks(base, after)).toHaveLength(16);
    expect(terrainAt(after, { x: 99, z: 99 })?.tile).toBe(OTHER_FLOOR);
    // Sem nenhuma casa da peça antiga, a paleta gravada guarda só a nova.
    const stored = serializeChunk(getChunk(after, { cx: 0, cz: 0 }));
    expect(stored.terrain).toEqual({
      palette: [OTHER_FLOOR],
      tiles: [1, 1024],
      heights: [0, 1024],
    });
  });

  it('shouldRejectAreasAndTilesThatAreNotValid', () => {
    const outside = paintTerrainRect(base, {
      from: { x: 200, z: 0 },
      to: { x: 210, z: 5 },
      tile: FLOOR,
    });
    expect(errorsOf(outside)[0]).toMatch(/fora do mapa/);
    const cell = paintTerrainCell(base, { cell: { x: 100, z: 0 }, tile: FLOOR });
    expect(errorsOf(cell)[0]).toMatch(/\(100, 0\) está fora do mapa/);
    const fractional = paintTerrainRect(base, {
      from: { x: 1.5, z: 0 },
      to: { x: 3, z: 3 },
      tile: FLOOR,
    });
    expect(errorsOf(fractional)[0]).toMatch(/casas inteiras/);
    const unsafe = paintTerrainCell(base, { cell: { x: 1, z: 1 }, tile: '../../etc' });
    expect(errorsOf(unsafe)[0]).toMatch(/Peça de chão inválida/);
  });
});

describe('terrain heights and holes', () => {
  const cell = { x: 5, z: 5 };

  it('shouldRaiseCellsThatHaveFloor', () => {
    const raised = unwrap(setTerrainHeight(base, { from: cell, to: cell, height: 3 }));
    expect(terrainAt(raised, cell)).toEqual({ tile: FLOOR, height: 3 });
    expectOnlyChunksChanged(base, raised, ['0,0']);
  });

  it('shouldKeepTheHeightWhenPaintingAnotherTileOverTheFloor', () => {
    const raised = unwrap(setTerrainHeight(base, { from: cell, to: cell, height: 3 }));
    const painted = unwrap(paintTerrainCell(raised, { cell, tile: OTHER_FLOOR }));
    expect(terrainAt(painted, cell)).toEqual({ tile: OTHER_FLOOR, height: 3 });
  });

  it('shouldErasingTheFloorAlsoErasesTheHeight', () => {
    const raised = unwrap(setTerrainHeight(base, { from: cell, to: cell, height: 3 }));
    const hole = unwrap(paintTerrainCell(raised, { cell, tile: null }));
    expect(terrainAt(hole, cell)).toEqual({ tile: null, height: 0 });
    // Pintar de novo no buraco começa do nível zero.
    const refilled = unwrap(paintTerrainCell(hole, { cell, tile: FLOOR }));
    expect(terrainAt(refilled, cell)).toEqual({ tile: FLOOR, height: 0 });
  });

  it('shouldSkipHolesWhenRaisingARectangle', () => {
    const hole = unwrap(paintTerrainCell(base, { cell, tile: null }));
    const raised = unwrap(
      setTerrainHeight(hole, { from: { x: 4, z: 4 }, to: { x: 6, z: 6 }, height: 2 }),
    );
    expect(terrainAt(raised, cell)).toEqual({ tile: null, height: 0 });
    expect(terrainAt(raised, { x: 4, z: 4 })?.height).toBe(2);
    expect(terrainAt(raised, { x: 6, z: 6 })?.height).toBe(2);
    expect(terrainAt(raised, { x: 7, z: 7 })?.height).toBe(0);
  });

  it('shouldReturnTheSameModelWhenTheHeightIsAlreadyThere', () => {
    expect(unwrap(setTerrainHeight(base, { from: cell, to: cell, height: 0 }))).toBe(base);
    const hole = unwrap(paintTerrainCell(base, { cell, tile: null }));
    expect(unwrap(setTerrainHeight(hole, { from: cell, to: cell, height: 5 }))).toBe(hole);
  });

  it('shouldRaiseAcrossChunksTouchingOnlyThose', () => {
    const raised = unwrap(
      setTerrainHeight(base, { from: { x: 31, z: 31 }, to: { x: 32, z: 32 }, height: 4 }),
    );
    expectOnlyChunksChanged(base, raised, ['0,0', '1,0', '0,1', '1,1']);
  });

  it('shouldRejectHeightsOutsideTheLimit', () => {
    for (const height of [41, -1, 1.5, Number.NaN]) {
      const result = setTerrainHeight(base, { from: cell, to: cell, height });
      expect(errorsOf(result)[0]).toMatch(/inteiro de 0 a 40/);
    }
    const outside = setTerrainHeight(base, {
      from: { x: 500, z: 5 },
      to: { x: 501, z: 5 },
      height: 1,
    });
    expect(errorsOf(outside)[0]).toMatch(/fora do mapa/);
  });
});

describe('piece operations', () => {
  const car = makePiece({ id: 'carro-1', x: 30, z: 5, footprint: { width: 4, depth: 2 } });

  it('shouldStoreAPieceInTheChunkOfItsAnchorEvenWhenItAdvancesIntoTheNeighbor', () => {
    const after = unwrap(placePiece(base, car));
    expectOnlyChunksChanged(base, after, ['0,0']);
    expect(getChunk(after, { cx: 0, cz: 0 }).pieces).toEqual([car]);
    expect(piecesOccupyingCell(after, { x: 33, z: 6 })).toEqual([car]);
  });

  it('shouldAllowStackingAndOverlappingPieces', () => {
    const ground = unwrap(placePiece(base, makePiece({ id: 'casa', x: 3, z: 3 })));
    const stacked = unwrap(placePiece(ground, makePiece({ id: 'sobrado', x: 3, z: 3, level: 4 })));
    const overlapped = unwrap(placePiece(stacked, makePiece({ id: 'barril', x: 3, z: 3 })));
    const ids = piecesOccupyingCell(overlapped, { x: 3, z: 3 }).map((piece) => piece.id);
    expect(ids).toEqual(['casa', 'barril', 'sobrado']);
  });

  it('shouldRejectAPieceThatLeavesTheMap', () => {
    const edge = makePiece({ id: 'carro-2', x: 98, z: 10, footprint: { width: 2, depth: 4 } });
    expect(placePiece(base, edge).ok).toBe(true);
    const outside = placePiece(base, { ...edge, x: 99 });
    expect(errorsOf(outside)[0]).toMatch(/"carro-2" não cabe no mapa/);
  });

  it('shouldRejectAPieceThatLeavesTheMapWhenRotated', () => {
    const wagon = makePiece({ id: 'carroca', x: 98, z: 10, footprint: { width: 2, depth: 4 } });
    expect(placePiece(base, wagon).ok).toBe(true);
    const turned = placePiece(base, { ...wagon, rotation: 1 });
    expect(errorsOf(turned)[0]).toMatch(/"carroca" não cabe no mapa/);
  });

  it('shouldRejectARepeatedIdEvenInAnotherChunk', () => {
    const placed = unwrap(placePiece(base, makePiece({ id: 'barril-1', x: 5, z: 5 })));
    const repeated = placePiece(placed, makePiece({ id: 'barril-1', x: 70, z: 70 }));
    expect(errorsOf(repeated)[0]).toMatch(/Já existe uma peça com o id "barril-1"/);
  });

  it('shouldExplainInvalidPiecesInPortuguese', () => {
    const wide = placePiece(base, makePiece({ footprint: { width: 9, depth: 1 } }));
    expect(errorsOf(wide)[0]).toMatch(/A largura da peça precisa ser um número inteiro de 1 a 8/);
    expect(errorsOf(placePiece(base, makePiece({ level: 256 })))[0]).toMatch(/O degrau da base/);
    expect(errorsOf(placePiece(base, makePiece({ rotation: 4 })))[0]).toMatch(/O giro da peça/);
    expect(errorsOf(placePiece(base, makePiece({ scale: 5 })))[0]).toMatch(/escala da peça/);
    expect(errorsOf(placePiece(base, makePiece({ id: '' })))[0]).toMatch(/id da peça/);
  });

  it('shouldStopAtThePieceLimitOfAChunk', () => {
    const full = getChunk(base, { cx: 0, cz: 0 });
    const pieces = Array.from({ length: MAX_PIECES_PER_CHUNK }, (_, index) =>
      makePiece({ id: `peca-${index}`, x: index % 32, z: Math.floor(index / 32) % 32 }),
    );
    const crowded = withChunk(base, { ...full, pieces });
    const result = placePiece(crowded, makePiece({ id: 'a-mais', x: 1, z: 1 }));
    expect(errorsOf(result)[0]).toMatch(/máximo de 2048 peças/);
    // Outro pedaço continua aceitando.
    expect(placePiece(crowded, makePiece({ id: 'a-mais', x: 40, z: 1 })).ok).toBe(true);
  });

  it('shouldRemoveAPieceTouchingOnlyItsChunk', () => {
    const placed = unwrap(placePiece(base, car));
    const removed = unwrap(removePiece(placed, car));
    expectOnlyChunksChanged(placed, removed, ['0,0']);
    expect(piecesOccupyingCell(removed, { x: 33, z: 6 })).toEqual([]);
    // O id volta a ficar livre.
    expect(placePiece(removed, car).ok).toBe(true);
  });

  it('shouldDoNothingWhenThereIsNoSuchPiece', () => {
    const placed = unwrap(placePiece(base, car));
    expect(unwrap(removePiece(placed, { ...car, id: 'outra' }))).toBe(placed);
    expect(unwrap(removePiece(placed, { ...car, x: 70 }))).toBe(placed);
    expect(unwrap(removePiece(placed, { ...car, x: -5 }))).toBe(placed);
    expect(unwrap(removePiece(base, car))).toBe(base);
  });
});

describe('placing pieces in batch', () => {
  it('shouldPlaceEveryPieceInItsAnchorChunkAtOnce', () => {
    const pieces = [
      makePiece({ id: 'a', x: 1, z: 1 }),
      makePiece({ id: 'b', x: 40, z: 1 }),
      makePiece({ id: 'c', x: 2, z: 2 }),
    ];
    const after = unwrap(placePieces(base, pieces));
    expectOnlyChunksChanged(base, after, ['0,0', '1,0']);
    expect(getChunk(after, { cx: 0, cz: 0 }).pieces.map((piece) => piece.id)).toEqual(['a', 'c']);
  });

  it('shouldRefuseTheWholeBatchWhenOneIdRepeats', () => {
    const placed = unwrap(placePiece(base, makePiece({ id: 'a' })));
    expect(
      errorsOf(placePieces(placed, [makePiece({ id: 'b' }), makePiece({ id: 'a' })]))[0],
    ).toMatch(/"a"/);
    expect(
      errorsOf(placePieces(base, [makePiece({ id: 'b' }), makePiece({ id: 'b' })]))[0],
    ).toMatch(/"b"/);
  });

  it('shouldRefuseTheWholeBatchWhenOnePieceLeavesTheMap', () => {
    const result = placePieces(base, [makePiece({ id: 'a' }), makePiece({ id: 'b', x: 100 })]);
    expect(result.ok).toBe(false);
  });

  it('shouldRespectTheChunkLimit', () => {
    const many = Array.from({ length: MAX_PIECES_PER_CHUNK + 1 }, (_, index) =>
      makePiece({ id: `p${index}`, x: index % 32, z: Math.floor(index / 32) % 32 }),
    );
    expect(placePieces(base, many).ok).toBe(false);
    expect(placePieces(base, []).ok).toBe(true);
  });
});

describe('wall operations', () => {
  it('shouldStoreAWallInTheChunkOfItsCell', () => {
    const after = unwrap(placeWall(base, makeWall({ x: 10, z: 10 })));
    expectOnlyChunksChanged(base, after, ['0,0']);
  });

  it('shouldGiveAChunkBorderEdgeToTheChunkOnTheHigherXOrZSide', () => {
    // A aresta oeste de x = 32 é da casa (32, z): do pedaço de lá.
    expectOnlyChunksChanged(
      base,
      unwrap(placeWall(base, makeWall({ x: 32, z: 5, side: 'west' }))),
      ['1,0'],
    );
    expectOnlyChunksChanged(
      base,
      unwrap(placeWall(base, makeWall({ x: 5, z: 32, side: 'north' }))),
      ['0,1'],
    );
  });

  it('shouldGiveTheEastAndSouthMapBordersToTheInnerNeighbor', () => {
    const east = unwrap(placeWall(base, makeWall({ x: 100, z: 5, side: 'west' })));
    expectOnlyChunksChanged(base, east, ['3,0']);
    const south = unwrap(placeWall(base, makeWall({ x: 5, z: 100, side: 'north' })));
    expectOnlyChunksChanged(base, south, ['0,3']);
  });

  it('shouldStackWallsOnTheSameEdgeAtDifferentLevels', () => {
    const ground = unwrap(placeWall(base, makeWall({ level: 0 })));
    const stacked = unwrap(placeWall(ground, makeWall({ level: 8, height: 4 })));
    expect(getChunk(stacked, { cx: 0, cz: 0 }).walls.map((wall) => wall.level)).toEqual([0, 8]);
  });

  it('shouldReplaceTheWallsItOverlapsOnTheSameEdge', () => {
    // Térreo [0, 8) e andar de cima [8, 12); a nova [6, 10) encosta nas duas e tira as duas.
    const ground = unwrap(placeWall(base, makeWall({ level: 0 })));
    const stacked = unwrap(placeWall(ground, makeWall({ level: 8, height: 4 })));
    const replaced = unwrap(placeWall(stacked, makeWall({ level: 6, height: 4, style: 'x-y' })));
    const walls = getChunk(replaced, { cx: 0, cz: 0 }).walls;
    expect(walls).toEqual([makeWall({ level: 6, height: 4, style: 'x-y' })]);
    // Só encostar (o topo de uma é a base da outra) não é sobrepor.
    const touching = unwrap(placeWall(ground, makeWall({ level: 8, height: 2 })));
    expect(getChunk(touching, { cx: 0, cz: 0 }).walls).toHaveLength(2);
    // Outra aresta da mesma casa não conta.
    const west = unwrap(placeWall(ground, makeWall({ side: 'west' })));
    expect(getChunk(west, { cx: 0, cz: 0 }).walls).toHaveLength(2);
  });

  it('shouldKeepTheOrderOfTheOtherWallsWhenReplacing', () => {
    let model = unwrap(placeWall(base, makeWall({ x: 0 })));
    model = unwrap(placeWall(model, makeWall({ x: 1 })));
    model = unwrap(placeWall(model, makeWall({ x: 2 })));
    model = unwrap(placeWall(model, makeWall({ x: 1, level: 2, height: 2 })));
    const walls = getChunk(model, { cx: 0, cz: 0 }).walls;
    expect(walls.map((wall) => [wall.x, wall.level])).toEqual([
      [0, 0],
      [1, 2],
      [2, 0],
    ]);
  });

  it('shouldReplaceAWallOnTheSameEdgeAndLevel', () => {
    const placed = unwrap(placeWall(base, makeWall()));
    const restyled = unwrap(placeWall(placed, makeWall({ style: 'parede-madeira', height: 4 })));
    const walls = getChunk(restyled, { cx: 0, cz: 0 }).walls;
    expect(walls).toHaveLength(1);
    expect(walls[0]).toMatchObject({ style: 'parede-madeira', height: 4 });
    expect(unwrap(placeWall(placed, makeWall()))).toBe(placed);
  });

  it('shouldRejectWallsThatAreNotValidOrOutsideTheMap', () => {
    expect(errorsOf(placeWall(base, makeWall({ x: 101 })))[0]).toMatch(
      /\(101, 1\) está fora do mapa/,
    );
    expect(errorsOf(placeWall(base, makeWall({ x: 100, side: 'north' })))[0]).toMatch(
      /fora do mapa/,
    );
    expect(errorsOf(placeWall(base, makeWall({ height: 0 })))[0]).toMatch(/A altura da parede/);
    expect(errorsOf(placeWall(base, makeWall({ height: 17 })))[0]).toMatch(/A altura da parede/);
    expect(errorsOf(placeWall(base, makeWall({ level: 256 })))[0]).toMatch(/O degrau da base/);
    expect(errorsOf(placeWall(base, makeWall({ style: '../x' })))[0]).toMatch(/Peça desconhecida/);
  });

  it('shouldStopAtTheWallLimitOfAChunk', () => {
    const chunk = getChunk(base, { cx: 0, cz: 0 });
    const walls = Array.from({ length: MAX_WALLS_PER_CHUNK }, (_, index) =>
      makeWall({ x: index % 32, z: Math.floor(index / 32) % 32, level: Math.floor(index / 1024) }),
    );
    const crowded = withChunk(base, { ...chunk, walls });
    const result = placeWall(crowded, makeWall({ x: 1, z: 1, level: 100 }));
    expect(errorsOf(result)[0]).toMatch(/máximo de 4096 paredes/);
    // Trocar o estilo de uma parede que já existe continua valendo com o pedaço cheio.
    expect(placeWall(crowded, makeWall({ x: 0, z: 0, level: 0, style: 'parede-madeira' })).ok).toBe(
      true,
    );
  });

  it('shouldRemoveOnlyTheWallAtThatLevel', () => {
    const both = unwrap(
      placeWall(unwrap(placeWall(base, makeWall({ level: 0 }))), makeWall({ level: 8 })),
    );
    const removed = unwrap(removeWall(both, { x: 1, z: 1, side: 'north', level: 8 }));
    expectOnlyChunksChanged(both, removed, ['0,0']);
    expect(getChunk(removed, { cx: 0, cz: 0 }).walls.map((wall) => wall.level)).toEqual([0]);
  });

  it('shouldDoNothingWhenThereIsNoSuchWall', () => {
    expect(unwrap(removeWall(base, { x: 1, z: 1, side: 'north', level: 0 }))).toBe(base);
    expect(unwrap(removeWall(base, { x: 500, z: 1, side: 'north', level: 0 }))).toBe(base);
    const placed = unwrap(placeWall(base, makeWall()));
    expect(unwrap(removeWall(placed, { x: 1, z: 1, side: 'west', level: 0 }))).toBe(placed);
  });
});

describe('changed chunks', () => {
  it('shouldReportNothingForTheSameModel', () => {
    expect(changedChunks(base, base)).toEqual([]);
  });

  it('shouldReportEachTouchedChunkOnce', () => {
    const after = unwrap(placeWall(base, makeWall({ x: 40, z: 40 })));
    expect(changedChunks(base, after)).toEqual([{ cx: 1, cz: 1 }]);
    expect(after.chunks.get(chunkKey({ cx: 1, cz: 1 }))).not.toBe(base.chunks.get('1,1'));
  });
});
