/**
 * Burgo do Monte Alto (RPG-63): cidade medieval murada que sobe a encosta em degraus, pensada
 * à mão. Fora do muro ficam as roças, o lago e a estrada que chega ao portão sul. Lá dentro, a
 * praça do mercado no bairro baixo, as ruas de casas e lojas, a igreja no patamar de cima e,
 * no topo, o castelo, sobre o penhasco que despenca para o lado de fora do muro.
 *
 * Diferente da Vila da Ponte Velha, aqui o desnível é de propósito: o muro norte é um
 * penhasco de quatro degraus, e só se sobe ao castelo pela rua principal.
 */
import type { Cell } from '../../grid';
import { type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import {
  createSketch,
  outlineWalls,
  stampBuildings,
  type Sketch,
  type SketchBuilding,
  type SketchPiece,
} from './sketch';

export const WALLED_TOWN_SIZE = { width: 48, depth: 48 } as const;

const TILE = {
  grass: 'grama',
  dirt: 'terra',
  water: 'agua',
  planks: 'piso-madeira',
  road: 'med-calcamento',
  plaza: 'med-piso-tijolo-vermelho',
  stone: 'piso-pedra',
} as const;
const WALL_STYLE = 'med-parede-rustica';
const PIECE = {
  heroStatue: 'pra-estatua-grande',
  bench: 'pra-banco-pedra',
  bed: 'pra-canteiro',
  statue: 'estatua',
  obelisk: 'pra-obelisco',
  pillar: 'pilar',
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
  rock: 'rocha',
  log: 'nat-tronco',
} as const;

/** O retângulo cercado pelo muro da cidade. */
const TOWN: CellRect = { x: 4, z: 6, width: 40, depth: 34 };
/** Altura do muro, em degraus acima do chão de dentro. */
const TOWN_WALL_HEIGHT = 3;
/** Portões: as casas de borda do muro que ficam abertas. */
const GATES: readonly Cell[] = [
  { x: 23, z: 39 },
  { x: 24, z: 39 },
  { x: 43, z: 34 },
  { x: 43, z: 35 },
];

/** Degraus: fora do muro, o lago e as roças; dentro, quatro faixas que sobem para o norte. */
const HEIGHT = { water: 0, outside: 1 } as const;
/** Faixas da cidade, do sul para o norte: até a linha `fromZ`, a altura `height`. */
const BANDS: readonly { readonly fromZ: number; readonly height: number }[] = [
  { fromZ: 32, height: 2 },
  { fromZ: 22, height: 3 },
  { fromZ: 13, height: 4 },
  { fromZ: 0, height: 5 },
];
/** O pátio do castelo: a última faixa, calçada de pedra e fechada por um muro baixo. */
const CASTLE_FROM_Z = 13;
const CASTLE_WALL = { height: 2, gate: [23, 24] } as const;

const LAKE = { cx: 8.5, cz: 44, rx: 6.5, rz: 3.2 } as const;
/** Píer de tábuas que entra no lago, no degrau das margens. */
const PIER: CellRect = { x: 8, z: 41, width: 1, depth: 3 };

/** Ruas de dentro: a principal (do portão ao castelo) e as duas transversais. */
const STREETS: readonly CellRect[] = [
  { x: 23, z: CASTLE_FROM_Z, width: 2, depth: 27 },
  { x: 4, z: 34, width: 40, depth: 2 },
  { x: 4, z: 26, width: 40, depth: 2 },
];
/** Estradas de terra de fora: a do sul e a do leste. */
const ROADS: readonly CellRect[] = [
  { x: 23, z: 40, width: 2, depth: 8 },
  { x: 44, z: 34, width: 4, depth: 2 },
];
const MARKET: CellRect = { x: 27, z: 32, width: 12, depth: 7 };
const FIELDS: readonly CellRect[] = [
  { x: 28, z: 41, width: 10, depth: 6 },
  { x: 15, z: 42, width: 6, depth: 5 },
];

type BuildingPlace = Omit<SketchBuilding, 'style' | 'use' | 'width' | 'depth' | 'level'> &
  Partial<Pick<SketchBuilding, 'use' | 'width' | 'depth'>>;

/** A altura da faixa da cidade em que a linha z cai. */
function bandHeight(z: number): number {
  return BANDS.find((band) => z >= band.fromZ)!.height;
}

/** Casa medieval de 6×4 no degrau da sua faixa, salvo quando o lugar pede outra coisa. */
const building = (place: BuildingPlace): SketchBuilding => ({
  style: 'medieval',
  use: 'house',
  width: 6,
  depth: 4,
  level: bandHeight(place.z),
  ...place,
});

/** Cada prédio no seu lugar, com a porta virada para a rua. */
const BUILDINGS: readonly SketchBuilding[] = [
  // Bairro baixo: as casas da rua do portão leste e a do canto oeste.
  building({ x: 6, z: 36, stories: 1, rotation: 0, variant: 0 }),
  building({ x: 14, z: 36, stories: 2, rotation: 0, variant: 1 }),
  building({ x: 6, z: 28, stories: 2, rotation: 0, variant: 2 }),
  // Faixa do meio: casas e lojas dos dois lados da rua de cima.
  building({ x: 6, z: 22, stories: 2, rotation: 2, variant: 3 }),
  building({ x: 14, z: 22, stories: 1, rotation: 2, variant: 4, use: 'shop' }),
  building({ x: 27, z: 22, stories: 2, rotation: 2, variant: 0, use: 'shop' }),
  building({ x: 35, z: 22, stories: 2, rotation: 2, variant: 5 }),
  building({ x: 14, z: 28, stories: 1, rotation: 0, variant: 6 }),
  building({ x: 27, z: 28, stories: 2, rotation: 0, variant: 7 }),
  building({ x: 35, z: 28, stories: 1, rotation: 0, variant: 8, use: 'shop' }),
  // Patamar: casas viradas para a rua principal e a igreja de pedra.
  building({ x: 8, z: 15, stories: 2, rotation: 3, variant: 9, width: 6, depth: 6 }),
  building({ x: 16, z: 15, stories: 1, rotation: 3, variant: 10, width: 6, depth: 6 }),
  building({
    x: 26,
    z: 14,
    stories: 2,
    rotation: 1,
    variant: 0,
    use: 'tower',
    width: 8,
    depth: 6,
  }),
  building({ x: 35, z: 15, stories: 1, rotation: 1, variant: 11, width: 6, depth: 6 }),
  // O castelo: a torre de menagem, o quartel e a cavalariça.
  building({ x: 21, z: 6, stories: 3, rotation: 2, variant: 0, use: 'tower', depth: 6 }),
  building({ x: 12, z: 7, stories: 1, rotation: 2, variant: 0, use: 'tower' }),
  building({ x: 30, z: 7, stories: 1, rotation: 2, variant: 12, width: 8 }),
];

export type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;

function inRect(rect: CellRect, x: number, z: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && z >= rect.z && z < rect.z + rect.depth;
}

function inLake(x: number, z: number): boolean {
  return Math.hypot((x + 0.5 - LAKE.cx) / LAKE.rx, (z + 0.5 - LAKE.cz) / LAKE.rz) <= 1;
}

/** Chão de fora do muro: o lago com o píer, as roças, as estradas e o campo. */
function outsideFloor(x: number, z: number): Floor {
  if (inRect(PIER, x, z)) return { tile: TILE.planks, height: HEIGHT.outside };
  if (inLake(x, z)) return { tile: TILE.water, height: HEIGHT.water };
  const dirt = [...ROADS, ...FIELDS].some((rect) => inRect(rect, x, z));
  return { tile: dirt ? TILE.dirt : TILE.grass, height: HEIGHT.outside };
}

/** Chão de dentro do muro: o pátio do castelo, a praça, as ruas e o gramado. */
function townFloor(x: number, z: number): Floor {
  const height = bandHeight(z);
  if (z < CASTLE_FROM_Z) return { tile: TILE.stone, height };
  if (inRect(MARKET, x, z)) return { tile: TILE.plaza, height };
  if (STREETS.some((rect) => inRect(rect, x, z))) return { tile: TILE.road, height };
  return { tile: TILE.grass, height };
}

/** Chão de cada casa do burgo. */
export function walledTownFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (let z = 0; z < WALLED_TOWN_SIZE.depth; z += 1) {
    for (let x = 0; x < WALLED_TOWN_SIZE.width; x += 1) {
      floors.set(key({ x, z }), inRect(TOWN, x, z) ? townFloor(x, z) : outsideFloor(x, z));
    }
  }
  return floors;
}

/** O muro da cidade, aberto nos portões, e o muro baixo do castelo, aberto na rua principal. */
function raiseWalls(sketch: Sketch): void {
  const town: Cell[] = [];
  for (let z = TOWN.z; z < TOWN.z + TOWN.depth; z += 1) {
    for (let x = TOWN.x; x < TOWN.x + TOWN.width; x += 1) town.push({ x, z });
  }
  const gates = new Set(GATES.map(key));
  outlineWalls(sketch, town, (cell) =>
    gates.has(key(cell))
      ? []
      : [{ style: WALL_STYLE, level: bandHeight(cell.z), height: TOWN_WALL_HEIGHT }],
  );
  const gate = CASTLE_WALL.gate as readonly number[];
  const lower = bandHeight(CASTLE_FROM_Z);
  for (let x = TOWN.x; x < TOWN.x + TOWN.width; x += 1) {
    if (gate.includes(x)) continue;
    sketch.wall({
      x,
      z: CASTLE_FROM_Z,
      side: 'north',
      style: WALL_STYLE,
      level: lower,
      height: CASTLE_WALL.height + 1,
    });
  }
}

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

/** A praça do mercado: a estátua do herói, as bancas, bancos e canteiros. */
function furnishMarket(place: Place): void {
  place(PIECE.heroStatue, { x: 32, z: 36 });
  for (const [x, z] of [
    [28, 33],
    [29, 33],
    [35, 33],
    [36, 33],
  ] as const) {
    place(PIECE.table, { x, z });
  }
  place(PIECE.crate, { x: 30, z: 33 });
  place(PIECE.barrel, { x: 37, z: 33 });
  place(PIECE.box, { x: 27, z: 33 });
  place(PIECE.barrel, { x: 38, z: 32 });
  place(PIECE.bench, { x: 28, z: 37 });
  place(PIECE.bench, { x: 35, z: 37 });
  place(PIECE.bed, { x: 30, z: 38 });
  place(PIECE.bed, { x: 33, z: 38 });
  for (const [x, z] of [
    [27, 32],
    [27, 38],
    [38, 38],
  ] as const) {
    place(PIECE.torch, { x, z });
  }
}

/** As ruas: tochas nas esquinas, carga na porta das lojas e as árvores dos quintais. */
function furnishStreets(place: Place): void {
  for (const [x, z] of [
    [22, 38],
    [25, 38],
    [22, 33],
    [22, 28],
    [25, 25],
    [22, 21],
    [25, 14],
    [42, 33],
    [5, 33],
    [5, 25],
    [42, 25],
  ] as const) {
    place(PIECE.torch, { x, z });
  }
  place(PIECE.barrel, { x: 20, z: 25 });
  place(PIECE.barrel, { x: 21, z: 25 });
  place(PIECE.crate, { x: 33, z: 25 });
  place(PIECE.wagon, { x: 40, z: 36 });
  for (const [x, z, tree] of [
    [5, 38, PIECE.oak],
    [21, 37, PIECE.birch],
    [42, 29, PIECE.tree],
    [5, 30, PIECE.birch],
    [42, 21, PIECE.oak],
    [5, 19, PIECE.pine],
    [14, 13, PIECE.birch],
  ] as const) {
    place(tree, { x, z });
  }
  for (const [x, z] of [
    [12, 38],
    [20, 30],
    [26, 30],
    [42, 38],
    [13, 25],
    [34, 19],
  ] as const) {
    place(PIECE.flowers, { x, z });
  }
  place(PIECE.bush, { x: 20, z: 32 });
  place(PIECE.bush, { x: 41, z: 31 });
}

/** O adro da igreja: estátua, obelisco e roseiras entre a igreja e a casa do vizinho. */
function furnishChurchyard(place: Place): void {
  place(PIECE.statue, { x: 33, z: 14 });
  place(PIECE.obelisk, { x: 33, z: 17 });
  place(PIECE.rose, { x: 33, z: 20 });
  place(PIECE.rose, { x: 42, z: 16 });
  place(PIECE.bush, { x: 42, z: 19 });
}

/** O pátio do castelo: pilares e tochas do portão, carga, baús e o bote encostado. */
function furnishCastle(place: Place): void {
  place(PIECE.pillar, { x: 22, z: 12 });
  place(PIECE.pillar, { x: 25, z: 12 });
  place(PIECE.torch, { x: 21, z: 12 });
  place(PIECE.torch, { x: 26, z: 12 });
  for (const [x, z] of [
    [6, 7],
    [7, 7],
    [6, 8],
  ] as const) {
    place(PIECE.barrel, { x, z });
  }
  place(PIECE.crate, { x: 9, z: 7 });
  place(PIECE.chest, { x: 19, z: 7 }, { rotation: 1 });
  place(PIECE.log, { x: 39, z: 11 });
  place(PIECE.grass, { x: 41, z: 9 });
  place(PIECE.statue, { x: 18, z: 11 });
  place(PIECE.statue, { x: 29, z: 11 });
}

/** Fora do muro: as roças cercadas, o lago com o bote, a carroça na estrada e o mato. */
function furnishOutside(place: Place): void {
  for (const rect of FIELDS) {
    for (let z = rect.z + 1; z < rect.z + rect.depth; z += 2) {
      for (let x = rect.x + 1; x < rect.x + rect.width; x += 2) place(PIECE.grass, { x, z });
    }
    for (let x = rect.x; x < rect.x + rect.width; x += 1) place(PIECE.fence, { x, z: rect.z });
  }
  place(PIECE.boat, { x: 6, z: 43 });
  place(PIECE.wagon, { x: 25, z: 43 });
  place(PIECE.torch, { x: 22, z: 41 });
  place(PIECE.torch, { x: 25, z: 41 });
  for (const [x, z, tree] of [
    [1, 2, PIECE.pine],
    [6, 1, PIECE.pine],
    [12, 3, PIECE.pine],
    [19, 1, PIECE.oak],
    [30, 2, PIECE.pine],
    [38, 1, PIECE.pine],
    [44, 4, PIECE.pine],
    [46, 1, PIECE.oak],
    [1, 10, PIECE.pine],
    [2, 17, PIECE.oak],
    [1, 26, PIECE.pine],
    [2, 34, PIECE.birch],
    [45, 10, PIECE.pine],
    [46, 18, PIECE.oak],
    [45, 27, PIECE.pine],
    [46, 41, PIECE.birch],
    [42, 45, PIECE.oak],
    [1, 46, PIECE.pine],
    [14, 47, PIECE.birch],
  ] as const) {
    place(tree, { x, z });
  }
  for (const [x, z] of [
    [9, 2],
    [25, 3],
    [35, 4],
    [2, 22],
    [45, 22],
  ] as const) {
    place(PIECE.rock, { x, z });
  }
  place(PIECE.boulder, { x: 15, z: 1 });
  place(PIECE.boulder, { x: 40, z: 2 });
}

export function buildWalledTownMap(): AssembledMap {
  const sketch = createSketch(WALLED_TOWN_SIZE, null);
  const floors = walledTownFloors();
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    sketch.ground({ x: x!, z: z!, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  const indoors = stampBuildings(sketch, BUILDINGS);
  raiseWalls(sketch);
  const place: Place = (piece, cell, options = {}) => {
    const floor = floors.get(key(cell));
    if (!floor) throw new Error(`Peça ${piece} fora do burgo em ${key(cell)}.`);
    if (indoors.has(key(cell))) throw new Error(`Peça ${piece} dentro de prédio em ${key(cell)}.`);
    sketch.piece(piece, cell, { ...options, level: floor.height });
  };
  furnishMarket(place);
  furnishStreets(place);
  furnishChurchyard(place);
  furnishCastle(place);
  furnishOutside(place);
  return sketch.build(styleHeader(STYLE_KITS.medieval));
}
