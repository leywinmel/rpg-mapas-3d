/**
 * Porto da maré (RPG-63): porto pensado à mão, numa encosta que desce até o mar. A cidade
 * alta fica ao norte, dois degraus acima do cais; a rua de pedra desce até o calçadão de
 * madeira, de onde saem três píeres para o mar (água um degrau abaixo, como no gerador).
 * No cais: armazém, taverna, mercado de peixe e a casa do capitão do porto; no pontal a
 * leste, o farol.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, type CellRect, type MapWall } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { createSketch, type Sketch, type SketchPiece } from './sketch';

export const PORT_SIZE = { width: 48, depth: 48 } as const;

const TILE = {
  water: 'agua',
  planks: 'piso-madeira',
  street: 'med-calcamento',
  grass: 'grama',
  dirt: 'terra',
  stone: 'piso-pedra',
} as const;
const WALL = {
  plain: 'med-parede-rustica',
  door: 'med-rustica-porta',
  window: 'med-rustica-janela',
  stone: 'parede-pedra',
} as const;
const PIECE = {
  ship: 'med-navio',
  fishingBoat: 'med-pesqueiro',
  boat: 'med-bote',
  torch: 'tocha',
  barrel: 'barril',
  crate: 'caixa',
  bigCrate: 'med-caixote',
  chest: 'bau',
  table: 'mesa',
  chair: 'cadeira',
  wagon: 'med-carroca',
  tree: 'nat-carvalho',
  bush: 'nat-arbusto',
  flowers: 'nat-flores',
  rock: 'rocha',
  slab: 'med-assoalho-escuro',
} as const;

/** Degraus: o mar no zero, o cais um acima e a cidade subindo a encosta. */
const HEIGHT = { water: 0, dock: 1, middle: 2, upper: 3 } as const;
/** Linhas onde a encosta sobe um degrau (de baixo para cima). */
const MIDDLE_FROM_Z = 11;
const DOCK_FROM_Z = 21;
/** Largura do calçadão de madeira junto da água. */
const BOARDWALK = 3;
const STORY = 4;

/** A linha da praia: a água começa nela, com uma curva suave. */
const shoreZ = (x: number) => 34 + Math.round(1.5 * Math.sin(x / 6));

const PIERS: readonly CellRect[] = [
  { x: 8, z: 0, width: 2, depth: 9 },
  { x: 20, z: 0, width: 2, depth: 11 },
  { x: 32, z: 0, width: 2, depth: 8 },
];

const HEADLAND = { cx: 42.5, cz: 39.5, radius: 4.6 } as const;
const LIGHTHOUSE: CellRect = { x: 41, z: 38, width: 3, depth: 3 };
const LIGHTHOUSE_WALL = 12;

type Building = {
  readonly rect: CellRect;
  /** Lado da porta: no meio dele. */
  readonly door: 'north' | 'south';
};

const BUILDINGS = {
  warehouse: { rect: { x: 2, z: 23, width: 8, depth: 6 }, door: 'south' },
  tavern: { rect: { x: 12, z: 22, width: 8, depth: 7 }, door: 'south' },
  harbor: { rect: { x: 35, z: 23, width: 7, depth: 5 }, door: 'south' },
  houseA: { rect: { x: 4, z: 13, width: 6, depth: 5 }, door: 'south' },
  houseB: { rect: { x: 30, z: 13, width: 6, depth: 5 }, door: 'south' },
  chapel: { rect: { x: 14, z: 2, width: 7, depth: 7 }, door: 'south' },
  houseC: { rect: { x: 33, z: 3, width: 6, depth: 5 }, door: 'south' },
} as const satisfies Record<string, Building>;

const STREET_X = { from: 23, to: 26 } as const;
const STREET_Z = { from: 19, to: 21 } as const;

export type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;
const inRect = (rect: CellRect, x: number, z: number) =>
  x >= rect.x && x < rect.x + rect.width && z >= rect.z && z < rect.z + rect.depth;

function slopeHeight(z: number): number {
  if (z >= DOCK_FROM_Z) return HEIGHT.dock;
  if (z >= MIDDLE_FROM_Z) return HEIGHT.middle;
  return HEIGHT.upper;
}

function landTile(x: number, z: number): string {
  if (x >= STREET_X.from && x <= STREET_X.to) return TILE.street;
  if (z >= STREET_Z.from && z <= STREET_Z.to) return TILE.street;
  if (Object.values(BUILDINGS).some((building) => inRect(building.rect, x, z))) return TILE.planks;
  return z >= DOCK_FROM_Z ? TILE.dirt : TILE.grass;
}

/** Píer de cada coluna do mar: ele começa na linha da praia de cada píer. */
function onPier(x: number, z: number): boolean {
  return PIERS.some((pier) => {
    const start = Math.min(shoreZ(pier.x), shoreZ(pier.x + 1));
    return inRect({ ...pier, z: start }, x, z);
  });
}

/** Chão de cada casa do porto. */
export function portFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (let z = 0; z < PORT_SIZE.depth; z += 1) {
    for (let x = 0; x < PORT_SIZE.width; x += 1) {
      const shore = shoreZ(x);
      const headland = Math.hypot(x + 0.5 - HEADLAND.cx, z + 0.5 - HEADLAND.cz) <= HEADLAND.radius;
      let floor: Floor;
      if (headland) floor = { tile: TILE.stone, height: HEIGHT.dock };
      else if (z >= shore) {
        floor = onPier(x, z)
          ? { tile: TILE.planks, height: HEIGHT.dock }
          : { tile: TILE.water, height: HEIGHT.water };
      } else if (z >= shore - BOARDWALK) floor = { tile: TILE.planks, height: HEIGHT.dock };
      else floor = { tile: landTile(x, z), height: slopeHeight(z) };
      floors.set(key({ x, z }), floor);
    }
  }
  return floors;
}

/** Paredes de uma casa: porta no meio do lado pedido e janela a cada três casas. */
function raiseBuilding(sketch: Sketch, building: Building, level: number): void {
  const { x: x0, z: z0, width, depth } = building.rect;
  const doorX = x0 + Math.floor(width / 2);
  const style = (offset: number) => (offset % 3 === 1 ? WALL.window : WALL.plain);
  const wall = (edge: Pick<MapWall, 'x' | 'z' | 'side'>, wallStyle: string) =>
    sketch.wall({ ...edge, style: wallStyle, level, height: STORY });
  for (let x = x0; x < x0 + width; x += 1) {
    const doorHere = x === doorX;
    wall(
      { x, z: z0, side: 'north' },
      doorHere && building.door === 'north' ? WALL.door : style(x - x0),
    );
    wall(
      { x, z: z0 + depth, side: 'north' },
      doorHere && building.door === 'south' ? WALL.door : style(x - x0),
    );
  }
  for (let z = z0; z < z0 + depth; z += 1) {
    wall({ x: x0, z, side: 'west' }, style(z - z0));
    wall({ x: x0 + width, z, side: 'west' }, style(z - z0));
  }
}

/** Farol: torre de pedra oca com a porta ao norte e a chama sobre a laje do topo. */
function raiseLighthouse(sketch: Sketch): void {
  const { x: x0, z: z0, width, depth } = LIGHTHOUSE;
  const band = { style: WALL.stone, level: HEIGHT.dock, height: LIGHTHOUSE_WALL };
  for (let x = x0; x < x0 + width; x += 1) {
    if (x !== x0 + 1) sketch.wall({ x, z: z0, side: 'north', ...band });
    sketch.wall({ x, z: z0 + depth, side: 'north', ...band });
  }
  for (let z = z0; z < z0 + depth; z += 1) {
    sketch.wall({ x: x0, z, side: 'west', ...band });
    sketch.wall({ x: x0 + width, z, side: 'west', ...band });
  }
  const top = HEIGHT.dock + LIGHTHOUSE_WALL;
  const cells: Cell[] = [];
  for (let z = z0; z < z0 + depth; z += 1) {
    for (let x = x0; x < x0 + width; x += 1) cells.push({ x, z });
  }
  sketch.deck(cells, PIECE.slab, top);
  sketch.piece(PIECE.torch, { x: x0 + 1, z: z0 + 1 }, { level: top });
}

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

function furnishDocks(place: Place): void {
  place(PIECE.ship, { x: 23, z: 36 });
  place(PIECE.fishingBoat, { x: 34, z: 36 });
  place(PIECE.boat, { x: 10, z: 37 });
  place(PIECE.boat, { x: 6, z: 38 });
  for (const pier of PIERS) {
    const start = Math.min(shoreZ(pier.x), shoreZ(pier.x + 1));
    place(PIECE.torch, { x: pier.x, z: start + pier.depth - 1 });
  }
  for (const x of [2, 14, 27, 38]) place(PIECE.torch, { x, z: shoreZ(x) - BOARDWALK });
  for (const [x, z] of [
    [16, 31],
    [17, 31],
    [5, 31],
    [29, 30],
  ] as const) {
    place(PIECE.barrel, { x, z });
  }
  place(PIECE.bigCrate, { x: 6, z: 31 });
  place(PIECE.bigCrate, { x: 30, z: 30 });
  place(PIECE.rock, { x: 45, z: 36 });
}

function furnishWarehouse(place: Place): void {
  for (const [x, z] of [
    [2, 23],
    [3, 23],
    [2, 24],
    [8, 23],
    [9, 24],
  ] as const) {
    place(PIECE.barrel, { x, z });
  }
  for (const [x, z] of [
    [4, 23],
    [5, 23],
    [9, 27],
    [2, 27],
  ] as const) {
    place(PIECE.bigCrate, { x, z });
  }
  place(PIECE.crate, { x: 3, z: 27 });
}

function furnishTavern(place: Place): void {
  for (const [x, z] of [
    [14, 24],
    [17, 24],
    [14, 27],
  ] as const) {
    place(PIECE.table, { x, z });
    place(PIECE.chair, { x: x - 1, z }, { rotation: 1 });
    place(PIECE.chair, { x: x + 1, z }, { rotation: 3 });
  }
  for (const [x, z] of [
    [19, 22],
    [19, 23],
    [18, 22],
  ] as const) {
    place(PIECE.barrel, { x, z });
  }
  place(PIECE.torch, { x: 12, z: 22 });
}

/** Mercado de peixe a céu aberto: as bancas e a carroça de entrega. */
function furnishMarket(place: Place): void {
  for (const x of [28, 31]) {
    place(PIECE.table, { x, z: 25 });
    place(PIECE.crate, { x, z: 26 });
    place(PIECE.barrel, { x: x + 1, z: 25 });
  }
  place(PIECE.wagon, { x: 27, z: 22 });
}

function furnishHarbor(place: Place): void {
  place(PIECE.table, { x: 38, z: 24 });
  place(PIECE.chair, { x: 38, z: 25 }, { rotation: 2 });
  place(PIECE.chest, { x: 41, z: 23 }, { rotation: 3 });
  place(PIECE.crate, { x: 35, z: 23 });
}

function furnishTown(place: Place): void {
  place(PIECE.table, { x: 17, z: 4 });
  place(PIECE.chest, { x: 17, z: 3 });
  place(PIECE.torch, { x: 14, z: 2 });
  place(PIECE.torch, { x: 20, z: 2 });
  for (const [x, z] of [
    [2, 4],
    [8, 7],
    [42, 10],
    [29, 8],
    [11, 17],
    [44, 16],
  ] as const) {
    place(PIECE.tree, { x, z });
  }
  for (const [x, z] of [
    [12, 14],
    [37, 16],
    [22, 10],
    [41, 4],
  ] as const) {
    place(PIECE.bush, { x, z });
  }
  for (const [x, z] of [
    [27, 11],
    [21, 15],
    [10, 9],
  ] as const) {
    place(PIECE.flowers, { x, z });
  }
}

export function buildPortMap(): AssembledMap {
  const sketch = createSketch(PORT_SIZE, null);
  const floors = portFloors();
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    sketch.ground({ x: x!, z: z!, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  for (const building of Object.values(BUILDINGS)) {
    raiseBuilding(sketch, building, slopeHeight(building.rect.z));
  }
  raiseLighthouse(sketch);
  const place: Place = (piece, cell, options = {}) => {
    const floor = floors.get(key(cell));
    if (!floor) throw new Error(`Peça ${piece} fora do porto em ${key(cell)}.`);
    sketch.piece(piece, cell, { ...options, level: floor.height });
  };
  furnishDocks(place);
  furnishWarehouse(place);
  furnishTavern(place);
  furnishMarket(place);
  furnishHarbor(place);
  furnishTown(place);
  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, light: 1, backdrop: 'sea' },
  });
}
