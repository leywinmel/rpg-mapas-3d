// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import RAPIER from '@dimforge/rapier3d-compat';
import { ToastViewport, useToastStore } from '@/components';
import { diceToThrow, type DiceOutcome } from '@/domain';
import type { RoomSessionValue } from '@/features/rooms';
import { createThrowSpec, throwSpecSchema } from '../physics/spec';
import type { ThrowMessage } from '../schemas';
import type { DiceChannelHandlers } from '../services/dice-channel';
import { seededRandom } from '../testing/seeded-random';
import type { DiceRoll } from '../types';
import { DiceTray } from './DiceTray';

const ROOM = '33333333-3333-4333-8333-333333333333';
const MASTER = '11111111-1111-4111-8111-111111111111';
const PLAYER = '22222222-2222-4222-8222-222222222222';

// ------------------------------------------------------------------ Dublês
const session = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('@/features/rooms', () => ({ useRoomSession: () => session.value }));

// A bandeja 3D não renderiza em teste (sem WebGL): um quadro vazio no lugar.
vi.mock('./TrayCanvas', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('div', { 'data-testid': 'tray-canvas' }) };
});

const service = vi.hoisted(() => ({
  listRecent: vi.fn(),
  getRoll: vi.fn(),
  insertRoll: vi.fn(),
  clearHistory: vi.fn(),
}));
vi.mock('../services/dice-service', () => ({ getDiceService: () => service }));

type FakeChannel = {
  handlers: DiceChannelHandlers | null;
  sendThrow: ReturnType<typeof vi.fn>;
  announceCleared: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};
const channel = vi.hoisted<FakeChannel>(() => ({
  handlers: null,
  sendThrow: vi.fn(),
  announceCleared: vi.fn(),
  close: vi.fn(),
}));
vi.mock('../services/dice-channel', () => ({
  openDiceChannel: (options: { handlers: DiceChannelHandlers }) => {
    channel.handlers = options.handlers;
    return {
      sendThrow: channel.sendThrow,
      announceCleared: channel.announceCleared,
      close: channel.close,
    };
  },
}));

// jsdom ainda não sabe abrir <dialog> como janela modal.
beforeAll(async () => {
  await RAPIER.init();
  const proto = HTMLDialogElement.prototype;
  proto.showModal ??= function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close ??= function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

function setSession(role: 'gm' | 'player') {
  const userId = role === 'gm' ? MASTER : PLAYER;
  const value: RoomSessionValue = {
    room: {
      id: ROOM,
      slug: 'demo',
      name: 'Mesa',
      ownerId: MASTER,
      activeMapId: null,
      cutawayLock: null,
      tableWeather: { weather: 'clear', dayPhase: 'map' },
    },
    membership: { role, nickname: role === 'gm' ? 'Mestre' : 'Ana' },
    isGameMaster: role === 'gm',
    members: [
      { userId: MASTER, nickname: 'Mestre', role: 'gm', joinedAt: '2026-11-01T10:00:00Z' },
      { userId: PLAYER, nickname: 'Ana', role: 'player', joinedAt: '2026-11-01T10:01:00Z' },
    ],
    onlineUserIds: new Set([MASTER, PLAYER]),
    viewer: { userId, role, isGuest: false },
  };
  session.value = value;
}

function savedRoll(input: {
  roomId: string;
  rollerId: string;
  notation: string;
  outcome: DiceOutcome;
  hidden: boolean;
}): DiceRoll {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    roomId: input.roomId,
    rollerId: input.rollerId,
    notation: input.notation,
    dice: input.outcome.results.map((die) => ({ ...die })),
    modifier: input.outcome.modifier,
    total: input.outcome.total,
    hidden: input.hidden,
    createdAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
  channel.handlers = null;
  service.listRecent.mockReset().mockResolvedValue([]);
  service.getRoll.mockReset().mockResolvedValue(null);
  service.clearHistory.mockReset().mockResolvedValue(undefined);
  service.insertRoll.mockReset().mockImplementation(async (input) => savedRoll(input));
  channel.sendThrow.mockReset().mockResolvedValue(undefined);
  channel.announceCleared.mockReset().mockResolvedValue(undefined);
  channel.close.mockReset();
});

// ---------------------------------------------------------------- Auxiliares
async function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: 'Abrir os dados' }));
  await screen.findByRole('heading', { name: 'Dados' });
  await screen.findByTestId('tray-canvas');
}

const dieButton = (name: string) =>
  screen.getByRole('button', { name: new RegExp(`^Adicionar ${name}`) });
const rollButton = () => screen.getByRole('button', { name: /Rolar$/ });

async function rollTwoD20() {
  await openPanel();
  fireEvent.click(dieButton('d20'));
  fireEvent.click(dieButton('d20'));
  // O botão só destrava quando o motor de física carregou.
  await waitFor(() => expect(rollButton()).toBeEnabled());
  fireEvent.click(rollButton());
  await waitFor(() => expect(service.insertRoll).toHaveBeenCalled());
}

/** Os avisos de erro aparecem no canto da tela, fora do painel: precisam do ToastViewport. */
function renderWithToasts() {
  render(
    <>
      <DiceTray />
      <ToastViewport />
    </>,
  );
}

function remoteThrow(rollId: string): ThrowMessage {
  return { rollId, notation: '2d20kh1 + 3', spec: createThrowSpec([20, 20], seededRandom(9)) };
}

describe('DiceTray', () => {
  describe('o canto da sala', () => {
    it('shouldShowOnlyTheButtonUntilSomeoneOpensThePanel', () => {
      setSession('player');
      render(<DiceTray />);
      expect(screen.getByRole('button', { name: 'Abrir os dados' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Dados' })).not.toBeInTheDocument();
    });

    it('shouldOpenAndCloseThePanelFromTheButton', async () => {
      setSession('player');
      render(<DiceTray />);
      await openPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Fechar os dados' }));
      expect(screen.queryByRole('heading', { name: 'Dados' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Abrir os dados' })).toBeInTheDocument();
    });

    it('shouldKeepTheDraftWhenThePanelIsClosedAndOpenedAgain', async () => {
      setSession('player');
      render(<DiceTray />);
      await openPanel();
      fireEvent.click(dieButton('d8'));
      fireEvent.click(screen.getByRole('button', { name: 'Fechar os dados' }));
      await openPanel();
      expect(screen.getByLabelText('Rolagem')).toHaveValue('1d8');
    });

    it('shouldListenToTheTableWhileTheDiceAreClosedAndLetGoOnLeaving', () => {
      setSession('player');
      const { unmount } = render(<DiceTray />);
      expect(channel.handlers).not.toBeNull();
      unmount();
      expect(channel.close).toHaveBeenCalled();
    });

    it('shouldLoadTheHistoryOfTheRoomRightAway', async () => {
      setSession('player');
      render(<DiceTray />);
      await waitFor(() => expect(service.listRecent).toHaveBeenCalledWith(ROOM));
    });
  });

  describe('rolar em público', () => {
    it('shouldSaveTheRollWithTheValuesOfTheSimulationThenWarnTheTable', async () => {
      setSession('player');
      render(<DiceTray />);
      await rollTwoD20();

      const saved = service.insertRoll.mock.calls[0]?.[0];
      expect(saved).toMatchObject({
        roomId: ROOM,
        rollerId: PLAYER,
        notation: '2d20',
        hidden: false,
      });
      expect(saved.outcome.results).toHaveLength(2);
      for (const die of saved.outcome.results) {
        expect(die.sides).toBe(20);
        expect(die.value).toBeGreaterThanOrEqual(1);
        expect(die.value).toBeLessThanOrEqual(20);
      }

      await waitFor(() => expect(channel.sendThrow).toHaveBeenCalledTimes(1));
      const message = channel.sendThrow.mock.calls[0]?.[0] as ThrowMessage;
      expect(message.rollId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
      expect(message.notation).toBe('2d20');
      expect(throwSpecSchema.safeParse(message.spec).success).toBe(true);
      expect(message.spec.dice.map((die) => die.sides)).toEqual(
        diceToThrow({ groups: [{ count: 2, sides: 20, sign: 1 }], modifier: 0, notation: '2d20' }),
      );
    });

    it('shouldShowTheResultAndAddTheRollToTheHistory', async () => {
      setSession('player');
      render(<DiceTray />);
      await rollTwoD20();

      const log = await screen.findByRole('log', { name: 'Histórico de rolagens' });
      expect(log).toHaveTextContent('Ana');
      expect(log).toHaveTextContent('2d20');
      const saved = service.insertRoll.mock.calls[0]?.[0];
      expect(log).toHaveTextContent(`Total ${saved.outcome.total}`);
      expect(screen.getByText(/Ana está rolando/)).toBeInTheDocument();
    });

    it('shouldNotOfferTheHiddenSwitchToPlayers', async () => {
      setSession('player');
      render(<DiceTray />);
      await openPanel();
      expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    });

    it('shouldTellThePlayerWhenTheDatabaseRefusesTheRoll', async () => {
      setSession('player');
      service.insertRoll.mockRejectedValueOnce({ code: '42501', message: 'rls' });
      renderWithToasts();
      await rollTwoD20();

      expect(
        await screen.findByText('Você não tem permissão para fazer isso nesta mesa.'),
      ).toBeInTheDocument();
      expect(channel.sendThrow).not.toHaveBeenCalled();
      expect(screen.queryByRole('log')).not.toBeInTheDocument();
    });

    it('shouldKeepTheRollWhenOnlyTheWarningToTheTableFails', async () => {
      setSession('player');
      channel.sendThrow.mockRejectedValueOnce(new Error('canal caiu'));
      renderWithToasts();
      await rollTwoD20();

      expect(await screen.findByText(/a rolagem foi gravada/i)).toBeInTheDocument();
      expect(await screen.findByRole('log')).toHaveTextContent('2d20');
    });
  });

  describe('rolar escondido (só o mestre)', () => {
    it('shouldSaveAsHiddenAndSendNothingToTheTable', async () => {
      setSession('gm');
      render(<DiceTray />);
      await openPanel();
      fireEvent.click(screen.getByRole('switch', { name: /rolar escondido/i }));
      fireEvent.click(dieButton('d20'));
      await waitFor(() => expect(rollButton()).toBeEnabled());
      fireEvent.click(rollButton());

      await waitFor(() => expect(service.insertRoll).toHaveBeenCalledTimes(1));
      expect(service.insertRoll.mock.calls[0]?.[0]).toMatchObject({
        rollerId: MASTER,
        hidden: true,
      });
      // Nada vai pelo canal: o jogador não recebe nem o sinal de que houve rolagem.
      await screen.findByRole('log');
      expect(channel.sendThrow).not.toHaveBeenCalled();
      expect(screen.getByText('Escondida')).toBeInTheDocument();
    });

    it('shouldRollInPublicWhenTheSwitchIsOff', async () => {
      setSession('gm');
      render(<DiceTray />);
      await rollTwoD20();
      expect(service.insertRoll.mock.calls[0]?.[0]).toMatchObject({ hidden: false });
      await waitFor(() => expect(channel.sendThrow).toHaveBeenCalledTimes(1));
    });
  });

  describe('rolagem de outra pessoa', () => {
    it('shouldOpenThePanelAndPlayTheSameThrow', async () => {
      setSession('player');
      render(<DiceTray />);
      expect(screen.queryByRole('heading', { name: 'Dados' })).not.toBeInTheDocument();

      act(() => channel.handlers?.onThrow(remoteThrow('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')));

      await screen.findByRole('heading', { name: 'Dados' });
      expect(await screen.findByText(/está rolando/)).toBeInTheDocument();
      expect(screen.getByText('2d20kh1 + 3')).toBeInTheDocument();
    });

    it('shouldShowTheRowFromTheDatabaseAsTheResultWhenItArrives', async () => {
      setSession('player');
      render(<DiceTray />);
      const rollId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      act(() => channel.handlers?.onThrow(remoteThrow(rollId)));
      await screen.findByText(/está rolando/);

      act(() =>
        channel.handlers?.onRollInserted({
          id: rollId,
          roomId: ROOM,
          rollerId: MASTER,
          notation: '2d20kh1 + 3',
          dice: [
            { sides: 20, value: 4, kept: false },
            { sides: 20, value: 17, kept: true },
          ],
          modifier: 3,
          total: 20,
          hidden: false,
          createdAt: new Date().toISOString(),
        }),
      );

      expect(await screen.findByText('Mestre está rolando')).toBeInTheDocument();
      expect(screen.getByRole('log')).toHaveTextContent('Mestre');
    });

    it('shouldIgnoreTheSameThrowDeliveredTwice', async () => {
      setSession('player');
      render(<DiceTray />);
      const message = remoteThrow('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
      act(() => channel.handlers?.onThrow(message));
      act(() => channel.handlers?.onThrow(message));
      await screen.findByText(/está rolando/);
      expect(screen.getAllByText(/está rolando/)).toHaveLength(1);
    });
  });

  describe('histórico ao vivo', () => {
    it('shouldAddRollsThatArriveFromTheRealtimeChannel', async () => {
      setSession('player');
      render(<DiceTray />);
      await openPanel();
      expect(await screen.findByText('Nenhuma rolagem ainda')).toBeInTheDocument();

      act(() =>
        channel.handlers?.onRollInserted({
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          roomId: ROOM,
          rollerId: MASTER,
          notation: '1d6',
          dice: [{ sides: 6, value: 5, kept: true }],
          modifier: 0,
          total: 5,
          hidden: false,
          createdAt: new Date().toISOString(),
        }),
      );
      expect(await screen.findByRole('log')).toHaveTextContent('Mestre');
    });

    it('shouldReloadWhenTheChannelConnectsAgain', async () => {
      setSession('player');
      render(<DiceTray />);
      await waitFor(() => expect(service.listRecent).toHaveBeenCalledTimes(1));
      act(() => channel.handlers?.onConnected());
      await waitFor(() => expect(service.listRecent).toHaveBeenCalledTimes(2));
    });

    it('shouldEmptyAndReloadWhenTheMasterClearsTheHistory', async () => {
      setSession('player');
      service.listRecent.mockResolvedValueOnce([
        {
          id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          roomId: ROOM,
          rollerId: MASTER,
          notation: '1d4',
          dice: [{ sides: 4, value: 2, kept: true }],
          modifier: 0,
          total: 2,
          hidden: false,
          createdAt: new Date().toISOString(),
        },
      ]);
      render(<DiceTray />);
      await openPanel();
      expect(await screen.findByRole('log')).toHaveTextContent('1d4');

      act(() => channel.handlers?.onHistoryCleared());
      expect(await screen.findByText('Nenhuma rolagem ainda')).toBeInTheDocument();
      expect(service.listRecent).toHaveBeenCalledTimes(2);
    });

    it('shouldShowAnErrorWithRetryWhenTheFirstQueryFails', async () => {
      setSession('player');
      service.listRecent.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      render(<DiceTray />);
      await openPanel();
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Histórico indisponível');
      expect(alert).toHaveTextContent('Sem conexão com o servidor');

      fireEvent.click(within(alert).getByRole('button', { name: /Tentar de novo/ }));
      expect(await screen.findByText('Nenhuma rolagem ainda')).toBeInTheDocument();
    });
  });

  describe('limpar o histórico', () => {
    it('shouldNotOfferItToPlayers', async () => {
      setSession('player');
      render(<DiceTray />);
      await openPanel();
      expect(
        screen.queryByRole('button', { name: 'Limpar o histórico de rolagens' }),
      ).not.toBeInTheDocument();
    });

    it('shouldAskBeforeClearingThenClearAndWarnTheTable', async () => {
      setSession('gm');
      render(<DiceTray />);
      await openPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Limpar o histórico de rolagens' }));
      const dialog = await screen.findByRole('dialog', { name: 'Limpar o histórico de rolagens?' });
      expect(service.clearHistory).not.toHaveBeenCalled();

      fireEvent.click(within(dialog).getByRole('button', { name: /Limpar histórico/ }));
      await waitFor(() => expect(service.clearHistory).toHaveBeenCalledWith(ROOM));
      await waitFor(() => expect(channel.announceCleared).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('shouldNotClearAnythingWhenThePersonCancels', async () => {
      setSession('gm');
      render(<DiceTray />);
      await openPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Limpar o histórico de rolagens' }));
      const dialog = await screen.findByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
      expect(service.clearHistory).not.toHaveBeenCalled();
      expect(channel.announceCleared).not.toHaveBeenCalled();
    });

    it('shouldShowTheFailureInsideTheWindowAndKeepItOpen', async () => {
      setSession('gm');
      service.clearHistory.mockRejectedValueOnce({ code: '42501', message: 'rls' });
      render(<DiceTray />);
      await openPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Limpar o histórico de rolagens' }));
      const dialog = await screen.findByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: /Limpar histórico/ }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('Você não tem permissão');
      expect(channel.announceCleared).not.toHaveBeenCalled();
      expect(dialog).toHaveAttribute('open');
    });
  });
});
