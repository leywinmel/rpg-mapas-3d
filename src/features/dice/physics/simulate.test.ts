import RAPIER from '@dimforge/rapier3d-compat';
import { diceToThrow, evaluateDice, parseDice, type DieSides } from '@/domain';
import { seededRandom } from '../testing/seeded-random';
import {
  FLOATS_PER_BODY,
  MAX_REST_TILT_DEGREES,
  MAX_SIMULATION_STEPS,
  TRAY_HALF_DEPTH,
  TRAY_HALF_WIDTH,
} from './constants';
import { planCorrections } from './correction';
import { readValue, tiltDegrees } from './orientation';
import { BODY_KINDS, getDieShape } from './shapes';
import {
  isCleanThrow,
  positionAt,
  rotationAt,
  simulateThrow,
  type SimulatedThrow,
} from './simulate';
import { createThrowSpec, type ThrowSpec } from './spec';
import { dot } from './vec';

beforeAll(async () => {
  await RAPIER.init();
});

function simulate(spec: ThrowSpec): SimulatedThrow {
  return simulateThrow(RAPIER, spec);
}

function expectedRange(sides: DieSides): [number, number] {
  return [1, sides];
}

describe('simulateThrow', () => {
  it('shouldGiveTheSameFramesAndValuesForTheSameInput', () => {
    const spec = createThrowSpec([20, 20, 6, 100, 4, 12, 8, 10], seededRandom(7));
    const first = simulate(spec);
    // O que chega pela rede passou por JSON: tem de render o mesmo, bit a bit.
    const second = simulate(JSON.parse(JSON.stringify(spec)) as ThrowSpec);

    expect(second.frameCount).toBe(first.frameCount);
    expect(second.values).toEqual(first.values);
    expect(second.settled).toBe(first.settled);
    expect(Array.from(second.frames)).toEqual(Array.from(first.frames));
  });

  it('shouldNotDependOnWhatWasSimulatedBefore', () => {
    const target = createThrowSpec([6, 6, 6], seededRandom(21));
    const alone = simulate(target);
    simulate(createThrowSpec(Array<DieSides>(20).fill(20), seededRandom(22)));
    expect(Array.from(simulate(target).frames)).toEqual(Array.from(alone.frames));
  });

  it('shouldChangeWhenTheThrowChanges', () => {
    const a = simulate(createThrowSpec([20, 20, 20, 20], seededRandom(1)));
    const b = simulate(createThrowSpec([20, 20, 20, 20], seededRandom(2)));
    expect(Array.from(b.frames)).not.toEqual(Array.from(a.frames));
  });

  it('shouldRecordTheStartingPoseAndKeepEveryFrameFinite', () => {
    const spec = createThrowSpec([6, 20, 100], seededRandom(3));
    const sim = simulate(spec);
    expect(sim.frames).toHaveLength(sim.frameCount * sim.bodies.length * FLOATS_PER_BODY);
    expect(Array.from(sim.frames).every(Number.isFinite)).toBe(true);
    const firstDie = spec.dice[0]?.bodies[0];
    const start = positionAt(sim, 0, 0);
    expect(start[1]).toBeCloseTo(firstDie?.position[1] ?? Number.NaN, 3);
  });

  it('shouldStopWhenEverythingSettlesWithinTheTimeLimit', () => {
    const sim = simulate(createThrowSpec([6, 6, 20], seededRandom(4)));
    expect(sim.settled).toBe(true);
    expect(sim.frameCount).toBeGreaterThan(1);
    expect(sim.frameCount).toBeLessThanOrEqual(MAX_SIMULATION_STEPS + 1);
  });

  it('shouldKeepAllDiceInsideTheTrayAboveTheFloor', () => {
    const dice = Array<DieSides>(30).fill(12);
    const sim = simulate(createThrowSpec(dice, seededRandom(5)));
    for (let frame = 0; frame < sim.frameCount; frame++) {
      for (let body = 0; body < sim.bodies.length; body++) {
        const [x, y, z] = positionAt(sim, frame, body);
        expect(Math.abs(x)).toBeLessThan(TRAY_HALF_WIDTH);
        expect(Math.abs(z)).toBeLessThan(TRAY_HALF_DEPTH);
        expect(y).toBeGreaterThan(0);
      }
    }
  });

  it('shouldRestFlatOnAFaceAtTheHeightOfItsInradius', () => {
    const shape = getDieShape('d20');
    const reading = shape.readings[0];
    if (!reading) throw new Error('d20 sem faces');
    const inradius = shape.vertices.reduce(
      (best, vertex) => Math.max(best, dot(vertex, reading.up)),
      0,
    );
    for (const seed of [6, 16, 26]) {
      const sim = simulate(createThrowSpec([20], seededRandom(seed)));
      expect(isCleanThrow(sim)).toBe(true);
      const [, height] = positionAt(sim, sim.frameCount - 1, 0);
      expect(height).toBeCloseTo(inradius, 1);
    }
  });

  it('shouldReportAnUnsettledThrowAsNotClean', () => {
    const sim = simulate(createThrowSpec([6], seededRandom(8)));
    expect(isCleanThrow({ ...sim, settled: false })).toBe(false);
    expect(isCleanThrow({ ...sim, maxTiltDegrees: MAX_REST_TILT_DEGREES + 1 })).toBe(false);
    expect(isCleanThrow({ ...sim, maxTiltDegrees: 0 })).toBe(sim.settled);
  });
});

describe('valores lidos', () => {
  it.each(([4, 6, 8, 10, 12, 20, 100] as const).map((sides) => [sides]))(
    'shouldReadAValueInsideTheRangeOfTheD%i',
    (sides) => {
      const [min, max] = expectedRange(sides);
      const sim = simulate(
        createThrowSpec(Array<DieSides>(8).fill(sides), seededRandom(30 + sides)),
      );
      expect(sim.values).toHaveLength(8);
      for (const value of sim.values) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThanOrEqual(max);
      }
    },
  );

  it('shouldReadEachValueFromTheFinalPoseOfItsBodies', () => {
    const sim = simulate(createThrowSpec([8, 12], seededRandom(9)));
    sim.bodies.forEach((kind, body) => {
      const value = readValue(kind, rotationAt(sim, sim.frameCount - 1, body));
      expect(sim.values[body]).toBe(value);
    });
  });

  it('shouldCombineTheTwoD10sOfAHundredIntoOneValue', () => {
    const sim = simulate(createThrowSpec([100, 100, 100, 100], seededRandom(12)));
    expect(sim.bodies).toEqual(Array(4).fill(BODY_KINDS[100]).flat());
    sim.values.forEach((value, die) => {
      const tens = readValue('d100-tens', rotationAt(sim, sim.frameCount - 1, die * 2));
      const units = readValue('d100-units', rotationAt(sim, sim.frameCount - 1, die * 2 + 1));
      expect(value).toBe(tens + units || 100);
    });
  });

  it('shouldFeedTheDomainRulesDirectly', () => {
    const parsed = parseDice('2d20kh1+d6+3');
    if (!parsed.ok) throw new Error(parsed.error);
    const sim = simulate(createThrowSpec(diceToThrow(parsed.expression), seededRandom(13)));
    const outcome = evaluateDice(parsed.expression, sim.values);
    expect(outcome.results.map((die) => die.value)).toEqual([...sim.values]);
    expect(outcome.total).toBeGreaterThanOrEqual(1 + 1 + 3);
  });

  it('shouldMeasureHowFarEachFinalFaceIsFromUpright', () => {
    const sim = simulate(createThrowSpec([20, 20, 20], seededRandom(14)));
    const tilts = sim.bodies.map((kind, body) =>
      tiltDegrees(kind, rotationAt(sim, sim.frameCount - 1, body)),
    );
    expect(sim.maxTiltDegrees).toBeCloseTo(Math.max(...tilts), 6);
  });
});

describe('distribuição', () => {
  /** Qui-quadrado crítico (p = 0,001) para cada número de lados menos um grau de liberdade. */
  const CHI_SQUARED_LIMIT: Record<number, number> = {
    4: 16.27,
    6: 20.52,
    8: 24.32,
    10: 27.88,
    12: 31.26,
    20: 43.82,
  };
  const THROWS = 25;
  const DICE_PER_THROW = 8;

  it.each(Object.keys(CHI_SQUARED_LIMIT).map((sides) => [Number(sides) as DieSides]))(
    'shouldLandOnEveryFaceOfTheD%i about equally often',
    (sides) => {
      const random = seededRandom(100 + sides);
      const counts = new Map<number, number>();
      for (let index = 0; index < THROWS; index++) {
        const spec = createThrowSpec(Array<DieSides>(DICE_PER_THROW).fill(sides), random);
        for (const value of simulate(spec).values) counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      const expected = (THROWS * DICE_PER_THROW) / sides;
      let chiSquared = 0;
      for (let face = 1; face <= sides; face++) {
        chiSquared += ((counts.get(face) ?? 0) - expected) ** 2 / expected;
      }
      expect(chiSquared).toBeLessThan(CHI_SQUARED_LIMIT[sides] ?? 0);
    },
  );
});

describe('planCorrections', () => {
  const spec = createThrowSpec([6, 20, 100, 4], seededRandom(15));

  it('shouldAskForNothingWhenTheDatabaseAgrees', () => {
    const sim = simulate(spec);
    expect(planCorrections(sim, sim.values)).toEqual([]);
  });

  it('shouldIgnoreRowsThatDoNotMatchTheThrow', () => {
    const sim = simulate(spec);
    expect(planCorrections(sim, [1, 2])).toEqual([]);
  });

  it('shouldTurnOnlyTheDieThatDisagreesToTheRecordedFace', () => {
    const sim = simulate(spec);
    const wrong = sim.values.map((value, die) => (die === 1 ? (value % 20) + 1 : value));
    const corrections = planCorrections(sim, wrong);

    expect(corrections).toHaveLength(1);
    const [fix] = corrections;
    expect(fix?.body).toBe(1);
    expect(readValue('d20', fix?.to ?? [0, 0, 0, 1])).toBe(wrong[1]);
    expect(tiltDegrees('d20', fix?.to ?? [0, 0, 0, 1])).toBeLessThan(0.001);
  });

  it('shouldCorrectBothD10sOfAHundredWhenTheTotalDiffers', () => {
    const sim = simulate(spec);
    const target = sim.values[2] === 100 ? 37 : 100;
    const wrong = sim.values.map((value, die) => (die === 2 ? target : value));
    const corrections = planCorrections(sim, wrong);

    const tens = corrections.find((fix) => sim.bodies[fix.body] === 'd100-tens');
    const units = corrections.find((fix) => sim.bodies[fix.body] === 'd100-units');
    const tensRead = readValue('d100-tens', tens?.to ?? rotationAt(sim, sim.frameCount - 1, 4));
    const unitsRead = readValue('d100-units', units?.to ?? rotationAt(sim, sim.frameCount - 1, 5));
    expect(tensRead + unitsRead || 100).toBe(target);
  });

  it('shouldStartFromTheFinalPoseOfTheSimulation', () => {
    const sim = simulate(spec);
    const wrong = sim.values.map((value, die) => (die === 0 ? (value % 6) + 1 : value));
    const [fix] = planCorrections(sim, wrong);
    expect(fix?.from).toEqual(rotationAt(sim, sim.frameCount - 1, 0));
  });
});
