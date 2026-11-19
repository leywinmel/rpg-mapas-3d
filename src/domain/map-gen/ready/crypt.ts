/**
 * Cripta esquecida (RPG-63): masmorra pensada à mão, descendo em degraus. A entrada fica no
 * alto, ao norte; uma escadaria cavada no terreno desce até o salão de pilares; dele saem a
 * prisão (oeste) e a sala do altar sobre um estrado (leste); outra escadaria desce para a
 * cripta funda dos sarcófagos, ao sul, que esconde uma sala secreta a oeste.
 *
 * O relevo é o do terreno (degraus de meio metro): o mestre vê as quedas e os personagens
 * sobem e descem andando, sem peça de escada.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, rectCells, STORY_HEIGHT_STEPS, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { createSketch, outlineWalls, type Sketch } from './sketch';

export const CRYPT_SIZE = { width: 40, depth: 40 } as const;

const FLOOR = 'piso-pedra';
const WALL = { stone: 'parede-pedra', arch: 'med-arco', bars: 'grade' } as const;
const PIECE = {
  pillar: 'pilar',
  statue: 'estatua',
  torch: 'tocha',
  rock: 'rocha',
  barrel: 'barril',
  crate: 'caixa',
  chest: 'bau',
  table: 'mesa',
  chair: 'cadeira',
  sarcophagus: 'mas-sarcofago',
  altar: 'mas-altar',
  bones: 'mas-ossos',
  mushrooms: 'nat-cogumelos',
  pebbles: 'nat-seixos',
} as const;

/** Degraus do chão de cada parte: a entrada no alto e a cripta no fundo. */
const HEIGHT = { entrance: 6, hall: 2, dais: 3, crypt: 0 } as const;

type Room = { readonly rect: CellRect; readonly height: number };

const ROOMS = {
  entrance: { rect: { x: 17, z: 0, width: 6, depth: 6 }, height: HEIGHT.entrance },
  hall: { rect: { x: 12, z: 10, width: 16, depth: 12 }, height: HEIGHT.hall },
  westPass: { rect: { x: 10, z: 15, width: 2, depth: 2 }, height: HEIGHT.hall },
  prison: { rect: { x: 1, z: 11, width: 9, depth: 10 }, height: HEIGHT.hall },
  eastPass: { rect: { x: 28, z: 15, width: 2, depth: 2 }, height: HEIGHT.hall },
  altar: { rect: { x: 30, z: 11, width: 9, depth: 10 }, height: HEIGHT.hall },
  dais: { rect: { x: 32, z: 14, width: 5, depth: 4 }, height: HEIGHT.dais },
  crypt: { rect: { x: 12, z: 26, width: 16, depth: 12 }, height: HEIGHT.crypt },
  secretPass: { rect: { x: 9, z: 31, width: 3, depth: 2 }, height: HEIGHT.crypt },
  secret: { rect: { x: 2, z: 28, width: 7, depth: 7 }, height: HEIGHT.crypt },
} as const satisfies Record<string, Room>;

/** Escadarias cavadas no terreno: a altura de cada linha, de cima para baixo. */
const STAIRWAYS: ReadonlyArray<{ x: number; width: number; z: number; heights: number[] }> = [
  { x: 19, width: 2, z: 6, heights: [5, 4, 3, 2] },
  { x: 19, width: 2, z: 22, heights: [2, 1, 1, 0] },
];

/** A abertura da entrada: a borda norte do mapa, sem parede, onde a escada da superfície chega. */
const DOORWAY: readonly Cell[] = [
  { x: 19, z: 0 },
  { x: 20, z: 0 },
];

const key = (cell: Cell) => `${cell.x},${cell.z}`;

function carve(sketch: Sketch): Map<string, number> {
  const heights = new Map<string, number>();
  for (const room of Object.values(ROOMS)) {
    sketch.ground(room.rect, FLOOR, room.height);
    for (const cell of rectCells(room.rect)) heights.set(key(cell), room.height);
  }
  for (const stairs of STAIRWAYS) {
    stairs.heights.forEach((height, dz) => {
      const rect = { x: stairs.x, z: stairs.z + dz, width: stairs.width, depth: 1 };
      sketch.ground(rect, FLOOR, height);
      for (const cell of rectCells(rect)) heights.set(key(cell), height);
    });
  }
  return heights;
}

/** Arcos de pedra onde um corredor encontra uma sala: marca a passagem. */
function arches(sketch: Sketch, heightOf: (cell: Cell) => number): void {
  const west: Cell[] = [
    { x: 12, z: 15 },
    { x: 12, z: 16 },
    { x: 10, z: 15 },
    { x: 10, z: 16 },
    { x: 28, z: 15 },
    { x: 28, z: 16 },
    { x: 30, z: 15 },
    { x: 30, z: 16 },
    { x: 12, z: 31 },
    { x: 12, z: 32 },
    { x: 9, z: 31 },
    { x: 9, z: 32 },
  ];
  for (const cell of west) {
    const level = Math.max(heightOf(cell), heightOf({ x: cell.x - 1, z: cell.z }));
    sketch.wall({ ...cell, side: 'west', style: WALL.arch, level, height: STORY_HEIGHT_STEPS });
  }
  for (const z of [6, 10, 22, 26]) {
    for (const x of [19, 20]) {
      const level = Math.max(heightOf({ x, z }), heightOf({ x, z: z - 1 }));
      sketch.wall({ x, z, side: 'north', style: WALL.arch, level, height: STORY_HEIGHT_STEPS });
    }
  }
}

/** Prisão: três celas de grade na parede oeste e a mesa do carcereiro. */
function furnishPrison(sketch: Sketch): void {
  const level = HEIGHT.hall;
  for (let z = 11; z <= 19; z += 1) {
    sketch.wall({ x: 4, z, side: 'west', style: WALL.bars, level, height: STORY_HEIGHT_STEPS });
  }
  for (const z of [14, 17, 20]) {
    for (let x = 1; x <= 3; x += 1) {
      sketch.wall({ x, z, side: 'north', style: WALL.stone, level, height: STORY_HEIGHT_STEPS });
    }
  }
  for (const [x, z] of [
    [2, 12],
    [1, 16],
    [3, 18],
  ] as const) {
    sketch.piece(PIECE.bones, { x, z }, { level });
  }
  sketch.piece(PIECE.table, { x: 7, z: 12 }, { level });
  sketch.piece(PIECE.chair, { x: 7, z: 13 }, { level, rotation: 2 });
  sketch.piece(PIECE.chest, { x: 9, z: 11 }, { level, rotation: 3 });
  sketch.piece(PIECE.barrel, { x: 9, z: 20 }, { level });
  sketch.piece(PIECE.barrel, { x: 8, z: 20 }, { level });
  sketch.piece(PIECE.torch, { x: 5, z: 11 }, { level });
  sketch.piece(PIECE.torch, { x: 5, z: 20 }, { level });
}

/** Salão de pilares: duas fileiras, estátuas guardando a escadaria e entulho num canto. */
function furnishHall(sketch: Sketch): void {
  const level = HEIGHT.hall;
  for (const x of [14, 25]) {
    for (const z of [12, 15, 18]) sketch.piece(PIECE.pillar, { x, z }, { level });
  }
  sketch.piece(PIECE.statue, { x: 17, z: 10 }, { level });
  sketch.piece(PIECE.statue, { x: 22, z: 10 }, { level });
  for (const [x, z] of [
    [12, 11],
    [27, 11],
    [12, 20],
    [27, 20],
  ] as const) {
    sketch.piece(PIECE.torch, { x, z }, { level });
  }
  sketch.piece(PIECE.rock, { x: 26, z: 21 }, { level });
  sketch.piece(PIECE.rock, { x: 27, z: 21 }, { level });
  sketch.piece(PIECE.pebbles, { x: 25, z: 21 }, { level });
  sketch.piece(PIECE.bones, { x: 16, z: 19 }, { level });
  sketch.piece(PIECE.crate, { x: 12, z: 21 }, { level });
  sketch.piece(PIECE.barrel, { x: 13, z: 21 }, { level });
}

/** Sala do altar: o altar no estrado, estátuas nos cantos dele e os baús do tesouro. */
function furnishAltar(sketch: Sketch): void {
  const level = HEIGHT.hall;
  const top = HEIGHT.dais;
  sketch.piece(PIECE.altar, { x: 33, z: 15 }, { level: top, rotation: 0 });
  sketch.piece(PIECE.statue, { x: 32, z: 14 }, { level: top });
  sketch.piece(PIECE.statue, { x: 36, z: 14 }, { level: top });
  sketch.piece(PIECE.bones, { x: 35, z: 17 }, { level: top });
  for (const [x, z] of [
    [30, 11],
    [38, 11],
    [30, 20],
    [38, 20],
  ] as const) {
    sketch.piece(PIECE.torch, { x, z }, { level });
  }
  sketch.piece(PIECE.chest, { x: 31, z: 19 }, { level });
  sketch.piece(PIECE.chest, { x: 37, z: 19 }, { level });
}

/** Cripta funda: duas fileiras de sarcófagos, o túmulo do senhor no fim do corredor. */
function furnishCrypt(sketch: Sketch): void {
  const level = HEIGHT.crypt;
  for (const x of [14, 16, 23, 25]) {
    for (const z of [28, 32]) sketch.piece(PIECE.sarcophagus, { x, z }, { level });
  }
  for (const x of [18, 21]) {
    for (const z of [27, 30, 33]) sketch.piece(PIECE.pillar, { x, z }, { level });
  }
  sketch.piece(PIECE.altar, { x: 19, z: 36 }, { level, rotation: 2 });
  sketch.piece(PIECE.statue, { x: 17, z: 37 }, { level, rotation: 2 });
  sketch.piece(PIECE.statue, { x: 22, z: 37 }, { level, rotation: 2 });
  for (const [x, z] of [
    [12, 26],
    [27, 26],
    [12, 37],
    [27, 37],
  ] as const) {
    sketch.piece(PIECE.torch, { x, z }, { level });
  }
  for (const [x, z] of [
    [15, 35],
    [26, 30],
    [13, 30],
  ] as const) {
    sketch.piece(PIECE.bones, { x, z }, { level });
  }
}

/** Sala secreta: o tesouro esquecido, cogumelos e ossos de quem não saiu. */
function furnishSecret(sketch: Sketch): void {
  const level = HEIGHT.crypt;
  sketch.piece(PIECE.chest, { x: 4, z: 31 }, { level, rotation: 1 });
  sketch.piece(PIECE.chest, { x: 4, z: 32 }, { level, rotation: 1 });
  sketch.piece(PIECE.bones, { x: 6, z: 29 }, { level });
  sketch.piece(PIECE.bones, { x: 3, z: 34 }, { level });
  sketch.piece(PIECE.mushrooms, { x: 2, z: 28 }, { level });
  sketch.piece(PIECE.mushrooms, { x: 8, z: 34 }, { level });
  sketch.piece(PIECE.rock, { x: 8, z: 28 }, { level });
  sketch.piece(PIECE.torch, { x: 2, z: 34 }, { level });
}

function furnishEntrance(sketch: Sketch): void {
  const level = HEIGHT.entrance;
  sketch.piece(PIECE.torch, { x: 17, z: 1 }, { level });
  sketch.piece(PIECE.torch, { x: 22, z: 1 }, { level });
  sketch.piece(PIECE.statue, { x: 18, z: 5 }, { level, rotation: 2 });
  sketch.piece(PIECE.statue, { x: 21, z: 5 }, { level, rotation: 2 });
  sketch.piece(PIECE.rock, { x: 22, z: 4 }, { level });
  sketch.piece(PIECE.pebbles, { x: 17, z: 3 }, { level });
}

export function buildCryptMap(): AssembledMap {
  const sketch = createSketch(CRYPT_SIZE, null);
  const heights = carve(sketch);
  const heightOf = (cell: Cell) => heights.get(key(cell)) ?? 0;
  const area = [...heights.keys()].map((text) => {
    const [x, z] = text.split(',').map(Number);
    return { x: x!, z: z! };
  });
  const doorway = new Set(DOORWAY.map(key));
  outlineWalls(sketch, area, (cell) =>
    doorway.has(key(cell))
      ? []
      : [{ style: WALL.stone, level: heightOf(cell), height: STORY_HEIGHT_STEPS }],
  );
  arches(sketch, heightOf);
  furnishEntrance(sketch);
  furnishHall(sketch);
  furnishPrison(sketch);
  furnishAltar(sketch);
  furnishCrypt(sketch);
  furnishSecret(sketch);
  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'masmorra', backdrop: 'dungeon' },
  });
}
