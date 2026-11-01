/**
 * Regras da lista de mapas da mesa: formulário de criar/renomear (validado com
 * zod, mesmos limites do banco), nome da cópia e reordenação.
 */
import { z } from 'zod';
import {
  createEmptyDocument,
  MAX_MAP_SIZE,
  parseMapDocument,
  type MapDocument,
  type MapResult,
} from '@/domain';
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
    .max(MAX_MAP_SIZE, `${label}: no máximo ${MAX_MAP_SIZE} casas.`);

export const newMapSchema = z.object({
  name: mapNameSchema,
  width: sideSchema('Largura'),
  depth: sideSchema('Profundidade'),
  floor: z.string().refine((key) => pieceCatalog.get(key)?.kind === 'floor', 'Escolha um chão.'),
});

export type NewMapInput = z.infer<typeof newMapSchema>;

export type FieldErrors = Partial<Record<keyof NewMapInput, string>>;

export type FormResult<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

/** Valida o formulário e devolve a primeira mensagem de cada campo, pronta para a tela. */
export function parseNewMap(input: Record<keyof NewMapInput, unknown>): FormResult<NewMapInput> {
  const parsed = newMapSchema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  const errors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof NewMapInput | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors };
}

/**
 * Documento do mapa novo. Passa pelo mesmo validador do domínio que guarda o
 * salvamento e a leitura: nada chega ao banco sem ele.
 */
export function newMapDocument(input: NewMapInput): MapResult<MapDocument> {
  const size = { width: input.width, depth: input.depth };
  return parseMapDocument(createEmptyDocument(size, input.floor), size);
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
