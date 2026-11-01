import { DICE_SIDES, MAX_DICE_PER_ROLL, type DieSides } from '@/domain';
import { seededRandom } from '../testing/seeded-random';
import { SPEC_DECIMALS, TRAY_HALF_DEPTH, TRAY_HALF_WIDTH } from './constants';
import { BODY_KINDS } from './shapes';
import { createThrowSpec, secureRandom, throwSpecSchema, type ThrowSpec } from './spec';

const DECIMAL_FACTOR = 10 ** SPEC_DECIMALS;

function numbersOf(spec: ThrowSpec): number[] {
  return spec.dice.flatMap((die) =>
    die.bodies.flatMap((body) => [
      ...body.position,
      ...body.rotation,
      ...body.linearVelocity,
      ...body.angularVelocity,
    ]),
  );
}

function everyDie(count = 1): DieSides[] {
  return DICE_SIDES.flatMap((sides) => Array<DieSides>(count).fill(sides));
}

describe('createThrowSpec', () => {
  it('shouldGiveEachDieTheBodiesItNeeds', () => {
    const spec = createThrowSpec(everyDie(), seededRandom(1));
    spec.dice.forEach((die) => expect(die.bodies).toHaveLength(BODY_KINDS[die.sides].length));
    expect(spec.dice.find((die) => die.sides === 100)?.bodies).toHaveLength(2);
  });

  it('shouldKeepTheOrderOfTheDiceItWasAskedFor', () => {
    const wanted: DieSides[] = [20, 4, 100, 6];
    expect(createThrowSpec(wanted, seededRandom(2)).dice.map((die) => die.sides)).toEqual(wanted);
  });

  it('shouldBeRepeatableWithTheSameSequenceAndDifferentOtherwise', () => {
    const first = createThrowSpec(everyDie(2), seededRandom(3));
    expect(createThrowSpec(everyDie(2), seededRandom(3))).toEqual(first);
    expect(createThrowSpec(everyDie(2), seededRandom(4))).not.toEqual(first);
  });

  it('shouldSurviveTheTripThroughJsonUnchanged', () => {
    const spec = createThrowSpec(everyDie(2), seededRandom(5));
    expect(JSON.parse(JSON.stringify(spec))).toEqual(spec);
  });

  it('shouldRoundEverythingToTheAgreedDecimals', () => {
    const values = numbersOf(createThrowSpec(everyDie(3), seededRandom(6)));
    for (const value of values) {
      expect(Math.abs(value * DECIMAL_FACTOR - Math.round(value * DECIMAL_FACTOR))).toBeLessThan(
        1e-6,
      );
      expect(Object.is(value, -0)).toBe(false);
    }
  });

  it('shouldDropEveryBodyInsideTheTrayWithoutOverlapping', () => {
    const spec = createThrowSpec(Array<DieSides>(MAX_DICE_PER_ROLL).fill(20), seededRandom(7));
    const positions = spec.dice.flatMap((die) => die.bodies.map((body) => body.position));
    for (const [x, y, z] of positions) {
      expect(Math.abs(x)).toBeLessThan(TRAY_HALF_WIDTH);
      expect(Math.abs(z)).toBeLessThan(TRAY_HALF_DEPTH);
      expect(y).toBeGreaterThan(0);
    }
    const minimumGap = Math.min(
      ...positions.flatMap((a, i) =>
        positions.slice(i + 1).map((b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])),
      ),
    );
    expect(minimumGap).toBeGreaterThan(1);
  });

  it('shouldAlwaysProduceSomethingTheNetworkSchemaAccepts', () => {
    for (let seed = 0; seed < 20; seed++) {
      const spec = createThrowSpec(everyDie(7), seededRandom(seed));
      expect(throwSpecSchema.safeParse(spec).success).toBe(true);
    }
  });
});

describe('throwSpecSchema', () => {
  const valid = () => createThrowSpec([20, 100], seededRandom(9));
  type Mutable = { dice: Array<{ sides: number; bodies: Array<Record<string, number[]>> }> };
  const clone = (): Mutable => JSON.parse(JSON.stringify(valid())) as Mutable;

  it('shouldAcceptAGeneratedSpec', () => {
    expect(throwSpecSchema.safeParse(valid()).success).toBe(true);
  });

  it('shouldRejectMoreDiceThanTheRollLimit', () => {
    const spec = createThrowSpec(Array<DieSides>(MAX_DICE_PER_ROLL + 1).fill(6), seededRandom(10));
    expect(throwSpecSchema.safeParse(spec).success).toBe(false);
  });

  it('shouldRejectAnEmptyThrow', () => {
    expect(throwSpecSchema.safeParse({ dice: [] }).success).toBe(false);
  });

  it('shouldRejectADieThatDoesNotExist', () => {
    const spec = clone();
    spec.dice[0]!.sides = 7;
    expect(throwSpecSchema.safeParse(spec).success).toBe(false);
  });

  it('shouldRejectTheWrongNumberOfBodies', () => {
    const spec = clone();
    spec.dice[1]!.bodies.pop();
    expect(throwSpecSchema.safeParse(spec).success).toBe(false);
  });

  it.each([
    ['position', [0, 99, 0]],
    ['position', [Number.NaN, 1, 0]],
    ['linearVelocity', [1e6, 0, 0]],
    ['angularVelocity', [0, -1e6, 0]],
    ['rotation', [0, 0, 0, 0]],
    ['rotation', [5, 0, 0, 0]],
  ])('shouldRejectAnImpossible%s %j', (field, value) => {
    const spec = clone();
    spec.dice[0]!.bodies[0]![field] = value as number[];
    expect(throwSpecSchema.safeParse(spec).success).toBe(false);
  });

  it('shouldRejectExtraNestingAndNonObjects', () => {
    expect(throwSpecSchema.safeParse(null).success).toBe(false);
    expect(throwSpecSchema.safeParse('{"dice":[]}').success).toBe(false);
    expect(throwSpecSchema.safeParse({ dice: 'x' }).success).toBe(false);
  });
});

describe('secureRandom', () => {
  it('shouldStayInsideZeroInclusiveAndOneExclusive', () => {
    for (let index = 0; index < 500; index++) {
      const value = secureRandom();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
