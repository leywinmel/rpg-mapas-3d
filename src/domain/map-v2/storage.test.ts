import { MAX_REPORTED_ERRORS } from './constants';
import { createEmptyMap, getChunk, piecesOccupyingCell, terrainAt } from './model';
import { paintTerrainRect, placePiece, placeWall, setTerrainHeight } from './operations';
import { loadMapModel, serializeMapModel, type StoredChunk } from './storage';
import { errorsOf, makePiece, makeWall, unwrap } from './test-fixtures';
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

  it('shouldReadTheLargestMapWithAllItsChunks', () => {
    const model = createEmptyMap({ width: 1000, depth: 1000 });
    const loaded = unwrap(load(model, storedChunks(model)));
    expect(loaded.chunks.size).toBe(1024);
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

  it('shouldRejectAMissingChunk', () => {
    const model = editedMap();
    const chunks = storedChunks(model).filter(({ coord }) => coord.cx !== 1 || coord.cz !== 1);
    expect(errorsOf(load(model, chunks))[0]).toMatch(
      /Falta 1 pedaço do mapa, a começar pelo \(1, 1\)/,
    );
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
