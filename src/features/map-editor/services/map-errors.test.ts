import { z } from 'zod';
import { setLogSink, type LogEntry } from '@/lib/logger';
import { MAP_ERROR_MESSAGES, MapError, reportMapFailure, toMapError } from './map-errors';

describe('toMapError', () => {
  it('shouldKeepAMapErrorAsItIs', () => {
    const error = new MapError('forbidden', '42501');
    expect(toMapError(error)).toBe(error);
  });

  it('shouldTreatAValidationFailureAsInvalid', () => {
    const parsed = z.number().safeParse('x');
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(toMapError(parsed.error).kind).toBe('invalid');
  });

  it('shouldTellTheSizeLimitApartFromOtherRejectedData', () => {
    const tooLarge = toMapError({
      code: '23514',
      message: 'violates check constraint "maps_document_size"',
    });
    expect(tooLarge.kind).toBe('too-large');
    expect(toMapError({ code: '23514', message: 'violates "maps_v1_size"' }).kind).toBe('invalid');
  });

  it('shouldShowAFriendlyMessageWithoutTechnicalDetail', () => {
    const error = toMapError({ code: '42501', message: 'permission denied for table map_chunks' });
    expect(error.message).toBe(MAP_ERROR_MESSAGES.forbidden);
    expect(error.code).toBe('42501');
    expect(toMapError('???').kind).toBe('unknown');
  });
});

describe('reportMapFailure', () => {
  it('shouldLogTheKindAndCodeAndReturnTheFriendlyMessage', () => {
    const entries: LogEntry[] = [];
    setLogSink((entry) => entries.push(entry));
    const message = reportMapFailure(
      { code: '22023', message: 'Pedaço fora do mapa ou sem documento.' },
      { action: 'save-map', mapId: 'map-1', toast: false },
    );
    expect(message).toBe(MAP_ERROR_MESSAGES.invalid);
    expect(entries.at(-1)).toMatchObject({
      level: 'warn',
      context: { feature: 'map-editor', action: 'save-map', kind: 'invalid', code: '22023' },
    });
  });
});
