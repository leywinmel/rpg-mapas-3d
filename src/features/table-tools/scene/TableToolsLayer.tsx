import { useMemo } from 'react';
import { useRoomSession } from '@/features/rooms';
import { modelHeightMap } from '@/features/scene';
import { useTokensStore } from '@/features/tokens';
import { useTableToolsStore } from '../hooks/table-tools-store';
import { PingMarker } from './PingMarker';
import { RulerView } from './RulerView';
import { TABLE_SCENE_COLORS } from './table-tools-scene';
import { useTablePointer } from './useTablePointer';

const SOMEONE = 'Alguém da mesa';

/**
 * Régua e ping na cena: a régua desta pessoa, as que os outros compartilham (só de quem está
 * online e no mesmo mapa) e os marcadores. As casas vêm do canal; a altura, do mapa de cada um.
 */
export default function TableToolsLayer() {
  const { members, onlineUserIds, viewer } = useRoomSession();
  const view = useTokensStore((state) => state.view);
  const ruler = useTableToolsStore((state) => state.ruler);
  const sharedRulers = useTableToolsStore((state) => state.sharedRulers);
  const pings = useTableToolsStore((state) => state.pings);
  const model = view?.model;
  const heights = useMemo(() => (model ? modelHeightMap(model) : null), [model]);
  useTablePointer(heights);

  if (!view || !heights) return null;
  const nickname = (userId: string) =>
    userId === viewer.userId
      ? 'Você'
      : (members.find((member) => member.userId === userId)?.nickname ?? SOMEONE);

  return (
    <>
      {ruler && <RulerView line={ruler} heights={heights} color={TABLE_SCENE_COLORS.ruler} />}
      {Object.values(sharedRulers)
        .filter((shared) => shared.mapId === view.mapId && onlineUserIds.has(shared.userId))
        .map((shared) => (
          <RulerView
            key={shared.userId}
            line={shared}
            heights={heights}
            color={TABLE_SCENE_COLORS.sharedRuler}
            owner={nickname(shared.userId)}
          />
        ))}
      {pings
        .filter((ping) => ping.mapId === view.mapId)
        .map((ping) => (
          <PingMarker key={ping.id} ping={ping} heights={heights} who={nickname(ping.userId)} />
        ))}
    </>
  );
}
