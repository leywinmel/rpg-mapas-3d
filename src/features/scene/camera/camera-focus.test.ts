import { afterEach, describe, expect, it } from 'vitest';
import { useCameraFocus } from './camera-focus';

afterEach(() => useCameraFocus.setState({ view: null, request: null }));

describe('camera focus', () => {
  it('shouldKeepTheSameViewWhileTheCameraStaysInTheSameCell', () => {
    useCameraFocus.getState().reportView({ x: 3.2, z: 4.9 });
    const first = useCameraFocus.getState().view;
    useCameraFocus.getState().reportView({ x: 3.8, z: 4.1 });
    expect(useCameraFocus.getState().view).toBe(first);
    expect(first).toEqual({ x: 3, z: 4 });
  });

  it('shouldNumberEachRequestEvenForTheSamePoint', () => {
    useCameraFocus.getState().requestFocus({ x: 1, z: 1 });
    const first = useCameraFocus.getState().request;
    useCameraFocus.getState().requestFocus({ x: 1, z: 1 });
    expect(useCameraFocus.getState().request?.id).toBe((first?.id ?? 0) + 1);
  });
});
