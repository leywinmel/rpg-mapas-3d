/**
 * Geometria do tabuleiro em TypeScript puro (sem three.js): onde cada peça do
 * mapa fica no mundo 3D e qual casa está sob o cursor. Fica fora dos
 * componentes para ser testada em Node e compartilhada entre cena e editor.
 */
import { isInside, type Cell, type FloorTile, type GridSize, type Prop, type Wall } from '@/domain';
import { MAX_TERRAIN_HEIGHT, stepsToWorld, terrainAt, type MapModel } from '@/domain/map-v2';

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
/** Altura (em degraus) de cada casa do mapa, ou NO_FLOOR; quem chama já conferiu a borda. */
export type HeightMap = { readonly size: GridSize; readonly lookup: (cell: Cell) => number };

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

/** Parede do lado oeste fica girada um quarto de volta em relação à do norte. */
export const RIGHT_ANGLE_DEGREES = 90;

/** Topo do chão no mundo. O degrau é o HEIGHT_STEP do domínio, o mesmo do v1 e do v2. */
export function floorTop(height: number): number {
  return stepsToWorld(height);
}

/**
 * Alturas lidas direto do mapa v2, sem copiar nada: montar um vetor do mapa inteiro a cada
 * passo do pincel custaria um milhão de casas num mapa de 1000×1000.
 */
export function modelHeightMap(model: MapModel): HeightMap {
  return {
    size: model.size,
    lookup: (cell) => {
      const terrain = terrainAt(model, cell);
      return terrain && terrain.tile !== null ? terrain.height : NO_FLOOR;
    },
  };
}

export function heightAt(map: HeightMap, cell: Cell): number {
  if (cell.x < 0 || cell.z < 0 || cell.x >= map.size.width || cell.z >= map.size.depth) {
    return NO_FLOOR;
  }
  return map.lookup(cell);
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

export type PropAsset = Prop['asset'];

/** Chave do grupo de instâncias: mesmo modelo = mesmo InstancedMesh. */
export function assetGroupKey(asset: PropAsset): string {
  return asset.source === 'catalog' ? `catalog:${asset.key}` : `upload:${asset.assetId}`;
}

/** Meio da aresta e o giro da parede: norte corre em x, oeste corre em z. */
export function wallEdgePlacement(
  edge: WallEdge,
): Pick<InstanceTransform, 'x' | 'z' | 'rotationY'> {
  const isNorth = edge.side === 'north';
  return {
    x: isNorth ? edge.x + 0.5 : edge.x,
    z: isNorth ? edge.z : edge.z + 0.5,
    rotationY: isNorth ? 0 : RIGHT_ANGLE_DEGREES,
  };
}

/**
 * Cada unidade de altura de parede vira uma instância empilhada: a geometria detalhada não
 * deforma ao esticar e continua cabendo num único InstancedMesh por estilo. Uma sobra menor
 * que uma unidade (parede de degrau ímpar, ou cortada no meio pelo corte de andares) vira um
 * último segmento achatado.
 */
export function stackedWallSegments(
  edge: WallEdge,
  base: number,
  height: number,
): InstanceTransform[] {
  const { x, z, rotationY } = wallEdgePlacement(edge);
  const fullSegments = Math.floor(height);
  const segments: InstanceTransform[] = [];
  for (let level = 0; level < fullSegments; level += 1) {
    segments.push({ x, y: base + level, z, rotationY, scale: 1 });
  }
  const remainder = height - fullSegments;
  if (remainder > 0) {
    segments.push({ x, y: base + fullSegments, z, rotationY, scale: 1, scaleY: remainder });
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

type RaySpan = { enter: number; exit: number };

/**
 * Trecho do raio (em distância t) que passa por cima do tabuleiro, do topo do
 * chão mais alto possível até o nível zero. Fora dele não há bloco para tocar,
 * e cortar aqui limita a travessia ao tamanho do mapa mesmo com raio rasante.
 */
function spanOverBoard(ray: Ray, size: GridSize): RaySpan | null {
  const { origin, direction } = ray;
  if (direction.y >= 0) return null;
  let enter = Math.max((floorTop(MAX_TERRAIN_HEIGHT) - origin.y) / direction.y, 0);
  let exit = -origin.y / direction.y;
  const axes = [
    { start: origin.x, step: direction.x, length: size.width },
    { start: origin.z, step: direction.z, length: size.depth },
  ];
  for (const { start, step, length } of axes) {
    if (step === 0) {
      if (start < 0 || start > length) return null;
      continue;
    }
    const near = -start / step;
    const far = (length - start) / step;
    enter = Math.max(enter, Math.min(near, far));
    exit = Math.min(exit, Math.max(near, far));
  }
  return enter <= exit ? { enter, exit } : null;
}

type AxisWalk = { cell: number; step: number; next: number; delta: number };

/** Travessia num eixo: casa atual e em que t o raio cruza a próxima borda de casa. */
function axisWalk(origin: number, direction: number, start: number): AxisWalk {
  const cell = Math.floor(start);
  if (direction === 0) return { cell, step: 0, next: Infinity, delta: Infinity };
  const step = Math.sign(direction);
  const border = step > 0 ? cell + 1 : cell;
  return { cell, step, next: (border - origin) / direction, delta: Math.abs(1 / direction) };
}

/**
 * Casa sob o raio do cursor, levando em conta os chãos empilhados. Anda pelas
 * casas que o raio atravessa, da mais perto à mais longe, e para na primeira
 * cujo bloco ele toca, pelo topo ou pela lateral: sem a lateral, clicar no
 * flanco de um bloco elevado pegaria o chão atrás dele. Custa uma conta por
 * casa atravessada, em vez de testar milhares de instâncias.
 */
export function pickCell(ray: Ray, map: HeightMap): CellHit | null {
  const span = spanOverBoard(ray, map.size);
  if (!span) return null;
  const { origin, direction } = ray;
  const at = (t: number) => ({ x: origin.x + direction.x * t, z: origin.z + direction.z * t });
  const start = at(span.enter);
  const walkX = axisWalk(origin.x, direction.x, start.x);
  const walkZ = axisWalk(origin.z, direction.z, start.z);
  for (let enter = span.enter; enter <= span.exit;) {
    const cell = { x: walkX.cell, z: walkZ.cell };
    const exit = Math.min(walkX.next, walkZ.next, span.exit);
    const surface = surfaceAt(map, cell);
    // Momento em que o raio desce até o topo do bloco; antes da entrada na casa, ele bate na lateral.
    const touch = (surface - origin.y) / direction.y;
    if (isInside(map.size, cell) && touch <= exit) {
      return { cell, point: at(Math.max(touch, enter)), surface };
    }
    const axis = walkX.next < walkZ.next ? walkX : walkZ;
    enter = axis.next;
    axis.cell += axis.step;
    axis.next += axis.delta;
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
  /** Plano de fundo da câmera: alcança a ponta oposta do mapa com a câmera no mais afastado. */
  far: number;
};

const CAMERA_POLAR = (50 * Math.PI) / 180;
const CAMERA_AZIMUTH = Math.PI / 4;
const CAMERA_DISTANCE_FACTOR = 0.85;
const CAMERA_DISTANCE_PADDING = 6;
const CAMERA_MIN_DISTANCE = 2.5;
const CAMERA_MAX_DISTANCE_FACTOR = 2.2;
const CAMERA_MAX_DISTANCE_PADDING = 12;
/**
 * O plano de fundo de sempre. Só mapa grande (acima de ~300 casas) passa dele; em mapa pequeno
 * o fundo mais perto daria mais precisão de profundidade, mas mudaria a cena de quem já tinha mapa.
 */
const MIN_CAMERA_FAR = 1000;
/**
 * Distância, em raios do mapa (meia diagonal), em que o mapa inteiro cabe numa tela de
 * computador (16:10) com o fov de 45° e a câmera inclinada 50°. Medido no navegador.
 */
const CAMERA_FIT_FACTOR = 1.8;
/**
 * Em perspectiva a ponta perto da câmera ocupa mais tela que a do fundo: mirar um pouco à
 * frente do centro (fração do raio) põe as quatro pontas dentro do quadro.
 */
const CAMERA_FIT_TARGET_SHIFT = 0.3;

/**
 * Enquadramento inicial: vista de maquete em diagonal. Em mapa pequeno, centrada e perto, para a
 * maquete aparecer grande e a neblina (que também cresce com o mapa) só engolir o fundo. Em
 * mapa grande essa distância deixava só o meio e a ponta (0,0) na tela, e o mestre achava que
 * a câmera olhava para o canto (RPG-25); então, quando a distância de "caber tudo" é maior, ela
 * vence e o alvo vem um pouco para a frente, para as quatro pontas aparecerem.
 */
export function cameraFrame(size: GridSize): CameraFrame {
  const span = Math.max(size.width, size.depth);
  const close = span * CAMERA_DISTANCE_FACTOR + CAMERA_DISTANCE_PADDING;
  const radius = Math.hypot(size.width, size.depth) / 2;
  const fits = radius * CAMERA_FIT_FACTOR;
  const distance = Math.max(close, fits);
  // Para a frente = na direção da câmera (o azimute), sem sair do mapa.
  const shift = fits > close ? radius * CAMERA_FIT_TARGET_SHIFT : 0;
  const target = clampToBoard(
    {
      x: size.width / 2 + shift * Math.sin(CAMERA_AZIMUTH),
      y: 0,
      z: size.depth / 2 + shift * Math.cos(CAMERA_AZIMUTH),
    },
    size,
  );
  const horizontal = Math.sin(CAMERA_POLAR) * distance;
  const maxDistance = span * CAMERA_MAX_DISTANCE_FACTOR + CAMERA_MAX_DISTANCE_PADDING;
  return {
    target,
    position: {
      x: target.x + horizontal * Math.sin(CAMERA_AZIMUTH),
      y: Math.cos(CAMERA_POLAR) * distance,
      z: target.z + horizontal * Math.cos(CAMERA_AZIMUTH),
    },
    minDistance: CAMERA_MIN_DISTANCE,
    maxDistance,
    far: Math.max(MIN_CAMERA_FAR, maxDistance + span * Math.SQRT2),
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
