import { AUTH_MESSAGES, authErrorCode, translateAuthError } from './auth-errors';

describe('translateAuthError', () => {
  it.each([
    [{ code: 'weak_password', status: 422 }, AUTH_MESSAGES.weakPassword],
    [{ code: 'user_already_exists', status: 422 }, AUTH_MESSAGES.emailInUse],
    [{ code: 'email_exists', status: 422 }, AUTH_MESSAGES.emailInUse],
    [{ code: 'invalid_credentials', status: 400 }, AUTH_MESSAGES.invalidCredentials],
    [{ code: 'over_request_rate_limit', status: 429 }, AUTH_MESSAGES.rateLimited],
    [{ status: 429 }, AUTH_MESSAGES.rateLimited],
    [{ code: 'same_password', status: 422 }, AUTH_MESSAGES.samePassword],
  ])('shouldTranslateKnownFailure %o', (error, expected) => {
    expect(translateAuthError(error)).toBe(expected);
  });

  it('shouldFallBackToEnglishTextWhenCodeIsMissing', () => {
    expect(translateAuthError(new Error('Invalid login credentials'))).toBe(
      AUTH_MESSAGES.invalidCredentials,
    );
    expect(translateAuthError(new TypeError('Failed to fetch'))).toBe(AUTH_MESSAGES.network);
  });

  it('shouldUseGenericMessageForAnythingElse', () => {
    expect(translateAuthError(new Error('boom'))).toBe(AUTH_MESSAGES.unknown);
    expect(translateAuthError(undefined)).toBe(AUTH_MESSAGES.unknown);
  });
});

describe('authErrorCode', () => {
  it('shouldGiveCodeForLogsWithoutPersonalData', () => {
    expect(authErrorCode({ code: 'weak_password', message: 'ana@exemplo.test' })).toBe(
      'weak_password',
    );
    expect(authErrorCode({ status: 500 })).toBe('http_500');
    expect(authErrorCode('x')).toBe('unknown');
  });
});
