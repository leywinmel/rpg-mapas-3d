import type { Cell } from '@/domain';
import { notify } from '@/components';
import { reportError } from '@/lib/report-error';
import { PING_LIFETIME_MS, PING_LIMIT, RULER_BROADCAST_INTERVAL_MS } from '../constants';
import { useTableToolsStore, type Ping, type TableToolsActions } from '../hooks/table-tools-store';
import type { RulerMessage } from '../schemas';
import { createLatestThrottle } from './latest-throttle';
import { createRateLimiter } from './rate-limit';
import type { openTableChannel, TableChannel } from './table-channel';

export type TableToolsRuntimeOptions = {
  roomId: string;
  userId: string;
  /** Mapa na tela agora (a régua e o ping valem só nele). */
  currentMapId: () => string | null;
  /** O remetente é da mesa? Qualquer membro pode mandar lixo no canal. */
  isMember: (userId: string) => boolean;
  openChannel: typeof openTableChannel;
  newId?: () => string;
};

export type TableToolsRuntime = { actions: TableToolsActions; dispose: () => void };

/** Um aviso por visita basta: o cliente do Supabase reconecta sozinho. */
function createConnectionWarning() {
  let warned = false;
  return (error: unknown) => {
    if (warned) return;
    warned = true;
    reportError(error, {
      userMessage: 'A conexão em tempo real da régua e do ping falhou.',
      hint: 'Tentando reconectar. Os marcadores dos outros podem não aparecer.',
      context: { feature: 'table-tools', action: 'realtime' },
      severity: 'warn',
    });
  };
}

function reportSendFailure(action: string) {
  return (error: unknown) =>
    reportError(error, {
      userMessage: 'Não deu para mostrar à mesa.',
      hint: 'Confira a conexão e tente de novo.',
      context: { feature: 'table-tools', action },
      severity: 'warn',
    });
}

/**
 * Liga a régua e o ping ao canal da mesa: mostra o que chega dos outros e manda o que esta
 * pessoa faz. Só broadcast; nada vai para o banco.
 */
export function startTableToolsRuntime(options: TableToolsRuntimeOptions): TableToolsRuntime {
  const { userId, currentMapId, isMember } = options;
  const newId = options.newId ?? (() => crypto.randomUUID());
  const store = useTableToolsStore;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const sentLimiter = createRateLimiter(PING_LIMIT);
  const receivedLimiter = createRateLimiter(PING_LIMIT);
  let lastRefusalAt = Number.NEGATIVE_INFINITY;

  const showPing = (ping: Ping) => {
    store.getState().addPing(ping);
    const timer = setTimeout(() => {
      timers.delete(timer);
      store.getState().removePing(ping.id);
    }, PING_LIFETIME_MS);
    timers.add(timer);
  };

  const channel: TableChannel = options.openChannel({
    roomId: options.roomId,
    handlers: {
      onRuler: (message) => {
        if (message.userId === userId || !isMember(message.userId)) return;
        store.getState().putSharedRuler(message);
      },
      onRulerCleared: ({ userId: sender }) => store.getState().dropSharedRuler(sender),
      onPing: (message) => {
        if (message.userId === userId || !isMember(message.userId)) return;
        // Quem passou do limite (cliente alterado) não enche a tela de ninguém.
        if (!receivedLimiter.tryTake(message.userId)) return;
        showPing(message);
      },
      onConnectionProblem: createConnectionWarning(),
    },
  });

  const throttle = createLatestThrottle<RulerMessage>((message) => {
    channel.sendRuler(message).catch(reportSendFailure('share-ruler'));
  }, RULER_BROADCAST_INTERVAL_MS);

  const announceCleared = () => {
    throttle.cancel();
    channel.sendRulerCleared({ userId }).catch(reportSendFailure('clear-ruler'));
  };

  // A régua compartilhada acompanha o estado: cada ponta nova sai; apagar ou parar de
  // compartilhar avisa a mesa uma vez.
  const unsubscribe = store.subscribe((state, previous) => {
    const mapId = currentMapId();
    const sharing = state.shareRuler && state.ruler !== null && mapId !== null;
    const wasSharing = previous.shareRuler && previous.ruler !== null;
    if (sharing && state.ruler && mapId) {
      if (state.ruler !== previous.ruler || !previous.shareRuler) {
        throttle.push({ userId, mapId, from: state.ruler.from, to: state.ruler.to });
      }
      return;
    }
    if (wasSharing) announceCleared();
  });

  const actions: TableToolsActions = {
    ping(cell: Cell) {
      const mapId = currentMapId();
      if (!mapId) return;
      if (!sentLimiter.tryTake(userId)) {
        const now = Date.now();
        if (now - lastRefusalAt > PING_LIMIT.windowMs) {
          lastRefusalAt = now;
          notify.info('Calma aí!', 'Espere um instante para marcar o mapa de novo.');
        }
        return;
      }
      const ping: Ping = { id: newId(), userId, mapId, cell };
      showPing(ping);
      channel.sendPing(ping).catch(reportSendFailure('ping'));
    },
  };

  return {
    actions,
    dispose() {
      unsubscribe();
      const { shareRuler, ruler } = store.getState();
      if (shareRuler && ruler) announceCleared();
      throttle.cancel();
      timers.forEach(clearTimeout);
      timers.clear();
      channel.close();
    },
  };
}
