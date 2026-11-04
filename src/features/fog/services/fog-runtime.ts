import { isAreaCovered, isEmptyFogPlan, planFogSave, type GridSize } from '@/domain';
import { useTokensStore } from '@/features/tokens';
import { reportError } from '@/lib/report-error';
import { FOG_SAVE_DELAY_MS } from '../constants';
import { useFogStore } from '../hooks/fog-store';
import type { FogChannel, openFogChannel } from './fog-channel';
import { fogFailures } from './fog-errors';
import type { FogService } from './fog-service';

/** Lê a névoa do mapa aberto; a resposta de um mapa anterior é descartada. */
export function createFogLoader(service: FogService) {
  let seq = 0;
  return async (mapId: string, size: GridSize) => {
    const mine = ++seq;
    useFogStore.getState().setLoading();
    try {
      const fog = await service.loadFog(mapId, size);
      if (mine === seq && useFogStore.getState().mapId === mapId) {
        useFogStore.getState().setLoaded(fog);
      }
    } catch (error) {
      fogFailures.report(error, { action: 'load' });
      if (mine === seq) useFogStore.getState().setFailed(error);
    }
  };
}

/** Guarda o canal aberto da mesa para quem foi criado antes dele (a gravação). */
export function createChannelSlot() {
  let channel: FogChannel | null = null;
  return {
    get: () => channel,
    set: (next: FogChannel | null) => {
      channel = next;
    },
  };
}

/**
 * Gravação do mestre: espera a pausa depois da última pincelada e manda só os pedaços que
 * mudaram desde a última gravação; depois avisa a mesa.
 */
export function createFogSaver(options: { service: FogService; channel: () => FogChannel | null }) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let saving = false;

  const save = async () => {
    timer = null;
    const { mapId, fog, saved } = useFogStore.getState();
    if (!mapId || !fog || saving) return;
    const plan = planFogSave(saved, fog);
    if (isEmptyFogPlan(saved, plan)) {
      useFogStore.getState().markSaved(fog);
      return;
    }
    saving = true;
    useFogStore.getState().setSaveStatus('saving');
    try {
      await options.service.saveFog(mapId, plan);
    } catch (error) {
      fogFailures.report(error, { action: 'save', toast: true });
      useFogStore.getState().setSaveStatus('error', error);
      return;
    } finally {
      saving = false;
    }
    if (useFogStore.getState().mapId !== mapId) return;
    useFogStore.getState().markSaved(fog);
    // Pinceladas que chegaram durante a gravação vão na próxima.
    if (useFogStore.getState().saveStatus === 'pending') schedule();
    options
      .channel()
      ?.announce(mapId)
      .catch((error: unknown) => fogFailures.report(error, { action: 'announce' }));
  };

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void save(), FOG_SAVE_DELAY_MS);
  }

  return {
    schedule,
    flush: () => {
      if (timer) clearTimeout(timer);
      void save();
    },
    cancel: () => {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

function createConnectionWarning() {
  let warned = false;
  return (error: unknown) => {
    if (warned) return;
    warned = true;
    reportError(error, {
      userMessage: 'A conexão em tempo real da névoa falhou.',
      hint: 'Tentando reconectar. Se a névoa não mudar, recarregue a página.',
      context: { feature: 'fog', action: 'realtime' },
      severity: 'warn',
    });
  };
}

/** Escuta o aviso do mestre: relê a névoa, o mapa (jogador) e os tokens que podem ter surgido. */
export function connectFogChannel(options: {
  roomId: string;
  openChannel: typeof openFogChannel;
  reload: (mapId: string) => void;
}): FogChannel {
  return options.openChannel({
    roomId: options.roomId,
    handlers: {
      onChanged: (mapId) => {
        if (useFogStore.getState().mapId !== mapId) return;
        options.reload(mapId);
        useFogStore.getState().bumpRevision();
        useTokensStore.getState().actions?.reload();
      },
      onConnectionProblem: createConnectionWarning(),
    },
  });
}

/** Os tokens perguntam à névoa se uma área está toda coberta (para não anunciar o arraste). */
export function fogCovers(anchor: { x: number; z: number }, size: number): boolean {
  const { fog } = useFogStore.getState();
  return Boolean(fog?.enabled && isAreaCovered(fog, anchor, size));
}
