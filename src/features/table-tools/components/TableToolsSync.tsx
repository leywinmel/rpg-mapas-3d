import { useEffect, useRef, useState } from 'react';
import { useRoomSession } from '@/features/rooms';
import { useTokensStore } from '@/features/tokens';
import { useTableToolsStore } from '../hooks/table-tools-store';
import { openTableChannel } from '../services/table-channel';
import { startTableToolsRuntime } from '../services/table-tools-runtime';

/**
 * Liga a régua e o ping ao canal da mesa e monta as ações que a cena usa. Não desenha nada.
 * Trocar de mapa apaga a régua desta pessoa (as casas não valem no outro mapa).
 */
export function TableToolsSync({ openChannel }: { openChannel?: typeof openTableChannel }) {
  const { room, viewer, members } = useRoomSession();
  const [open] = useState(() => openChannel ?? openTableChannel);
  const memberIds = useRef<ReadonlySet<string>>(new Set());
  useEffect(() => {
    memberIds.current = new Set(members.map((member) => member.userId));
  }, [members]);

  useEffect(() => {
    const runtime = startTableToolsRuntime({
      roomId: room.id,
      userId: viewer.userId,
      currentMapId: () => useTokensStore.getState().view?.mapId ?? null,
      isMember: (userId) => memberIds.current.has(userId),
      openChannel: open,
    });
    useTableToolsStore.getState().setActions(runtime.actions);
    return () => {
      useTableToolsStore.getState().setActions(null);
      runtime.dispose();
    };
  }, [room.id, viewer.userId, open]);

  useEffect(
    () =>
      useTokensStore.subscribe((state, previous) => {
        if (state.view?.mapId !== previous.view?.mapId) useTableToolsStore.getState().clearRuler();
      }),
    [],
  );

  // A mesa fechou: nada de régua nem ping dela na próxima.
  useEffect(() => () => useTableToolsStore.getState().reset(), []);

  return null;
}
