/**
 * Pôr uma casa pronta no mapa, com um clique: um modelo novo só (um passo no desfazer).
 *
 * O terreno do retângulo é nivelado na casa mais alta embaixo dele (pela regra "sobe junto":
 * o que já estava apoiado ali acompanha o chão), o piso interno é pintado e as paredes e peças
 * entram com a base no chão nivelado mais a altura da planta. As peças que já estavam ali
 * continuam, como ao pôr um objeto por cima de outro: o mestre decide o que apagar.
 */
import type { Cell } from '../grid';
import type { MapResult } from '../map-document';
import {
  MAX_LEVEL,
  isRectInside,
  paintTerrainRect,
  placePieces,
  placeWall,
  setTerrainHeight,
  terrainAt,
  type CellRect,
  type MapModel,
  type MapPiece,
} from '../map-v2';
import { rotateBlueprint, type Blueprint } from './blueprint';

export type PrefabPlacement = {
  readonly blueprint: Blueprint;
  /** Casa sob o cursor: o prédio fica centrado nela. */
  readonly center: Cell;
  readonly rotation: number;
  /** Fábrica de ids únicos para as peças (o editor usa UUIDs). */
  readonly newId: (index: number) => string;
};

/** O retângulo que a casa pronta ocupa, centrado na casa do cursor e já girado. */
export function prefabRect(blueprint: Blueprint, center: Cell, rotation: number): CellRect {
  const turned = rotation % 2 !== 0;
  const width = turned ? blueprint.depth : blueprint.width;
  const depth = turned ? blueprint.width : blueprint.depth;
  return {
    x: center.x - Math.floor(width / 2),
    z: center.z - Math.floor(depth / 2),
    width,
    depth,
  };
}

function highestGround(model: MapModel, rect: CellRect): number {
  let highest = 0;
  for (let z = rect.z; z < rect.z + rect.depth; z += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      highest = Math.max(highest, terrainAt(model, { x, z })?.height ?? 0);
    }
  }
  return highest;
}

type Based = PrefabPlacement & { readonly base: number };

function prefabPieces(blueprint: Blueprint, rect: CellRect, placement: Based) {
  const { base } = placement;
  return blueprint.pieces.map((piece, index): MapPiece => ({
    id: placement.newId(index),
    asset: { source: 'catalog', key: piece.key },
    x: rect.x + piece.x,
    z: rect.z + piece.z,
    level: Math.min(base + piece.level, MAX_LEVEL),
    rotation: piece.rotation,
    footprint: piece.footprint,
    scale: piece.scale,
  }));
}

export function placePrefab(model: MapModel, placement: PrefabPlacement): MapResult<MapModel> {
  const blueprint = rotateBlueprint(placement.blueprint, placement.rotation);
  const rect = prefabRect(placement.blueprint, placement.center, placement.rotation);
  if (!isRectInside(model.size, rect)) {
    return { ok: false, errors: ['A casa pronta não cabe no mapa aqui: chegue mais para dentro.'] };
  }
  const from = { x: rect.x, z: rect.z };
  const to = { x: rect.x + rect.width - 1, z: rect.z + rect.depth - 1 };
  const base = highestGround(model, rect);
  const painted = paintTerrainRect(model, { from, to, tile: blueprint.floor });
  if (!painted.ok) return painted;
  const leveled = setTerrainHeight(painted.value, { from, to, height: base });
  if (!leveled.ok) return leveled;
  let current = leveled.value;
  for (const wall of blueprint.walls) {
    const placed = placeWall(current, {
      ...wall,
      x: rect.x + wall.x,
      z: rect.z + wall.z,
      level: Math.min(base + wall.level, MAX_LEVEL),
    });
    if (!placed.ok) return placed;
    current = placed.value;
  }
  const based: Based = { ...placement, base };
  return placePieces(current, prefabPieces(blueprint, rect, based));
}
