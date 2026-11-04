/** Régua da mesa: distância entre duas casas da grade, em casas e em metros. */
import type { Cell } from './grid';

/** Uma casa da grade vale 1,5 m (a escala do boneco 1×1 e do gerador de vilas). */
export const METERS_PER_CELL = 1.5;

export type Measurement = {
  readonly cells: number;
  readonly meters: number;
};

/**
 * Regra da diagonal do D&D 5e (distância de Chebyshev): andar na diagonal custa uma casa, como
 * andar reto. Por isso a distância é o maior dos dois deslocamentos, não a soma nem a hipotenusa.
 */
export function measureCells(from: Cell, to: Cell): Measurement {
  const cells = Math.max(Math.abs(to.x - from.x), Math.abs(to.z - from.z));
  return { cells, meters: cells * METERS_PER_CELL };
}
