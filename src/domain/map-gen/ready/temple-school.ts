/**
 * Academia do Monte Kasumi (RPG-64): escola-templo japonesa na encosta de um monte, em quatro
 * patamares ligados por uma escadaria de pedra. No pé, o primeiro torii e o lago; no patamar de
 * baixo, o campo de treino de terra e as salas de aula; no do meio, o pátio de pedra com o
 * incensário e o campanário entre os dormitórios; no alto, o salão principal, o pagode e o
 * bambuzal. Tudo à mão, sem sorteio: o mesmo mapa toda vez.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import type { WallSet } from '../kits';
import { createSketch, stampBuildings, type SketchBuilding, type SketchPiece } from './sketch';

export const TEMPLE_SCHOOL_SIZE = { width: 64, depth: 64 } as const;

const TILE = {
  grass: 'grama',
  dirt: 'terra',
  stone: 'piso-pedra',
  water: 'agua',
} as const;
const PIECE = {
  torii: 'jap-torii',
  lantern: 'jap-lanterna',
  sakura: 'jap-sakura',
  bamboo: 'jap-bambu',
  pagoda: 'jap-pagode',
  bell: 'jap-campanario',
  incense: 'jap-incensario',
  dummy: 'jap-boneco-treino',
  pine: 'nat-pinheiro',
  oak: 'nat-carvalho',
  grassTuft: 'nat-capim',
  flowers: 'nat-flores',
  rock: 'rocha',
  pebbles: 'nat-seixos',
  barrel: 'barril',
} as const;

/** Madeira escura, reboco claro e o telhado de beiral curvo, do maior para o menor. */
const JAPANESE_WALLS: WallSet = {
  plain: 'jap-parede',
  door: 'jap-parede-porta',
  window: 'jap-parede-janela',
  roofs: [
    { key: 'jap-telhado-4x4', footprint: { width: 4, depth: 4 } },
    { key: 'jap-telhado-2x4', footprint: { width: 2, depth: 4 } },
    { key: 'jap-telhado-2x2', footprint: { width: 2, depth: 2 } },
  ],
};

/** Degrau de cada patamar: sobe um andar (quatro degraus) por patamar. */
const RISE = 4;
const LEVEL = {
  pond: 0,
  foot: 1,
  lower: 1 + RISE,
  middle: 1 + 2 * RISE,
  top: 1 + 3 * RISE,
} as const;
/** Faixas de z de cada patamar (de cima para baixo do mapa, o alto do monte fica ao norte). */
const BAND = {
  top: { from: 0, to: 17 },
  middle: { from: 21, to: 33 },
  lower: { from: 37, to: 50 },
  foot: { from: 54, to: 63 },
} as const;
/**
 * As linhas de escada entre dois patamares, na ordem de quem sobe (do pé para o alto): no
 * caminho, cada linha sobe um degrau; fora dele, a encosta fica no patamar de baixo.
 */
const STAIRS: readonly { rows: readonly number[]; below: number }[] = [
  { rows: [53, 52, 51], below: LEVEL.foot },
  { rows: [36, 35, 34], below: LEVEL.lower },
  { rows: [20, 19, 18], below: LEVEL.middle },
];

/** A escadaria e o caminho de pedra que corta o monte de ponta a ponta. */
const PATH: CellRect = { x: 30, z: 0, width: 3, depth: 64 };
const POND: CellRect = { x: 8, z: 55, width: 8, depth: 5 };
const TRAINING_FIELD: CellRect = { x: 4, z: 39, width: 20, depth: 11 };
/** Pátio de pedra em frente às salas de aula. */
const CLASS_YARD: CellRect = { x: 33, z: 37, width: 5, depth: 14 };
const COURTYARD: CellRect = { x: 18, z: 21, width: 28, depth: 13 };
const FORECOURT: CellRect = { x: 24, z: 13, width: 16, depth: 5 };
const BAMBOO_GROVE: CellRect = { x: 2, z: 2, width: 14, depth: 15 };
const PAGODA_GARDEN: CellRect = { x: 44, z: 5, width: 8, depth: 9 };
const PAVED: readonly CellRect[] = [CLASS_YARD, COURTYARD, FORECOURT];

const SCHOOL_BUILDINGS: readonly SketchBuilding[] = [
  // Salas de aula do patamar de baixo, de porta para o pátio de pedra.
  ...[38, 45].map((z, index) => classroom(z, index)),
  // Dormitórios de dois andares dos dois lados do pátio do meio.
  ...[21, 28].flatMap((z, index) => [dorm(4, z, 3, index), dorm(48, z, 1, index + 2)]),
  {
    style: 'medieval',
    use: 'house',
    x: 25,
    z: 5,
    width: 14,
    depth: 8,
    stories: 1,
    rotation: 2,
    level: LEVEL.top,
    variant: 4,
    walls: JAPANESE_WALLS,
  },
];

function classroom(z: number, variant: number): SketchBuilding {
  return {
    style: 'medieval',
    use: 'house',
    x: 38,
    z,
    width: 6,
    depth: 10,
    stories: 1,
    rotation: 1,
    level: LEVEL.lower,
    variant,
    walls: JAPANESE_WALLS,
  };
}

function dorm(x: number, z: number, rotation: number, variant: number): SketchBuilding {
  return {
    style: 'medieval',
    use: 'house',
    x,
    z,
    width: 6,
    depth: 10,
    stories: 2,
    rotation,
    level: LEVEL.middle,
    variant,
    walls: JAPANESE_WALLS,
  };
}

export type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;

function inRect(rect: CellRect, x: number, z: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && z >= rect.z && z < rect.z + rect.depth;
}

function bandHeight(z: number): number {
  if (z <= BAND.top.to) return LEVEL.top;
  if (z <= BAND.middle.to) return LEVEL.middle;
  if (z <= BAND.lower.to) return LEVEL.lower;
  return LEVEL.foot;
}

/** A linha de escada da casa (degrau no caminho, encosta fora dele), ou null. */
function stairAt(x: number, z: number): Floor | null {
  for (const { rows, below } of STAIRS) {
    const step = rows.indexOf(z);
    if (step < 0) continue;
    if (!inRect(PATH, x, z)) return { tile: TILE.grass, height: below };
    return { tile: TILE.stone, height: below + step + 1 };
  }
  return null;
}

function floorAt(x: number, z: number): Floor {
  const stair = stairAt(x, z);
  if (stair) return stair;
  const onPath = inRect(PATH, x, z);
  const height = bandHeight(z);
  if (inRect(POND, x, z)) return { tile: TILE.water, height: LEVEL.pond };
  if (onPath || PAVED.some((rect) => inRect(rect, x, z))) return { tile: TILE.stone, height };
  if (inRect(TRAINING_FIELD, x, z)) return { tile: TILE.dirt, height };
  return { tile: TILE.grass, height };
}

/** Chão de cada casa do monte, do pé ao salão principal. */
export function templeSchoolFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (let z = 0; z < TEMPLE_SCHOOL_SIZE.depth; z += 1) {
    for (let x = 0; x < TEMPLE_SCHOOL_SIZE.width; x += 1) floors.set(key({ x, z }), floorAt(x, z));
  }
  return floors;
}

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

function placeAll(place: Place, piece: string, cells: readonly (readonly [number, number])[]) {
  for (const [x, z] of cells) place(piece, { x, z });
}

/** Um par de lanternas, uma de cada lado do caminho, em cada linha pedida. */
function lanternPairs(place: Place, zs: readonly number[]): void {
  for (const z of zs) {
    place(PIECE.lantern, { x: PATH.x - 1, z });
    place(PIECE.lantern, { x: PATH.x + PATH.width, z });
  }
}

/** O pé do monte: o primeiro torii sobre o caminho, o lago com pedras e as cerejeiras. */
function furnishFoot(place: Place): void {
  place(PIECE.torii, { x: PATH.x, z: 58 });
  lanternPairs(place, [55, 61]);
  placeAll(place, PIECE.rock, [
    [7, 56],
    [16, 58],
    [11, 60],
  ]);
  place(PIECE.pebbles, { x: 7, z: 59 });
  placeAll(place, PIECE.sakura, [
    [18, 55],
    [6, 61],
    [17, 61],
    [24, 57],
    [37, 56],
    [43, 60],
  ]);
}

/** Patamar de baixo: os bonecos de treino em fileiras e os barris de água na beira do campo. */
function furnishLower(place: Place): void {
  for (const z of [41, 44, 47]) {
    for (const x of [7, 11, 15, 19]) place(PIECE.dummy, { x, z });
  }
  placeAll(place, PIECE.barrel, [
    [4, 39],
    [5, 39],
    [23, 49],
  ]);
  lanternPairs(place, [38, 49]);
  placeAll(place, PIECE.sakura, [
    [26, 40],
    [26, 47],
    [50, 39],
    [55, 44],
    [59, 48],
  ]);
}

/** Patamar do meio: o incensário no centro do pátio, o campanário e as lanternas. */
function furnishMiddle(place: Place): void {
  place(PIECE.incense, { x: 31, z: 28 });
  place(PIECE.bell, { x: 40, z: 24 });
  lanternPairs(place, [22, 32]);
  placeAll(place, PIECE.lantern, [
    [20, 24],
    [20, 32],
    [43, 32],
  ]);
  placeAll(place, PIECE.sakura, [
    [15, 21],
    [15, 33],
    [46, 21],
    [46, 33],
  ]);
}

/** O alto: o segundo torii, as lanternas do salão, o pagode e o bambuzal. */
function furnishTop(place: Place): void {
  place(PIECE.torii, { x: PATH.x, z: 16 });
  placeAll(place, PIECE.lantern, [
    [26, 14],
    [37, 14],
    [24, 17],
    [39, 17],
  ]);
  place(PIECE.pagoda, { x: 46, z: 8 });
  placeAll(place, PIECE.lantern, [
    [45, 7],
    [49, 12],
  ]);
  placeAll(place, PIECE.sakura, [
    [44, 5],
    [50, 6],
    [44, 13],
    [22, 8],
    [41, 3],
  ]);
  for (let z = BAMBOO_GROVE.z; z < BAMBOO_GROVE.z + BAMBOO_GROVE.depth; z += 2) {
    for (
      let x = BAMBOO_GROVE.x + (z % 4 === 0 ? 0 : 1);
      x < BAMBOO_GROVE.x + BAMBOO_GROVE.width;
      x += 2
    ) {
      place(PIECE.bamboo, { x, z });
    }
  }
}

/** Número fixo de cada casa: espalha a mata sem sorteio e sem fileiras. */
function cellPattern(x: number, z: number): number {
  return (Math.imul(x, 73856093) ^ Math.imul(z, 19349663)) >>> 0;
}

const SCATTER = { tree: 9, tuft: 13 } as const;
/** Faixa da beira do mapa onde a mata do monte fecha. */
const FOREST_EDGE = 3;
const RESERVED: readonly CellRect[] = [BAMBOO_GROVE, PAGODA_GARDEN, POND];

/** Pinheiros na beira do monte e capim solto no resto da grama. */
function scatterNature(place: Place, floors: Map<string, Floor>, taken: Set<string>): void {
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number) as [number, number];
    if (floor.tile !== TILE.grass || taken.has(text)) continue;
    if (STAIRS.some(({ rows }) => rows.includes(z))) continue;
    if (RESERVED.some((rect) => inRect(rect, x, z))) continue;
    const pattern = cellPattern(x, z);
    const edge = Math.min(x, z, TEMPLE_SCHOOL_SIZE.width - 1 - x, TEMPLE_SCHOOL_SIZE.depth - 1 - z);
    if (edge < FOREST_EDGE && pattern % 3 === 0) {
      place(pattern % 2 ? PIECE.pine : PIECE.oak, { x, z });
    } else if (edge >= FOREST_EDGE && pattern % SCATTER.tree === 0) {
      place(PIECE.pine, { x, z });
    } else if (pattern % SCATTER.tuft === 0) {
      place(pattern % 3 ? PIECE.grassTuft : PIECE.flowers, { x, z });
    }
  }
}

export function buildTempleSchoolMap(): AssembledMap {
  const sketch = createSketch(TEMPLE_SCHOOL_SIZE, null);
  const floors = templeSchoolFloors();
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    sketch.ground({ x: x!, z: z!, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  const indoors = stampBuildings(sketch, SCHOOL_BUILDINGS);
  // A mata espalhada não pisa onde já há peça posta à mão nem encosta nela.
  const taken = new Set<string>();
  const place: Place = (piece, cell, options = {}) => {
    const floor = floors.get(key(cell));
    if (!floor || floor.tile === TILE.water) {
      throw new Error(`Peça ${piece} fora do chão da academia em ${key(cell)}.`);
    }
    if (indoors.has(key(cell))) throw new Error(`Peça ${piece} dentro de casa em ${key(cell)}.`);
    sketch.piece(piece, cell, { ...options, level: floor.height });
    for (let dz = -1; dz <= 3; dz += 1) {
      for (let dx = -1; dx <= 3; dx += 1) taken.add(key({ x: cell.x + dx, z: cell.z + dz }));
    }
  };
  furnishFoot(place);
  furnishLower(place);
  furnishMiddle(place);
  furnishTop(place);
  for (const cell of indoors) taken.add(cell);
  scatterNature(place, floors, taken);
  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'floresta', backdrop: 'forest' },
  });
}
