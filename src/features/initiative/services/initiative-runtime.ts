import { moveWithinTie, nextInitiativePosition, nextTurn, previousTurn } from '@/domain';
import { reportError } from '@/lib/report-error';
import { INITIATIVE_RELOAD_DELAY_MS } from '../constants';
import { useInitiativeStore, type InitiativeActions } from '../hooks/initiative-store';
import type { InitiativeChannel, openInitiativeChannel } from './initiative-channel';
import { initiativeFailures } from './initiative-errors';
import type { InitiativeService } from './initiative-service';

export type InitiativeReloader = { now: () => void; soon: () => void; cancel: () => void };

/** Relê a ordem; a resposta de um pedido velho é descartada. */
export function createInitiativeReloader(
  service: InitiativeService,
  roomId: string,
): InitiativeReloader {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let seq = 0;
  const run = async () => {
    const mine = ++seq;
    useInitiativeStore.getState().setLoading();
    try {
      const board = await service.load(roomId);
      if (mine === seq) useInitiativeStore.getState().setBoard(board);
    } catch (error) {
      initiativeFailures.report(error, { action: 'load' });
      if (mine === seq) useInitiativeStore.getState().setFailed(error);
    }
  };
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return {
    now: () => {
      cancel();
      void run();
    },
    soon: () => {
      cancel();
      timer = setTimeout(() => void run(), INITIATIVE_RELOAD_DELAY_MS);
    },
    cancel,
  };
}

/** Um aviso por visita basta: o cliente do Supabase reconecta sozinho. */
function createConnectionWarning() {
  let warned = false;
  return (error: unknown) => {
    if (warned) return;
    warned = true;
    reportError(error, {
      userMessage: 'A conexão em tempo real da iniciativa falhou.',
      hint: 'Tentando reconectar. A vez pode aparecer atrasada.',
      context: { feature: 'initiative', action: 'realtime' },
      severity: 'warn',
    });
  };
}

export type InitiativeRuntime = {
  actions: InitiativeActions;
  /** Releitura agrupada (os tokens à vista mudaram: a ordem do jogador pode ter mudado junto). */
  refreshSoon: () => void;
  dispose: () => void;
};

/**
 * Liga a ordem da mesa ao banco e ao canal: carrega, relê quando alguém avisa e monta as ações
 * do painel. Toda gravação relê a ordem e avisa a mesa; as contas de vez e rodada são do domínio.
 */
export function startInitiativeRuntime(options: {
  roomId: string;
  service: InitiativeService;
  openChannel: typeof openInitiativeChannel;
}): InitiativeRuntime {
  const { roomId, service } = options;
  const reloader = createInitiativeReloader(service, roomId);
  const channel: InitiativeChannel = options.openChannel({
    roomId,
    handlers: {
      onChanged: reloader.soon,
      onConnected: reloader.soon,
      onConnectionProblem: createConnectionWarning(),
    },
  });
  reloader.now();

  const board = () => useInitiativeStore.getState().board;

  /** Grava, relê e avisa a mesa; a falha vira aviso na tela e `false`. */
  const commit = async (action: string, write: () => Promise<void>): Promise<boolean> => {
    try {
      await write();
    } catch (error) {
      initiativeFailures.report(error, { action, toast: true });
      reloader.now();
      return false;
    }
    reloader.now();
    // O aviso é cortesia: a gravação já deu certo; quem perder relê ao reconectar.
    channel
      .announce()
      .catch((error: unknown) => initiativeFailures.report(error, { action: 'announce' }));
    return true;
  };

  const actions: InitiativeActions = {
    add: (entries) =>
      commit('add', () => {
        const first = nextInitiativePosition(board().entries);
        return service.add(
          roomId,
          entries.map((entry, index) => ({ ...entry, position: first + index })),
        );
      }),
    update: (entry, patch) => commit('update', () => service.update(entry.id, patch)),
    moveTie: (entry, move) =>
      commit('reorder', async () => {
        const changes = moveWithinTie(board().entries, entry.id, move);
        if (changes) await service.reorder(changes);
      }),
    remove: (entry) => commit('remove', () => service.remove(entry.id)),
    next: () =>
      commit('next', () => {
        const { entries, round } = board();
        return service.setTurn(roomId, nextTurn(entries, round));
      }),
    previous: () =>
      commit('previous', () => {
        const { entries, round } = board();
        return service.setTurn(roomId, previousTurn(entries, round));
      }),
    // A janela de confirmação mostra o erro nela mesma: aqui ele só sobe.
    async clear() {
      try {
        await service.clear(roomId);
      } finally {
        reloader.now();
      }
      channel
        .announce()
        .catch((error: unknown) => initiativeFailures.report(error, { action: 'announce' }));
    },
    reload: reloader.now,
  };

  return {
    actions,
    refreshSoon: reloader.soon,
    dispose() {
      reloader.cancel();
      channel.close();
    },
  };
}
