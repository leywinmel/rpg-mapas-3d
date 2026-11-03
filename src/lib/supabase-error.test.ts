import { classifySupabaseError, isNetworkFailure, readFailureDetails } from './supabase-error';
import type { SupabaseErrorTable } from './supabase-error';

type Kind = 'denied' | 'bad-file' | 'special' | 'offline' | 'other';

const TABLE: SupabaseErrorTable<Kind> = {
  byPostgresCode: { '42501': 'denied', '22023': 'bad-file' },
  byStorageStatus: { '413': 'bad-file' },
  network: 'offline',
  refine: (kind, { message }) =>
    kind === 'denied' && message.includes('segredo') ? 'special' : kind,
};

describe('classifySupabaseError', () => {
  it('shouldMapAPostgresCodeKeepingTheCodeForTheLog', () => {
    expect(classifySupabaseError({ code: '42501', message: 'x' }, TABLE, 'other')).toEqual({
      kind: 'denied',
      code: '42501',
    });
  });

  it('shouldMapAStorageStatusBeforeAnyPostgresCode', () => {
    const error = { statusCode: '413', code: '42501', message: 'x' };
    expect(classifySupabaseError(error, TABLE, 'other')).toEqual({ kind: 'bad-file', code: '413' });
  });

  it('shouldLetTheFeatureRefineTheKindByTheMessage', () => {
    const error = { code: '42501', message: 'tabela segredo' };
    expect(classifySupabaseError(error, TABLE, 'other').kind).toBe('special');
    expect(classifySupabaseError({ code: '22023', message: 'segredo' }, TABLE, 'other').kind).toBe(
      'bad-file',
    );
  });

  it('shouldRecognizeNetworkFailuresOfDifferentBrowsers', () => {
    for (const message of ['Failed to fetch', 'NetworkError when attempting', 'Load failed']) {
      expect(classifySupabaseError(new Error(message), TABLE, 'other').kind).toBe('offline');
    }
  });

  it('shouldUseTheFallbackAndKeepWhateverCodeCameWithTheError', () => {
    expect(classifySupabaseError(new Error('boom'), TABLE, 'other')).toEqual({
      kind: 'other',
      code: null,
    });
    expect(classifySupabaseError({ code: 'XX000', message: 'x' }, TABLE, 'special')).toEqual({
      kind: 'special',
      code: 'XX000',
    });
  });

  it('shouldWorkWithoutAStorageTable', () => {
    const noStorage: SupabaseErrorTable<Kind> = { byPostgresCode: {}, network: 'offline' };
    expect(classifySupabaseError({ statusCode: '413' }, noStorage, 'other')).toEqual({
      kind: 'other',
      code: '413',
    });
  });

  it('shouldNotBreakOnValuesThatAreNotErrors', () => {
    for (const value of [undefined, null, 'texto', 42]) {
      expect(classifySupabaseError(value, TABLE, 'other').kind).toBe('other');
    }
  });
});

describe('readFailureDetails', () => {
  it('shouldIgnoreFieldsThatAreNotText', () => {
    expect(readFailureDetails({ code: 42, statusCode: 500, message: {} })).toEqual({
      postgresCode: null,
      storageStatus: null,
      message: '',
    });
  });
});

describe('isNetworkFailure', () => {
  it('shouldIgnoreUnrelatedMessages', () => {
    expect(isNetworkFailure('permission denied')).toBe(false);
  });
});
