import { useCallback } from 'react';
import { createEmptyMap, DEFAULT_FLOOR_TILE, type MapModel } from '@/domain/map-v2';
import { reportError } from '@/lib/report-error';
import {
  copyName,
  moveMap,
  nextSortOrder,
  type MoveDirection,
  type NewMapInput,
} from '../editor/map-list';
import {
  BatchSaveError,
  blankBaseline,
  saveMapV2InBatches,
  type SaveProgress,
} from '../services/batch-save';
import { useMapEditorServices } from '../services/services-context';
import type { MapSummary } from '../types';

export type RoomMapsSnapshot = {
  roomId: string;
  activeMapId: string | null;
  maps: readonly MapSummary[];
  patch: (update: { activeMapId?: string | null; maps?: MapSummary[] }) => void;
};

type Context = Record<string, unknown>;

export type CreateFromModelInput = {
  name: string;
  model: MapModel;
  onProgress?: (progress: SaveProgress) => void;
};

export type ResumeSaveInput = {
  mapId: string;
  /** O que já chegou ao banco (o `saved` do BatchSaveError). */
  saved: MapModel;
  current: MapModel;
  onProgress?: (progress: SaveProgress) => void;
};

/**
 * O mapa foi criado, mas a gravação dos pedaços parou no meio. O mapa no banco continua
 * válido (o que faltou é chão liso) e `saved` diz de onde a nova tentativa recomeça.
 */
export class PartialMapError extends Error {
  readonly summary: MapSummary;
  readonly saved: MapModel;

  constructor(summary: MapSummary, failure: BatchSaveError) {
    super('O mapa foi criado, mas nem todos os pedaços foram gravados.', { cause: failure.cause });
    this.name = 'PartialMapError';
    this.summary = summary;
    this.saved = failure.saved;
  }
}

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
  const { maps: service, mapsV2 } = useMapEditorServices();
  const { roomId, activeMapId, maps, patch } = snapshot;

  const create = useCallback(
    (input: NewMapInput) =>
      attempt(
        async () => {
          const size = { width: input.width, depth: input.depth };
          const summary = await mapsV2.createMapV2({
            roomId,
            name: input.name,
            size,
            sortOrder: nextSortOrder(maps),
          });
          // O mapa nasce com o chão padrão em todo pedaço; outro chão é gravado logo em seguida.
          if (input.floor !== DEFAULT_FLOOR_TILE) {
            const current = createEmptyMap(size, input.floor);
            await mapsV2.saveMapV2({ mapId: summary.id, saved: null, current });
          }
          patch({ maps: [...maps, summary] });
          return summary;
        },
        { action: 'create-map' },
        'Não conseguimos criar o mapa.',
      ),
    [mapsV2, roomId, maps, patch],
  );

  const createFromModel = useCallback(
    ({ name, model, onProgress }: CreateFromModelInput) =>
      attempt(
        async () => {
          const summary = await mapsV2.createMapV2({
            roomId,
            name,
            size: model.size,
            sortOrder: nextSortOrder(maps),
            header: model.header,
          });
          patch({ maps: [...maps, summary] });
          try {
            await saveMapV2InBatches(mapsV2, {
              mapId: summary.id,
              saved: blankBaseline(model),
              current: model,
              onProgress,
            });
          } catch (error) {
            if (error instanceof BatchSaveError) throw new PartialMapError(summary, error);
            throw error;
          }
          return summary;
        },
        { action: 'create-map-from-model' },
        'Não conseguimos gravar o mapa gerado.',
      ),
    [mapsV2, roomId, maps, patch],
  );

  const resumeSave = useCallback(
    ({ mapId, saved, current, onProgress }: ResumeSaveInput) =>
      attempt(
        () => saveMapV2InBatches(mapsV2, { mapId, saved, current, onProgress }),
        { action: 'resume-map-save', mapId },
        'Não conseguimos terminar de gravar o mapa.',
      ),
    [mapsV2],
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
          const { model } = await mapsV2.loadMapV2(source.id);
          const summary = await mapsV2.createMapV2({
            roomId,
            name: copyName(source.name),
            size: model.size,
            sortOrder: nextSortOrder(maps),
            header: model.header,
          });
          patch({ maps: [...maps, summary] });
          // Em lotes: a cópia de uma cidade grande não cabe num pedido só.
          await saveMapV2InBatches(mapsV2, {
            mapId: summary.id,
            saved: blankBaseline(model),
            current: model,
          });
          return summary;
        },
        { action: 'duplicate-map', mapId: source.id },
        'Não conseguimos duplicar o mapa.',
      ),
    [mapsV2, roomId, maps, patch],
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

  return { create, createFromModel, resumeSave, rename, duplicate, remove, activate, move };
}

export type MapActions = ReturnType<typeof useMapActions>;
