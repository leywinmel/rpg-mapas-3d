// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { HistoryState } from '../hooks/roll-history';
import { DiceError } from '../services/dice-errors';
import type { DiceRoll } from '../types';
import { RollHistory } from './RollHistory';

const NAMES: Record<string, string> = { ana: 'Ana', gm: 'Mestre' };
const nicknameOf = (userId: string | null) => (userId ? (NAMES[userId] ?? 'Alguém') : 'Alguém');

function roll(overrides: Partial<DiceRoll> = {}): DiceRoll {
  return {
    id: 'roll-1',
    roomId: 'room',
    rollerId: 'ana',
    notation: '2d20kh1 + 3',
    dice: [
      { sides: 20, value: 4, kept: false },
      { sides: 20, value: 17, kept: true },
    ],
    modifier: 3,
    total: 20,
    hidden: false,
    createdAt: '2026-11-01T17:32:09Z',
    ...overrides,
  };
}

function renderHistory(history: HistoryState, onRetry = vi.fn()) {
  render(<RollHistory history={history} onRetry={onRetry} nicknameOf={nicknameOf} />);
  return onRetry;
}

describe('RollHistory', () => {
  it('shouldShowALoadingStateWhileTheFirstQueryRuns', () => {
    renderHistory({ status: 'loading', rolls: [] });
    expect(screen.getAllByText(/Carregando as rolagens/).length).toBeGreaterThan(0);
  });

  it('shouldShowAFriendlyErrorWithRetryAndNoTechnicalDetail', () => {
    const onRetry = renderHistory({
      status: 'error',
      rolls: [],
      error: new DiceError('network', null),
    });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Histórico indisponível');
    expect(alert).toHaveTextContent('Sem conexão com o servidor');
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shouldInviteToRollWhenThereIsNothingYet', () => {
    renderHistory({ status: 'ready', rolls: [] });
    expect(screen.getByText('Nenhuma rolagem ainda')).toBeInTheDocument();
    expect(screen.queryByRole('log')).not.toBeInTheDocument();
  });

  describe('com rolagens', () => {
    it('shouldListWhoRolledWhatAndTheTotal', () => {
      renderHistory({ status: 'ready', rolls: [roll()] });
      const list = screen.getByRole('log', { name: 'Histórico de rolagens' });
      const entry = list.children[0];
      expect(entry).toHaveTextContent('Ana');
      expect(entry).toHaveTextContent('2d20kh1 + 3');
      expect(entry).toHaveTextContent('Total 20');
      expect(entry).toHaveTextContent('+3');
    });

    it('shouldTellScreenReadersWhichDiceWereDiscarded', () => {
      renderHistory({ status: 'ready', rolls: [roll()] });
      const dice = screen.getByRole('list', { name: 'Dados da rolagem' });
      const [first, second] = within(dice).getAllByRole('listitem');
      expect(first).toHaveTextContent('descartado');
      expect(second).not.toHaveTextContent('descartado');
    });

    it('shouldKeepTheOrderTheyCameIn', () => {
      renderHistory({
        status: 'ready',
        rolls: [
          roll({ id: 'new', notation: '1d6', rollerId: 'gm' }),
          roll({ id: 'old', notation: '1d4' }),
        ],
      });
      const entries = Array.from(screen.getByRole('log').children);
      expect(entries[0]).toHaveTextContent('Mestre');
      expect(entries[1]).toHaveTextContent('Ana');
    });

    it('shouldMarkHiddenRollsForTheMaster', () => {
      renderHistory({ status: 'ready', rolls: [roll({ hidden: true, rollerId: 'gm' })] });
      expect(screen.getByText('Escondida')).toBeInTheDocument();
    });

    it('shouldNotMarkPublicRolls', () => {
      renderHistory({ status: 'ready', rolls: [roll()] });
      expect(screen.queryByText('Escondida')).not.toBeInTheDocument();
    });

    it('shouldUseAGenericNameWhenTheRollerLeftTheTable', () => {
      renderHistory({ status: 'ready', rolls: [roll({ rollerId: null })] });
      expect(screen.getByRole('log')).toHaveTextContent('Alguém');
    });

    it('shouldShowTheTimeAsAMachineReadableDate', () => {
      renderHistory({ status: 'ready', rolls: [roll()] });
      const time = screen.getByRole('log').querySelector('time');
      expect(time).toHaveAttribute('datetime', '2026-11-01T17:32:09Z');
      expect(time?.textContent).toMatch(/^\d{2}:\d{2}$/);
    });

    it('shouldShowUserTextAsPlainTextNeverAsHtml', () => {
      const nasty = '<img src=x onerror="alert(1)">';
      render(
        <RollHistory
          history={{ status: 'ready', rolls: [roll({ notation: nasty })] }}
          onRetry={vi.fn()}
          nicknameOf={() => '<b>Ana</b>'}
        />,
      );
      expect(screen.getByRole('log').querySelector('img, b')).toBeNull();
      expect(screen.getByRole('log')).toHaveTextContent('<b>Ana</b>');
      expect(screen.getByRole('log')).toHaveTextContent(nasty);
    });

    it('shouldShrinkVeryLongRollsToJustTheNumbers', () => {
      const many = Array.from({ length: 40 }, (_, index) => ({
        sides: 6 as const,
        value: (index % 6) + 1,
        kept: true,
      }));
      renderHistory({
        status: 'ready',
        rolls: [roll({ dice: many, notation: '40d6', total: 140 })],
      });
      const dice = screen.getByRole('list', { name: 'Dados da rolagem' });
      expect(within(dice).getAllByRole('listitem')).toHaveLength(41);
      expect(dice.className).toMatch(/diceCompact/);
    });
  });
});
