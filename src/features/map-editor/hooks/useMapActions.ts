import { useCallback } from 'react';
import { createEmptyDocument, parseMapDocument } from '@/domain';
import { reportError } from '@/lib/report-error';
import {
  copyName,
  moveMap,
  nextSortOrder,
  type MoveDirection,
  type NewMapInput,
} from '../editor/map-list';
import { useMapEditorServices } from '../services/services-context';
import type { MapSummary } from '../types';

export type RoomMapsSnapshot = {
  roomId: string;
  activeMapId: string | null;
  maps: readonly MapSummary[];
  patch: (update: { activeMapId?: string | null; maps?: MapSummary[] }) => void;
};

type Context = Record<string, unknown>;

/** Registra a falha (sem toast: o diálogo ou a lista mostram a mensagem) e repassa o erro. */
async function attempt<T>(action: () => Promise<T>, context: Context, userMessage: string) {
  try {
    return await action();
  } catch (error) {
    reportError(error, {
      userMessage,
      context: { feature: 'map-editor', ...context },
      toast: false,
    });
    throw error;
  }
}

/**
 * Ações do mestre sobre a lista de mapas. Cada uma atualiza a tela na hora
 * (otimista) e o tempo real confirma depois; em erro, quem chamou mostra a
 * mensagem no próprio diálogo.
 */
export function useMapActions(snapshot: RoomMapsSnapshot) {
  const { maps: service } = useMapEditorServices();
  const { roomId, activeMapId, maps, patch } = snapshot;

  const create = useCallback(
    (input: NewMapInput) =>
      attempt(
        async () => {
          const summary = await service.createMap({
            roomId,
            name: input.name,
            width: input.width,
            depth: input.depth,
            document: createEmptyDocument({ width: input.width, depth: input.depth }, input.floor),
            sortOrder: nextSortOrder(maps),
          });
          patch({ maps: [...maps, summary] });
          return summary;
        },
        { action: 'create-map' },
        'Não conseguimos criar o mapa.',
      ),
    [service, roomId, maps, patch],
  );

  const rename = useCallback(
    (mapId: string, name: string) =>
      attempt(
        async () => {
          await service.renameMap(mapId, name);
          patch({ maps: maps.map((map) => (map.id === mapId ? { ...map, name } : map)) });
        },
        { action: 'rename-map', mapId },
        'Não conseguimos renomear o mapa.',
      ),
    [service, maps, patch],
  );

  const duplicate = useCallback(
    (source: MapSummary) =>
      attempt(
        async () => {
          const record = await service.loadMap(source.id);
          const parsed = parseMapDocument(record.document, source);
          if (!parsed.ok) throw new Error(parsed.errors.join(' | '));
          const summary = await service.createMap({
            roomId,
            name: copyName(source.name),
            width: source.width,
            depth: source.depth,
            document: parsed.value,
            sortOrder: nextSortOrder(maps),
          });
          patch({ maps: [...maps, summary] });
          return summary;
        },
        { action: 'duplicate-map', mapId: source.id },
        'Não conseguimos duplicar o mapa.',
      ),
    [service, roomId, maps, patch],
  );

  const remove = useCallback(
    (mapId: string) =>
      attempt(
        async () => {
          await service.deleteMap(mapId);
          patch({
            maps: maps.filter((map) => map.id !== mapId),
            // O banco zera rooms.active_map_id sozinho (on delete set null).
            activeMapId: activeMapId === mapId ? null : activeMapId,
          });
        },
        { action: 'delete-map', mapId },
        'Não conseguimos apagar o mapa.',
      ),
    [service, maps, activeMapId, patch],
  );

  const activate = useCallback(
    (mapId: string) =>
      attempt(
        async () => {
          await service.setActiveMap(roomId, mapId);
          patch({ activeMapId: mapId });
        },
        { action: 'activate-map', mapId },
        'Não conseguimos mostrar este mapa para a mesa.',
      ),
    [service, roomId, patch],
  );

  const move = useCallback(
    (mapId: string, direction: MoveDirection) =>
      attempt(
        async () => {
          const changes = moveMap(maps, mapId, direction);
          if (changes.length === 0) return;
          await service.reorderMaps(changes);
          const order = new Map(changes.map((item) => [item.id, item.sortOrder]));
          patch({
            maps: maps.map((map) => ({ ...map, sortOrder: order.get(map.id) ?? map.sortOrder })),
          });
        },
        { action: 'reorder-maps', mapId },
        'Não conseguimos mudar a ordem dos mapas.',
      ),
    [service, maps, patch],
  );

  return { create, rename, duplicate, remove, activate, move };
}

export type MapActions = ReturnType<typeof useMapActions>;
