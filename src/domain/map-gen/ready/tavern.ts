/**
 * Taverna do Javali (pedido do usuário em 22/11): estalagem medieval de um andar, sem telhado,
 * para a cena clássica do grupo que se encontra na taverna. O salão ocupa o oeste, com o balcão
 * de barris de chope ao norte, as mesas e a mesa de banquete; a leste ficam a cozinha com a
 * despensa e os dois quartos de hóspede (o dos fundos com o baú do dono). Lá fora, a rua de
 * calçamento, o chafariz, a carroça e as árvores do quintal.
 *
 * Os móveis vêm do pacote KayKit Dungeon Remastered (CC0), em public/assets/tavern.
 */
import type { Cell } from '../../grid';
import { STORY_HEIGHT_STEPS, type CellRect, type Footprint, type MapWall } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createSketch, type Sketch } from './sketch';

export const TAVERN_SIZE = { width: 32, depth: 26 } as const;

const TILE = {
  grass: 'grama',
  road: 'med-calcamento',
  yard: 'terra',
  floor: 'med-assoalho-escuro',
  kitchen: 'med-piso-tijolo',
} as const;
const WALL = {
  outer: 'med-parede-reboco',
  window: 'med-reboco-janela',
  door: 'med-reboco-porta',
  inner: 'parede-madeira',
} as const;
const PIECE = {
  bed: 'kay-cama',
  strawBed: 'kay-cama-palha',
  keg: 'kay-barril-chope',
  barrels: 'kay-barris',
  feast: 'kay-mesa-banquete',
  table: 'kay-mesa-toalha',
  counter: 'kay-mesinha',
  stool: 'kay-banquinho',
  shelf: 'kay-estante',
  candleShelf: 'kay-prateleira-velas',
  candles: 'kay-candelabro',
  banner: 'kay-estandarte-vermelho',
  weapons: 'kay-espada-escudo',
  crates: 'kay-caixas',
  coins: 'kay-moedas',
  goldChest: 'kay-bau-ouro',
  trunk: 'kay-arca',
  wallTorch: 'kay-tocha-parede',
  torch: 'tocha',
  wagon: 'med-carroca',
  fountain: 'pra-chafariz',
  oak: 'nat-carvalho',
  birch: 'nat-betula',
  bush: 'nat-arbusto',
  flowers: 'nat-flores',
  barrel: 'barril',
} as const;

/** O prédio inteiro e cada cômodo, em casas do mapa. */
const BUILDING: CellRect = { x: 3, z: 3, width: 24, depth: 16 };
/** Coluna da parede entre o salão e os fundos, linha da parede entre a cozinha e os quartos. */
const BACK_WALL_X = 19;
const KITCHEN_WALL_Z = 11;
/** Coluna da parede entre os dois quartos. */
const ROOMS_WALL_X = 23;
const KITCHEN: CellRect = { x: 19, z: 3, width: 8, depth: 8 };
/** Portas do salão para a rua (duas casas) e as passagens de dentro, sem parede. */
const FRONT_DOOR = [10, 11] as const;
const KITCHEN_DOOR_Z = 6;
const ROOM_DOOR_Z = 14;
const INNER_ROOM_DOOR_Z = 17;
/** Janela a cada tantas casas nas paredes de fora. */
const WINDOW_EVERY = 4;
const ROAD: CellRect = { x: 0, z: 21, width: 32, depth: 2 };
const PATH: CellRect = { x: 10, z: 19, width: 2, depth: 2 };

/** Giro das peças de parede: a frente olha para +z (0) ou para -z (2). */
const FACING = { south: 0, north: 2 } as const;

/** O chafariz ocupa 2×2 no catálogo, mas não está na tabela de peças grandes do gerador. */
const FOOTPRINTS: Readonly<Record<string, Footprint>> = {
  [PIECE.fountain]: { width: 2, depth: 2 },
};

const key = (cell: Cell) => `${cell.x},${cell.z}`;

function wall(sketch: Sketch, edge: Pick<MapWall, 'x' | 'z' | 'side'>, style: string): void {
  sketch.wall({ ...edge, style, level: 0, height: STORY_HEIGHT_STEPS });
}

/** Paredes de fora (reboco, com janelas e a porta) e as divisórias de madeira de dentro. */
function raiseWalls(sketch: Sketch): void {
  const { x: x0, z: z0, width, depth } = BUILDING;
  const outer = (offset: number) => (offset % WINDOW_EVERY === 2 ? WALL.window : WALL.outer);
  for (let x = x0; x < x0 + width; x += 1) {
    wall(sketch, { x, z: z0, side: 'north' }, outer(x - x0));
    const front = (FRONT_DOOR as readonly number[]).includes(x) ? WALL.door : outer(x - x0);
    wall(sketch, { x, z: z0 + depth, side: 'north' }, front);
  }
  for (let z = z0; z < z0 + depth; z += 1) {
    wall(sketch, { x: x0, z, side: 'west' }, outer(z - z0));
    wall(sketch, { x: x0 + width, z, side: 'west' }, outer(z - z0));
    if (z !== KITCHEN_DOOR_Z && z !== ROOM_DOOR_Z) {
      wall(sketch, { x: BACK_WALL_X, z, side: 'west' }, WALL.inner);
    }
    if (z >= KITCHEN_WALL_Z && z !== INNER_ROOM_DOOR_Z) {
      wall(sketch, { x: ROOMS_WALL_X, z, side: 'west' }, WALL.inner);
    }
  }
  for (let x = BACK_WALL_X; x < x0 + width; x += 1) {
    wall(sketch, { x, z: KITCHEN_WALL_Z, side: 'north' }, WALL.inner);
  }
}

type Place = (piece: string, cell: Cell, rotation?: number) => void;

/** Banquinhos nas quatro casas em volta de uma mesa de uma casa. */
function stoolsAround(place: Place, table: Cell): void {
  place(PIECE.table, table);
  for (const [dx, dz] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const) {
    place(PIECE.stool, { x: table.x + dx, z: table.z + dz });
  }
}

/** O salão: o balcão de chope, as mesas, o banquete e a parede dos estandartes. */
function furnishHall(place: Place): void {
  for (const x of [4, 6, 8]) place(PIECE.keg, { x, z: 3 });
  for (let x = 4; x <= 9; x += 1) {
    place(PIECE.counter, { x, z: 5 });
    place(PIECE.stool, { x, z: 6 });
  }
  place(PIECE.wallTorch, { x: 11, z: 3 });
  place(PIECE.banner, { x: 12, z: 3 });
  place(PIECE.weapons, { x: 14, z: 3 });
  place(PIECE.banner, { x: 17, z: 3 });
  place(PIECE.wallTorch, { x: 16, z: 3 });

  stoolsAround(place, { x: 6, z: 10 });
  stoolsAround(place, { x: 6, z: 15 });
  stoolsAround(place, { x: 15, z: 15 });
  place(PIECE.feast, { x: 12, z: 8 });
  for (let z = 8; z <= 10; z += 1) {
    place(PIECE.stool, { x: 11, z });
    place(PIECE.stool, { x: 14, z });
  }
  place(PIECE.barrels, { x: 18, z: 3 });
  place(PIECE.candles, { x: 4, z: 12 });
  place(PIECE.wallTorch, { x: 4, z: 18 }, FACING.north);
  place(PIECE.wallTorch, { x: 17, z: 18 }, FACING.north);
}

/** Cozinha e despensa: estantes na parede, barris, caixotes e a mesa de trabalho. */
function furnishKitchen(place: Place): void {
  for (const x of [20, 22, 24]) place(PIECE.shelf, { x, z: 3 });
  place(PIECE.candleShelf, { x: 26, z: 3 });
  for (const z of [5, 6, 7]) place(PIECE.barrels, { x: 26, z });
  for (const [x, z] of [
    [25, 10],
    [26, 10],
    [26, 9],
  ] as const) {
    place(PIECE.crates, { x, z });
  }
  place(PIECE.table, { x: 22, z: 7 });
  place(PIECE.stool, { x: 21, z: 7 });
}

/** Os quartos: o de hóspede na frente e o do dono nos fundos, com o baú e as moedas. */
function furnishRooms(place: Place): void {
  place(PIECE.bed, { x: 21, z: 11 });
  place(PIECE.trunk, { x: 19, z: 11 });
  place(PIECE.candles, { x: 22, z: 13 });
  place(PIECE.strawBed, { x: 22, z: 15 });
  place(PIECE.bed, { x: 25, z: 11 });
  place(PIECE.trunk, { x: 23, z: 11 });
  place(PIECE.candles, { x: 26, z: 14 });
  place(PIECE.goldChest, { x: 26, z: 18 }, FACING.north);
  place(PIECE.coins, { x: 25, z: 18 });
}

/** Lá fora: tochas na porta, o chafariz depois da rua, a carroça no quintal e as árvores. */
function furnishOutside(place: Place): void {
  place(PIECE.torch, { x: 9, z: 19 });
  place(PIECE.torch, { x: 12, z: 19 });
  place(PIECE.fountain, { x: 20, z: 23 });
  place(PIECE.wagon, { x: 29, z: 12 });
  for (const [x, z] of [
    [27, 17],
    [28, 17],
  ] as const) {
    place(PIECE.barrel, { x, z });
  }
  for (const [x, z] of [
    [1, 1],
    [29, 2],
    [1, 20],
    [30, 19],
    [5, 24],
    [27, 24],
  ] as const) {
    place(PIECE.oak, { x, z });
  }
  for (const [x, z] of [
    [14, 1],
    [1, 10],
    [30, 7],
  ] as const) {
    place(PIECE.birch, { x, z });
  }
  for (const [x, z] of [
    [4, 19],
    [6, 19],
    [15, 19],
    [17, 19],
  ] as const) {
    place(PIECE.flowers, { x, z });
  }
  place(PIECE.bush, { x: 2, z: 15 });
  place(PIECE.bush, { x: 28, z: 4 });
}

/** O chão: grama, a rua, o caminho até a porta, o terreiro dos fundos e o assoalho. */
function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...TAVERN_SIZE }, TILE.grass);
  sketch.ground({ x: 27, z: 10, width: 5, depth: 9 }, TILE.yard);
  sketch.ground(ROAD, TILE.road);
  sketch.ground(PATH, TILE.road);
  sketch.ground(BUILDING, TILE.floor);
  sketch.ground(KITCHEN, TILE.kitchen);
}

export function buildTavernMap(): AssembledMap {
  const sketch = createSketch(TAVERN_SIZE, null);
  lay(sketch);
  raiseWalls(sketch);
  const placed = new Set<string>();
  const place: Place = (piece, cell, rotation = 0) => {
    if (placed.has(key(cell))) throw new Error(`Duas peças em ${key(cell)} (${piece}).`);
    placed.add(key(cell));
    sketch.piece(piece, cell, { rotation, footprint: FOOTPRINTS[piece] });
  };
  furnishHall(place);
  furnishKitchen(place);
  furnishRooms(place);
  furnishOutside(place);
  return sketch.build(styleHeader(STYLE_KITS.medieval));
}
