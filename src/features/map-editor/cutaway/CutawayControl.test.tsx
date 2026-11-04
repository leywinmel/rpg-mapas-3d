// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Cutaway } from '@/domain/map-v2';
import type { CutawayBinding } from './cutaway-binding';
import { CutawayControl } from './CutawayControl';

function renderControl(overrides: Partial<CutawayBinding>, top = 3) {
  const setOwn = vi.fn<(cut: Cutaway) => void>();
  const binding: CutawayBinding = { own: null, setOwn, lock: null, isMaster: false, ...overrides };
  render(<CutawayControl binding={binding} top={top} />);
  return { setOwn };
}

describe('CutawayControl', () => {
  it('shouldHideTheTopStoryWithTheButtonAndWithPageDown', () => {
    const { setOwn } = renderControl({});
    expect(screen.getByText('Mostrando todos os andares')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mostrar o andar de cima/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Esconder o andar de cima/ }));
    expect(setOwn).toHaveBeenLastCalledWith(12);
    fireEvent.keyDown(window, { key: 'PageDown' });
    expect(setOwn).toHaveBeenCalledTimes(2);
  });

  it('shouldShowAPlayerThatTheMasterLockedTheCut', () => {
    renderControl({ lock: 4 });
    expect(screen.getByText('Mostrando até o térreo')).toBeInTheDocument();
    expect(screen.getByText('O mestre travou o corte até o térreo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mostrar o andar de cima/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Travar/ })).not.toBeInTheDocument();
  });

  it('shouldLetTheMasterLockThePlayersAtHisOwnCut', async () => {
    const changeLock = vi.fn<(lock: Cutaway) => Promise<void>>().mockResolvedValue(undefined);
    renderControl({ isMaster: true, own: 8, changeLock });
    fireEvent.click(screen.getByRole('button', { name: 'Travar os jogadores até o 1º andar' }));
    await waitFor(() => expect(changeLock).toHaveBeenCalledWith(8));
  });

  it('shouldAskTheMasterToPickAStoryBeforeLocking', () => {
    renderControl({ isMaster: true, changeLock: vi.fn() });
    expect(
      screen.getByRole('button', { name: 'Escolha um andar para travar o corte dos jogadores' }),
    ).toBeDisabled();
  });
});
