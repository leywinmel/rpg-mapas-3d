// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_AMBIENCE } from '@/domain';
import { AmbienceControls } from './AmbienceControls';

describe('AmbienceControls', () => {
  it('shouldStartWithThePlainBackground', () => {
    render(<AmbienceControls ambience={DEFAULT_AMBIENCE} dispatch={vi.fn()} />);
    expect(screen.getByLabelText('Fundo')).toHaveValue('none');
  });

  it('shouldSwapTheBackdropWhenTheMasterPicksOne', () => {
    const dispatch = vi.fn();
    render(<AmbienceControls ambience={DEFAULT_AMBIENCE} dispatch={dispatch} />);
    fireEvent.change(screen.getByLabelText('Fundo'), { target: { value: 'sea' } });
    expect(dispatch).toHaveBeenCalledWith({ type: 'set-ambience', patch: { backdrop: 'sea' } });
  });
});
