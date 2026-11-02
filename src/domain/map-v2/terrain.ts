/**
 * Terreno de um pedaço: uma peça de chão (ou nenhuma) e uma altura por casa. Em memória fica
 * decodificado, em arrays tipados, para consultar e pintar uma casa em tempo constante; só vira
 * paleta mais corridas (RLE) ao serializar. Os arrays NÃO podem ser mutados depois de criados:
 * as operações copiam o array do pedaço tocado, e é isso que deixa os outros pedaços compartilhados.
 */
import type { MapResult } from '../map-document';
import { MAX_TERRAIN_HEIGHT } from './constants';
import type { CellRect } from './rect';
import { decodeRuns, encodeRuns } from './rle';
import type { TerrainDocument } from './schema';
import { fail, ok } from './validation';

/** Índice da paleta que significa "sem chão" (o buraco no mapa). */
export const NO_FLOOR_INDEX = 0;

export type ChunkTerrain = {
  /** Peças de chão usadas no pedaço, sem repetição. O índice i ≥ 1 aponta para palette[i - 1]. */
  readonly palette: readonly string[];
  /**
   * Índice da paleta de cada casa, linha a linha (z, depois x). É 16 bits porque, no limite,
   * um pedaço tem uma peça diferente por casa (1024 entradas).
   */
  readonly tiles: Uint16Array;
  /** Altura do terreno de cada casa, em degraus, na mesma ordem. Casa sem chão tem altura 0. */
  readonly heights: Uint8Array;
};

/** Pedaço liso: a mesma peça de chão (ou nenhuma) em todas as casas, no nível zero. */
export function createUniformTerrain(cellCount: number, tile: string | null): ChunkTerrain {
  const tiles = new Uint16Array(cellCount);
  if (tile === null) return { palette: [], tiles, heights: new Uint8Array(cellCount) };
  tiles.fill(1);
  return { palette: [tile], tiles, heights: new Uint8Array(cellCount) };
}

/** Peça de chão da casa (índice dentro do pedaço), ou null quando não há chão. */
export function tileAtIndex(terrain: ChunkTerrain, index: number): string | null {
  const paletteIndex = terrain.tiles[index] ?? NO_FLOOR_INDEX;
  return paletteIndex === NO_FLOOR_INDEX ? null : (terrain.palette[paletteIndex - 1] ?? null);
}

/**
 * Terreno compacto para gravar. A paleta é reindexada pela ordem em que as peças aparecem: o
 * mesmo terreno gera sempre o mesmo JSON (o autosave compara pedaços sem falso "mudou") e as
 * peças que ninguém mais usa saem da paleta.
 */
export function encodeTerrain(terrain: ChunkTerrain): TerrainDocument {
  const tiles = encodeRuns(terrain.tiles);
  const palette: string[] = [];
  const newIndexOf = new Map<number, number>();
  for (let run = 0; run < tiles.length; run += 2) {
    const oldIndex = tiles[run]!;
    if (oldIndex === NO_FLOOR_INDEX) continue;
    let newIndex = newIndexOf.get(oldIndex);
    if (newIndex === undefined) {
      palette.push(terrain.palette[oldIndex - 1]!);
      newIndex = palette.length;
      newIndexOf.set(oldIndex, newIndex);
    }
    // Trocar índices distintos por índices distintos não junta corridas vizinhas.
    tiles[run] = newIndex;
  }
  return { palette, tiles, heights: encodeRuns(terrain.heights) };
}

function firstDuplicate(values: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
}

/** Índice da primeira casa sem chão que tem altura, ou -1. */
function firstHoleWithHeight(tiles: readonly number[], heights: readonly number[]): number {
  return tiles.findIndex((tile, index) => tile === NO_FLOOR_INDEX && heights[index] !== 0);
}

/**
 * Lê o terreno do documento. As corridas precisam fechar a conta das casas do pedaço, os
 * índices precisam existir na paleta e as alturas ficar no limite. Casa sem chão não tem
 * altura: é a mesma regra do v1 (tirar o chão apaga a altura), e sem ela o mesmo mapa teria
 * dois jeitos de ser gravado.
 */
export function decodeTerrain(
  document: TerrainDocument,
  bounds: CellRect,
): MapResult<ChunkTerrain> {
  const cellCount = bounds.width * bounds.depth;
  const repeated = firstDuplicate(document.palette);
  if (repeated !== undefined) {
    return fail([`Terreno: a peça de chão "${repeated}" aparece duas vezes na paleta.`]);
  }
  const tiles = decodeRuns(document.tiles, {
    length: cellCount,
    maxValue: document.palette.length,
    label: 'Terreno (peças de chão)',
  });
  if (!tiles.ok) return tiles;
  const heights = decodeRuns(document.heights, {
    length: cellCount,
    maxValue: MAX_TERRAIN_HEIGHT,
    label: 'Terreno (alturas)',
  });
  if (!heights.ok) return heights;

  const hole = firstHoleWithHeight(tiles.value, heights.value);
  if (hole >= 0) {
    const x = bounds.x + (hole % bounds.width);
    const z = bounds.z + Math.floor(hole / bounds.width);
    return fail([`Terreno: a casa (${x}, ${z}) está sem chão mas tem altura.`]);
  }
  return ok({
    palette: [...document.palette],
    tiles: Uint16Array.from(tiles.value),
    heights: Uint8Array.from(heights.value),
  });
}
