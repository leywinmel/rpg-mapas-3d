/**
 * Vila da Ponte Velha (RPG-63): vila medieval pensada à mão, em degraus. A oeste, o rio corre
 * um degrau abaixo das margens, com as roças do outro lado da ponte de tábuas. Do lado de cá
 * sobe a cidade: as casas da beira-rio, a cidade alta com a taverna e a praça da fonte, a
 * igreja no patamar de cima e, no alto de tudo, a torre do senhor dentro do muro.
 *
 * Os prédios vêm da mesma planta do gerador (paredes, janelas, mobília, escada e telhado) [#6];
 * aqui só se escolhe onde cada um fica e para que lado abre a porta.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import {
  createSketch,
  outlineWalls,
  stampBuildings,
  type Sketch,
  type SketchBuilding,
  type SketchPiece,
} from './sketch';

export const MEDIEVAL_TOWN_SIZE = { width: 48, depth: 48 } as const;

const TILE = {
  grass: 'grama',
  dirt: 'terra',
  water: 'agua',
  planks: 'piso-madeira',
  road: 'med-calcamento',
  plaza: 'med-piso-tijolo-vermelho',
  stone: 'piso-pedra',
} as const;
const KEEP_WALL = 'med-parede-rustica';
const PIECE = {
  fountain: 'pra-fonte',
  bench: 'pra-banco-pedra',
  bed: 'pra-canteiro',
  statue: 'estatua',
  obelisk: 'pra-obelisco',
  torch: 'tocha',
  barrel: 'barril',
  crate: 'med-caixote',
  box: 'caixa',
  table: 'mesa',
  chest: 'bau',
  wagon: 'med-carroca',
  fence: 'med-cerca-madeira',
  boat: 'med-bote',
  oak: 'nat-carvalho',
  pine: 'nat-pinheiro',
  birch: 'nat-betula',
  tree: 'arvore',
  bush: 'nat-arbusto',
  rose: 'nat-roseira',
  flowers: 'nat-flores',
  grass: 'nat-capim',
  boulder: 'nat-pedregulho',
  stump: 'nat-toco',
} as const;

/** O rio: a coluna do meio ondula com z; a água vai de duas casas a oeste até uma a leste. */
const RIVER = { center: 10, wave: 1.5, period: 6, west: 2, east: 1 } as const;
/** A ponte de tábuas: quatro fileiras, com cerca nas duas de fora. */
const BRIDGE = { from: 22, to: 25 } as const;

/** Degraus da vila: o rio no fundo, a torre no alto. */
const HEIGHT = { water: 0, low: 1, upper: 2, terrace: 3, keep: 4 } as const;
/** Da coluna 20 para leste começa a cidade alta; até a linha 14, a partir da coluna 24, o patamar. */
const UPPER_FROM_X = 20;
const TERRACE = { fromX: 24, toZ: 14 } as const;
/** O morro da torre: um círculo de pedra cercado de muro, com o portão ao sul. */
const KEEP = { cx: 33, cz: 6, radius: 4.8, wallHeight: 2, gate: [32, 33], gateRow: 10 } as const;

const PLAZA: CellRect = { x: 28, z: 19, width: 10, depth: 10 };
/** Ruas de calçamento: a principal (da ponte à praça e além), a do norte, a do sul e a da igreja. */
const ROADS: readonly CellRect[] = [
  { x: 11, z: 23, width: 17, depth: 2 },
  { x: 38, z: 23, width: 10, depth: 2 },
  { x: 32, z: 11, width: 2, depth: 8 },
  { x: 32, z: 29, width: 2, depth: 19 },
  { x: 34, z: 11, width: 11, depth: 2 },
];
/** As roças do outro lado do rio: terra lavrada. */
const FIELDS: readonly CellRect[] = [
  { x: 0, z: 2, width: 6, depth: 8 },
  { x: 0, z: 30, width: 6, depth: 9 },
];

type BuildingPlace = Omit<SketchBuilding, 'style' | 'use' | 'width' | 'depth'> &
  Partial<Pick<SketchBuilding, 'use' | 'width' | 'depth'>>;

/** Casa medieval de 6×6, salvo quando o lugar pede outra medida ou outro uso. */
const building = (place: BuildingPlace): SketchBuilding => ({
  style: 'medieval',
  use: 'house',
  width: 6,
  depth: 6,
  ...place,
});

/** Cada prédio no seu lugar, com a porta virada para a rua ou para a praça. */
const BUILDINGS: readonly SketchBuilding[] = [
  // Beira-rio (cidade baixa).
  building({ x: 14, z: 5, stories: 2, rotation: 2, level: HEIGHT.low, variant: 0 }),
  building({ x: 14, z: 16, stories: 1, rotation: 2, level: HEIGHT.low, variant: 1 }),
  building({ x: 14, z: 26, stories: 2, rotation: 0, level: HEIGHT.low, variant: 2 }),
  building({ x: 14, z: 35, stories: 1, rotation: 0, level: HEIGHT.low, variant: 3 }),
  // Cidade alta: a taverna, as lojas da praça e as casas das ruas.
  building({ x: 21, z: 16, stories: 2, rotation: 2, level: HEIGHT.upper, variant: 0, use: 'shop' }),
  building({ x: 21, z: 26, stories: 2, rotation: 0, level: HEIGHT.upper, variant: 1 }),
  building({
    x: 28,
    z: 15,
    stories: 1,
    rotation: 2,
    level: HEIGHT.upper,
    variant: 1,
    use: 'shop',
    width: 4,
    depth: 4,
  }),
  building({
    x: 34,
    z: 15,
    stories: 1,
    rotation: 2,
    level: HEIGHT.upper,
    variant: 2,
    use: 'shop',
    width: 4,
    depth: 4,
  }),
  building({ x: 40, z: 16, stories: 2, rotation: 2, level: HEIGHT.upper, variant: 4 }),
  building({ x: 40, z: 26, stories: 1, rotation: 0, level: HEIGHT.upper, variant: 5 }),
  building({ x: 26, z: 32, stories: 2, rotation: 3, level: HEIGHT.upper, variant: 6 }),
  building({ x: 34, z: 32, stories: 1, rotation: 1, level: HEIGHT.upper, variant: 7 }),
  building({ x: 26, z: 40, stories: 1, rotation: 3, level: HEIGHT.upper, variant: 8 }),
  // O celeiro comprido no fim da rua do sul.
  building({ x: 34, z: 40, stories: 1, rotation: 1, level: HEIGHT.upper, variant: 9, depth: 8 }),
  // A igreja de pedra no patamar e a torre do senhor no morro.
  building({
    x: 39,
    z: 3,
    stories: 2,
    rotation: 2,
    level: HEIGHT.terrace,
    variant: 0,
    use: 'tower',
    depth: 8,
  }),
  building({
    x: 31,
    z: 4,
    stories: 3,
    rotation: 2,
    level: HEIGHT.keep,
    variant: 0,
    use: 'tower',
    width: 4,
    depth: 4,
  }),
];

export type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;

function riverCenter(z: number): number {
  return RIVER.center + Math.round(RIVER.wave * Math.sin(z / RIVER.period));
}

function inRect(rect: CellRect, x: number, z: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && z >= rect.z && z < rect.z + rect.depth;
}

function inKeep(x: number, z: number): boolean {
  return Math.hypot(x + 0.5 - KEEP.cx, z + 0.5 - KEEP.cz) <= KEEP.radius;
}

/** Altura da margem leste: cidade baixa, cidade alta, patamar da igreja e morro da torre. */
function townHeight(x: number, z: number): number {
  if (inKeep(x, z)) return HEIGHT.keep;
  if (x >= TERRACE.fromX && z <= TERRACE.toZ) return HEIGHT.terrace;
  return x >= UPPER_FROM_X ? HEIGHT.upper : HEIGHT.low;
}

/** Chão da margem oeste: roças e a trilha de terra que sai da ponte. */
function westBankTile(x: number, z: number): string {
  const field = FIELDS.some((rect) => inRect(rect, x, z));
  const lane = z > BRIDGE.from && z < BRIDGE.to;
  return field || lane ? TILE.dirt : TILE.grass;
}

/** Chão da margem leste: barranco de terra, ruas, praça e o pátio de pedra da torre. */
function townTile(x: number, z: number, fromRiver: number): string {
  if (inKeep(x, z)) return TILE.stone;
  if (inRect(PLAZA, x, z)) return TILE.plaza;
  if (ROADS.some((rect) => inRect(rect, x, z))) return TILE.road;
  return fromRiver === RIVER.east + 1 ? TILE.dirt : TILE.grass;
}

/** Chão de cada casa da vila: rio, ponte, roças, ruas, praça e o morro da torre. */
export function medievalTownFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (let z = 0; z < MEDIEVAL_TOWN_SIZE.depth; z += 1) {
    const center = riverCenter(z);
    const bridge = z >= BRIDGE.from && z <= BRIDGE.to;
    for (let x = 0; x < MEDIEVAL_TOWN_SIZE.width; x += 1) {
      const fromRiver = x - center;
      const river = fromRiver >= -RIVER.west && fromRiver <= RIVER.east;
      let floor: Floor;
      if (river && bridge) floor = { tile: TILE.planks, height: HEIGHT.low };
      else if (river) floor = { tile: TILE.water, height: HEIGHT.water };
      else if (fromRiver < 0) floor = { tile: westBankTile(x, z), height: HEIGHT.low };
      else floor = { tile: townTile(x, z, fromRiver), height: townHeight(x, z) };
      floors.set(key({ x, z }), floor);
    }
  }
  return floors;
}

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

/** A ponte (cerca dos dois lados) e os botes amarrados no rio. */
function furnishRiver(place: Place): void {
  for (const z of [BRIDGE.from, BRIDGE.to]) {
    const center = riverCenter(z);
    for (let x = center - RIVER.west; x <= center + RIVER.east; x += 1) {
      place(PIECE.fence, { x, z });
    }
  }
  place(PIECE.boat, { x: 9, z: 30 });
  place(PIECE.boat, { x: 10, z: 8 });
  place(PIECE.torch, { x: 11, z: 22 });
  place(PIECE.torch, { x: 11, z: 25 });
}

/** As roças: capim em fileiras, cerca, carga e as árvores na beira. */
function furnishFarms(place: Place): void {
  for (const rect of FIELDS) {
    for (let z = rect.z + 1; z < rect.z + rect.depth; z += 2) {
      for (let x = rect.x + 1; x < rect.x + rect.width; x += 2) place(PIECE.grass, { x, z });
    }
    for (let x = rect.x; x < rect.x + rect.width; x += 1) place(PIECE.fence, { x, z: rect.z });
  }
  for (const [x, z] of [
    [2, 19],
    [5, 20],
    [3, 42],
    [6, 45],
    [1, 26],
  ] as const) {
    place(PIECE.oak, { x, z });
  }
  place(PIECE.barrel, { x: 5, z: 12 });
  place(PIECE.barrel, { x: 6, z: 12 });
  place(PIECE.crate, { x: 6, z: 13 });
  place(PIECE.stump, { x: 1, z: 11 });
}

/** A praça: a fonte no meio, bancos, canteiros, tochas e as bancas de feira. */
function furnishPlaza(place: Place): void {
  place(PIECE.fountain, { x: 31, z: 22 });
  for (const [x, z] of [
    [28, 19],
    [37, 19],
    [28, 28],
    [37, 28],
  ] as const) {
    place(PIECE.torch, { x, z });
  }
  place(PIECE.bench, { x: 29, z: 26 });
  place(PIECE.bench, { x: 35, z: 26 });
  place(PIECE.bed, { x: 29, z: 21 });
  place(PIECE.bed, { x: 35, z: 21 });
  place(PIECE.table, { x: 36, z: 23 });
  place(PIECE.table, { x: 36, z: 24 });
  place(PIECE.crate, { x: 37, z: 23 });
  place(PIECE.barrel, { x: 37, z: 24 });
  place(PIECE.box, { x: 29, z: 23 });
  place(PIECE.barrel, { x: 28, z: 24 });
}

/** As ruas da cidade: tochas, a carga da taverna, a carroça no pasto e as árvores. */
function furnishStreets(place: Place): void {
  for (const [x, z] of [
    [20, 22],
    [26, 25],
    [39, 22],
    [46, 25],
    [31, 30],
    [34, 38],
    [31, 46],
    [31, 13],
    [38, 13],
    [44, 13],
  ] as const) {
    place(PIECE.torch, { x, z });
  }
  place(PIECE.barrel, { x: 27, z: 20 });
  place(PIECE.barrel, { x: 27, z: 21 });
  place(PIECE.crate, { x: 27, z: 19 });
  place(PIECE.wagon, { x: 44, z: 40 });
  for (let x = 42; x < MEDIEVAL_TOWN_SIZE.width; x += 1) place(PIECE.fence, { x, z: 34 });
  for (const [x, z] of [
    [43, 37],
    [46, 44],
    [42, 46],
  ] as const) {
    place(PIECE.grass, { x, z });
  }
  place(PIECE.boulder, { x: 45, z: 36 });
  for (const [x, z, tree] of [
    [12, 44, PIECE.pine],
    [16, 45, PIECE.birch],
    [20, 42, PIECE.oak],
    [23, 46, PIECE.tree],
    [46, 30, PIECE.birch],
    [46, 17, PIECE.pine],
    [21, 34, PIECE.oak],
    [12, 13, PIECE.birch],
  ] as const) {
    place(tree, { x, z });
  }
  for (const [x, z] of [
    [20, 15],
    [12, 33],
    [25, 38],
    [40, 38],
    [20, 31],
  ] as const) {
    place(PIECE.flowers, { x, z });
  }
  place(PIECE.bush, { x: 39, z: 31 });
  place(PIECE.bush, { x: 20, z: 27 });
}

/** O patamar: o pomar a oeste e o adro da igreja com estátua e roseiras. */
function furnishTerrace(place: Place): void {
  for (const [x, z, tree] of [
    [25, 2, PIECE.oak],
    [27, 6, PIECE.tree],
    [25, 10, PIECE.oak],
    [21, 3, PIECE.birch],
    [22, 8, PIECE.pine],
    [21, 12, PIECE.birch],
    [45, 1, PIECE.pine],
  ] as const) {
    place(tree, { x, z });
  }
  place(PIECE.statue, { x: 46, z: 5 });
  place(PIECE.obelisk, { x: 46, z: 8 });
  place(PIECE.rose, { x: 46, z: 10 });
  place(PIECE.rose, { x: 38, z: 9 });
  place(PIECE.bush, { x: 38, z: 4 });
}

/** O pátio da torre: tochas no portão, carga e o baú do senhor. */
function furnishKeep(place: Place): void {
  place(PIECE.torch, { x: 30, z: 9 });
  place(PIECE.torch, { x: 35, z: 9 });
  place(PIECE.barrel, { x: 36, z: 5 });
  place(PIECE.crate, { x: 36, z: 6 });
  place(PIECE.chest, { x: 30, z: 4 }, { rotation: 1 });
}

/** O muro de pedra em volta do morro, aberto no portão. */
function keepWalls(sketch: Sketch): void {
  const area: Cell[] = [];
  for (let z = 0; z < MEDIEVAL_TOWN_SIZE.depth; z += 1) {
    for (let x = 0; x < MEDIEVAL_TOWN_SIZE.width; x += 1) {
      if (inKeep(x, z)) area.push({ x, z });
    }
  }
  const gate = KEEP.gate as readonly number[];
  outlineWalls(sketch, area, (cell) =>
    cell.z === KEEP.gateRow && gate.includes(cell.x)
      ? []
      : [{ style: KEEP_WALL, level: HEIGHT.keep, height: KEEP.wallHeight }],
  );
}

export function buildMedievalTownMap(): AssembledMap {
  const sketch = createSketch(MEDIEVAL_TOWN_SIZE, null);
  const floors = medievalTownFloors();
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    sketch.ground({ x: x!, z: z!, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  const indoors = stampBuildings(sketch, BUILDINGS);
  keepWalls(sketch);
  const place: Place = (piece, cell, options = {}) => {
    const floor = floors.get(key(cell));
    if (!floor) throw new Error(`Peça ${piece} fora da vila em ${key(cell)}.`);
    if (indoors.has(key(cell))) throw new Error(`Peça ${piece} dentro de prédio em ${key(cell)}.`);
    sketch.piece(piece, cell, { ...options, level: floor.height });
  };
  furnishRiver(place);
  furnishFarms(place);
  furnishPlaza(place);
  furnishStreets(place);
  furnishTerrace(place);
  furnishKeep(place);
  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, light: 1, backdrop: 'forest' },
  });
}
