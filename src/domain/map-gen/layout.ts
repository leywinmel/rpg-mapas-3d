/**
 * Planta da vila ou cidade, antes das peças: quarteirões divididos por ruas (divisão binária
 * do terreno), lotes com prédios virados para a rua, praça no centro, parques, árvores,
 * postes e veículos estacionados. É a parte barata do gerador: a prévia só precisa disto.
 *
 * Tudo no térreo (terreno plano): a porta dá para a calçada ou para um recuo livre, e a rua
 * tem pelo menos 4 casas, duas faixas de carro de 2 casas.
 */
import type { GridSize } from '../grid';
import { QUARTER_TURNS, type CellRect, type Footprint } from '../map-v2';
import { doorColumn, type BuildingSpec, type BuildingUse } from './blueprint';
import {
  roofFor,
  STYLE_KITS,
  SINGLE_CELL,
  type SettlementStyle,
  type SizedPiece,
  type StyleKit,
  type WallSet,
} from './kits';
import type { SettlementProfile } from './presets';
import { createRandom, deriveSeed, type Random } from './random';

/** O que cada casa do terreno é. A prévia pinta por isto; o gerador escolhe o piso por isto. */
export const TERRAIN_CLASS = {
  ground: 0,
  road: 1,
  sidewalk: 2,
  plaza: 3,
  yard: 4,
  building: 5,
} as const;
export type TerrainClass = (typeof TERRAIN_CLASS)[keyof typeof TERRAIN_CLASS];

export type PlannedBuilding = {
  /** Retângulo no mapa, já girado. */
  readonly rect: CellRect;
  readonly rotation: number;
  readonly spec: BuildingSpec;
};

/** Peça solta (árvore, poste, veículo), no térreo. */
export type PlannedPiece = {
  readonly key: string;
  readonly x: number;
  readonly z: number;
  readonly rotation: number;
  readonly footprint: Footprint;
  readonly scale: number;
};

export type SettlementPlan = {
  readonly size: GridSize;
  readonly style: SettlementStyle;
  readonly profile: SettlementProfile;
  /** Classe de cada casa, linha a linha (z, depois x). */
  readonly classes: Uint8Array;
  readonly buildings: readonly PlannedBuilding[];
  readonly pieces: readonly PlannedPiece[];
};

export type PlanOptions = {
  readonly style: SettlementStyle;
  readonly size: GridSize;
  readonly seed: number;
  readonly profile: SettlementProfile;
};

/** Mobílias diferentes por combinação de prédio: repetir deixa o gerador rápido (plantas em cache). */
const INTERIOR_VARIANTS = 24;
const LAMP_SPACING = 8;
const STREET_PROP_CHANCE = 0.07;
const CELLS_PER_PARK_TREE = 10;
const CELLS_PER_YARD_TREE = 24;
const CELLS_PER_YARD_PROP = 18;
const CELLS_PER_YARD_COVER = 14;
const CELLS_PER_PARK_COVER = 6;
const CELLS_PER_MARKET_PROP = 16;
const PLAZA_TREE_INSET = 2;
const TREE_SCALE = { min: 0.8, spread: 0.6 } as const;
/** Andar mínimo para o prédio virar "torre" (janelas em toda a fachada). */
const TOWER_STORIES = 3;
const SHOP_CHANCE = 0.25;
/** Vaga entre veículos estacionados, em casas. */
const PARKING_GAP = { min: 1, max: 5 } as const;
const BIG_VEHICLE_CHANCE = 0.15;
/** Quanto do andar a mais a cidade ganha no centro (0 = igual no mapa todo). */
const CENTER_HEIGHT_WEIGHT = 0.6;

type Planner = {
  readonly size: GridSize;
  readonly kit: StyleKit;
  readonly profile: PlanOptions['profile'];
  readonly seed: number;
  readonly random: Random;
  readonly classes: Uint8Array;
  /** Casa já usada no térreo (prédio, peça, porta que precisa ficar livre, cruzamento). */
  readonly blocked: Uint8Array;
  readonly buildings: PlannedBuilding[];
  readonly pieces: PlannedPiece[];
  readonly roads: CellRect[];
};

const index = (planner: Planner, x: number, z: number) => z * planner.size.width + x;

function inside(planner: Planner, x: number, z: number): boolean {
  return x >= 0 && z >= 0 && x < planner.size.width && z < planner.size.depth;
}

function forRect(rect: CellRect, visit: (x: number, z: number) => void): void {
  for (let z = rect.z; z < rect.z + rect.depth; z += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) visit(x, z);
  }
}

function fillClass(planner: Planner, rect: CellRect, terrain: TerrainClass): void {
  forRect(rect, (x, z) => {
    planner.classes[index(planner, x, z)] = terrain;
  });
}

function isFree(planner: Planner, rect: CellRect, allowed?: TerrainClass): boolean {
  for (let z = rect.z; z < rect.z + rect.depth; z += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      if (!inside(planner, x, z)) return false;
      const at = index(planner, x, z);
      if (planner.blocked[at] !== 0) return false;
      if (allowed !== undefined && planner.classes[at] !== allowed) return false;
    }
  }
  return true;
}

function block(planner: Planner, rect: CellRect): void {
  forRect(rect, (x, z) => {
    if (inside(planner, x, z)) planner.blocked[index(planner, x, z)] = 1;
  });
}

function rotatedSize(footprint: Footprint, rotation: number): Footprint {
  return rotation % 2 === 0 ? footprint : { width: footprint.depth, depth: footprint.width };
}

type LoosePiece = { key: string; x: number; z: number; rotation: number; footprint: Footprint };

/** Põe a peça se as casas estão livres (e da classe pedida); devolve se pôs. */
function tryPiece(planner: Planner, piece: LoosePiece, allowed?: TerrainClass, scale = 1): boolean {
  const { width, depth } = rotatedSize(piece.footprint, piece.rotation);
  const rect = { x: piece.x, z: piece.z, width, depth };
  if (!isFree(planner, rect, allowed)) return false;
  block(planner, rect);
  planner.pieces.push({ ...piece, scale });
  return true;
}

function single(planner: Planner, key: string, x: number, z: number, allowed?: TerrainClass) {
  const rotation = planner.random.between(0, QUARTER_TURNS - 1);
  return tryPiece(planner, { key, x, z, rotation, footprint: SINGLE_CELL }, allowed);
}

function tree(planner: Planner, x: number, z: number, allowed?: TerrainClass): boolean {
  const { random, kit } = planner;
  const scale = TREE_SCALE.min + random.next() * TREE_SCALE.spread;
  const rotation = random.between(0, QUARTER_TURNS - 1);
  const piece = { key: random.pick(kit.trees), x, z, rotation, footprint: SINGLE_CELL };
  return tryPiece(planner, piece, allowed, scale);
}

/** Sorteia `count` casas do retângulo e tenta pôr uma peça em cada. */
function scatter(
  planner: Planner,
  rect: CellRect,
  count: number,
  put: (x: number, z: number) => unknown,
) {
  const { random } = planner;
  for (let item = 0; item < count; item += 1) {
    put(
      random.between(rect.x, rect.x + rect.width - 1),
      random.between(rect.z, rect.z + rect.depth - 1),
    );
  }
}

// ---------------------------------------------------------------------------
// Ruas e quarteirões
// ---------------------------------------------------------------------------

function addRoad(planner: Planner, rect: CellRect): void {
  forRect(rect, (x, z) => {
    const at = index(planner, x, z);
    // Cruzamento: nada estaciona nem fica parado ali.
    if (planner.classes[at] === TERRAIN_CLASS.road) planner.blocked[at] = 1;
    planner.classes[at] = TERRAIN_CLASS.road;
  });
  planner.roads.push(rect);
}

/** Divide o retângulo com uma rua no lado mais comprido até os quarteirões caberem no máximo. */
function subdivide(planner: Planner, rect: CellRect, level: number, blocks: CellRect[]): void {
  const { profile, random } = planner;
  if (rect.width <= profile.maxBlock && rect.depth <= profile.maxBlock) {
    blocks.push(rect);
    return;
  }
  const vertical = rect.width >= rect.depth;
  const length = vertical ? rect.width : rect.depth;
  const road = level < profile.avenueLevels ? profile.avenueWidth : profile.streetWidth;
  if (length < 2 * profile.minBlock + road) {
    blocks.push(rect);
    return;
  }
  const cut = random.between(profile.minBlock, length - profile.minBlock - road);
  if (vertical) {
    addRoad(planner, { x: rect.x + cut, z: rect.z, width: road, depth: rect.depth });
    subdivide(planner, { ...rect, width: cut }, level + 1, blocks);
    const rest = cut + road;
    subdivide(planner, { ...rect, x: rect.x + rest, width: rect.width - rest }, level + 1, blocks);
    return;
  }
  addRoad(planner, { x: rect.x, z: rect.z + cut, width: rect.width, depth: road });
  subdivide(planner, { ...rect, depth: cut }, level + 1, blocks);
  const rest = cut + road;
  subdivide(planner, { ...rect, z: rect.z + rest, depth: rect.depth - rest }, level + 1, blocks);
}

function inset(rect: CellRect, by: number): CellRect {
  return {
    x: rect.x + by,
    z: rect.z + by,
    width: Math.max(0, rect.width - 2 * by),
    depth: Math.max(0, rect.depth - 2 * by),
  };
}

// ---------------------------------------------------------------------------
// Prédios
// ---------------------------------------------------------------------------

/** Quão perto do centro (1 no meio, 0 no canto): a cidade sobe no centro. */
function centrality(planner: Planner, rect: CellRect): number {
  const { width, depth } = planner.size;
  const dx = rect.x + rect.width / 2 - width / 2;
  const dz = rect.z + rect.depth / 2 - depth / 2;
  const far = Math.hypot(width / 2, depth / 2);
  return 1 - Math.min(1, Math.hypot(dx, dz) / far);
}

function storiesFor(planner: Planner, rect: CellRect): number {
  const { profile, random } = planner;
  const range = profile.maxStories - profile.minStories + 1;
  const weight = 1 - CENTER_HEIGHT_WEIGHT + CENTER_HEIGHT_WEIGHT * centrality(planner, rect);
  return profile.minStories + Math.min(range - 1, Math.floor(random.next() * range * weight));
}

function buildingUse(planner: Planner, stories: number): BuildingUse {
  if (stories >= TOWER_STORIES) return 'tower';
  return planner.random.chance(SHOP_CHANCE) ? 'shop' : 'house';
}

/** Lado do prédio: o telhado de duas águas só fecha em lados pares. */
function side(planner: Planner, max: number): number {
  const { profile, kit, random } = planner;
  const value = random.between(profile.minSide, Math.min(profile.maxSide, max));
  return kit.roof === 'gable' ? value - (value % 2) : value;
}

type Frontage = 'north' | 'south';

/**
 * A casa com telhado próprio num estilo de laje (a de reboco do moderno) encolhe uma casa nos
 * lados ímpares, para o telhado de duas águas fechar; a frente do lote (onde fica a porta) não
 * sai do lugar. Se encolher deixar o lote menor que o mínimo, a casa fica com laje.
 */
function lotFor(planner: Planner, lot: CellRect, walls: WallSet, front: Frontage): CellRect {
  if (!walls.roofs) return lot;
  const width = lot.width - (lot.width % 2);
  const depth = lot.depth - (lot.depth % 2);
  if (Math.min(width, depth) < planner.profile.minSide) return lot;
  const z = front === 'south' ? lot.z + (lot.depth - depth) : lot.z;
  return { x: lot.x, z, width, depth };
}

/** O prédio, com a porta virada para a frente do lote, e a casa da porta (lado de fora) livre. */
function addBuilding(planner: Planner, lot: CellRect, front: Frontage): void {
  const { kit, random } = planner;
  const stories = storiesFor(planner, lot);
  const use = buildingUse(planner, stories);
  const walls = random.pick(kit.walls[use]);
  const rect = lotFor(planner, lot, walls, front);
  const rotation = front === 'north' ? 0 : 2;
  const spec: BuildingSpec = {
    width: rect.width,
    depth: rect.depth,
    stories,
    use,
    walls,
    floor: random.pick(kit.tiles.indoor),
    roof: roofFor(kit, walls, rect),
    seed: deriveSeed(planner.seed, random.between(0, INTERIOR_VARIANTS - 1)),
  };
  fillClass(planner, rect, TERRAIN_CLASS.building);
  block(planner, rect);
  // Girar 2 quartos põe a porta no sul, na coluna espelhada.
  const doorX = rotation === 0 ? doorColumn(rect.width) : rect.width - 1 - doorColumn(rect.width);
  const outsideZ = front === 'north' ? rect.z - 1 : rect.z + rect.depth;
  block(planner, { x: rect.x + doorX, z: outsideZ, width: 1, depth: 1 });
  planner.buildings.push({ rect, rotation, spec });
}

/** Uma fileira de lotes ao longo da face do quarteirão. */
function fillRow(planner: Planner, row: CellRect, front: Frontage, setback: number): void {
  const { profile, random } = planner;
  let x = row.x + random.between(0, profile.minGap);
  const maxDepth = row.depth - setback;
  while (row.x + row.width - x >= profile.minSide) {
    const width = side(planner, row.x + row.width - x);
    const depth = side(planner, maxDepth);
    if (width < profile.minSide || depth < profile.minSide) return;
    if (random.chance(profile.buildingChance)) {
      const z = front === 'north' ? row.z + setback : row.z + row.depth - setback - depth;
      addBuilding(planner, { x, z, width, depth }, front);
    }
    x += width + random.between(profile.minGap, profile.maxGap);
  }
}

function fillYard(planner: Planner, area: CellRect): void {
  const cells = area.width * area.depth;
  const { kit, random } = planner;
  scatter(planner, area, Math.ceil(cells / CELLS_PER_YARD_TREE), (x, z) =>
    tree(planner, x, z, TERRAIN_CLASS.yard),
  );
  scatter(planner, area, Math.floor(cells / CELLS_PER_YARD_PROP), (x, z) =>
    single(planner, random.pick(kit.yardProps), x, z, TERRAIN_CLASS.yard),
  );
  scatter(planner, area, Math.floor(cells / CELLS_PER_YARD_COVER), (x, z) =>
    single(planner, random.pick(kit.groundCover), x, z, TERRAIN_CLASS.yard),
  );
}

function fillLots(planner: Planner, area: CellRect): void {
  const { profile } = planner;
  fillClass(planner, area, TERRAIN_CLASS.yard);
  // Sem calçada, a porta precisa de uma casa de recuo livre na frente.
  const setback = profile.sidewalks ? 0 : 1;
  const minRow = profile.minSide + setback;
  if (area.depth >= 2 * minRow) {
    const rowDepth = Math.min(profile.lotDepth, Math.floor(area.depth / 2));
    fillRow(planner, { ...area, depth: rowDepth }, 'north', setback);
    const south = { ...area, z: area.z + area.depth - rowDepth, depth: rowDepth };
    fillRow(planner, south, 'south', setback);
  } else if (area.depth >= minRow) {
    fillRow(planner, area, 'north', setback);
  }
  fillYard(planner, area);
}

function fillPark(planner: Planner, area: CellRect): void {
  const { kit, random } = planner;
  fillClass(planner, area, TERRAIN_CLASS.ground);
  const cells = area.width * area.depth;
  scatter(planner, area, Math.ceil(cells / CELLS_PER_PARK_TREE), (x, z) => tree(planner, x, z));
  scatter(planner, area, Math.ceil(cells / CELLS_PER_YARD_PROP), (x, z) =>
    single(planner, random.pick(kit.yardProps), x, z),
  );
  scatter(planner, area, Math.ceil(cells / CELLS_PER_PARK_COVER), (x, z) =>
    single(planner, random.pick(kit.groundCover), x, z),
  );
}

/** Praça do centro: piso de praça, o monumento no meio, árvores nos cantos e o mercado. */
function fillPlaza(planner: Planner, area: CellRect): void {
  const { kit, random } = planner;
  fillClass(planner, area, TERRAIN_CLASS.plaza);
  const centerX = area.x + Math.floor(area.width / 2);
  const centerZ = area.z + Math.floor(area.depth / 2);
  single(planner, kit.plazaCenter, centerX, centerZ);
  const near = PLAZA_TREE_INSET;
  const farX = area.x + area.width - 1 - near;
  const farZ = area.z + area.depth - 1 - near;
  for (const [x, z] of [
    [area.x + near, area.z + near],
    [farX, area.z + near],
    [area.x + near, farZ],
    [farX, farZ],
  ] as const) {
    tree(planner, x, z);
  }
  const cells = area.width * area.depth;
  scatter(planner, area, Math.ceil(cells / CELLS_PER_MARKET_PROP), (x, z) =>
    single(planner, random.pick(kit.streetProps), x, z),
  );
}

function sidewalkRing(planner: Planner, area: CellRect): CellRect {
  const { profile, kit } = planner;
  if (!profile.sidewalks || !kit.tiles.sidewalk) return area;
  fillClass(planner, area, TERRAIN_CLASS.sidewalk);
  return inset(area, 1);
}

/** Faixa mínima da praça entre as duas fileiras de casas. */
const MIN_PLAZA_DEPTH = 6;

/**
 * Quarteirão fundo vira largo de mercado: casas nas faces norte e sul, praça na faixa do
 * meio. Sem isso, na vila pequena (4 quarteirões) a praça vazia ocuparia um quarto do mapa.
 */
function fillPlazaBlock(planner: Planner, area: CellRect): void {
  const rowDepth = planner.profile.lotDepth;
  const middle = area.depth - 2 * rowDepth;
  if (middle < MIN_PLAZA_DEPTH) return fillPlaza(planner, area);
  fillLots(planner, area);
  fillPlaza(planner, { x: area.x, z: area.z + rowDepth, width: area.width, depth: middle });
}

function fillBlock(planner: Planner, area: CellRect, isPlaza: boolean): void {
  const inner = sidewalkRing(planner, area);
  if (inner.width <= 0 || inner.depth <= 0) return;
  if (isPlaza) return fillPlazaBlock(planner, inner);
  if (planner.random.chance(planner.profile.parkChance)) return fillPark(planner, inner);
  fillLots(planner, inner);
}

// ---------------------------------------------------------------------------
// Rua: veículos, postes e enfeites
// ---------------------------------------------------------------------------

function pickVehicle(planner: Planner, road: CellRect): SizedPiece | null {
  const { kit, random, profile } = planner;
  const roadWidth = Math.min(road.width, road.depth);
  const big = roadWidth >= profile.avenueWidth && kit.bigVehicles.length > 0;
  if (big && random.chance(BIG_VEHICLE_CHANCE)) return random.pick(kit.bigVehicles);
  return kit.vehicles.length > 0 ? random.pick(kit.vehicles) : null;
}

/** Veículos estacionados junto ao meio-fio, nas duas mãos, de frente para o sentido da faixa. */
function parkVehicles(planner: Planner, road: CellRect): void {
  const { random, profile } = planner;
  const horizontal = road.width > road.depth;
  const length = horizontal ? road.width : road.depth;
  for (const lane of [0, 1] as const) {
    let along = random.between(0, PARKING_GAP.max);
    while (along < length) {
      const vehicle = pickVehicle(planner, road);
      if (!vehicle) return;
      const { width: across, depth: span } = vehicle.footprint;
      const offset = lane === 0 ? 0 : Math.min(road.width, road.depth) - across;
      const rotation = horizontal ? (lane === 0 ? 1 : 3) : lane === 0 ? 2 : 0;
      const x = horizontal ? road.x + along : road.x + offset;
      const z = horizontal ? road.z + offset : road.z + along;
      const placed =
        random.chance(profile.vehicleChance) &&
        tryPiece(
          planner,
          { key: vehicle.key, x, z, rotation, footprint: vehicle.footprint },
          TERRAIN_CLASS.road,
        );
      along += (placed ? span : 1) + random.between(PARKING_GAP.min, PARKING_GAP.max);
    }
  }
}

/** Postes dos dois lados da rua, de tantas em tantas casas, fora do caminho das portas. */
function lightRoad(planner: Planner, road: CellRect): void {
  const lamp = planner.kit.lamp;
  if (!lamp) return;
  const horizontal = road.width > road.depth;
  const length = horizontal ? road.width : road.depth;
  for (let along = LAMP_SPACING / 2; along < length; along += LAMP_SPACING) {
    const sides = horizontal
      ? [
          { x: road.x + along, z: road.z - 1 },
          { x: road.x + along, z: road.z + road.depth },
        ]
      : [
          { x: road.x - 1, z: road.z + along },
          { x: road.x + road.width, z: road.z + along },
        ];
    for (const cell of sides) {
      if (!inside(planner, cell.x, cell.z)) continue;
      if (planner.classes[index(planner, cell.x, cell.z)] === TERRAIN_CLASS.road) continue;
      tryPiece(planner, { key: lamp, ...cell, rotation: 0, footprint: SINGLE_CELL });
    }
  }
}

function decorateSidewalks(planner: Planner): void {
  const { random, kit, size } = planner;
  for (let z = 0; z < size.depth; z += 1) {
    for (let x = 0; x < size.width; x += 1) {
      if (planner.classes[index(planner, x, z)] !== TERRAIN_CLASS.sidewalk) continue;
      if (!random.chance(STREET_PROP_CHANCE)) continue;
      single(planner, random.pick(kit.streetProps), x, z, TERRAIN_CLASS.sidewalk);
    }
  }
}

/** O quarteirão mais perto do meio do mapa vira a praça. */
function centralBlock(size: GridSize, blocks: readonly CellRect[]): CellRect | undefined {
  const distance = (rect: CellRect) =>
    Math.hypot(rect.x + rect.width / 2 - size.width / 2, rect.z + rect.depth / 2 - size.depth / 2);
  return [...blocks].sort((a, b) => distance(a) - distance(b))[0];
}

export function planSettlement(options: PlanOptions): SettlementPlan {
  const { size, style, profile, seed } = options;
  const cells = size.width * size.depth;
  const planner: Planner = {
    size,
    kit: STYLE_KITS[style],
    profile,
    seed,
    random: createRandom(seed),
    classes: new Uint8Array(cells),
    blocked: new Uint8Array(cells),
    buildings: [],
    pieces: [],
    roads: [],
  };
  const area = inset({ x: 0, z: 0, width: size.width, depth: size.depth }, profile.border);
  const blocks: CellRect[] = [];
  if (area.width > 0 && area.depth > 0) subdivide(planner, area, 0, blocks);
  const plaza = centralBlock(size, blocks);
  for (const rect of blocks) fillBlock(planner, rect, rect === plaza);
  for (const road of planner.roads) parkVehicles(planner, road);
  for (const road of planner.roads) lightRoad(planner, road);
  decorateSidewalks(planner);
  return {
    size: { width: size.width, depth: size.depth },
    style,
    profile,
    classes: planner.classes,
    buildings: planner.buildings,
    pieces: planner.pieces,
  };
}
