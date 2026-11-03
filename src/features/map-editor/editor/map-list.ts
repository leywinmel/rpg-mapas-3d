/**
 * Regras da lista de mapas da mesa: formulário de criar/renomear (validado com
 * zod, mesmos limites do banco), nome da cópia e reordenação.
 */
import { z } from 'zod';
import { MAX_MAP_SIZE_V2 } from '@/domain/map-v2';
import { pieceCatalog } from '@/features/scene';
import type { MapSummary } from '../types';

/** Mesmo limite da coluna maps.name. */
export const MAX_MAP_NAME_LENGTH = 80;
const COPY_SUFFIX = ' (cópia)';

export const mapNameSchema = z
  .string()
  .trim()
  .min(1, 'Dê um nome ao mapa.')
  .max(MAX_MAP_NAME_LENGTH, `Use até ${MAX_MAP_NAME_LENGTH} caracteres.`);

const sideSchema = (label: string) =>
  z.coerce
    .number({ message: `${label} precisa ser um número.` })
    .int(`${label} precisa ser um número inteiro.`)
    .min(1, `${label}: no mínimo 1 casa.`)
    .max(MAX_MAP_SIZE_V2, `${label}: no máximo ${MAX_MAP_SIZE_V2} casas.`);

const mapSizeSchema = z.object({ width: sideSchema('Largura'), depth: sideSchema('Profundidade') });

export const newMapSchema = mapSizeSchema.extend({
  name: mapNameSchema,
  floor: z.string().refine((key) => pieceCatalog.get(key)?.kind === 'floor', 'Escolha um chão.'),
});

export type NewMapInput = z.infer<typeof newMapSchema>;

export type FieldErrors = Partial<Record<keyof NewMapInput, string>>;

export type FormResult<T, E = FieldErrors> = { ok: true; value: T } | { ok: false; errors: E };

export type MapSizeInput = z.infer<typeof mapSizeSchema>;

/** Primeira mensagem de cada campo, pronta para a tela. */
function parseForm<T extends object>(
  schema: z.ZodType<T>,
  input: unknown,
): FormResult<T, Partial<Record<keyof T, string>>> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  const errors: Partial<Record<keyof T, string>> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof T | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors };
}

/** Valida o formulário de mapa novo. */
export function parseNewMap(input: Record<keyof NewMapInput, unknown>): FormResult<NewMapInput> {
  return parseForm(newMapSchema, input);
}

/** Valida o tamanho novo do mapa (os mesmos limites de criar). */
export function parseMapSize(
  input: Record<keyof MapSizeInput, unknown>,
): FormResult<MapSizeInput, Partial<Record<keyof MapSizeInput, string>>> {
  return parseForm(mapSizeSchema, input);
}

export function copyName(name: string): string {
  return `${name.slice(0, MAX_MAP_NAME_LENGTH - COPY_SUFFIX.length)}${COPY_SUFFIX}`;
}

export function nextSortOrder(maps: readonly MapSummary[]): number {
  return maps.reduce((highest, map) => Math.max(highest, map.sortOrder + 1), 0);
}

/** Lista na ordem em que a mesa mostra: sort_order e, no empate, quem veio antes. */
export function sortMaps(maps: readonly MapSummary[]): MapSummary[] {
  return [...maps].sort((a, b) => a.sortOrder - b.sortOrder);
}

export type MoveDirection = 'up' | 'down';

/**
 * Sobe ou desce um mapa e devolve só as posições que mudaram. Renumera tudo
 * (0, 1, 2…) porque mapas antigos podem ter o mesmo sort_order, e trocar dois
 * valores iguais não mudaria nada.
 */
export function moveMap(
  maps: readonly MapSummary[],
  mapId: string,
  direction: MoveDirection,
): Array<{ id: string; sortOrder: number }> {
  const ordered = sortMaps(maps);
  const index = ordered.findIndex((map) => map.id === mapId);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= ordered.length) return [];
  const reordered = ordered.slice();
  [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
  return reordered
    .map((map, position) => ({ id: map.id, sortOrder: position, before: map.sortOrder }))
    .filter((item) => item.sortOrder !== item.before)
    .map(({ id, sortOrder }) => ({ id, sortOrder }));
}
