import { RoomError, roomErrorMessage, toRoomError } from './room-errors';

describe('toRoomError', () => {
  it.each([
    ['42501', 'forbidden'],
    ['P0002', 'not-found'],
    ['PGRST116', 'not-found'],
    ['22023', 'invalid'],
    ['23502', 'invalid'],
    ['23514', 'invalid'],
  ])('shouldMapPostgresCode%sTo%s', (code, kind) => {
    expect(toRoomError({ code, message: 'x' })).toMatchObject({ kind, code });
  });

  it('shouldRecognizeNetworkFailures', () => {
    expect(toRoomError(new Error('Failed to fetch')).kind).toBe('network');
  });

  it('shouldFallBackToUnknownKeepingTheCode', () => {
    expect(toRoomError(new Error('boom'))).toMatchObject({ kind: 'unknown', code: null });
    expect(toRoomError({ code: 'XX000', message: 'x' })).toMatchObject({
      kind: 'unknown',
      code: 'XX000',
    });
  });

  it('shouldKeepAnErrorThatIsAlreadyARoomError', () => {
    const original = new RoomError('forbidden', null);
    expect(toRoomError(original)).toBe(original);
  });

  it('shouldGiveFriendlyPortugueseMessages', () => {
    expect(roomErrorMessage({ code: 'P0002' })).toBe(
      'Mesa não encontrada. Confira o link ou peça um novo ao mestre.',
    );
  });
});
