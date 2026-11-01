/**
 * Geometria do tabuleiro em TypeScript puro (sem three.js): onde cada peça do
 * documento fica no mundo 3D e qual casa está sob o cursor. Fica fora dos
 * componentes para ser testada em Node e compartilhada entre cena e editor.
 */
import {
  MAX_FLOOR_HEIGHT,
  worldToCell,
  type Cell,
  type FloorTile,
  type GridSize,
  type Prop,
  type Wall,
} from '@/domain';

/** Altura de cada degrau de chão empilhado, em unidades do mundo (1 casa = 1 unidade). */
export const FLOOR_STEP_HEIGHT = 0.5;
/** Profundidade do bloco abaixo do nível zero: dá a cara de maquete recortada. */
export const FLOOR_BASE_DEPTH = 0.3;
/** Espessura da tampa detalhada do chão; abaixo dela vem a coluna lisa. */
export const FLOOR_CAP_DEPTH = 0.12;
export const WALL_THICKNESS = 0.18;
/** Quanto do lado da casa um modelo enviado pode ocupar (sobra uma folga para a grade aparecer). */
export const MODEL_FOOTPRINT = 0.9;
export const MODEL_MAX_HEIGHT = 2;
/** Casa sem chão: marcador do mapa de alturas. */
export const NO_FLOOR = -1;

export type Vec3 = { x: number; y: number; z: number };
export type Ray = { origin: Vec3; direction: Vec3 };
export type HeightMap = { size: GridSize; heights: Int8Array };

/** Posição, giro (graus) e escala de uma instância de peça. */
export type InstanceTransform = {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  scale: number;
  scaleY?: number;
};

export type WallEdge = Pick<Wall, 'x' | 'z' | 'side'>;

export function floorTop(height: number): number {
  return height * FLOOR_STEP_HEIGHT;
}

/** Altura de cada casa num vetor (z * largura + x), para consultas O(1) no laço de quadros. */
export function buildHeightMap(floors: readonly FloorTile[], size: GridSize): HeightMap {
  const heights = new Int8Array(size.width * size.depth).fill(NO_FLOOR);
  for (const floor of floors) {
    if (floor.x >= size.width || floor.z >= size.depth) continue;
    heights[floor.z * size.width + floor.x] = floor.height;
  }
  return { size, heights };
}

export function heightAt(map: HeightMap, cell: Cell): number {
  if (cell.x < 0 || cell.z < 0 || cell.x >= map.size.width || cell.z >= map.size.depth) {
    return NO_FLOOR;
  }
  return map.heights[cell.z * map.size.width + cell.x] ?? NO_FLOOR;
}

/** Altura do topo da casa no mundo; casa vazia fica no nível zero. */
export function surfaceAt(map: HeightMap, cell: Cell): number {
  return floorTop(Math.max(heightAt(map, cell), 0));
}

/** Transformação da coluna lisa sob a tampa: estica do fundo do bloco até a tampa. */
export function floorColumnTransform(floor: FloorTile): InstanceTransform {
  const top = floorTop(floor.height) - FLOOR_CAP_DEPTH;
  return {
    x: floor.x + 0.5,
    y: top,
    z: floor.z + 0.5,
    rotationY: 0,
    scale: 1,
    scaleY: top + FLOOR_BASE_DEPTH,
  };
}

export function floorCapTransform(floor: FloorTile): InstanceTransform {
  return { x: floor.x + 0.5, y: floorTop(floor.height), z: floor.z + 0.5, rotationY: 0, scale: 1 };
}

export function propTransform(prop: Prop): InstanceTransform {
  return { x: prop.x, y: prop.elevation, z: prop.z, rotationY: prop.rotation, scale: prop.scale };
}

export type PropAsset = Prop['asset'];

/** Chave do grupo de instâncias: mesmo modelo = mesmo InstancedMesh. */
export function assetGroupKey(asset: PropAsset): string {
  return asset.source === 'catalog' ? `catalog:${asset.key}` : `upload:${asset.assetId}`;
}

/** As duas casas que a aresta separa; a parede nasce no chão mais alto das duas. */
export function wallBase(map: HeightMap, edge: WallEdge): number {
  const neighbor =
    edge.side === 'north' ? { x: edge.x, z: edge.z - 1 } : { x: edge.x - 1, z: edge.z };
  return Math.max(surfaceAt(map, edge), surfaceAt(map, neighbor));
}

/**
 * Cada metro de parede vira uma instância empilhada: a geometria detalhada não
 * deforma ao esticar e continua cabendo num único InstancedMesh por estilo.
 */
export function wallSegmentTransforms(map: HeightMap, wall: Wall): InstanceTransform[] {
  const base = wallBase(map, wall);
  const isNorth = wall.side === 'north';
  const segments: InstanceTransform[] = [];
  for (let level = 0; level < wall.height; level += 1) {
    segments.push({
      x: isNorth ? wall.x + 0.5 : wall.x,
      y: base + level,
      z: isNorth ? wall.z : wall.z + 0.5,
      rotationY: isNorth ? 0 : 90,
      scale: 1,
    });
  }
  return segments;
}

/** Aresta da casa mais perto do ponto: é onde a ferramenta de parede encaixa. */
export function nearestEdge(cell: Cell, point: { x: number; z: number }): WallEdge {
  const fx = point.x - cell.x;
  const fz = point.z - cell.z;
  const distances = [
    { edge: { x: cell.x, z: cell.z, side: 'north' as const }, distance: fz },
    { edge: { x: cell.x, z: cell.z + 1, side: 'north' as const }, distance: 1 - fz },
    { edge: { x: cell.x, z: cell.z, side: 'west' as const }, distance: fx },
    { edge: { x: cell.x + 1, z: cell.z, side: 'west' as const }, distance: 1 - fx },
  ];
  distances.sort((a, b) => a.distance - b.distance);
  return distances[0]!.edge;
}

/** Distância do ponto até a aresta mais próxima da casa (0 = em cima da linha). */
export function distanceToNearestEdge(cell: Cell, point: { x: number; z: number }): number {
  const fx = point.x - cell.x;
  const fz = point.z - cell.z;
  return Math.min(fx, 1 - fx, fz, 1 - fz);
}

export type CellHit = { cell: Cell; point: { x: number; z: number }; surface: number };

/**
 * Casa sob o raio do cursor, levando em conta os chãos empilhados: testa os
 * planos de cada degrau, do mais alto ao chão, e aceita a primeira casa cujo
 * topo está naquele degrau. São no máximo 11 interseções por movimento do
 * mouse, em vez de testar milhares de instâncias.
 */
export function pickCell(ray: Ray, map: HeightMap): CellHit | null {
  const { origin, direction } = ray;
  if (direction.y === 0) return null;
  for (let level = MAX_FLOOR_HEIGHT; level >= 0; level -= 1) {
    const plane = floorTop(level);
    const t = (plane - origin.y) / direction.y;
    if (t <= 0) continue;
    const point = { x: origin.x + direction.x * t, z: origin.z + direction.z * t };
    const cell = worldToCell(map.size, point.x, point.z);
    if (!cell) continue;
    if (Math.max(heightAt(map, cell), 0) === level) return { cell, point, surface: plane };
  }
  return null;
}

export type Box = { min: Vec3; max: Vec3 };
export type ModelFit = { scale: number; offset: Vec3 };

/**
 * Modelo enviado vem em qualquer escala (centímetros, metros, gigante). Cabe
 * numa casa: lado maior do chão até MODEL_FOOTPRINT, altura até MODEL_MAX_HEIGHT,
 * centrado e apoiado no chão.
 */
export function fitModelToCell(box: Box): ModelFit {
  const width = box.max.x - box.min.x;
  const depth = box.max.z - box.min.z;
  const height = box.max.y - box.min.y;
  const footprint = Math.max(width, depth);
  const limits = [
    footprint > 0 ? MODEL_FOOTPRINT / footprint : Infinity,
    height > 0 ? MODEL_MAX_HEIGHT / height : Infinity,
  ];
  const fitted = Math.min(...limits);
  const scale = Number.isFinite(fitted) ? fitted : 1;
  return {
    scale,
    offset: {
      x: -((box.min.x + box.max.x) / 2) * scale,
      y: -box.min.y * scale,
      z: -((box.min.z + box.max.z) / 2) * scale,
    },
  };
}

const MIN_INSTANCE_CAPACITY = 16;

/**
 * Capacidade do InstancedMesh em potências de 2: pintar uma casa a mais não
 * recria a malha (e não recompila nada); só ao passar do limite.
 */
export function instanceCapacity(count: number): number {
  let capacity = MIN_INSTANCE_CAPACITY;
  while (capacity < count) capacity *= 2;
  return capacity;
}

/** Agrupa itens por chave mantendo a ordem: um InstancedMesh por tipo de peça. */
export function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

export type CameraFrame = {
  position: Vec3;
  target: Vec3;
  minDistance: number;
  maxDistance: number;
};

const CAMERA_POLAR = (50 * Math.PI) / 180;
const CAMERA_AZIMUTH = Math.PI / 4;
const CAMERA_DISTANCE_FACTOR = 0.85;
const CAMERA_DISTANCE_PADDING = 6;
const CAMERA_MIN_DISTANCE = 2.5;
const CAMERA_MAX_DISTANCE_FACTOR = 2.2;
const CAMERA_MAX_DISTANCE_PADDING = 12;

/** Enquadramento inicial: vista de maquete em diagonal, o mapa inteiro cabendo na tela. */
export function cameraFrame(size: GridSize): CameraFrame {
  const span = Math.max(size.width, size.depth);
  const distance = span * CAMERA_DISTANCE_FACTOR + CAMERA_DISTANCE_PADDING;
  const target = { x: size.width / 2, y: 0, z: size.depth / 2 };
  const horizontal = Math.sin(CAMERA_POLAR) * distance;
  return {
    target,
    position: {
      x: target.x + horizontal * Math.sin(CAMERA_AZIMUTH),
      y: Math.cos(CAMERA_POLAR) * distance,
      z: target.z + horizontal * Math.cos(CAMERA_AZIMUTH),
    },
    minDistance: CAMERA_MIN_DISTANCE,
    maxDistance: span * CAMERA_MAX_DISTANCE_FACTOR + CAMERA_MAX_DISTANCE_PADDING,
  };
}

/** Prende o ponto que a câmera olha dentro do mapa: arrastar não perde o tabuleiro de vista. */
export function clampToBoard(point: Vec3, size: GridSize): Vec3 {
  return {
    x: Math.min(Math.max(point.x, 0), size.width),
    y: point.y,
    z: Math.min(Math.max(point.z, 0), size.depth),
  };
}
