/**
 * Névoa de guerra: um bit por casa (1 = coberta). 100×100 cabe em 1.250 bytes.
 * Convenção igual à do banco (get_bit do Postgres): o bit n fica no byte n >> 3,
 * posição n & 7, contando do bit menos significativo.
 */
import { cellIndex, cellsInRect, isInside, type Cell, type GridSize } from './grid';

export type FogMask = {
  readonly width: number;
  readonly depth: number;
  readonly bits: Uint8Array;
};

export function byteLengthFor(size: GridSize): number {
  return Math.ceil((size.width * size.depth) / 8);
}

/** Névoa nova: tudo coberto (o mestre revela aos poucos) ou tudo visível. */
export function createFog(size: GridSize, covered: boolean): FogMask {
  const bits = new Uint8Array(byteLengthFor(size));
  if (covered) {
    bits.fill(0xff);
    // Zera os bits de sobra do último byte para não marcar casas que não existem.
    const total = size.width * size.depth;
    const extra = bits.length * 8 - total;
    if (extra > 0) bits[bits.length - 1] = 0xff >> extra;
  }
  return { width: size.width, depth: size.depth, bits };
}

export function isCovered(fog: FogMask, cell: Cell): boolean {
  if (!isInside(fog, cell)) return false;
  const n = cellIndex(fog, cell);
  const byte = fog.bits[n >> 3] ?? 0;
  return (byte & (1 << (n & 7))) !== 0;
}

/** Devolve uma névoa nova com o retângulo coberto (true) ou revelado (false). Não altera a original. */
export function paintRect(fog: FogMask, a: Cell, b: Cell, covered: boolean): FogMask {
  const bits = fog.bits.slice();
  for (const cell of cellsInRect(fog, a, b)) {
    const n = cellIndex(fog, cell);
    const mask = 1 << (n & 7);
    const current = bits[n >> 3] ?? 0;
    bits[n >> 3] = covered ? current | mask : current & ~mask;
  }
  return { width: fog.width, depth: fog.depth, bits };
}

export function countCovered(fog: FogMask): number {
  let total = 0;
  for (const byte of fog.bits) {
    let value = byte;
    while (value) {
      total += value & 1;
      value >>= 1;
    }
  }
  return total;
}

/** Formato que o Supabase devolve e aceita para colunas bytea: "\x0a1b...". */
export function fogToBytea(fog: FogMask): string {
  let hex = '\\x';
  for (const byte of fog.bits) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

export function fogFromBytea(size: GridSize, value: string | null | undefined): FogMask {
  const fog = createFog(size, false);
  if (!value) return fog;
  const hex = value.startsWith('\\x') ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error('Névoa salva em formato inválido.');
  }
  const length = Math.min(hex.length / 2, fog.bits.length);
  for (let i = 0; i < length; i += 1) fog.bits[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return fog;
}
