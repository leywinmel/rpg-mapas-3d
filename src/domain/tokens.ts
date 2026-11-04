/**
 * Regras puras dos tokens: tamanho em casas, onde ele cabe no mapa, para onde o arraste o leva e
 * como a vida muda. Os limites espelham os checks da tabela tokens (migration da F6).
 */
import type { Cell, GridSize } from './grid';

/** Lado do token em casas: 1×1 (pessoa) até 4×4 (dragão). */
export const MIN_TOKEN_SIZE = 1;
export const MAX_TOKEN_SIZE = 4;

/** Vida máxima aceita pelo banco (tokens.hp_max). */
export const MAX_TOKEN_HP = 100000;

export const MAX_TOKEN_NAME_LENGTH = 60;
export const MAX_TOKEN_NOTES_LENGTH = 2000;

export type TokenPlacement = { readonly x: number; readonly z: number; readonly size: number };

export function isValidTokenSize(size: number): boolean {
  return Number.isInteger(size) && size >= MIN_TOKEN_SIZE && size <= MAX_TOKEN_SIZE;
}

/** O token inteiro cabe no mapa? */
export function fitsInMap(map: GridSize, token: TokenPlacement): boolean {
  return (
    token.x >= 0 &&
    token.z >= 0 &&
    token.x + token.size <= map.width &&
    token.z + token.size <= map.depth
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Canto do token quando o cursor está na casa `cell`: o cursor fica no meio do token (num 2×2,
 * na casa de cima à esquerda do meio), e o token nunca sai do mapa.
 */
export function anchorUnderCursor(map: GridSize, cell: Cell, size: number): Cell {
  const offset = Math.floor((size - 1) / 2);
  return {
    x: clamp(cell.x - offset, 0, Math.max(map.width - size, 0)),
    z: clamp(cell.z - offset, 0, Math.max(map.depth - size, 0)),
  };
}

/** Casas que o token ocupa, linha a linha. */
export function tokenCells(token: TokenPlacement): Cell[] {
  const cells: Cell[] = [];
  for (let dz = 0; dz < token.size; dz += 1) {
    for (let dx = 0; dx < token.size; dx += 1) cells.push({ x: token.x + dx, z: token.z + dz });
  }
  return cells;
}

export type TokenHealth = { readonly current: number; readonly max: number };

/** Vida depois de dano (delta negativo) ou cura, presa entre 0 e a máxima. */
export function adjustHealth(health: TokenHealth, delta: number): number {
  return clamp(Math.round(health.current + delta), 0, health.max);
}

/** Fração da barra de vida, de 0 a 1 (vida máxima 0 = barra vazia). */
export function healthFraction(health: TokenHealth): number {
  if (health.max <= 0) return 0;
  return clamp(health.current / health.max, 0, 1);
}
