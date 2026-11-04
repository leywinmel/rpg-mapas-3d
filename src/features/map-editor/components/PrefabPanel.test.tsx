// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { DEFAULT_BRUSH } from '../editor/editor-reducer';
import { PrefabPanel } from './PrefabPanel';

function renderPanel(libraryStyle: 'all' | 'medieval' | 'modern' | 'futurist') {
  render(
    <PrefabPanel
      brush={DEFAULT_BRUSH}
      tool="select"
      dispatch={() => {}}
      libraryStyle={libraryStyle}
    />,
  );
  const group = screen.getByRole('radiogroup', { name: 'Estilo das casas' });
  return group.querySelector('[aria-checked="true"]')?.textContent;
}

describe('PrefabPanel', () => {
  it('shouldOpenOnTheLibraryStyleFilter', () => {
    expect(renderPanel('modern')).toBe('Moderno');
  });

  it('shouldFallBackToTheBrushHouseStyleWhenTheFilterIsAll', () => {
    expect(renderPanel('all')).toBe('Medieval');
  });
});
