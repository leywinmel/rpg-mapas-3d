/**
 * Gerador de vilas e cidades: da planta (layout.ts) ao MapModel v2, por semente. Monta os
 * pedaços direto (sem passar pelas operações, que conferem o mapa inteiro a cada peça): é o
 * que deixa uma cidade de 1000×1000 sair em segundos. O resultado é um mapa comum, que o
 * mestre edita como qualquer outro.
 */
import type { GridSize } from '../grid';
import {
  chunkBounds,
  chunkKey,
  chunkOfCell,
  createDefaultHeader,
  isValidMapSizeV2,
  listChunks,
  MAX_MAP_SIZE_V2,
  MAX_PIECES_PER_CHUNK,
  MAX_WALLS_PER_CHUNK,
  wallKey,
  wallOwnerChunk,
  type MapChunk,
  type MapHeader,
  type MapModel,
  type MapPiece,
  type MapWall,
} from '../map-v2';
import { buildBlueprint, rotateBlueprint, type Blueprint, type BuildingSpec } from './blueprint';
import { STYLE_KITS, type SettlementStyle, type StyleKit } from './kits';
import {
  planSettlement,
  TERRAIN_CLASS,
  type PlannedPiece,
  type SettlementPlan,
  type TerrainClass,
} from './layout';
import { profileForSize, type SettlementProfile } from './presets';

export type SettlementOptions = {
  readonly style: SettlementStyle;
  readonly size: GridSize;
  readonly seed: number;
  /** Sem ele, o jeito vem do tamanho (vila, cidadezinha ou cidade). */
  readonly profile?: SettlementProfile;
};

export type GenerationStats = {
  readonly buildings: number;
  readonly walls: number;
  readonly pieces: number;
  /** Peças ou paredes que não couberam no limite de um pedaço (deve ser zero). */
  readonly dropped: number;
};

export type GeneratedSettlement = {
  readonly model: MapModel;
  readonly stats: GenerationStats;
};

/** Pedaço em construção: os arrays ainda podem ser mexidos, ninguém mais os tem. */
type Draft = { walls: MapWall[]; pieces: MapPiece[]; wallKeys: Set<string> };

type Builder = {
  readonly size: GridSize;
  readonly kit: StyleKit;
  readonly drafts: Map<string, Draft>;
  dropped: number;
};

function draftAt(builder: Builder, key: string): Draft {
  const found = builder.drafts.get(key);
  if (found) return found;
  const draft: Draft = { walls: [], pieces: [], wallKeys: new Set() };
  builder.drafts.set(key, draft);
  return draft;
}

/**
 * Dois prédios encostados pelos fundos dividem a parede da divisa: a aresta recebe uma parede
 * só (a do primeiro prédio), como o domínio exige.
 */
function addWall(builder: Builder, wall: MapWall): void {
  const draft = draftAt(builder, chunkKey(wallOwnerChunk(builder.size, wall)));
  const key = wallKey(wall);
  if (draft.wallKeys.has(key)) return;
  if (draft.walls.length >= MAX_WALLS_PER_CHUNK) {
    builder.dropped += 1;
    return;
  }
  draft.walls.push(wall);
  draft.wallKeys.add(key);
}

/** Id curto e único no mapa: o pedaço da âncora e a ordem dentro dele. */
function addPiece(builder: Builder, piece: Omit<MapPiece, 'id'>): void {
  const coord = chunkOfCell(piece);
  const draft = draftAt(builder, chunkKey(coord));
  if (draft.pieces.length >= MAX_PIECES_PER_CHUNK) {
    builder.dropped += 1;
    return;
  }
  draft.pieces.push({ id: `g${coord.cx}.${coord.cz}.${draft.pieces.length}`, ...piece });
}

function catalogPiece(piece: PlannedPiece): Omit<MapPiece, 'id'> {
  return {
    asset: { source: 'catalog', key: piece.key },
    x: piece.x,
    z: piece.z,
    level: 0,
    rotation: piece.rotation,
    footprint: piece.footprint,
    scale: piece.scale,
  };
}

/** Plantas já giradas, por prédio igual: a cidade repete combinações e monta cada uma uma vez. */
function blueprintCache(kit: StyleKit) {
  const cache = new Map<string, Blueprint>();
  return (spec: BuildingSpec, rotation: number): Blueprint => {
    const key = [
      spec.width,
      spec.depth,
      spec.stories,
      spec.use,
      spec.walls.plain,
      spec.floor,
      spec.seed,
      rotation,
    ].join('|');
    const found = cache.get(key);
    if (found) return found;
    const built = rotateBlueprint(buildBlueprint(spec, kit), rotation);
    cache.set(key, built);
    return built;
  };
}

/** Peça de chão de cada classe de terreno. */
function classTiles(kit: StyleKit, profile: SettlementProfile): Record<TerrainClass, string> {
  const { tiles } = kit;
  return {
    [TERRAIN_CLASS.ground]: tiles.ground,
    [TERRAIN_CLASS.road]: profile.dirtRoads ? tiles.lane : tiles.road,
    [TERRAIN_CLASS.sidewalk]: tiles.sidewalk ?? tiles.ground,
    [TERRAIN_CLASS.plaza]: tiles.plaza,
    [TERRAIN_CLASS.yard]: tiles.yard,
    // O piso de cada prédio é pintado por cima, prédio a prédio.
    [TERRAIN_CLASS.building]: tiles.indoor[0]!,
  };
}

/** Peça de chão de cada casa do mapa, como índice numa lista de chaves. */
function terrainTiles(plan: SettlementPlan, kit: StyleKit) {
  const keys: string[] = [];
  const indexOf = new Map<string, number>();
  const keyIndex = (key: string) => {
    let found = indexOf.get(key);
    if (found === undefined) {
      found = keys.push(key) - 1;
      indexOf.set(key, found);
    }
    return found;
  };
  const byClass = classTiles(kit, plan.profile);
  const classIndex = Object.values(TERRAIN_CLASS).map((terrain) => keyIndex(byClass[terrain]));
  const tiles = new Uint16Array(plan.classes.length);
  for (let cell = 0; cell < tiles.length; cell += 1) tiles[cell] = classIndex[plan.classes[cell]!]!;
  const { width } = plan.size;
  for (const { rect, spec } of plan.buildings) {
    const floor = keyIndex(spec.floor);
    for (let z = rect.z; z < rect.z + rect.depth; z += 1) {
      tiles.fill(floor, z * width + rect.x, z * width + rect.x + rect.width);
    }
  }
  return { keys, tiles };
}

/** Terreno de um pedaço a partir do terreno do mapa todo (paleta só com o que ele usa). */
function chunkTerrain(
  terrain: ReturnType<typeof terrainTiles>,
  size: GridSize,
  bounds: MapChunk['bounds'],
): MapChunk['terrain'] {
  const palette: string[] = [];
  const local = new Map<number, number>();
  const tiles = new Uint16Array(bounds.width * bounds.depth);
  let offset = 0;
  for (let z = bounds.z; z < bounds.z + bounds.depth; z += 1) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x += 1) {
      const global = terrain.tiles[z * size.width + x]!;
      let paletteIndex = local.get(global);
      if (paletteIndex === undefined) {
        paletteIndex = palette.push(terrain.keys[global]!);
        local.set(global, paletteIndex);
      }
      tiles[offset] = paletteIndex;
      offset += 1;
    }
  }
  return { palette, tiles, heights: new Uint8Array(tiles.length) };
}

function stampBuildings(builder: Builder, plan: SettlementPlan): void {
  const blueprintOf = blueprintCache(builder.kit);
  for (const { rect, rotation, spec } of plan.buildings) {
    const blueprint = blueprintOf(spec, rotation);
    for (const wall of blueprint.walls) {
      addWall(builder, { ...wall, x: rect.x + wall.x, z: rect.z + wall.z });
    }
    for (const piece of blueprint.pieces) {
      addPiece(builder, {
        asset: { source: 'catalog', key: piece.key },
        x: rect.x + piece.x,
        z: rect.z + piece.z,
        level: piece.level,
        rotation: piece.rotation,
        footprint: piece.footprint,
        scale: piece.scale,
      });
    }
  }
}

/** Cabeçalho do mapa gerado: o clima padrão com a paisagem do estilo em volta. */
function headerFor(kit: StyleKit): MapHeader {
  const header = createDefaultHeader();
  return { ...header, ambience: { ...header.ambience, backdrop: kit.backdrop } };
}

/** O mapa a partir da planta. */
export function buildSettlement(plan: SettlementPlan): GeneratedSettlement {
  const kit = STYLE_KITS[plan.style];
  const { size } = plan;
  const builder: Builder = { size, kit, drafts: new Map(), dropped: 0 };
  stampBuildings(builder, plan);
  for (const piece of plan.pieces) addPiece(builder, catalogPiece(piece));
  const terrain = terrainTiles(plan, kit);
  const chunks = new Map<string, MapChunk>();
  let walls = 0;
  let pieces = 0;
  for (const coord of listChunks(size)) {
    const key = chunkKey(coord);
    const bounds = chunkBounds(size, coord);
    const draft = builder.drafts.get(key) ?? { walls: [], pieces: [], wallKeys: new Set() };
    walls += draft.walls.length;
    pieces += draft.pieces.length;
    chunks.set(key, {
      coord,
      bounds,
      terrain: chunkTerrain(terrain, size, bounds),
      walls: draft.walls,
      pieces: draft.pieces,
    });
  }
  return {
    model: { size: { ...size }, header: headerFor(kit), chunks },
    stats: { buildings: plan.buildings.length, walls, pieces, dropped: builder.dropped },
  };
}

/** Vila ou cidade do tamanho pedido. Mesmo estilo, tamanho e semente: o mesmo mapa. */
export function generateSettlement(options: SettlementOptions): GeneratedSettlement {
  const { size } = options;
  if (!isValidMapSizeV2(size)) {
    throw new RangeError(
      `Tamanho ${size.width}×${size.depth} inválido: use de 1 a ${MAX_MAP_SIZE_V2} casas por lado.`,
    );
  }
  const profile = options.profile ?? profileForSize(size);
  return buildSettlement(planSettlement({ ...options, profile }));
}
