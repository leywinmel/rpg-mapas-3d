/**
 * Do pedaço do mapa v2 às instâncias da cena, em TypeScript puro (sem three.js): o que cada
 * InstancedMesh do pedaço desenha. Um pedaço desenha só o que é dele (terreno, paredes da
 * aresta que ele guarda, peças ancoradas nele); por isso mudar um pedaço redesenha só ele.
 */
import {
  isPieceVisible,
  NO_FLOOR_INDEX,
  pieceRect,
  stepsToWorld,
  visibleWallHeight,
  type Cutaway,
  type MapChunk,
  type MapPiece,
  type MapWall,
  type PieceAsset,
} from '@/domain/map-v2';
import { pieceCatalog } from '../catalog/catalog';
import { SCENE_PALETTE } from '../catalog/palette';
import {
  assetGroupKey,
  floorCapTransform,
  floorColumnTransform,
  floorTop,
  FLOOR_BASE_DEPTH,
  groupBy,
  RIGHT_ANGLE_DEGREES,
  stackedWallSegments,
  wallEdgePlacement,
  type InstanceTransform,
} from '../layout';

/** Uma camada lisa com uma cor por instância. */
export type ColoredInstances = {
  readonly transforms: InstanceTransform[];
  readonly colors: string[];
};

export type TerrainInstances = {
  /** A coluna lisa sob cada casa com chão: uma camada só, colorida pela lateral do piso. */
  readonly columns: ColoredInstances;
  /** As tampas, uma lista por peça de chão (um InstancedMesh por tipo). */
  readonly caps: ReadonlyArray<{ readonly tile: string; readonly transforms: InstanceTransform[] }>;
};

type ChunkFloor = { x: number; z: number; tile: string; height: number };

/** As casas do pedaço que têm chão, em coordenadas do mapa. */
function chunkFloors(chunk: MapChunk): ChunkFloor[] {
  const { bounds, terrain } = chunk;
  const floors: ChunkFloor[] = [];
  for (let index = 0; index < terrain.tiles.length; index += 1) {
    const paletteIndex = terrain.tiles[index] ?? NO_FLOOR_INDEX;
    const tile = paletteIndex === NO_FLOOR_INDEX ? undefined : terrain.palette[paletteIndex - 1];
    if (tile === undefined) continue;
    floors.push({
      x: bounds.x + (index % bounds.width),
      z: bounds.z + Math.floor(index / bounds.width),
      tile,
      height: terrain.heights[index] ?? 0,
    });
  }
  return floors;
}

/** Terreno do pedaço. Casa sem chão não desenha nada, como no v1. */
export function terrainInstances(chunk: MapChunk): TerrainInstances {
  const columns: InstanceTransform[] = [];
  const colors: string[] = [];
  const caps = new Map<string, InstanceTransform[]>();
  for (const floor of chunkFloors(chunk)) {
    const { tile } = floor;
    columns.push(floorColumnTransform(floor));
    colors.push(pieceCatalog.get(tile)?.sideColor ?? SCENE_PALETTE.stoneSide);
    const group = caps.get(tile);
    if (group) group.push(floorCapTransform(floor));
    else caps.set(tile, [floorCapTransform(floor)]);
  }
  return {
    columns: { transforms: columns, colors },
    caps: [...caps].map(([tile, transforms]) => ({ tile, transforms })),
  };
}

/** Segmentos da parede que aparecem com o corte: a base vem do degrau gravado na parede. */
export function wallTransforms(wall: MapWall, cutaway: Cutaway): InstanceTransform[] {
  const steps = visibleWallHeight(wall, cutaway);
  if (steps === 0) return [];
  return stackedWallSegments(wall, stepsToWorld(wall.level), stepsToWorld(steps));
}

export type WallGroup = { readonly style: string; readonly transforms: InstanceTransform[] };

/** Paredes do pedaço por estilo; o estilo que o corte esconde inteiro não vira malha vazia. */
export function wallGroups(chunk: MapChunk, cutaway: Cutaway): WallGroup[] {
  const groups: WallGroup[] = [];
  for (const [style, walls] of groupBy(chunk.walls, (wall) => wall.style)) {
    const transforms = walls.flatMap((wall) => wallTransforms(wall, cutaway));
    if (transforms.length > 0) groups.push({ style, transforms });
  }
  return groups;
}

/**
 * Onde a peça fica: no centro do retângulo que ela ocupa JÁ GIRADO (a âncora é o canto de
 * menor x e z), na altura do degrau da base, girada em quartos de volta. Uma peça de 1×1
 * cai no centro da casa, exatamente onde o editor v1 punha o objeto.
 */
export function pieceTransform(piece: MapPiece): InstanceTransform {
  const rect = pieceRect(piece);
  return {
    x: rect.x + rect.width / 2,
    y: stepsToWorld(piece.level),
    z: rect.z + rect.depth / 2,
    rotationY: piece.rotation * RIGHT_ANGLE_DEGREES,
    scale: piece.scale,
  };
}

export type PieceGroup = {
  readonly key: string;
  readonly asset: PieceAsset;
  readonly transforms: InstanceTransform[];
};

/** Peças do pedaço que o corte deixa ver, agrupadas por modelo (um InstancedMesh por grupo). */
export function pieceGroups(chunk: MapChunk, cutaway: Cutaway): PieceGroup[] {
  const visible = chunk.pieces.filter((piece) => isPieceVisible(piece, cutaway));
  return [...groupBy(visible, (piece) => assetGroupKey(piece.asset))].map(([key, pieces]) => ({
    key,
    asset: pieces[0]!.asset,
    transforms: pieces.map(pieceTransform),
  }));
}

/** Luz que uma peça acende (tocha), já na posição do mundo. */
export type LightSource = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly color: string;
  readonly intensity: number;
  readonly distance: number;
};

/** Peças do pedaço que acendem luz. Peça escondida pelo corte não ilumina. */
export function chunkLightSources(chunk: MapChunk, cutaway: Cutaway): LightSource[] {
  const sources: LightSource[] = [];
  for (const piece of chunk.pieces) {
    if (piece.asset.source !== 'catalog' || !isPieceVisible(piece, cutaway)) continue;
    const light = pieceCatalog.get(piece.asset.key)?.light;
    if (!light) continue;
    const { x, y, z } = pieceTransform(piece);
    sources.push({
      x,
      y: y + light.offsetY * piece.scale,
      z,
      color: light.color,
      intensity: light.intensity,
      distance: light.distance * piece.scale,
    });
  }
  return sources;
}

export type FarInstances = { readonly terrain: ColoredInstances; readonly walls: ColoredInstances };

const farColorOf = (key: string, fallback: string): string =>
  pieceCatalog.get(key)?.farColor ?? fallback;

/**
 * O pedaço visto de longe: cada casa vira um bloco liso só (coluna e tampa juntas, na cor do
 * topo do piso) e cada parede vira uma placa só da altura dela, em vez de um segmento
 * detalhado por unidade. Medido no mapa 1000×1000: terreno e paredes detalhados eram ~95%
 * dos triângulos da visão geral.
 */
export function farInstances(chunk: MapChunk, cutaway: Cutaway): FarInstances {
  const terrain: ColoredInstances = { transforms: [], colors: [] };
  for (const floor of chunkFloors(chunk)) {
    const top = floorTop(floor.height);
    terrain.transforms.push({
      x: floor.x + 0.5,
      y: top,
      z: floor.z + 0.5,
      rotationY: 0,
      scale: 1,
      scaleY: top + FLOOR_BASE_DEPTH,
    });
    terrain.colors.push(farColorOf(floor.tile, SCENE_PALETTE.stoneTop));
  }
  const walls: ColoredInstances = { transforms: [], colors: [] };
  for (const wall of chunk.walls) {
    const steps = visibleWallHeight(wall, cutaway);
    if (steps === 0) continue;
    walls.transforms.push({
      ...wallEdgePlacement(wall),
      y: stepsToWorld(wall.level),
      scale: 1,
      scaleY: stepsToWorld(steps),
    });
    walls.colors.push(farColorOf(wall.style, SCENE_PALETTE.wallStone));
  }
  return { terrain, walls };
}

/** Cada casa vira 4 segmentos de linha (8 vértices de 3 números). */
const GRID_FLOATS_PER_CELL = 4 * 2 * 3;

/**
 * Contorno de cada casa do pedaço na altura do topo dela: a grade acompanha o terreno. Casa
 * sem chão fica no nível zero (altura 0), como o surfaceAt do v1. `lift` sobe a linha um fio
 * acima da tampa, para as duas não brigarem na tela.
 */
export function chunkGridPositions(chunk: MapChunk, lift: number): Float32Array {
  const { bounds, terrain } = chunk;
  const positions = new Float32Array(bounds.width * bounds.depth * GRID_FLOATS_PER_CELL);
  let offset = 0;
  const push = (x: number, y: number, z: number) => {
    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;
    offset += 3;
  };
  for (let index = 0; index < terrain.heights.length; index += 1) {
    const x = bounds.x + (index % bounds.width);
    const z = bounds.z + Math.floor(index / bounds.width);
    const y = stepsToWorld(terrain.heights[index] ?? 0) + lift;
    push(x, y, z);
    push(x + 1, y, z);
    push(x + 1, y, z);
    push(x + 1, y, z + 1);
    push(x + 1, y, z + 1);
    push(x, y, z + 1);
    push(x, y, z + 1);
    push(x, y, z);
  }
  return positions;
}
