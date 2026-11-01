import { parseDice, evaluateDice, type DiceOutcome } from '@/domain';
import type { AppSupabaseClient } from '@/lib/supabase';
import { HISTORY_LIMIT } from '../constants';
import { DiceError } from './dice-errors';
import { createDiceService } from './dice-service';

type Result = { data: unknown; error: unknown };
type Call = { method: string; args: unknown[] };

/**
 * Cliente falso do Supabase: cada `from()` devolve um construtor encadeável que registra
 * as chamadas e resolve com o resultado combinado no teste.
 */
function fakeClient(result: Result) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of [
    'select',
    'eq',
    'order',
    'limit',
    'insert',
    'delete',
    'maybeSingle',
    'single',
  ]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder.then = (resolve: (value: Result) => unknown) => resolve(result);
  const client = {
    from: (table: string) => {
      calls.push({ method: 'from', args: [table] });
      return builder;
    },
  };
  return { client: client as unknown as AppSupabaseClient, calls };
}

const ROOM = '33333333-3333-4333-8333-333333333333';
const ROLLER = '22222222-2222-4222-8222-222222222222';
const ROLL_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const ROW = {
  id: ROLL_ID,
  room_id: ROOM,
  roller_id: ROLLER,
  notation: '2d20kh1 + 3',
  results: [
    { sides: 20, value: 4 },
    { sides: 20, value: 17 },
  ],
  modifier: 3,
  total: 20,
  hidden: false,
  created_at: '2026-11-01T12:00:00Z',
};

function outcomeOf(notation: string, values: number[]): { notation: string; outcome: DiceOutcome } {
  const parsed = parseDice(notation);
  if (!parsed.ok) throw new Error(parsed.error);
  return { notation: parsed.expression.notation, outcome: evaluateDice(parsed.expression, values) };
}

describe('createDiceService', () => {
  describe('listRecent', () => {
    it('shouldAskForTheNewestRollsOfTheRoomWithinTheLimit', async () => {
      const { client, calls } = fakeClient({ data: [ROW], error: null });
      await createDiceService(client).listRecent(ROOM);
      expect(calls).toContainEqual({ method: 'from', args: ['dice_rolls'] });
      expect(calls).toContainEqual({ method: 'eq', args: ['room_id', ROOM] });
      expect(calls).toContainEqual({ method: 'order', args: ['created_at', { ascending: false }] });
      expect(calls).toContainEqual({ method: 'limit', args: [HISTORY_LIMIT] });
    });

    it('shouldTurnRowsIntoRollsWithTheDiscardedDiceMarked', async () => {
      const { client } = fakeClient({ data: [ROW], error: null });
      const [roll] = await createDiceService(client).listRecent(ROOM);
      expect(roll).toEqual({
        id: ROLL_ID,
        roomId: ROOM,
        rollerId: ROLLER,
        notation: '2d20kh1 + 3',
        dice: [
          { sides: 20, value: 4, kept: false },
          { sides: 20, value: 17, kept: true },
        ],
        modifier: 3,
        total: 20,
        hidden: false,
        createdAt: '2026-11-01T12:00:00Z',
      });
    });

    it('shouldExplainAForbiddenReadInPlainPortuguese', async () => {
      const { client } = fakeClient({ data: null, error: { code: '42501', message: 'denied' } });
      const failure = createDiceService(client).listRecent(ROOM);
      await expect(failure).rejects.toBeInstanceOf(DiceError);
      await expect(failure).rejects.toMatchObject({ kind: 'forbidden', code: '42501' });
    });

    it('shouldRecognizeALostConnection', async () => {
      const { client } = fakeClient({
        data: null,
        error: { message: 'TypeError: Failed to fetch' },
      });
      await expect(createDiceService(client).listRecent(ROOM)).rejects.toMatchObject({
        kind: 'network',
      });
    });
  });

  describe('getRoll', () => {
    it('shouldFindARollById', async () => {
      const { client, calls } = fakeClient({ data: ROW, error: null });
      const roll = await createDiceService(client).getRoll(ROLL_ID);
      expect(calls).toContainEqual({ method: 'eq', args: ['id', ROLL_ID] });
      expect(roll?.total).toBe(20);
    });

    it('shouldReturnNothingWhenTheRowIsMissingOrHiddenByRls', async () => {
      const { client } = fakeClient({ data: null, error: null });
      await expect(createDiceService(client).getRoll(ROLL_ID)).resolves.toBeNull();
    });
  });

  describe('insertRoll', () => {
    it('shouldWriteTheColumnsTheTableExpectsWithoutTheKeptFlag', async () => {
      const { client, calls } = fakeClient({ data: ROW, error: null });
      const { notation, outcome } = outcomeOf('2d20kh1+3', [4, 17]);
      const saved = await createDiceService(client).insertRoll({
        roomId: ROOM,
        rollerId: ROLLER,
        notation,
        outcome,
        hidden: false,
      });

      const insert = calls.find((call) => call.method === 'insert');
      expect(insert?.args[0]).toEqual({
        room_id: ROOM,
        roller_id: ROLLER,
        notation: '2d20kh1 + 3',
        results: [
          { sides: 20, value: 4 },
          { sides: 20, value: 17 },
        ],
        modifier: 3,
        total: 20,
        hidden: false,
      });
      expect(saved.id).toBe(ROLL_ID);
    });

    it('shouldSendTheHiddenFlagAsGiven', async () => {
      const { client, calls } = fakeClient({ data: { ...ROW, hidden: true }, error: null });
      const { notation, outcome } = outcomeOf('1d20', [9]);
      const saved = await createDiceService(client).insertRoll({
        roomId: ROOM,
        rollerId: ROLLER,
        notation,
        outcome,
        hidden: true,
      });
      expect(calls.find((call) => call.method === 'insert')?.args[0]).toMatchObject({
        hidden: true,
      });
      expect(saved.hidden).toBe(true);
    });

    it('shouldRefuseWhatTheTableWouldRefuseWithoutCallingTheServer', async () => {
      const { client, calls } = fakeClient({ data: ROW, error: null });
      const { outcome } = outcomeOf('1d20', [9]);
      const service = createDiceService(client);
      const base = { roomId: ROOM, rollerId: ROLLER, outcome, hidden: false };

      await expect(service.insertRoll({ ...base, notation: '' })).rejects.toMatchObject({
        kind: 'invalid',
      });
      await expect(
        service.insertRoll({ ...base, notation: 'x'.repeat(101) }),
      ).rejects.toMatchObject({ kind: 'invalid' });
      await expect(
        service.insertRoll({ ...base, notation: '1d20', roomId: 'nao-e-um-id' }),
      ).rejects.toBeInstanceOf(DiceError);
      expect(calls).toEqual([]);
    });

    it('shouldRefuseResultsOutsideTheDice', async () => {
      const { client, calls } = fakeClient({ data: ROW, error: null });
      const outcome: DiceOutcome = {
        results: [{ sides: 6, value: 9, kept: true }],
        modifier: 0,
        total: 9,
      };
      await expect(
        createDiceService(client).insertRoll({
          roomId: ROOM,
          rollerId: ROLLER,
          notation: '1d6',
          outcome,
          hidden: false,
        }),
      ).rejects.toMatchObject({ kind: 'invalid' });
      expect(calls).toEqual([]);
    });

    it('shouldTurnADatabaseRefusalIntoAFriendlyError', async () => {
      const { client } = fakeClient({ data: null, error: { code: '42501', message: 'rls' } });
      const { notation, outcome } = outcomeOf('1d20', [9]);
      await expect(
        createDiceService(client).insertRoll({
          roomId: ROOM,
          rollerId: ROLLER,
          notation,
          outcome,
          hidden: true,
        }),
      ).rejects.toMatchObject({ kind: 'forbidden' });
    });
  });

  describe('clearHistory', () => {
    it('shouldDeleteEveryRollOfTheRoom', async () => {
      const { client, calls } = fakeClient({ data: null, error: null });
      await createDiceService(client).clearHistory(ROOM);
      expect(calls).toEqual([
        { method: 'from', args: ['dice_rolls'] },
        { method: 'delete', args: [] },
        { method: 'eq', args: ['room_id', ROOM] },
      ]);
    });

    it('shouldReportAFailureToTheCaller', async () => {
      const { client } = fakeClient({ data: null, error: { code: '42501', message: 'rls' } });
      await expect(createDiceService(client).clearHistory(ROOM)).rejects.toMatchObject({
        kind: 'forbidden',
      });
    });
  });
});
