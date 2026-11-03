// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QUALITY_STORAGE_KEY } from './quality';
import { QualityButton } from './QualityButton';
import { useQualityStore } from './quality-store';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  useQualityStore.setState({ mode: 'auto', autoLevel: 'high' });
});

describe('quality button', () => {
  it('shouldCycleTheChoiceAndSaveItInTheBrowser', () => {
    render(<QualityButton />);
    fireEvent.click(screen.getByRole('button', { name: /automática \(agora alta\)/ }));
    expect(useQualityStore.getState().mode).toBe('high');
    expect(window.localStorage.getItem(QUALITY_STORAGE_KEY)).toBe('high');
    expect(screen.getByRole('button', { name: /Qualidade da cena: alta/ })).toBeInTheDocument();
  });

  it('shouldShowTheLevelTheAutomaticModeSettledOn', () => {
    useQualityStore.getState().decline();
    render(<QualityButton />);
    expect(screen.getByRole('button', { name: /automática \(agora média\)/ })).toBeInTheDocument();
  });
});

describe('automatic quality', () => {
  it('shouldOnlyFollowTheMeasurementInAutomaticMode', () => {
    const store = useQualityStore.getState();
    store.decline();
    store.decline();
    expect(useQualityStore.getState().autoLevel).toBe('low');
    useQualityStore.getState().incline();
    expect(useQualityStore.getState().autoLevel).toBe('medium');
    useQualityStore.getState().setMode('high');
    useQualityStore.getState().decline();
    expect(useQualityStore.getState().autoLevel).toBe('medium');
  });
});
