import { z } from 'zod';
import { setLogSink, type LogEntry } from '@/lib/logger';
import { useToastStore } from '@/components/toast/toast-store';
import { DICE_ERROR_MESSAGES, DiceError, reportDiceFailure, toDiceError } from './dice-errors';

describe('toDiceError', () => {
  it.each([
    ['42501', 'forbidden'],
    ['23514', 'invalid'],
    ['22023', 'invalid'],
    ['22P02', 'invalid'],
  ])('shouldMapDatabaseCode %s to %s', (code, kind) => {
    expect(toDiceError({ code, message: 'x' })).toMatchObject({ kind, code });
  });

  it('shouldRecognizeALostConnectionAndUnknownFailures', () => {
    expect(toDiceError(new TypeError('Failed to fetch'))).toMatchObject({ kind: 'network' });
    expect(toDiceError({ message: 'algo estranho' })).toMatchObject({ kind: 'unknown' });
    expect(toDiceError('texto solto')).toMatchObject({ kind: 'unknown' });
    expect(toDiceError(null)).toMatchObject({ kind: 'unknown' });
  });

  it('shouldTreatAValidationFailureAsInvalid', () => {
    const failure = z.object({ a: z.string() }).safeParse({ a: 1 });
    expect(failure.success).toBe(false);
    if (failure.success) return;
    expect(toDiceError(failure.error)).toMatchObject({ kind: 'invalid' });
  });

  it('shouldKeepAnErrorThatIsAlreadyOneOfOurs', () => {
    const original = new DiceError('forbidden', '42501');
    expect(toDiceError(original)).toBe(original);
  });

  it('shouldSpeakPlainPortugueseWithoutTechnicalDetail', () => {
    for (const message of Object.values(DICE_ERROR_MESSAGES)) {
      expect(message).not.toMatch(/postgres|supabase|rls|sql|fetch|42501/i);
    }
  });
});

describe('reportDiceFailure', () => {
  const logs: LogEntry[] = [];

  beforeEach(() => {
    logs.length = 0;
    setLogSink((entry) => logs.push(entry));
    useToastStore.setState({ toasts: [] });
  });

  it('shouldLogTheCodeAndShowAFriendlyToast', () => {
    const message = reportDiceFailure({ code: '42501', message: 'rls' }, { action: 'roll' });
    expect(message).toBe(DICE_ERROR_MESSAGES.forbidden);
    expect(logs[0]).toMatchObject({
      level: 'warn',
      context: { feature: 'dice', action: 'roll', kind: 'forbidden', code: '42501' },
    });
    expect(useToastStore.getState().toasts[0]).toMatchObject({
      tone: 'warning',
      title: DICE_ERROR_MESSAGES.forbidden,
    });
  });

  it('shouldTreatUnknownFailuresAsErrors', () => {
    reportDiceFailure(new Error('boom'), { action: 'roll' });
    expect(logs[0]?.level).toBe('error');
    expect(useToastStore.getState().toasts[0]?.tone).toBe('error');
  });

  it('shouldStayQuietOnScreenWhenTheWindowShowsTheMessage', () => {
    const message = reportDiceFailure(new Error('boom'), { action: 'clear', toast: false });
    expect(message).toBe(DICE_ERROR_MESSAGES.unknown);
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('shouldPassTheHintAlong', () => {
    reportDiceFailure({ code: '42501' }, { action: 'roll', hint: 'Confira o histórico.' });
    expect(useToastStore.getState().toasts[0]?.description).toBe('Confira o histórico.');
  });
});
