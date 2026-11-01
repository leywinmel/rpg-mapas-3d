const MIX_INCREMENT = 0x6d2b79f5;
const UINT32_RANGE = 2 ** 32;

/** Sequência pseudo-aleatória fixa (mulberry32) para os testes não dependerem da sorte. */
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + MIX_INCREMENT) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };
}
