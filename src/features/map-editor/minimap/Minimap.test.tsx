// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createEmptyMap } from '@/domain/map-v2';
import { useCameraFocus } from '@/features/scene';
import { Minimap } from './Minimap';

const model = createEmptyMap({ width: 100, depth: 100 });

// O jsdom não desenha em canvas; o desenho em si é conferido no navegador.
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  useCameraFocus.setState({ view: null, request: null });
});

describe('Minimap', () => {
  it('shouldAskTheCameraToGoWhereTheMapWasClicked', () => {
    render(<Minimap model={model} />);
    const button = screen.getByRole('button', { name: /minimapa/i });
    button.getBoundingClientRect = () => new DOMRect(0, 0, 200, 200);
    fireEvent.click(button, { clientX: 50, clientY: 150, detail: 1 });
    expect(useCameraFocus.getState().request).toMatchObject({ x: 25.5, z: 75.5 });
  });

  it('shouldGoToTheMiddleWhenClickedFromTheKeyboard', () => {
    render(<Minimap model={model} />);
    fireEvent.click(screen.getByRole('button', { name: /minimapa/i }), { detail: 0 });
    expect(useCameraFocus.getState().request).toMatchObject({ x: 50.5, z: 50.5 });
  });

  it('shouldMarkWhereTheCameraIsLooking', () => {
    const { container } = render(<Minimap model={model} />);
    act(() => useCameraFocus.getState().reportView({ x: 25.7, z: 50.2 }));
    const marker = container.querySelector('span');
    expect(marker?.style.left).toBe('25%');
    expect(marker?.style.top).toBe('50%');
  });
});
