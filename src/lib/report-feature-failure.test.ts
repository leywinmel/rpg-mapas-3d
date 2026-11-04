import { reportError } from './report-error';
import { createFailureReporter, type ReportableFailure } from './report-feature-failure';

vi.mock('./report-error', () => ({ reportError: vi.fn() }));

const toFailure = (error: unknown): ReportableFailure => ({
  message: 'Frase amigável.',
  kind: error instanceof Error && error.message === 'boom' ? 'unknown' : 'forbidden',
  code: '42501',
});

beforeEach(() => {
  vi.mocked(reportError).mockClear();
});

describe('createFailureReporter', () => {
  it('shouldLogWithFeatureActionKindAndCodeAndReturnTheFriendlyMessage', () => {
    const { report } = createFailureReporter('mesas', toFailure);
    const error = new Error('negado');
    expect(report(error, { action: 'sair' })).toBe('Frase amigável.');
    expect(reportError).toHaveBeenCalledWith(error, {
      userMessage: 'Frase amigável.',
      context: { feature: 'mesas', action: 'sair', kind: 'forbidden', code: '42501' },
      severity: 'warn',
      toast: false,
    });
  });

  it('shouldTreatUnknownFailuresAsErrorsAndHonorTheToastOption', () => {
    const { report } = createFailureReporter('mesas', toFailure);
    report(new Error('boom'), { action: 'sair', toast: true });
    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ severity: 'error', toast: true }),
    );
  });

  it('shouldLogAndRethrowTheOriginalErrorForLoadsShownWithErrorState', () => {
    const { logAndRethrow } = createFailureReporter('mesas', toFailure);
    const error = new Error('negado');
    expect(() => logAndRethrow('carregar')(error)).toThrow(error);
    expect(reportError).toHaveBeenCalledTimes(1);
  });

  it('shouldToastByDefaultWhenConfiguredAndPassHintAndExtraContext', () => {
    const { report } = createFailureReporter('mesas', toFailure, { toastByDefault: true });
    report(new Error('negado'), {
      action: 'sair',
      hint: 'Tente de novo.',
      context: { mapId: 'm1' },
    });
    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        hint: 'Tente de novo.',
        toast: true,
        context: {
          feature: 'mesas',
          action: 'sair',
          mapId: 'm1',
          kind: 'forbidden',
          code: '42501',
        },
      }),
    );
  });
});
