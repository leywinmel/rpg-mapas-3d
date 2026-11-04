import { anchorUnderCursor, canMoveToken, tokenCells, type Cell, type Viewer } from '@/domain';
import type { MapModel } from '@/domain/map-v2';
import { heightAt, modelHeightMap, useCameraFocus } from '@/features/scene';
import { reportError } from '@/lib/report-error';
import { DRAG_BROADCAST_INTERVAL_MS, TOKENS_RELOAD_DELAY_MS } from '../constants';
import { useTokensStore, type TokenActions } from '../hooks/tokens-store';
import type { Token } from '../types';
import { createDragThrottle } from './drag-throttle';
import { tokenFailures } from './token-errors';
import type { openTokensChannel, TokensChannel } from './tokens-channel';
import type { TokensService } from './tokens-service';

/** Degrau do chão mais alto debaixo do token: ele fica em pé em cima, nunca enterrado. */
export function floorLevelUnder(model: MapModel, anchor: Cell, size: number): number {
  const heights = modelHeightMap(model);
  return tokenCells({ ...anchor, size }).reduce(
    (level, cell) => Math.max(level, heightAt(heights, cell)),
    0,
  );
}

function center(model: MapModel): Cell {
  return { x: Math.floor(model.size.width / 2), z: Math.floor(model.size.depth / 2) };
}

export type TokensReloader = { now: () => void; soon: () => void; cancel: () => void };

/** Relê a lista do mapa aberto; a resposta de um mapa anterior (ou de um pedido velho) é descartada. */
export function createTokensReloader(service: TokensService): TokensReloader {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let seq = 0;
  const run = async () => {
    const store = useTokensStore.getState();
    const mapId = store.view?.mapId;
    if (!mapId) return;
    const mine = ++seq;
    store.setLoading();
    try {
      const tokens = await service.listTokens(mapId);
      if (mine === seq) useTokensStore.getState().setTokens(tokens);
    } catch (error) {
      tokenFailures.report(error, { action: 'load' });
      if (mine === seq) useTokensStore.getState().setFailed(error);
    }
  };
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return {
    now: () => void run(),
    // Avisos em sequência (reconexão, névoa) viram uma releitura só.
    soon: () => {
      cancel();
      timer = setTimeout(() => void run(), TOKENS_RELOAD_DELAY_MS);
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
      userMessage: 'A conexão em tempo real dos tokens falhou.',
      hint: 'Tentando reconectar. Os movimentos dos outros podem chegar atrasados.',
      context: { feature: 'tokens', action: 'realtime' },
      severity: 'warn',
    });
  };
}

/**
 * Abre o canal da mesa e põe no estado o que chega: arraste dos outros, token gravado (relido
 * pelo RLS: se saiu da vista, some) e token apagado.
 */
export function connectTokensChannel(options: {
  roomId: string;
  service: TokensService;
  openChannel: typeof openTokensChannel;
  reloader: TokensReloader;
}): TokensChannel {
  const { service, reloader } = options;
  const refresh = async (tokenId: string) => {
    try {
      const token = await service.getToken(tokenId);
      const store = useTokensStore.getState();
      if (token && token.mapId === store.view?.mapId) store.upsertToken(token);
      else store.removeToken(tokenId);
    } catch (error) {
      tokenFailures.report(error, { action: 'refresh' });
    }
  };
  return options.openChannel({
    roomId: options.roomId,
    handlers: {
      onDrag: ({ tokenId, x, z }) => {
        const store = useTokensStore.getState();
        if (store.tokens.some((token) => token.id === tokenId)) {
          store.setRemoteDrag(tokenId, { x, z });
        }
      },
      onSaved: (tokenId) => void refresh(tokenId),
      onRemoved: (tokenId) => useTokensStore.getState().removeToken(tokenId),
      onConnected: reloader.soon,
      onConnectionProblem: createConnectionWarning(),
    },
  });
}

/** O jogador só vê o arraste de token à vista: o escondido e o coberto não vão ao canal. */
function visibleToPlayers(token: Token, anchor: Cell): boolean {
  if (token.hidden) return false;
  const covers = useTokensStore.getState().fogCovers;
  return !(covers && covers(anchor, token.size));
}

/** Ações que a cena e o painel usam; `dispose` cancela o arraste que estava para sair. */
export function createTokenActions(options: {
  service: TokensService;
  viewer: Viewer;
  channel: () => TokensChannel | null;
  reloader: TokensReloader;
}): { actions: TokenActions; dispose: () => void } {
  const { service, viewer } = options;
  const announce = (send: (channel: TokensChannel) => Promise<void>) => {
    const channel = options.channel();
    if (!channel) return;
    // O aviso é cortesia: a gravação já deu certo; quem perder relê ao reconectar.
    send(channel).catch((error: unknown) => tokenFailures.report(error, { action: 'announce' }));
  };
  const throttle = createDragThrottle((message) => {
    announce((channel) => channel.sendDrag(message));
  }, DRAG_BROADCAST_INTERVAL_MS);

  const actions: TokenActions = {
    async createToken(draft) {
      const view = useTokensStore.getState().view;
      if (!view) throw new Error('Nenhum mapa aberto para pôr o token.');
      const focus = useCameraFocus.getState().view ?? center(view.model);
      const anchor = anchorUnderCursor(view.model.size, focus, draft.size);
      const token = await service.createToken({
        ...draft,
        mapId: view.mapId,
        ...anchor,
        level: floorLevelUnder(view.model, anchor, draft.size),
      });
      useTokensStore.getState().upsertToken(token);
      announce((channel) => channel.announceSaved(token.id));
      return token;
    },
    async updateToken(token, patch) {
      const saved = await service.updateToken(token.id, patch);
      useTokensStore.getState().upsertToken(saved);
      announce((channel) => channel.announceSaved(saved.id));
    },
    async deleteToken(token) {
      await service.deleteToken(token);
      useTokensStore.getState().removeToken(token.id);
      announce((channel) => channel.announceRemoved(token.id));
    },
    dragToken(token, anchor) {
      if (!canMoveToken(viewer, token)) return;
      if (!visibleToPlayers(token, anchor)) {
        throttle.cancel();
        return;
      }
      throttle.push({ tokenId: token.id, ...anchor });
    },
    async dropToken(token, anchor) {
      throttle.cancel();
      const view = useTokensStore.getState().view;
      if (!view || !canMoveToken(viewer, token)) return;
      const level = floorLevelUnder(view.model, anchor, token.size);
      // Otimista: o token fica onde foi solto; se o banco recusar, volta.
      useTokensStore.getState().upsertToken({ ...token, ...anchor, level });
      try {
        const saved = await service.updateToken(token.id, { ...anchor, level });
        useTokensStore.getState().upsertToken(saved);
        announce((channel) => channel.announceSaved(saved.id));
      } catch (error) {
        useTokensStore.getState().upsertToken(token);
        tokenFailures.report(error, { action: 'move', toast: true });
      }
    },
    getImageUrl: service.getImageUrl,
    reload: options.reloader.soon,
  };
  return { actions, dispose: throttle.cancel };
}
