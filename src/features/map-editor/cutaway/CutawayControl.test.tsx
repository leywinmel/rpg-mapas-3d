// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Cutaway } from '@/domain/map-v2';
import type { CutawayBinding } from './cutaway-binding';
import { CutawayControl } from './CutawayControl';

function renderControl(overrides: Partial<CutawayBinding>, top = 3) {
  const setOwn = vi.fn<(cut: Cutaway) => void>();
  const setTableCutaway = vi.fn<(cut: Cutaway) => Promise<void>>().mockResolvedValue(undefined);
  const binding: CutawayBinding = {
    own: null,
    setOwn,
    tableCutaway: null,
    setTableCutaway,
    ...overrides,
  };
  render(<CutawayControl binding={binding} top={top} />);
  return { setOwn, setTableCutaway };
}

describe('CutawayControl', () => {
  it('shouldHideTheTopStoryWithTheButtonAndWithPageDown', () => {
    const { setOwn } = renderControl({});
    expect(screen.getByText('Você vê todos os andares')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mostrar o andar de cima/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Esconder o andar de cima/ }));
    expect(setOwn).toHaveBeenLastCalledWith(12);
    fireEvent.keyDown(window, { key: 'PageDown' });
    expect(setOwn).toHaveBeenCalledTimes(2);
  });

  it('shouldKeepTheMastersOwnViewApartFromWhatThePlayersSee', () => {
    renderControl({ own: 8, tableCutaway: 4 });
    expect(screen.getByText('Você vê até o 1º andar')).toBeInTheDocument();
    expect(screen.getByText('Os jogadores veem até o térreo')).toBeInTheDocument();
  });

  it('shouldSendTheStoryTheMasterSeesToTheTable', async () => {
    const { setTableCutaway } = renderControl({ own: 8 });
    expect(screen.getByText('Os jogadores veem todos os andares')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Mostrar aos jogadores o andar que você vê (até o 1º andar)',
      }),
    );
    await waitFor(() => expect(setTableCutaway).toHaveBeenCalledWith(8));
  });

  it('shouldShowEveryStoryToTheTableAgain', async () => {
    const { setTableCutaway } = renderControl({ tableCutaway: 4 });
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar todos os andares aos jogadores' }));
    await waitFor(() => expect(setTableCutaway).toHaveBeenCalledWith(null));
  });

  it('shouldDisableTheChoiceThePlayersAlreadySee', () => {
    renderControl({ own: 8, tableCutaway: 8 });
    expect(
      screen.getByRole('button', { name: /Mostrar aos jogadores o andar que você vê/ }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Mostrar todos os andares aos jogadores' }),
    ).toBeEnabled();
  });
});
