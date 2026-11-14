/**
 * Gerador de vilas e cidades: da planta (layout.ts) ao MapModel v2, por semente. Monta os
 * pedaços direto (sem passar pelas operações, que conferem o mapa inteiro a cada peça): é o
 * que deixa uma cidade de 1000×1000 sair em segundos. O resultado é um mapa comum, que o
 * mestre edita como qualquer outro.
 */
import type { GridSize } from '../grid';
import {
  createDefaultHeader,
  isValidMapSizeV2,
  MAX_MAP_SIZE_V2,
  type MapHeader,
  type MapPiece,
  type MapModel,
} from '../map-v2';
import { createAssembler, createTileKeys, type MapAssembler, type TerrainGrid } from './assemble';
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
function terrainTiles(plan: SettlementPlan, kit: StyleKit): TerrainGrid {
  const { keys, index: keyIndex } = createTileKeys();
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

function stampBuildings(assembler: MapAssembler, plan: SettlementPlan, kit: StyleKit): void {
  const blueprintOf = blueprintCache(kit);
  for (const { rect, rotation, spec } of plan.buildings) {
    const blueprint = blueprintOf(spec, rotation);
    for (const wall of blueprint.walls) {
      assembler.addWall({ ...wall, x: rect.x + wall.x, z: rect.z + wall.z });
    }
    for (const piece of blueprint.pieces) {
      assembler.addPiece({
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
  const assembler = createAssembler(plan.size);
  stampBuildings(assembler, plan, kit);
  for (const piece of plan.pieces) assembler.addPiece(catalogPiece(piece));
  const { model, walls, pieces, dropped } = assembler.finish(
    terrainTiles(plan, kit),
    headerFor(kit),
  );
  return { model, stats: { buildings: plan.buildings.length, walls, pieces, dropped } };
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
