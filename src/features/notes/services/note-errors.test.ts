import { NoteError, noteErrorMessage, toNoteError } from './note-errors';

describe('toNoteError', () => {
  it.each([
    ['42501', 'forbidden'],
    ['22023', 'invalid'],
    ['23514', 'invalid'],
    ['23502', 'invalid'],
    ['22P02', 'invalid'],
    ['PGRST116', 'not-found'],
  ])('shouldMapPostgresCode%sTo%s', (code, kind) => {
    expect(toNoteError({ code, message: 'x' })).toMatchObject({ kind, code });
  });

  it('shouldSeparateAPlayerWhoLeftFromAGameMasterOnlyDenial', () => {
    const left = toNoteError({
      code: '42501',
      message: 'new row violates row-level security policy for table "note_recipients"',
    });
    expect(left.kind).toBe('recipient');
    const denied = toNoteError({
      code: '42501',
      message: 'new row violates row-level security policy for table "notes"',
    });
    expect(denied.kind).toBe('forbidden');
  });

  it.each([
    ['413', 'image-too-large'],
    ['415', 'image-type'],
    ['403', 'forbidden'],
  ])('shouldMapStorageStatus%sTo%s', (statusCode, kind) => {
    expect(toNoteError({ statusCode, message: 'x' })).toMatchObject({ kind });
  });

  it('shouldRecognizeNetworkFailuresOfDifferentBrowsers', () => {
    for (const message of [
      'Failed to fetch',
      'NetworkError when attempting to fetch resource.',
      'Load failed',
    ]) {
      expect(toNoteError(new Error(message)).kind).toBe('network');
    }
  });

  it('shouldUseTheFallbackForWhatNothingRecognizes', () => {
    expect(toNoteError(new Error('boom')).kind).toBe('unknown');
    expect(toNoteError({ message: 'boom' }, 'image-upload').kind).toBe('image-upload');
    expect(toNoteError(undefined).kind).toBe('unknown');
  });

  it('shouldKeepAnErrorThatIsAlreadyANoteError', () => {
    const original = new NoteError('not-found', null);
    expect(toNoteError(original, 'unknown')).toBe(original);
  });

  it('shouldGiveFriendlyPortugueseMessagesWithoutTechnicalDetail', () => {
    expect(noteErrorMessage({ statusCode: '413', message: 'Payload too large' })).toBe(
      'A imagem passa de 5 MB. Escolha uma menor.',
    );
    expect(noteErrorMessage(new Error('stack: at line 3'))).not.toContain('stack');
  });
});
