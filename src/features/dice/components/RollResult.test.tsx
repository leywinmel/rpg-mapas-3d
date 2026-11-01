// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import type { CurrentPlay } from '../hooks/tray-player';
import type { DiceRoll } from '../types';
import { RollResult } from './RollResult';

function play(phase: CurrentPlay['phase']): CurrentPlay {
  return {
    id: 'roll-1',
    notation: '2d20kh1 + 3',
    sim: {
      sides: [20, 20],
      bodies: ['d20', 'd20'],
      frames: new Float32Array(14),
      frameCount: 1,
      settled: true,
      values: [4, 17],
      maxTiltDegrees: 0,
    },
    startedAt: 0,
    phase,
  };
}

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

describe('RollResult', () => {
  it('shouldInviteToRollWhenNothingIsOnTheTray', () => {
    render(<RollResult play={null} roll={null} who="Alguém" />);
    expect(screen.getByText(/Escolha os dados e role/)).toBeInTheDocument();
  });

  it('shouldSayWhoIsRollingWhileTheDiceFall', () => {
    render(<RollResult play={play('playing')} roll={roll()} who="Ana" />);
    expect(screen.getByText('Ana está rolando')).toBeInTheDocument();
    expect(screen.getByText('2d20kh1 + 3')).toBeInTheDocument();
    expect(screen.queryByText('20')).not.toBeInTheDocument();
  });

  it('shouldNotKnowTheNameUntilTheRowArrives', () => {
    render(<RollResult play={play('playing')} roll={null} who="Alguém" />);
    expect(screen.getByText('Alguém está rolando')).toBeInTheDocument();
  });

  it('shouldShowTheDatabaseTotalWhenTheDiceStop', () => {
    render(<RollResult play={play('done')} roll={roll()} who="Ana" />);
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Ana · 2d20kh1 + 3')).toBeInTheDocument();
  });

  it('shouldReadTheWholeRollAloudOnce', () => {
    render(<RollResult play={play('done')} roll={roll()} who="Ana" />);
    expect(
      screen.getByText('Ana rolou 2d20kh1 + 3: 4 (descartado), 17, bônus +3. Total 20.'),
    ).toBeInTheDocument();
  });

  it('shouldWaitForTheRowWhenTheDiceStoppedFirst', () => {
    render(<RollResult play={play('done')} roll={null} who="Alguém" />);
    expect(screen.getByText('Conferindo o resultado…')).toBeInTheDocument();
  });

  it('shouldWarnTheMasterWhenTheRollIsHidden', () => {
    render(<RollResult play={play('done')} roll={roll({ hidden: true })} who="Mestre" />);
    expect(screen.getByText(/Escondida: só você vê/)).toBeInTheDocument();
  });

  it('shouldNotMentionSecrecyOnPublicRolls', () => {
    render(<RollResult play={play('done')} roll={roll()} who="Ana" />);
    expect(screen.queryByText(/Escondida/)).not.toBeInTheDocument();
  });
});
