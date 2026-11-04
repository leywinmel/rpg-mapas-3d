/**
 * Sorteio determinístico: a mesma semente dá sempre a mesma vila. Sem Math.random, para o
 * gerador ser testável e para o mestre poder repetir um mapa só guardando o número.
 */

/** Maior semente aceita: cabe num inteiro de 31 bits, que o campo de número mostra sem perder casas. */
export const MAX_SEED = 2_147_483_647;

export type Random = {
  /** Número em [0, 1). */
  readonly next: () => number;
  /** Inteiro de min a max, os dois inclusive. */
  readonly between: (min: number, max: number) => number;
  /** Verdadeiro com a probabilidade dada (0 a 1). */
  readonly chance: (probability: number) => boolean;
  /** Um item da lista (que não pode ser vazia). */
  readonly pick: <T>(items: readonly T[]) => T;
};

/** Gerador pequeno e rápido (mulberry32): mesma semente, mesma sequência. */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const between = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    between,
    chance: (probability) => next() < probability,
    pick: <T>(items: readonly T[]) => items[between(0, items.length - 1)]!,
  };
}

/** Semente derivada (de um quarteirão, de uma casa): muda um pedaço sem mexer nos outros. */
export function deriveSeed(seed: number, ...parts: readonly number[]): number {
  let hash = seed >>> 0;
  for (const part of parts) {
    hash = Math.imul(hash ^ (part >>> 0), 0x9e3779b1) >>> 0;
    hash = (hash ^ (hash >>> 16)) >>> 0;
  }
  return hash % MAX_SEED;
}
