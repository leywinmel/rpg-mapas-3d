/**
 * O que o .glb desenha, em TypeScript sem three.js: as mesmas instâncias que a cena monta de
 * perto (chunk-instances), mas juntas por tipo de peça no mapa todo. Na tela cada pedaço tem
 * suas malhas (para redesenhar só o que muda); no arquivo, uma malha por tipo deixa o .glb
 * menor e abre mais leve no Blender.
 */
import { NO_FLOOR_INDEX, tintKey, type Cutaway, type MapChunk } from '@/domain/map-v2';
import { pieceCatalog, regroupWallSegments, type InstanceTransform } from '@/features/scene';
import {
  pieceGroups,
  terrainInstances,
  wallGroups,
  type ColoredInstances,
} from '@/features/scene/chunks/chunk-instances';
import { GLB_BASE_BYTES, GLB_BYTES_PER_FLOOR_CELL, GLB_BYTES_PER_OBJECT } from '../constants';

/** Cópias de uma peça (ou modelo enviado) com a mesma tinta: uma malha no arquivo. */
export type TintedInstances = {
  /** Chave da peça do catálogo ou id do modelo enviado. */
  readonly key: string;
  readonly tint?: string;
  readonly transforms: InstanceTransform[];
};

export type MapInstances = {
  /** Colunas sob as casas com chão: uma camada lisa, colorida pela lateral do piso. */
  readonly columns: ColoredInstances;
  /** Peças do catálogo (tampas de chão, paredes e objetos), pela chave da peça e a tinta. */
  readonly catalog: ReadonlyMap<string, TintedInstances>;
  /** Modelos enviados pelo mestre, pelo id do arquivo e a tinta. */
  readonly uploads: ReadonlyMap<string, TintedInstances>;
};

function append(
  groups: Map<string, TintedInstances>,
  { key, tint }: { key: string; tint?: string | undefined },
  items: InstanceTransform[],
) {
  const groupKey = tintKey(key, tint);
  const group = groups.get(groupKey);
  if (group) group.transforms.push(...items);
  else groups.set(groupKey, { key, ...(tint ? { tint } : {}), transforms: [...items] });
}

/** As paredes de modelo do pacote vêm em trechos de várias casas: junta como o CatalogPieces. */
function placedCatalog(key: string, transforms: InstanceTransform[]): InstanceTransform[] {
  const entry = pieceCatalog.get(key);
  if (entry?.visual.type !== 'model' || !entry.wallSpan) return transforms;
  return regroupWallSegments(transforms, entry.wallSpan);
}

export function collectMapInstances(chunks: readonly MapChunk[], cutaway: Cutaway): MapInstances {
  const columns: ColoredInstances = { transforms: [], colors: [] };
  const catalog = new Map<string, TintedInstances>();
  const uploads = new Map<string, TintedInstances>();
  for (const chunk of chunks) {
    const terrain = terrainInstances(chunk);
    columns.transforms.push(...terrain.columns.transforms);
    columns.colors.push(...terrain.columns.colors);
    for (const cap of terrain.caps) append(catalog, { key: cap.tile }, cap.transforms);
    for (const wall of wallGroups(chunk, cutaway)) {
      append(
        catalog,
        { key: wall.style, tint: wall.tint },
        placedCatalog(wall.style, wall.transforms),
      );
    }
    for (const group of pieceGroups(chunk, cutaway)) {
      const { asset, tint } = group;
      if (asset.source === 'catalog') append(catalog, { key: asset.key, tint }, group.transforms);
      else append(uploads, { key: asset.assetId, tint }, group.transforms);
    }
  }
  return { columns, catalog, uploads };
}

/**
 * Tamanho aproximado do .glb, para avisar antes de exportar. Conta casas com chão, paredes e
 * peças sem montar as instâncias: precisa ser rápido no mapa 1000×1000.
 */
export function estimateGlbBytes(chunks: readonly MapChunk[]): number {
  let floors = 0;
  let objects = 0;
  for (const chunk of chunks) {
    for (const tile of chunk.terrain.tiles) {
      if (tile !== NO_FLOOR_INDEX) floors += 1;
    }
    objects += chunk.walls.length + chunk.pieces.length;
  }
  return GLB_BASE_BYTES + floors * GLB_BYTES_PER_FLOOR_CELL + objects * GLB_BYTES_PER_OBJECT;
}
