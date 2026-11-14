// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HUD_TOGGLE_KEY, useHudStore, useHudToggle } from './hud-store';

function press(key: string, target: EventTarget = window, init: KeyboardEventInit = {}) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
  });
}

describe('hud toggle', () => {
  afterEach(() => useHudStore.getState().show());

  it('shouldHideAndShowTheHudWithTheShortcutForTheGameMaster', () => {
    renderHook(() => useHudToggle(true));
    press(HUD_TOGGLE_KEY);
    expect(useHudStore.getState().hidden).toBe(true);
    press(HUD_TOGGLE_KEY.toUpperCase());
    expect(useHudStore.getState().hidden).toBe(false);
  });

  it('shouldIgnoreTheShortcutForPlayersAndWhileTyping', () => {
    const { unmount } = renderHook(() => useHudToggle(false));
    press(HUD_TOGGLE_KEY);
    expect(useHudStore.getState().hidden).toBe(false);
    unmount();
    renderHook(() => useHudToggle(true));
    const input = document.body.appendChild(document.createElement('input'));
    press(HUD_TOGGLE_KEY, input);
    press(HUD_TOGGLE_KEY, window, { ctrlKey: true });
    expect(useHudStore.getState().hidden).toBe(false);
    input.remove();
  });

  it('shouldBringTheHudBackWhenLeavingTheTable', () => {
    const { unmount } = renderHook(() => useHudToggle(true));
    press(HUD_TOGGLE_KEY);
    unmount();
    expect(useHudStore.getState().hidden).toBe(false);
  });
});
