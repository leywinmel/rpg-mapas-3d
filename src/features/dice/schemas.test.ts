import { MAX_DICE_PER_ROLL, MAX_MODIFIER, MAX_NOTATION_LENGTH } from '@/domain';
import { createThrowSpec } from './physics/spec';
import { newRollSchema, storedResultsSchema, throwMessageSchema } from './schemas';
import { seededRandom } from './testing/seeded-random';

const ROOM = '33333333-3333-4333-8333-333333333333';
const ROLLER = '22222222-2222-4222-8222-222222222222';

const validRoll = () => ({
  roomId: ROOM,
  rollerId: ROLLER,
  notation: '2d6 + 3',
  results: [
    { sides: 6, value: 2 },
    { sides: 6, value: 6 },
  ],
  modifier: 3,
  total: 11,
  hidden: false,
});

describe('storedResultsSchema', () => {
  it('shouldAcceptTheShapeTheTableStores', () => {
    expect(storedResultsSchema.safeParse([{ sides: 6, value: 4 }]).success).toBe(true);
    expect(storedResultsSchema.safeParse([{ sides: 100, value: 100 }]).success).toBe(true);
  });

  it.each([
    ['vazio', []],
    ['texto', 'oops'],
    ['lado inexistente', [{ sides: 7, value: 1 }]],
    ['valor zero', [{ sides: 6, value: 0 }]],
    ['valor acima dos lados', [{ sides: 6, value: 7 }]],
    ['valor quebrado', [{ sides: 6, value: 2.5 }]],
    ['sem valor', [{ sides: 6 }]],
  ])('shouldRejectResults %s', (_, results) => {
    expect(storedResultsSchema.safeParse(results).success).toBe(false);
  });

  it('shouldRespectTheLimitOfDicePerRoll', () => {
    const dice = (count: number) => Array.from({ length: count }, () => ({ sides: 6, value: 1 }));
    expect(storedResultsSchema.safeParse(dice(MAX_DICE_PER_ROLL)).success).toBe(true);
    expect(storedResultsSchema.safeParse(dice(MAX_DICE_PER_ROLL + 1)).success).toBe(false);
  });
});

describe('newRollSchema', () => {
  it('shouldAcceptAFullRoll', () => {
    expect(newRollSchema.safeParse(validRoll()).success).toBe(true);
  });

  it.each([
    ['sala fora do formato', { roomId: 'abc' }],
    ['quem rolou fora do formato', { rollerId: '' }],
    ['notação vazia', { notation: '' }],
    ['notação longa demais', { notation: 'x'.repeat(MAX_NOTATION_LENGTH + 1) }],
    ['bônus acima do limite', { modifier: MAX_MODIFIER + 1 }],
    ['bônus abaixo do limite', { modifier: -MAX_MODIFIER - 1 }],
    ['bônus quebrado', { modifier: 1.5 }],
    ['total quebrado', { total: 1.5 }],
    ['escondida sem ser verdadeiro ou falso', { hidden: 'sim' }],
  ])('shouldRejectARollWith %s', (_, change) => {
    expect(newRollSchema.safeParse({ ...validRoll(), ...change }).success).toBe(false);
  });

  it('shouldAcceptTheLimitsThemselves', () => {
    const edge = {
      ...validRoll(),
      notation: 'x'.repeat(MAX_NOTATION_LENGTH),
      modifier: -MAX_MODIFIER,
    };
    expect(newRollSchema.safeParse(edge).success).toBe(true);
  });
});

describe('throwMessageSchema', () => {
  const message = () => ({
    rollId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    notation: '2d20kh1 + 3',
    spec: createThrowSpec([20, 20], seededRandom(1)),
  });

  it('shouldAcceptWhatTheRollerSends', () => {
    expect(throwMessageSchema.safeParse(message()).success).toBe(true);
  });

  it('shouldKeepTheSpecIntactThroughJson', () => {
    const sent = JSON.parse(JSON.stringify(message()));
    const parsed = throwMessageSchema.parse(sent);
    expect(parsed.spec).toEqual(message().spec);
  });

  it.each([
    ['sem id', { rollId: undefined }],
    ['notação vazia', { notation: '' }],
    ['arremesso vazio', { spec: { dice: [] } }],
    ['arremesso nulo', { spec: null }],
  ])('shouldRejectAMessage %s', (_, change) => {
    expect(throwMessageSchema.safeParse({ ...message(), ...change }).success).toBe(false);
  });
});
