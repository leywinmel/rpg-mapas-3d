import { useEffect, useState } from 'react';
import { useRoomSession } from '@/features/rooms';
import { useTokensStore } from '@/features/tokens';
import { useInitiativeStore } from '../hooks/initiative-store';
import { openInitiativeChannel } from '../services/initiative-channel';
import { startInitiativeRuntime } from '../services/initiative-runtime';
import { getInitiativeService, type InitiativeService } from '../services/initiative-service';

export type InitiativeDependencies = {
  service: InitiativeService;
  openChannel: typeof openInitiativeChannel;
};

/** O que, num token, decide se a entrada dele aparece para quem vê (e com que nome). */
function visibilityKey(tokens: readonly { id: string; hidden: boolean; name: string }[]): string {
  return tokens.map((token) => `${token.id}:${token.hidden ? 1 : 0}:${token.name}`).join('|');
}

/**
 * Liga a ordem de iniciativa da mesa ao banco e ao canal e monta as ações do painel. Não desenha
 * nada. Quando os tokens à vista mudam (o mestre escondeu, a névoa cobriu), relê: o RLS decide de
 * novo quais entradas esta pessoa vê.
 */
export function InitiativeSync({
  dependencies,
}: {
  dependencies?: Partial<InitiativeDependencies>;
}) {
  const { room } = useRoomSession();
  const [service] = useState(() => dependencies?.service ?? getInitiativeService());
  const [openChannel] = useState(() => dependencies?.openChannel ?? openInitiativeChannel);

  useEffect(() => {
    const runtime = startInitiativeRuntime({ roomId: room.id, service, openChannel });
    useInitiativeStore.getState().setActions(runtime.actions);
    const unsubscribe = useTokensStore.subscribe((state, previous) => {
      if (state.tokens === previous.tokens) return;
      if (visibilityKey(state.tokens) !== visibilityKey(previous.tokens)) runtime.refreshSoon();
    });
    return () => {
      unsubscribe();
      useInitiativeStore.getState().setActions(null);
      runtime.dispose();
    };
  }, [room.id, service, openChannel]);

  // A mesa fechou: nada da ordem dela na próxima.
  useEffect(() => () => useInitiativeStore.getState().reset(), []);

  return null;
}
