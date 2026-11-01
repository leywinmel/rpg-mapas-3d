import { seededRandom } from '../testing/seeded-random';
import {
  combineHundred,
  orientationForValue,
  readValue,
  splitHundred,
  tiltDegrees,
} from './orientation';
import { DIE_KINDS, getDieShape } from './shapes';
import { multiply, normalizeQuat, rotationBetween, WORLD_UP, type Quat } from './vec';

const FLAT_TILT_DEGREES = 0.001;

/** Rotação qualquer, mas sempre a mesma para a mesma semente. */
function arbitraryRotation(random: () => number): Quat {
  return normalizeQuat([random() - 0.5, random() - 0.5, random() - 0.5, random() + 0.1]);
}

describe.each(DIE_KINDS)('leitura do %s', (kind) => {
  const { readings } = getDieShape(kind);

  it.each(readings.map((reading) => [reading.value, reading] as const))(
    'shouldReadValue %i when its direction points up',
    (value, reading) => {
      const rotation = rotationBetween(reading.up, WORLD_UP);
      expect(readValue(kind, rotation)).toBe(value);
      expect(tiltDegrees(kind, rotation)).toBeLessThan(FLAT_TILT_DEGREES);
    },
  );

  it('shouldTurnAnyPoseIntoAnyValueByTheShortestTurn', () => {
    const random = seededRandom(11);
    for (const { value } of readings) {
      const start = arbitraryRotation(random);
      const target = orientationForValue(kind, start, value);
      expect(target).not.toBeNull();
      if (!target) continue;
      expect(readValue(kind, target)).toBe(value);
      expect(tiltDegrees(kind, target)).toBeLessThan(FLAT_TILT_DEGREES);
    }
  });

  it('shouldRefuseAValueTheDieDoesNotHave', () => {
    expect(orientationForValue(kind, [0, 0, 0, 1], 1000)).toBeNull();
  });
});

describe('tiltDegrees', () => {
  it('shouldGrowAsTheDieLeansAway', () => {
    const { readings } = getDieShape('d6');
    const top = readings[0];
    if (!top) throw new Error('d6 sem faces');
    const flat = rotationBetween(top.up, WORLD_UP);
    const lean: Quat = [Math.sin(Math.PI / 12), 0, 0, Math.cos(Math.PI / 12)];
    const leaning = normalizeQuat(multiply(lean, flat));
    expect(tiltDegrees('d6', leaning)).toBeCloseTo(30, 0);
  });
});

describe('d100', () => {
  it('shouldCombineTensAndUnitsWithDoubleZeroMeaningOneHundred', () => {
    expect(combineHundred(0, 0)).toBe(100);
    expect(combineHundred(0, 7)).toBe(7);
    expect(combineHundred(30, 5)).toBe(35);
    expect(combineHundred(90, 9)).toBe(99);
    expect(combineHundred(10, 0)).toBe(10);
  });

  it('shouldSplitEveryValueBackIntoTheDiceThatMakeIt', () => {
    for (let value = 1; value <= 100; value++) {
      const { tens, units } = splitHundred(value);
      expect(tens % 10).toBe(0);
      expect(units).toBeGreaterThanOrEqual(0);
      expect(units).toBeLessThanOrEqual(9);
      expect(combineHundred(tens, units)).toBe(value);
    }
  });
});
