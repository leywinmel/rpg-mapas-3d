import type { AuthService } from '../services/auth-service';
import type { SessionUser } from '../types';
import { startSessionSync, useSessionStore } from './session-store';

const ANA: SessionUser = { id: 'u-ana', email: null, isAnonymous: false };

function fakeService(fetchProfile: AuthService['fetchProfile']) {
  let emit: (user: SessionUser | null) => void = () => undefined;
  const service = {
    onSessionChange: (listener: (user: SessionUser | null) => void) => {
      emit = listener;
      return () => undefined;
    },
    fetchProfile,
  } as unknown as AuthService;
  return { service, emit: (user: SessionUser | null) => emit(user) };
}

beforeEach(() => {
  vi.useFakeTimers();
  useSessionStore.setState({ status: 'loading', user: null, profile: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('startSessionSync', () => {
  it('shouldLoadProfileAfterSignIn', async () => {
    const fetchProfile = vi.fn().mockResolvedValue({ id: ANA.id, displayName: 'Ana' });
    const { service, emit } = fakeService(fetchProfile);
    startSessionSync(service);

    emit(ANA);
    expect(useSessionStore.getState().status).toBe('signed-in');
    await vi.runAllTimersAsync();

    expect(fetchProfile).toHaveBeenCalledWith(ANA.id);
    expect(useSessionStore.getState().profile).toEqual({ id: ANA.id, displayName: 'Ana' });
  });

  it('shouldClearProfileOnSignOut', async () => {
    const { service, emit } = fakeService(
      vi.fn().mockResolvedValue({ id: ANA.id, displayName: 'Ana' }),
    );
    startSessionSync(service);
    emit(ANA);
    await vi.runAllTimersAsync();

    emit(null);

    expect(useSessionStore.getState()).toMatchObject({
      status: 'signed-out',
      user: null,
      profile: null,
    });
  });
});
