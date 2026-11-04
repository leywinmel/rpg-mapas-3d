import { chunkKey } from './chunks';
import { DEFAULT_FLOOR_TILE, MAX_REPORTED_ERRORS } from './constants';
import { createEmptyMap, getChunk, isDefaultChunk, piecesOccupyingCell, terrainAt } from './model';
import { paintTerrainRect, placePiece, placeWall, removePiece, removeWall } from './operations';
import { resizeMap } from './resize';
import { setTerrainHeight } from './terrain-height';
import {
  applyStoredChanges,
  isEmptySavePlan,
  loadMapModel,
  planMapSave,
  serializeMapModel,
  type StoredChunk,
} from './storage';
import { changedKeys, errorsOf, makePiece, makeWall, unwrap } from './test-fixtures';
import type { MapModel } from './types';

// 70×40 casas: 3 colunas de pedaços (32, 32 e 6 casas) e 2 linhas (32 e 8 casas).
const size = { width: 70, depth: 40 };

/** Um mapa com de tudo um pouco: chão trocado, morro, buraco, peças e paredes empilhadas. */
function editedMap(): MapModel {
  let model = createEmptyMap(size);
  model = unwrap(
    paintTerrainRect(model, { from: { x: 28, z: 2 }, to: { x: 36, z: 6 }, tile: 'piso-madeira' }),
  );
  model = unwrap(
    setTerrainHeight(model, { from: { x: 30, z: 3 }, to: { x: 34, z: 4 }, height: 6 }),
  );
  model = unwrap(
    paintTerrainRect(model, { from: { x: 60, z: 30 }, to: { x: 61, z: 31 }, tile: null }),
  );
  const car = makePiece({ id: 'carro-1', x: 30, z: 20, footprint: { width: 4, depth: 2 } });
  model = unwrap(placePiece(model, car));
  model = unwrap(placePiece(model, makePiece({ id: 'sobrado', x: 66, z: 36, level: 4 })));
  model = unwrap(placeWall(model, makeWall({ x: 32, z: 5, side: 'west' })));
  model = unwrap(placeWall(model, makeWall({ x: 32, z: 5, side: 'west', level: 8, height: 4 })));
  model = unwrap(placeWall(model, makeWall({ x: 70, z: 10, side: 'west' })));
  return unwrap(placeWall(model, makeWall({ x: 5, z: 40, side: 'north' })));
}

function storedChunks(model: MapModel): StoredChunk[] {
  const serialized = serializeMapModel(model);
  // Passa por JSON como o banco faria: nada de typed array ou referência escapa para o outro lado.
  return JSON.parse(JSON.stringify(serialized.chunks)) as StoredChunk[];
}

function load(model: MapModel, chunks: Iterable<StoredChunk>, header: unknown = model.header) {
  return loadMapModel({ size: model.size, header, chunks });
}

describe('loading and serializing a map', () => {
  it('shouldGetTheSameMapBackThroughJson', () => {
    const model = editedMap();
    const loaded = unwrap(load(model, storedChunks(model)));
    expect(serializeMapModel(loaded)).toEqual(serializeMapModel(model));
    expect(terrainAt(loaded, { x: 31, z: 3 })).toEqual({ tile: 'piso-madeira', height: 6 });
    expect(terrainAt(loaded, { x: 60, z: 30 })).toEqual({ tile: null, height: 0 });
    expect(piecesOccupyingCell(loaded, { x: 33, z: 21 }).map((piece) => piece.id)).toEqual([
      'carro-1',
    ]);
    expect(getChunk(loaded, { cx: 1, cz: 0 }).walls).toHaveLength(2);
    expect(getChunk(loaded, { cx: 2, cz: 0 }).walls).toHaveLength(1);
    expect(getChunk(loaded, { cx: 0, cz: 1 }).walls).toHaveLength(1);
  });

  it('shouldReadTheLargestMapWithAllItsChunksFromNoRowAtAll', () => {
    const model = createEmptyMap({ width: 1000, depth: 1000 });
    const chunks = storedChunks(model);
    expect(chunks).toEqual([]);
    const loaded = unwrap(load(model, chunks));
    expect(loaded.chunks.size).toBe(1024);
    expect(terrainAt(loaded, { x: 999, z: 999 })).toEqual({ tile: DEFAULT_FLOOR_TILE, height: 0 });
  });

  it('shouldRejectAnInvalidSizeOrHeader', () => {
    const model = editedMap();
    const chunks = storedChunks(model);
    const oversized = loadMapModel({
      size: { width: 1001, depth: 5 },
      header: model.header,
      chunks,
    });
    expect(errorsOf(oversized)[0]).toMatch(/Tamanho 1001×5 inválido/);
    expect(errorsOf(load(model, chunks, { version: 1 }))[0]).toMatch(/formato antigo/);
    expect(errorsOf(load(model, chunks, null))[0]).toMatch(/formato reconhecido/);
  });

  it('shouldFillAMissingChunkWithTheDefaultFloor', () => {
    const model = editedMap();
    const chunks = storedChunks(model).filter(({ coord }) => coord.cx !== 0 || coord.cz !== 0);
    const loaded = unwrap(load(model, chunks));
    const filled = getChunk(loaded, { cx: 0, cz: 0 });
    expect(isDefaultChunk(filled)).toBe(true);
    expect(filled.bounds).toEqual({ x: 0, z: 0, width: 32, depth: 32 });
    expect(piecesOccupyingCell(loaded, { x: 30, z: 20 })).toEqual([]);
    // O pedaço da borda que falta também nasce cortado no tamanho certo.
    const border = getChunk(unwrap(load(model, [])), { cx: 2, cz: 1 });
    expect(border.bounds).toEqual({ x: 64, z: 32, width: 6, depth: 8 });
  });

  it('shouldStoreOnlyTheChunksThatDifferFromTheDefault', () => {
    const model = editedMap();
    const keys = serializeMapModel(model).chunks.map(({ coord }) => chunkKey(coord));
    // (1, 1) nunca foi mexido: não vira linha no banco.
    expect(keys.sort()).toEqual(['0,0', '0,1', '1,0', '2,0', '2,1']);
  });

  it('shouldRejectARepeatedChunk', () => {
    const model = editedMap();
    const chunks = storedChunks(model);
    expect(errorsOf(load(model, [...chunks, chunks[0]!]))[0]).toMatch(
      /Pedaço \(0, 0\): veio repetido/,
    );
  });

  it('shouldRejectAChunkThatIsNotInTheMap', () => {
    const model = editedMap();
    const chunks = storedChunks(model);
    const extra: StoredChunk = { coord: { cx: 3, cz: 0 }, document: chunks[0]!.document };
    expect(errorsOf(load(model, [...chunks, extra]))[0]).toMatch(/Pedaço \(3, 0\).*não existe/);
  });

  it('shouldNameTheBrokenChunk', () => {
    const model = editedMap();
    const chunks = storedChunks(model).map((chunk) =>
      chunk.coord.cx === 2 && chunk.coord.cz === 1 ? { ...chunk, document: { version: 2 } } : chunk,
    );
    expect(errorsOf(load(model, chunks))[0]).toMatch(/^Pedaço \(2, 1\): /);
  });

  it('shouldRejectAPieceIdRepeatedAcrossChunks', () => {
    const model = editedMap();
    const chunks = storedChunks(model).map((chunk) => {
      if (chunk.coord.cx !== 2 || chunk.coord.cz !== 0) return chunk;
      // O mesmo id "carro-1" do pedaço (0, 0), agora também no pedaço (2, 0).
      const document = chunk.document as { pieces: unknown[] };
      const clone = makePiece({ id: 'carro-1', x: 66, z: 2 });
      return { ...chunk, document: { ...document, pieces: [...document.pieces, clone] } };
    });
    expect(errorsOf(load(model, chunks))[0]).toMatch(/"carro-1" aparece em dois pedaços/);
  });

  it('shouldReportOnlyTheFirstErrors', () => {
    const model = editedMap();
    const broken = storedChunks(model).map((chunk) => ({ ...chunk, document: null }));
    const errors = errorsOf(load(model, broken));
    expect(errors).toHaveLength(MAX_REPORTED_ERRORS);
  });
});

describe('planning a save', () => {
  const keysOf = (coords: ReadonlyArray<{ cx: number; cz: number }>) => coords.map(chunkKey);

  it('shouldWriteEverythingThatDiffersWhenTheBankHasNothingYet', () => {
    const model = editedMap();
    const plan = planMapSave(null, model);
    expect(plan.headerChanged).toBe(true);
    expect(plan.header).toBe(model.header);
    expect(plan.deletes).toEqual([]);
    expect(plan.upserts).toEqual(serializeMapModel(model).chunks);
  });

  it('shouldWriteOnlyTheHeaderOfABrandNewEmptyMap', () => {
    const plan = planMapSave(null, createEmptyMap({ width: 1000, depth: 1000 }));
    expect(plan.upserts).toEqual([]);
    expect(isEmptySavePlan(plan)).toBe(false);
  });

  it('shouldPlanNothingWhenNothingChanged', () => {
    const model = editedMap();
    expect(isEmptySavePlan(planMapSave(model, model))).toBe(true);
  });

  it('shouldWriteOnlyTheTouchedChunks', () => {
    const saved = editedMap();
    const current = unwrap(placePiece(saved, makePiece({ id: 'barril-9', x: 40, z: 35 })));
    const plan = planMapSave(saved, current);
    expect(plan.headerChanged).toBe(false);
    expect(keysOf(plan.upserts.map(({ coord }) => coord))).toEqual(['1,1']);
    expect(plan.upserts[0]?.document.pieces.map((piece) => piece.id)).toEqual(['barril-9']);
    expect(plan.deletes).toEqual([]);
  });

  it('shouldDeleteAChunkThatWentBackToTheDefaultFloor', () => {
    const saved = editedMap();
    let current = unwrap(removePiece(saved, { id: 'sobrado', x: 66, z: 36 }));
    current = unwrap(placePiece(current, makePiece({ id: 'barril-9', x: 40, z: 35 })));
    const plan = planMapSave(saved, current);
    expect(changedKeys(saved, current).sort()).toEqual(['1,1', '2,1']);
    expect(keysOf(plan.deletes)).toEqual(['2,1']);
    expect(keysOf(plan.upserts.map(({ coord }) => coord))).toEqual(['1,1']);
  });

  it('shouldDeleteAChunkWhoseOnlyWallWasRemoved', () => {
    const saved = editedMap();
    const current = unwrap(removeWall(saved, { x: 5, z: 40, side: 'north', level: 0 }));
    expect(keysOf(planMapSave(saved, current).deletes)).toEqual(['0,1']);
  });

  it('shouldNoticeANewHeader', () => {
    const saved = editedMap();
    const current = { ...saved, header: { ...saved.header } };
    const plan = planMapSave(saved, current);
    expect(plan.headerChanged).toBe(true);
    expect(isEmptySavePlan(plan)).toBe(false);
  });

  it('shouldCarryTheNewSizeAndOnlyTheChunksThatChanged', () => {
    const saved = editedMap();
    expect(planMapSave(saved, saved)).toMatchObject({ size, sizeChanged: false });
    // 70 → 64 casas de largura: some a terceira coluna de pedaços, que o banco apaga sozinho.
    const current = unwrap(resizeMap(saved, { width: 64, depth: 40 }));
    const plan = planMapSave(saved, current);
    expect(plan).toMatchObject({ size: { width: 64, depth: 40 }, sizeChanged: true });
    expect(isEmptySavePlan(plan)).toBe(false);
    expect(keysOf([...plan.upserts.map((chunk) => chunk.coord), ...plan.deletes])).toEqual([]);
  });

  it('shouldWriteBackTheChunksThatAnUndoBringsBack', () => {
    const before = editedMap();
    const shrunk = unwrap(resizeMap(before, { width: 30, depth: 40 }));
    const plan = planMapSave(shrunk, before);
    expect(plan.sizeChanged).toBe(true);
    expect(keysOf(plan.upserts.map((chunk) => chunk.coord)).sort()).toEqual(
      keysOf(serializeMapModel(before).chunks.map((chunk) => chunk.coord)).sort(),
    );
  });
});

describe('applying only the chunks that changed', () => {
  it('shouldSwapTheChangedChunksAndKeepEveryOtherOneAsTheSameObject', () => {
    const shown = editedMap();
    const edited = unwrap(placePiece(shown, makePiece({ id: 'novo', x: 2, z: 2 })));
    const changed = storedChunks(edited).filter(
      (chunk) => chunk.coord.cx === 0 && chunk.coord.cz === 0,
    );
    const next = unwrap(applyStoredChanges(shown, { header: edited.header, changed, removed: [] }));
    expect(changedKeys(shown, next)).toEqual([chunkKey({ cx: 0, cz: 0 })]);
    expect(piecesOccupyingCell(next, { x: 2, z: 2 }).map((piece) => piece.id)).toEqual(['novo']);
  });

  it('shouldTurnARemovedRowBackIntoThePlainFloor', () => {
    const shown = editedMap();
    const coord = { cx: 2, cz: 1 };
    const next = unwrap(
      applyStoredChanges(shown, { header: shown.header, changed: [], removed: [coord] }),
    );
    expect(isDefaultChunk(getChunk(next, coord))).toBe(true);
    expect(changedKeys(shown, next)).toEqual([chunkKey(coord)]);
    // Pedaço de fora do mapa (de antes de encolher) não entra.
    const outside = unwrap(
      applyStoredChanges(shown, { header: shown.header, changed: [], removed: [{ cx: 9, cz: 9 }] }),
    );
    expect(outside.chunks.size).toBe(shown.chunks.size);
  });

  it('shouldRefuseABrokenDocumentOrAPieceIdThatNowAppearsTwice', () => {
    const shown = editedMap();
    const broken = [{ coord: { cx: 0, cz: 0 }, document: { version: 2, terrain: 'x' } }];
    expect(
      errorsOf(applyStoredChanges(shown, { header: shown.header, changed: broken, removed: [] })),
    ).not.toEqual([]);
    // O sobrado (pedaço 2,1) reaparece no pedaço 0,0, mas a linha velha dele não foi apagada.
    const moved = unwrap(
      placePiece(createEmptyMap(size), makePiece({ id: 'sobrado', x: 1, z: 1 })),
    );
    const twice = storedChunks(moved);
    expect(
      errorsOf(applyStoredChanges(shown, { header: shown.header, changed: twice, removed: [] }))[0],
    ).toMatch(/sobrado/);
  });
});
