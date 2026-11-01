import RAPIER from '@dimforge/rapier3d-compat';
import type { DieSides } from '@/domain';
import { seededRandom } from '../testing/seeded-random';
import { MAX_REST_TILT_DEGREES, MAX_THROW_ATTEMPTS } from './constants';
import { isCleanThrow, simulateThrow, type SimulatedThrow } from './simulate';
import { throwSpecSchema } from './spec';
import { throwDice } from './throw-dice';

beforeAll(async () => {
  await RAPIER.init();
});

function fakeSim(overrides: Partial<SimulatedThrow>): SimulatedThrow {
  return {
    sides: [6],
    bodies: ['d6'],
    frames: new Float32Array(7),
    frameCount: 1,
    settled: true,
    values: [3],
    maxTiltDegrees: 0,
    ...overrides,
  };
}

describe('throwDice', () => {
  it('shouldReturnTheSpecAndSimulationOfTheSameThrow', () => {
    const dice: DieSides[] = [20, 6, 100];
    const { spec, sim } = throwDice({ rapier: RAPIER, dice, random: seededRandom(1) });
    expect(spec.dice.map((die) => die.sides)).toEqual(dice);
    expect(throwSpecSchema.safeParse(spec).success).toBe(true);
    // Quem assiste roda o spec e precisa chegar nos mesmos valores.
    expect(simulateThrow(RAPIER, spec).values).toEqual(sim.values);
  });

  it('shouldStopAtTheFirstCleanAttempt', () => {
    const simulate = vi.fn(() => fakeSim({ maxTiltDegrees: 1 }));
    throwDice({ rapier: RAPIER, dice: [6], random: seededRandom(2), simulate });
    expect(simulate).toHaveBeenCalledTimes(1);
  });

  it('shouldThrowAgainWhenADieEndsLeaningThenKeepTheCleanOne', () => {
    const tilts = [40, 25, 0];
    const simulate = vi.fn(() => fakeSim({ maxTiltDegrees: tilts.shift() ?? 0 }));
    const result = throwDice({ rapier: RAPIER, dice: [6], random: seededRandom(3), simulate });
    expect(simulate).toHaveBeenCalledTimes(3);
    expect(isCleanThrow(result.sim)).toBe(true);
  });

  it('shouldKeepTheLeastLeaningAttemptWhenNoneIsClean', () => {
    const tilts = [40, 12, 33, 20, 50, 45, 30, 60];
    const simulate = vi.fn(() => fakeSim({ maxTiltDegrees: tilts.shift() ?? 99 }));
    const result = throwDice({ rapier: RAPIER, dice: [6], random: seededRandom(4), simulate });
    expect(simulate).toHaveBeenCalledTimes(MAX_THROW_ATTEMPTS);
    expect(result.sim.maxTiltDegrees).toBe(12);
  });

  it('shouldPreferASettledAttemptOverAnUnsettledOne', () => {
    const attempts = [
      fakeSim({ settled: false, maxTiltDegrees: 0 }),
      fakeSim({ settled: true, maxTiltDegrees: MAX_REST_TILT_DEGREES + 20 }),
    ];
    const simulate = vi.fn(
      () => attempts.shift() ?? fakeSim({ settled: false, maxTiltDegrees: 90 }),
    );
    const result = throwDice({ rapier: RAPIER, dice: [6], random: seededRandom(5), simulate });
    expect(result.sim.settled).toBe(true);
  });

  it('shouldDrawEveryAttemptFromTheInjectedSequence', () => {
    const first = throwDice({ rapier: RAPIER, dice: [8, 8], random: seededRandom(6) });
    const again = throwDice({ rapier: RAPIER, dice: [8, 8], random: seededRandom(6) });
    expect(again.spec).toEqual(first.spec);
  });
});
