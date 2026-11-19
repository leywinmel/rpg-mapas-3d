/** Formulário "Mapas prontos": a escolha da biblioteca e o nome do mapa, validado com zod. */
import { READY_MAPS, readyMap } from '@/domain/map-gen';
import { mapNameSchema } from '../editor/map-list';
import type { MapRequest } from './useGenerateMap';

export type ReadyMapValues = { readonly mapId: string; readonly name: string };

export const DEFAULT_READY_VALUES: ReadyMapValues = {
  mapId: READY_MAPS[0]!.id,
  name: READY_MAPS[0]!.name,
};

export type ReadyMapParse =
  | { readonly ok: true; readonly request: MapRequest }
  | { readonly ok: false; readonly error: string };

export function parseReadyMap(values: ReadyMapValues): ReadyMapParse {
  const name = mapNameSchema.safeParse(values.name);
  if (!name.success) return { ok: false, error: name.error.issues[0]?.message ?? '' };
  const ready = readyMap(values.mapId);
  if (!ready) return { ok: false, error: 'Escolha um dos mapas prontos.' };
  return { ok: true, request: { name: name.data, build: () => ready.build().model } };
}
