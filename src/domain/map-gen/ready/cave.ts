/**
 * Caverna dos ecos (RPG-63): gruta pensada à mão, com o chão em degraus. Do túnel da
 * superfície (sul) se desce ao salão de estalagmites; a oeste fica o lago subterrâneo, com a
 * água um degrau abaixo da margem de lama; a leste uma rampa sobe ao patamar onde os
 * saqueadores acamparam; ao norte, a gruta dos cristais; a sudoeste, o canto dos cogumelos.
 *
 * As salas têm a borda torta de rocha (a mesma conta, sem sorteio, sempre igual) e os túneis
 * sobem ou descem casa a casa, para os personagens andarem de uma altura a outra.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { createSketch, outlineWalls, type Sketch, type SketchPiece } from './sketch';

export const CAVE_SIZE = { width: 44, depth: 44 } as const;

const TILE = { dirt: 'terra', mud: 'lama', water: 'agua', stone: 'piso-pedra' } as const;
const WALL_STYLE = 'parede-pedra';
const PIECE = {
  stalagmites: 'cav-estalagmites',
  crystals: 'cav-cristais',
  campfire: 'cav-fogueira',
  rock: 'rocha',
  boulder: 'nat-pedregulho',
  pebbles: 'nat-seixos',
  mushrooms: 'nat-cogumelos',
  log: 'nat-tronco',
  torch: 'tocha',
  barrel: 'barril',
  crate: 'caixa',
  chest: 'bau',
  bones: 'mas-ossos',
  boat: 'med-bote',
} as const;

/** Degraus do chão de cada parte: o lago no fundo e o acampamento no alto. */
const HEIGHT = { water: 0, shore: 1, nook: 1, hall: 2, grotto: 4, ledge: 6, surface: 4 } as const;

/**
 * A parede de rocha sobe de 3 a 5 degraus acima do chão, torta como pedra de verdade; mais
 * alta que isso, tapa a vista do mestre dentro das salas.
 */
const WALL_MIN = 3;
const WALL_SPREAD = 3;

type Chamber = {
  readonly cx: number;
  readonly cz: number;
  readonly rx: number;
  readonly rz: number;
  readonly height: number;
  readonly tile: string;
  /** Muda o desenho da borda torta de uma sala para outra. */
  readonly phase: number;
};

const CHAMBERS = {
  hall: { cx: 21, cz: 27, rx: 9, rz: 7, height: HEIGHT.hall, tile: TILE.dirt, phase: 0.4 },
  lake: { cx: 9, cz: 15, rx: 7.5, rz: 7.5, height: HEIGHT.shore, tile: TILE.mud, phase: 1.7 },
  ledge: { cx: 34, cz: 15, rx: 7, rz: 6, height: HEIGHT.ledge, tile: TILE.dirt, phase: 2.9 },
  grotto: { cx: 22, cz: 7, rx: 6, rz: 4.5, height: HEIGHT.grotto, tile: TILE.stone, phase: 4.1 },
  nook: { cx: 8, cz: 35, rx: 4.5, rz: 4, height: HEIGHT.nook, tile: TILE.dirt, phase: 5.3 },
} as const satisfies Record<string, Chamber>;

/** O lago dentro da sala da margem: a água fica no degrau zero. */
const LAKE_WATER = { cx: 8.5, cz: 14.5, rx: 5, rz: 5.5, phase: 0.9 } as const;

type Tunnel = {
  readonly from: Cell;
  readonly to: Cell;
  readonly fromHeight: number;
  readonly toHeight: number;
  readonly halfWidth: number;
};

/** Túneis entre as salas: a altura vai de uma ponta à outra, casa a casa. */
const TUNNELS: readonly Tunnel[] = [
  {
    from: { x: 21, z: 43 },
    to: { x: 21, z: 33 },
    fromHeight: HEIGHT.surface,
    toHeight: HEIGHT.hall,
    halfWidth: 1.6,
  },
  {
    from: { x: 14, z: 24 },
    to: { x: 12, z: 20 },
    fromHeight: HEIGHT.hall,
    toHeight: HEIGHT.shore,
    halfWidth: 1.6,
  },
  {
    from: { x: 27, z: 23 },
    to: { x: 31, z: 19 },
    fromHeight: HEIGHT.hall,
    toHeight: HEIGHT.ledge,
    halfWidth: 1.8,
  },
  {
    from: { x: 21, z: 21 },
    to: { x: 22, z: 11 },
    fromHeight: HEIGHT.hall,
    toHeight: HEIGHT.grotto,
    halfWidth: 1.4,
  },
  {
    from: { x: 14, z: 31 },
    to: { x: 10, z: 34 },
    fromHeight: HEIGHT.hall,
    toHeight: HEIGHT.nook,
    halfWidth: 1.3,
  },
];

/** A boca do túnel na borda sul, sem parede: por ali o grupo entra. */
const MOUTH_ROW = CAVE_SIZE.depth - 1;

/** Borda torta: o raio da sala varia com o ângulo, por duas ondas fixas. */
function insideBlob(
  shape: { cx: number; cz: number; rx: number; rz: number; phase: number },
  x: number,
  z: number,
): boolean {
  const dx = (x + 0.5 - shape.cx) / shape.rx;
  const dz = (z + 0.5 - shape.cz) / shape.rz;
  const angle = Math.atan2(dz, dx);
  const wobble =
    1 + 0.14 * Math.sin(3 * angle + shape.phase) + 0.08 * Math.sin(5 * angle - shape.phase);
  return Math.hypot(dx, dz) <= wobble;
}

/** Quanto do caminho do túnel a casa já andou (0 a 1) e a distância dela até a linha. */
function alongTunnel(tunnel: Tunnel, x: number, z: number): { t: number; distance: number } {
  const ax = tunnel.from.x + 0.5;
  const az = tunnel.from.z + 0.5;
  const dx = tunnel.to.x - tunnel.from.x;
  const dz = tunnel.to.z - tunnel.from.z;
  const length = dx * dx + dz * dz;
  const t = Math.min(Math.max(((x + 0.5 - ax) * dx + (z + 0.5 - az) * dz) / length, 0), 1);
  const distance = Math.hypot(x + 0.5 - (ax + dx * t), z + 0.5 - (az + dz * t));
  return { t, distance };
}

export type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;

/** Chão de cada casa aberta da caverna: as salas primeiro, depois os túneis no que sobrou. */
export function caveFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (let z = 0; z < CAVE_SIZE.depth; z += 1) {
    for (let x = 0; x < CAVE_SIZE.width; x += 1) {
      for (const chamber of Object.values(CHAMBERS)) {
        if (!insideBlob(chamber, x, z)) continue;
        floors.set(key({ x, z }), { tile: chamber.tile, height: chamber.height });
      }
      if (insideBlob(LAKE_WATER, x, z)) {
        floors.set(key({ x, z }), { tile: TILE.water, height: HEIGHT.water });
      }
      if (floors.has(key({ x, z }))) continue;
      for (const tunnel of TUNNELS) {
        const { t, distance } = alongTunnel(tunnel, x, z);
        if (distance > tunnel.halfWidth) continue;
        const height = Math.round(tunnel.fromHeight + (tunnel.toHeight - tunnel.fromHeight) * t);
        floors.set(key({ x, z }), { tile: TILE.dirt, height });
      }
    }
  }
  return floors;
}

/** Mistura fixa das coordenadas: a altura de cada trecho de parede, sem sorteio. */
const wallHeight = (cell: Cell) => WALL_MIN + ((cell.x * 7 + cell.z * 13) % WALL_SPREAD);

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

function furnishHall(place: Place): void {
  for (const [x, z] of [
    [15, 25],
    [26, 29],
    [19, 31],
    [24, 24],
    [17, 22],
  ] as const) {
    place(PIECE.stalagmites, { x, z });
  }
  for (const [x, z] of [
    [13, 28],
    [28, 26],
    [16, 30],
  ] as const) {
    place(PIECE.boulder, { x, z });
  }
  place(PIECE.rock, { x: 23, z: 32 });
  place(PIECE.pebbles, { x: 18, z: 27 });
  place(PIECE.bones, { x: 20, z: 25 });
  place(PIECE.torch, { x: 20, z: 34 });
  place(PIECE.torch, { x: 22, z: 34 });
}

function furnishLake(place: Place): void {
  place(PIECE.boat, { x: 9, z: 13 }, { rotation: 1 });
  for (const [x, z] of [
    [3, 10],
    [14, 10],
    [4, 20],
  ] as const) {
    place(PIECE.stalagmites, { x, z });
  }
  place(PIECE.rock, { x: 13, z: 20 });
  place(PIECE.mushrooms, { x: 2, z: 15 });
  place(PIECE.pebbles, { x: 15, z: 14 });
  place(PIECE.log, { x: 11, z: 21 });
}

/** Acampamento dos saqueadores no patamar alto: a fogueira, os troncos de sentar e o saque. */
function furnishLedge(place: Place): void {
  place(PIECE.campfire, { x: 34, z: 15 });
  place(PIECE.log, { x: 33, z: 15 }, { rotation: 1 });
  place(PIECE.log, { x: 35, z: 15 }, { rotation: 1 });
  place(PIECE.log, { x: 34, z: 14 });
  for (const [x, z] of [
    [38, 12],
    [38, 13],
  ] as const) {
    place(PIECE.barrel, { x, z });
  }
  place(PIECE.crate, { x: 37, z: 11 });
  place(PIECE.crate, { x: 30, z: 11 });
  place(PIECE.chest, { x: 39, z: 16 }, { rotation: 3 });
  place(PIECE.bones, { x: 31, z: 18 });
  place(PIECE.torch, { x: 29, z: 14 });
  place(PIECE.stalagmites, { x: 37, z: 19 });
}

/** Gruta dos cristais: a luz azul vem das pedras, sem tocha. */
function furnishGrotto(place: Place): void {
  for (const [x, z] of [
    [18, 6],
    [25, 5],
    [26, 6],
    [17, 9],
    [22, 4],
    [24, 10],
  ] as const) {
    place(PIECE.crystals, { x, z });
  }
  place(PIECE.stalagmites, { x: 20, z: 5 });
  place(PIECE.pebbles, { x: 23, z: 7 });
  place(PIECE.chest, { x: 22, z: 6 });
}

function furnishNook(place: Place): void {
  for (const [x, z] of [
    [6, 33],
    [9, 37],
    [5, 36],
    [10, 32],
  ] as const) {
    place(PIECE.mushrooms, { x, z });
  }
  place(PIECE.crystals, { x: 9, z: 38 });
  place(PIECE.bones, { x: 8, z: 35 });
}

export function buildCaveMap(): AssembledMap {
  const sketch: Sketch = createSketch(CAVE_SIZE, null);
  const floors = caveFloors();
  const area: Cell[] = [];
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    const cell = { x: x!, z: z! };
    area.push(cell);
    sketch.ground({ ...cell, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  const heightOf = (cell: Cell) => floors.get(key(cell))?.height ?? 0;
  outlineWalls(sketch, area, (cell) =>
    cell.z === MOUTH_ROW
      ? []
      : [{ style: WALL_STYLE, level: heightOf(cell), height: wallHeight(cell) }],
  );
  const place: Place = (piece, cell, options = {}) => {
    const floor = floors.get(key(cell));
    if (!floor) throw new Error(`Peça ${piece} fora da caverna em ${key(cell)}.`);
    sketch.piece(piece, cell, { ...options, level: floor.height });
  };
  furnishHall(place);
  furnishLake(place);
  furnishLedge(place);
  furnishGrotto(place);
  furnishNook(place);
  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'masmorra', backdrop: 'dungeon' },
  });
}
