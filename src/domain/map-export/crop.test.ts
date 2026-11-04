import { describe, expect, it } from 'vitest';
import {
  createEmptyMap,
  NO_FLOOR_INDEX,
  paintTerrainRect,
  placePiece,
  placeWall,
  type MapChunk,
  type MapModel,
} from '../map-v2';
import { makePiece, makeWall, unwrap } from '../map-v2/test-fixtures';
import { cropMapChunks } from './crop';

const size = { width: 70, depth: 40 };

function floorCount(chunk: MapChunk): number {
  return chunk.terrain.tiles.filter((tile) => tile !== NO_FLOOR_INDEX).length;
}

function total(chunks: MapChunk[], count: (chunk: MapChunk) => number): number {
  return chunks.reduce((sum, chunk) => sum + count(chunk), 0);
}

function mapWithThings(): MapModel {
  let model = createEmptyMap(size);
  // Carro 4×2 ancorado no pedaço (0, 0), avançando para o (1, 0).
  model = unwrap(
    placePiece(model, makePiece({ id: 'carro', x: 30, z: 4, footprint: { width: 4, depth: 2 } })),
  );
  model = unwrap(placePiece(model, makePiece({ id: 'barril', x: 2, z: 2 })));
  // Parede na aresta oeste da casa (40, 10): separa (39, 10) de (40, 10).
  return unwrap(placeWall(model, makeWall({ x: 40, z: 10, side: 'west' })));
}

describe('cropMapChunks', () => {
  it('a área inteira devolve os pedaços como estão', () => {
    const model = createEmptyMap(size);
    const chunks = cropMapChunks(model, { rect: { x: 0, z: 0, width: 70, depth: 40 } });
    expect(chunks).toHaveLength(6);
    expect(chunks[0]).toBe(model.chunks.get('0,0'));
  });

  it('corta o chão fora da área', () => {
    const chunks = cropMapChunks(createEmptyMap(size), {
      rect: { x: 30, z: 0, width: 4, depth: 3 },
    });
    expect(total(chunks, floorCount)).toBe(12);
  });

  it('peça grande ancorada fora da área entra quando alguma casa dela está dentro', () => {
    const chunks = cropMapChunks(mapWithThings(), { rect: { x: 33, z: 5, width: 2, depth: 2 } });
    const pieces = chunks.flatMap((chunk) => chunk.pieces.map((piece) => piece.id));
    expect(pieces).toEqual(['carro']);
  });

  it('parede fica quando uma das casas dos lados está na área', () => {
    const model = mapWithThings();
    const west = cropMapChunks(model, { rect: { x: 39, z: 10, width: 1, depth: 1 } });
    expect(total(west, (chunk) => chunk.walls.length)).toBe(1);
    const far = cropMapChunks(model, { rect: { x: 41, z: 10, width: 1, depth: 1 } });
    expect(total(far, (chunk) => chunk.walls.length)).toBe(0);
  });

  it('esconde o que está coberto, com as regras do banco', () => {
    const model = mapWithThings();
    const covered = (cell: { x: number; z: number }) => cell.x < 35;
    const chunks = cropMapChunks(model, {
      rect: { x: 0, z: 0, width: 70, depth: 40 },
      isHidden: covered,
    });
    const pieces = chunks.flatMap((chunk) => chunk.pieces.map((piece) => piece.id));
    // O barril está todo coberto; o carro tem casas cobertas, mas nenhuma à vista (30–33).
    expect(pieces).toEqual([]);
    expect(total(chunks, floorCount)).toBe((70 - 35) * 40);
    expect(total(chunks, (chunk) => chunk.walls.length)).toBe(1);
  });

  it('pedaço que fica vazio não volta', () => {
    let model = createEmptyMap(size);
    model = unwrap(
      paintTerrainRect(model, { from: { x: 0, z: 0 }, to: { x: 69, z: 39 }, tile: null }),
    );
    expect(cropMapChunks(model, { rect: { x: 0, z: 0, width: 70, depth: 40 } })).toEqual([]);
  });

  it('área fora do mapa não devolve nada', () => {
    expect(
      cropMapChunks(createEmptyMap(size), { rect: { x: 80, z: 0, width: 5, depth: 5 } }),
    ).toEqual([]);
  });
});
