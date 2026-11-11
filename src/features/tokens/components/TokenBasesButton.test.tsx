// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  readShowBases,
  TOKEN_BASES_STORAGE_KEY,
  useTokenViewStore,
  writeShowBases,
} from '../hooks/token-view-store';
import { TokenBasesButton } from './TokenBasesButton';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  useTokenViewStore.setState({ showBases: true });
});

describe('token bases button', () => {
  it('shouldHideAndShowTheBasesAndRememberTheChoice', () => {
    render(<TokenBasesButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Esconder a base dos tokens' }));
    expect(useTokenViewStore.getState().showBases).toBe(false);
    expect(readShowBases(window.localStorage)).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar a base dos tokens' }));
    expect(useTokenViewStore.getState().showBases).toBe(true);
    expect(readShowBases(window.localStorage)).toBe(true);
  });
});

describe('token bases storage', () => {
  it('shouldShowBasesUnlessHiddenOnPurpose', () => {
    expect(readShowBases(null)).toBe(true);
    window.localStorage.setItem(TOKEN_BASES_STORAGE_KEY, 'algo estranho');
    expect(readShowBases(window.localStorage)).toBe(true);
    writeShowBases(window.localStorage, false);
    expect(readShowBases(window.localStorage)).toBe(false);
  });

  it('shouldFallBackToShownWhenTheBrowserRefuses', () => {
    const broken = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(readShowBases(broken)).toBe(true);
    expect(() => writeShowBases(broken, false)).not.toThrow();
  });
});
