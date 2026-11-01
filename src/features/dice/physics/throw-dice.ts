import type { DieSides } from '@/domain';
import { MAX_THROW_ATTEMPTS } from './constants';
import { isCleanThrow, simulateThrow, type RapierModule, type SimulatedThrow } from './simulate';
import { createThrowSpec, secureRandom, type Random, type ThrowSpec } from './spec';

export type PhysicalThrow = {
  readonly spec: ThrowSpec;
  readonly sim: SimulatedThrow;
};

export type ThrowDiceOptions = {
  rapier: RapierModule;
  /** Lados de cada dado, na ordem da rolagem (ver `diceToThrow`). */
  dice: readonly DieSides[];
  random?: Random;
  /** Trocável nos testes. */
  simulate?: typeof simulateThrow;
};

/** Melhor das duas: o que assentou, e entre os que assentaram o menos torto. */
function isBetter(candidate: SimulatedThrow, current: SimulatedThrow): boolean {
  if (candidate.settled !== current.settled) return candidate.settled;
  return candidate.maxTiltDegrees < current.maxTiltDegrees;
}

/**
 * Quem rola sorteia e simula o arremesso. Se algum dado terminar apoiado torto (numa
 * parede ou em cima de outro) joga de novo, como numa mesa de verdade; depois de algumas
 * tentativas fica com o menos torto. Só quem rola faz isso: os outros reproduzem o
 * arremesso escolhido, então não precisam concordar sobre as tentativas descartadas.
 */
export function throwDice({
  rapier,
  dice,
  random = secureRandom,
  simulate = simulateThrow,
}: ThrowDiceOptions): PhysicalThrow {
  let best: PhysicalThrow | null = null;
  for (let attempt = 0; attempt < MAX_THROW_ATTEMPTS; attempt++) {
    const spec = createThrowSpec(dice, random);
    const sim = simulate(rapier, spec);
    if (isCleanThrow(sim)) return { spec, sim };
    if (!best || isBetter(sim, best.sim)) best = { spec, sim };
  }
  if (!best) throw new Error('Nenhuma tentativa de arremesso foi feita.');
  return best;
}
