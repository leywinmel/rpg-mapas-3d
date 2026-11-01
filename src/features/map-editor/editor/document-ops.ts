/**
 * Operações de edição sobre o documento do mapa: funções puras que devolvem um
 * documento novo (ou o MESMO objeto quando nada muda, para o histórico não
 * ganhar passo vazio). Limites vêm do domínio; a validação final é o
 * parseMapDocument antes de salvar.
 */
import {
  isEdgeInside,
  isInside,
  MAX_FLOOR_HEIGHT,
  MAX_PROPS,
  MAX_WALLS,
  type Ambience,
  type Cell,
  type FloorTile,
  type GridEdge,
  type GridSize,
  type MapDocument,
  type Prop,
  type Wall,
} from '@/domain';
import {
  distanceToNearestEdge,
  FLOOR_STEP_HEIGHT,
  nearestEdge,
  type PropAsset,
} from '@/features/scene';

/** Até esta distância da aresta, a borracha prefere apagar a parede em vez do chão. */
export const WALL_ERASE_RANGE = 0.22;
export const ROTATION_STEP = 90;
const FULL_TURN = 360;

function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.z === b.z;
}

function sameEdge(a: GridEdge, b: GridEdge): boolean {
  return a.x === b.x && a.z === b.z && a.side === b.side;
}

export function floorAt(document: MapDocument, cell: Cell): FloorTile | undefined {
  return document.floors.find((floor) => sameCell(floor, cell));
}

export function wallAt(document: MapDocument, edge: GridEdge): Wall | undefined {
  return document.walls.find((wall) => sameEdge(wall, edge));
}

/** Casa onde o objeto está apoiado (objetos têm posição livre, a casa é o chão sob eles). */
export function propCell(prop: Prop): Cell {
  return { x: Math.floor(prop.x), z: Math.floor(prop.z) };
}

export function propsInCell(document: MapDocument, cell: Cell): Prop[] {
  return document.props.filter((prop) => sameCell(propCell(prop), cell));
}

export function normalizeRotation(degrees: number): number {
  return ((degrees % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

export function setFloorTile(
  document: MapDocument,
  size: GridSize,
  paint: { cell: Cell; tile: string },
): MapDocument {
  const { cell, tile } = paint;
  if (!isInside(size, cell)) return document;
  const index = document.floors.findIndex((floor) => sameCell(floor, cell));
  if (index === -1) {
    return { ...document, floors: [...document.floors, { x: cell.x, z: cell.z, tile, height: 0 }] };
  }
  const current = document.floors[index]!;
  if (current.tile === tile) return document;
  const floors = document.floors.slice();
  floors[index] = { ...current, tile };
  return { ...document, floors };
}

export function removeFloor(document: MapDocument, cell: Cell): MapDocument {
  const floors = document.floors.filter((floor) => !sameCell(floor, cell));
  return floors.length === document.floors.length ? document : { ...document, floors };
}

/**
 * Sobe ou desce o bloco de chão um degrau. Objetos apoiados na casa sobem e
 * descem junto, senão ficariam enterrados ou flutuando.
 */
export function adjustFloorHeight(document: MapDocument, cell: Cell, delta: number): MapDocument {
  const index = document.floors.findIndex((floor) => sameCell(floor, cell));
  if (index === -1) return document;
  const current = document.floors[index]!;
  const height = Math.min(Math.max(current.height + delta, 0), MAX_FLOOR_HEIGHT);
  if (height === current.height) return document;
  const floors = document.floors.slice();
  floors[index] = { ...current, height };
  const lift = (height - current.height) * FLOOR_STEP_HEIGHT;
  const props = document.props.map((prop) =>
    sameCell(propCell(prop), cell)
      ? { ...prop, elevation: Math.max(prop.elevation + lift, 0) }
      : prop,
  );
  return { ...document, floors, props };
}

export function setWall(document: MapDocument, size: GridSize, wall: Wall): MapDocument {
  if (!isEdgeInside(size, wall)) return document;
  const index = document.walls.findIndex((existing) => sameEdge(existing, wall));
  if (index === -1) {
    if (document.walls.length >= MAX_WALLS) return document;
    return { ...document, walls: [...document.walls, wall] };
  }
  const current = document.walls[index]!;
  if (current.style === wall.style && current.height === wall.height) return document;
  const walls = document.walls.slice();
  walls[index] = wall;
  return { ...document, walls };
}

export function removeWall(document: MapDocument, edge: GridEdge): MapDocument {
  const walls = document.walls.filter((wall) => !sameEdge(wall, edge));
  return walls.length === document.walls.length ? document : { ...document, walls };
}

export type PropPlacement = {
  id: string;
  asset: PropAsset;
  cell: Cell;
  rotation: number;
};

/** Objeto novo no centro da casa, apoiado no topo do chão dela. */
export function placeProp(
  document: MapDocument,
  size: GridSize,
  placement: PropPlacement,
): MapDocument {
  const { cell } = placement;
  if (!isInside(size, cell) || document.props.length >= MAX_PROPS) return document;
  const floor = floorAt(document, cell);
  const prop: Prop = {
    id: placement.id,
    asset: placement.asset,
    x: cell.x + 0.5,
    z: cell.z + 0.5,
    elevation: (floor?.height ?? 0) * FLOOR_STEP_HEIGHT,
    rotation: normalizeRotation(placement.rotation),
    scale: 1,
  };
  return { ...document, props: [...document.props, prop] };
}

export function removeProp(document: MapDocument, id: string): MapDocument {
  const props = document.props.filter((prop) => prop.id !== id);
  return props.length === document.props.length ? document : { ...document, props };
}

export function rotateProp(document: MapDocument, id: string, step = ROTATION_STEP): MapDocument {
  if (!document.props.some((prop) => prop.id === id)) return document;
  return {
    ...document,
    props: document.props.map((prop) =>
      prop.id === id ? { ...prop, rotation: normalizeRotation(prop.rotation + step) } : prop,
    ),
  };
}

export type EraseTarget =
  | { layer: 'wall'; edge: GridEdge }
  | { layer: 'prop'; id: string }
  | { layer: 'floor'; cell: Cell };

/**
 * O que a borracha apaga sob o cursor, do que está "por cima" para baixo:
 * parede (se o cursor está colado numa aresta com parede), depois o objeto mais
 * recente da casa, depois o chão.
 */
export function eraseTargetAt(
  document: MapDocument,
  hit: { cell: Cell; point: { x: number; z: number } },
): EraseTarget | null {
  const edge = nearestEdge(hit.cell, hit.point);
  if (distanceToNearestEdge(hit.cell, hit.point) <= WALL_ERASE_RANGE && wallAt(document, edge)) {
    return { layer: 'wall', edge };
  }
  const props = propsInCell(document, hit.cell);
  const topProp = props.at(-1);
  if (topProp) return { layer: 'prop', id: topProp.id };
  if (floorAt(document, hit.cell)) return { layer: 'floor', cell: hit.cell };
  return null;
}

export function eraseTarget(document: MapDocument, target: EraseTarget): MapDocument {
  switch (target.layer) {
    case 'wall':
      return removeWall(document, target.edge);
    case 'prop':
      return removeProp(document, target.id);
    case 'floor':
      return removeFloor(document, target.cell);
  }
}

export function setAmbience(document: MapDocument, patch: Partial<Ambience>): MapDocument {
  const ambience = { ...document.ambience, ...patch };
  const unchanged = (Object.keys(ambience) as Array<keyof Ambience>).every(
    (key) => ambience[key] === document.ambience[key],
  );
  return unchanged ? document : { ...document, ambience };
}
