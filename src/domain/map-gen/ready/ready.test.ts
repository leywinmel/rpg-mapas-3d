import { describe, expect, it } from 'vitest';
import {
  parseChunk,
  rotatedFootprint,
  serializeChunk,
  type MapModel,
  type MapPiece,
} from '../../map-v2';
import { READY_MAPS, readyMap } from '.';
import { buildShipMap, SHIP_SIZE } from './ship';

function allPieces(model: MapModel): MapPiece[] {
  return [...model.chunks.values()].flatMap((chunk) => chunk.pieces);
}

/** Pisos soltos (convés, laje) recebem as outras peças por cima: não contam como ocupação. */
const isSlab = (piece: MapPiece) =>
  piece.asset.source === 'catalog' && piece.asset.key.includes('assoalho');

describe('mapas prontos', () => {
  it.each(READY_MAPS)('shouldMakeChunksTheDomainAccepts ($id)', (ready) => {
    const { model, dropped, pieces } = ready.build();
    expect(dropped).toBe(0);
    expect(pieces).toBeGreaterThan(0);
    expect(model.size).toEqual(ready.size);
    for (const chunk of model.chunks.values()) {
      const parsed = parseChunk(JSON.parse(JSON.stringify(serializeChunk(chunk))), {
        size: model.size,
        coord: chunk.coord,
      });
      expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    }
  });

  it.each(READY_MAPS)('shouldNotStackTwoPiecesOnTheSameCell ($id)', (ready) => {
    const taken = new Map<string, string>();
    for (const piece of allPieces(ready.build().model)) {
      if (isSlab(piece)) continue;
      const size = rotatedFootprint(piece.footprint, piece.rotation);
      for (let dz = 0; dz < size.depth; dz += 1) {
        for (let dx = 0; dx < size.width; dx += 1) {
          const cell = `${piece.x + dx},${piece.z + dz}@${piece.level}`;
          const key = piece.asset.source === 'catalog' ? piece.asset.key : piece.asset.assetId;
          expect(taken.get(cell), `${key} em ${cell}`).toBeUndefined();
          taken.set(cell, key);
        }
      }
    }
  });

  it('shouldFindAReadyMapById', () => {
    expect(readyMap('navio')?.size).toEqual(SHIP_SIZE);
    expect(readyMap('nada')).toBeUndefined();
  });
});

describe('navio de guerra', () => {
  const { model } = buildShipMap();
  const pieces = allPieces(model);
  const count = (key: string) =>
    pieces.filter((piece) => piece.asset.source === 'catalog' && piece.asset.key === key).length;

  it('shouldHaveTheThreeFloorsOfAShip', () => {
    const levels = new Set(pieces.filter(isSlab).map((piece) => piece.level));
    expect([...levels].sort((a, b) => a - b)).toEqual([4, 8]);
  });

  it('shouldArmTheShipAndRigItWithMasts', () => {
    expect(count('nav-canhao')).toBe(12);
    expect(count('nav-mastro')).toBe(3);
    expect(count('nav-timao')).toBe(1);
    expect(count('nav-gurupes')).toBe(1);
    expect(count('nav-rede')).toBe(12);
  });

  it('shouldLeaveTheHatchesOpenOverTheStairs', () => {
    const deck = new Set(
      pieces.filter((piece) => isSlab(piece) && piece.level === 4).map((p) => `${p.x},${p.z}`),
    );
    for (const stairs of pieces.filter(
      (piece) =>
        piece.asset.source === 'catalog' &&
        piece.asset.key === 'med-escada-interna' &&
        piece.level === 0,
    )) {
      for (let dz = 0; dz < 3; dz += 1)
        expect(deck.has(`${stairs.x},${stairs.z + dz}`)).toBe(false);
    }
  });
});
