/**
 * Ilha do Vulcão (RPG-63): ilha gigante pensada à mão, cercada de mar. A praia contorna tudo;
 * dentro dela, a baixada verde e os morros que sobem em degraus até o cume do vulcão
 * adormecido, onde fica o ídolo de pedra. Na baixada: a vila de pescadores ao sul, com o píer
 * e os barcos; as ruínas do templo a noroeste; e o acampamento dos piratas a leste. Uma
 * trilha de terra sobe da vila até o cume.
 *
 * O contorno e o relevo saem de fórmulas fixas (sem sorteio): o mesmo mapa toda vez. As
 * árvores dos morros seguem um padrão fixo pelas casas, para a mata não sair em fileiras.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, type CellRect, type Footprint } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { createSketch, stampBuildings, type SketchBuilding, type SketchPiece } from './sketch';

export const ISLAND_SIZE = { width: 120, depth: 120 } as const;

const TILE = {
  water: 'agua',
  sand: 'areia',
  grass: 'grama',
  dirt: 'terra',
  stone: 'piso-pedra',
  ash: 'chao-rachado',
  planks: 'piso-madeira',
} as const;
const PIECE = {
  pine: 'nat-pinheiro',
  oak: 'nat-carvalho',
  palm: 'nat-palmeira',
  grassTuft: 'nat-capim',
  flowers: 'nat-flores',
  boulder: 'nat-pedregulho',
  log: 'nat-tronco',
  rock: 'rocha',
  pebbles: 'nat-seixos',
  idol: 'pra-estatua-grande',
  pillar: 'pilar',
  statue: 'estatua',
  altar: 'mas-altar',
  bones: 'mas-ossos',
  chest: 'bau',
  barrel: 'barril',
  crate: 'caixa',
  torch: 'tocha',
  campfire: 'cav-fogueira',
  boat: 'med-bote',
  fishingBoat: 'med-pesqueiro',
  wagon: 'med-carroca',
} as const;
const BOULDER: Footprint = { width: 2, depth: 2 };
const IDOL: Footprint = { width: 2, depth: 2 };
const LOG: Footprint = { width: 2, depth: 1 };
const BOAT: Footprint = { width: 1, depth: 2 };
const FISHING_BOAT: Footprint = { width: 2, depth: 4 };
const WAGON: Footprint = { width: 2, depth: 3 };

const CENTER = { x: 60, z: 60 } as const;
/** Raio médio da ilha e as ondulações do contorno (casas). */
const SHORE = { radius: 50, wave3: 6, wave5: 4 } as const;
const BEACH_WIDTH = 3;
/** A baixada vai até este raio; dali para dentro, um degrau a cada `TERRACE` casas. */
const LOWLAND_RADIUS = 30;
const TERRACE = 4;
const PEAK_RADIUS = 6;
const HEIGHT = { sea: 0, lowland: 1 } as const;
/** Terraços de 2 a 6 têm mata; o cume, cinza. */
const FOREST_LEVELS = { from: 2, to: 6 } as const;
const ASH_FROM_LEVEL = 7;
/** Uma casa em tantas recebe árvore, capim ou palmeira (padrão fixo pela casa). */
const SCATTER = { tree: 7, lowlandTree: 29, tuft: 23, palm: 9 } as const;

/** Áreas planas desenhadas à mão por cima do relevo. */
const VILLAGE: CellRect = { x: 46, z: 84, width: 28, depth: 11 };
const PIER: CellRect = { x: 59, z: 95, width: 2, depth: 16 };
const TRAIL: CellRect = { x: 60, z: 62, width: 2, depth: 22 };
const RUINS: CellRect = { x: 30, z: 30, width: 12, depth: 10 };
const CAMP: CellRect = { x: 93, z: 55, width: 9, depth: 10 };
const PEAK_AREA: CellRect = { x: 52, z: 52, width: 16, depth: 16 };
const RESERVED: readonly CellRect[] = [VILLAGE, PIER, TRAIL, RUINS, CAMP, PEAK_AREA];

const VILLAGE_HOUSES: readonly SketchBuilding[] = [48, 56, 66].map((x, index) => ({
  style: 'medieval',
  use: 'house',
  x,
  z: 85,
  width: 6,
  depth: 5,
  stories: 1,
  rotation: 2,
  level: HEIGHT.lowland,
  variant: index,
}));

export type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;

function inRect(rect: CellRect, x: number, z: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && z >= rect.z && z < rect.z + rect.depth;
}

function shoreRadius(x: number, z: number): number {
  const angle = Math.atan2(z - CENTER.z, x - CENTER.x);
  return SHORE.radius + SHORE.wave3 * Math.sin(3 * angle) + SHORE.wave5 * Math.cos(5 * angle + 1);
}

const distance = (x: number, z: number) => Math.hypot(x - CENTER.x, z - CENTER.z);

/** Degrau do relevo: a baixada no 1 e um a mais a cada terraço rumo ao cume. */
function terrainHeight(x: number, z: number): number {
  return HEIGHT.lowland + Math.floor(Math.max(0, LOWLAND_RADIUS - distance(x, z)) / TERRACE);
}

function floorAt(x: number, z: number): Floor {
  if (inRect(PIER, x, z)) return { tile: TILE.planks, height: HEIGHT.lowland };
  const shore = shoreRadius(x, z);
  const d = distance(x, z);
  if (d > shore) return { tile: TILE.water, height: HEIGHT.sea };
  if (d > shore - BEACH_WIDTH) return { tile: TILE.sand, height: HEIGHT.lowland };
  if (inRect(VILLAGE, x, z)) return { tile: TILE.dirt, height: HEIGHT.lowland };
  if (inRect(RUINS, x, z)) return { tile: TILE.stone, height: HEIGHT.lowland };
  if (inRect(CAMP, x, z)) return { tile: TILE.sand, height: HEIGHT.lowland };
  const height = terrainHeight(x, z);
  if (inRect(TRAIL, x, z)) return { tile: TILE.dirt, height };
  if (d < PEAK_RADIUS || height >= ASH_FROM_LEVEL) return { tile: TILE.ash, height };
  return { tile: TILE.grass, height };
}

/** Chão de cada casa da ilha, do mar ao cume. */
export function islandFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (let z = 0; z < ISLAND_SIZE.depth; z += 1) {
    for (let x = 0; x < ISLAND_SIZE.width; x += 1) floors.set(key({ x, z }), floorAt(x, z));
  }
  return floors;
}

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

function placeAll(place: Place, piece: string, cells: readonly (readonly [number, number])[]) {
  for (const [x, z] of cells) place(piece, { x, z });
}

/** Número fixo de cada casa: espalha a mata sem sorteio e sem fileiras. */
function cellPattern(x: number, z: number): number {
  return (Math.imul(x, 73856093) ^ Math.imul(z, 19349663)) >>> 0;
}

/** Mata fechada nos morros, carvalhos soltos e capim na baixada, palmeiras na beira da praia. */
function scatterNature(place: Place, floors: Map<string, Floor>): void {
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number) as [number, number];
    if (floor.tile !== TILE.grass || RESERVED.some((rect) => inRect(rect, x, z))) continue;
    const pattern = cellPattern(x, z);
    const nearBeach = distance(x, z) > shoreRadius(x, z) - BEACH_WIDTH - 2;
    if (floor.height >= FOREST_LEVELS.from && floor.height <= FOREST_LEVELS.to) {
      if (pattern % SCATTER.tree === 0) place(pattern % 2 ? PIECE.pine : PIECE.oak, { x, z });
    } else if (nearBeach && pattern % SCATTER.palm === 0) {
      place(PIECE.palm, { x, z });
    } else if (!nearBeach && pattern % SCATTER.lowlandTree === 0) {
      place(PIECE.oak, { x, z });
    } else if (pattern % SCATTER.tuft === 0) {
      place(pattern % 3 ? PIECE.grassTuft : PIECE.flowers, { x, z });
    }
  }
}

/** A vila de pescadores: o varal de barris, a carroça, as tochas e os barcos no píer. */
function furnishVillage(place: Place, placeOnWater: Place): void {
  placeAll(place, PIECE.barrel, [
    [47, 92],
    [48, 92],
    [72, 91],
  ]);
  placeAll(place, PIECE.crate, [
    [55, 92],
    [63, 93],
    [64, 93],
  ]);
  placeAll(place, PIECE.torch, [
    [58, 91],
    [62, 91],
    [46, 84],
    [73, 84],
  ]);
  place(PIECE.wagon, { x: 69, z: 91 }, { footprint: WAGON });
  place(PIECE.chest, { x: 60, z: 108 });
  place(PIECE.torch, { x: 59, z: 110 });
  placeOnWater(PIECE.fishingBoat, { x: 62, z: 103 }, { footprint: FISHING_BOAT });
  placeOnWater(PIECE.boat, { x: 57, z: 104 }, { footprint: BOAT });
}

/** As ruínas do templo: o anel de pilares, as estátuas e o altar com as oferendas. */
function furnishRuins(place: Place): void {
  for (const x of [31, 34, 37, 40]) {
    place(PIECE.pillar, { x, z: 31 });
    place(PIECE.pillar, { x, z: 38 });
  }
  place(PIECE.altar, { x: 35, z: 34 });
  placeAll(place, PIECE.statue, [
    [32, 34],
    [39, 34],
  ]);
  placeAll(place, PIECE.bones, [
    [34, 36],
    [38, 32],
  ]);
  place(PIECE.chest, { x: 36, z: 35 });
  placeAll(place, PIECE.rock, [
    [30, 36],
    [41, 33],
  ]);
  place(PIECE.pebbles, { x: 33, z: 37 });
}

/** O acampamento dos piratas: a fogueira com troncos, o tesouro e o butim empilhado. */
function furnishCamp(place: Place): void {
  place(PIECE.campfire, { x: 97, z: 59 });
  place(PIECE.log, { x: 96, z: 57 }, { footprint: LOG });
  place(PIECE.log, { x: 96, z: 61 }, { footprint: LOG });
  placeAll(place, PIECE.chest, [
    [100, 56],
    [101, 56],
  ]);
  placeAll(place, PIECE.barrel, [
    [94, 63],
    [95, 63],
    [94, 62],
  ]);
  placeAll(place, PIECE.crate, [
    [100, 63],
    [101, 62],
  ]);
  placeAll(place, PIECE.torch, [
    [93, 55],
    [101, 64],
  ]);
}

/** O cume do vulcão: o ídolo de pedra e os pedregulhos rolados. */
function furnishPeak(place: Place): void {
  place(PIECE.idol, { x: 59, z: 59 }, { footprint: IDOL });
  place(PIECE.boulder, { x: 54, z: 63 }, { footprint: BOULDER });
  place(PIECE.boulder, { x: 65, z: 55 }, { footprint: BOULDER });
  placeAll(place, PIECE.rock, [
    [56, 56],
    [64, 64],
    [57, 66],
  ]);
  placeAll(place, PIECE.torch, [
    [58, 61],
    [62, 58],
  ]);
}

export function buildIslandMap(): AssembledMap {
  const sketch = createSketch(ISLAND_SIZE, null);
  const floors = islandFloors();
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    sketch.ground({ x: x!, z: z!, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  const indoors = stampBuildings(sketch, VILLAGE_HOUSES);
  const placeWhere =
    (onWater: boolean): Place =>
    (piece, cell, options = {}) => {
      const floor = floors.get(key(cell));
      if (!floor || (floor.tile === TILE.water) !== onWater) {
        throw new Error(`Peça ${piece} no chão errado da ilha em ${key(cell)}.`);
      }
      if (indoors.has(key(cell))) throw new Error(`Peça ${piece} dentro de casa em ${key(cell)}.`);
      sketch.piece(piece, cell, { ...options, level: floor.height });
    };
  const place = placeWhere(false);
  furnishVillage(place, placeWhere(true));
  furnishRuins(place);
  furnishCamp(place);
  furnishPeak(place);
  scatterNature(place, floors);
  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'vila', light: 1, backdrop: 'sea' },
  });
}
