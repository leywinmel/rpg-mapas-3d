/**
 * Mapas prontos fora da cidade (RPG-43): masmorra, caverna e deserto, por semente. Como as
 * vilas, sai um MapModel comum, que o mestre edita como qualquer outro. A planta guarda a peça
 * de chão de cada casa (null = rocha maciça, sem chão), as paredes e as peças soltas; a prévia
 * do formulário lê só a planta.
 */
import type { GridSize } from '../grid';
import type { Backdrop } from '../map-document';
import {
  createDefaultHeader,
  isValidMapSizeV2,
  MAX_MAP_SIZE_V2,
  STORY_HEIGHT_STEPS,
  type MapHeader,
  type MapModel,
  type MapWall,
} from '../map-v2';
import { createAssembler, createTileKeys } from './assemble';
import { generateSettlement, type GenerationStats } from './generator';
import type { SettlementStyle } from './kits';
import type { PlannedPiece } from './layout';
import { createRandom, deriveSeed, type Random } from './random';

export const WILD_KINDS = ['dungeon', 'cave', 'desert', 'port'] as const;
export type WildKind = (typeof WILD_KINDS)[number];

/** O que o gerador sabe fazer: vila ou cidade (com estilo) ou um dos mapas fora da cidade. */
export const MAP_KINDS = ['settlement', ...WILD_KINDS] as const;
export type MapKind = (typeof MAP_KINDS)[number];

export const MAP_KIND_LABELS: Readonly<Record<MapKind, string>> = {
  settlement: 'Vila ou cidade',
  dungeon: 'Masmorra',
  cave: 'Caverna',
  desert: 'Deserto',
  port: 'Porto',
};

export function isWildKind(kind: MapKind): kind is WildKind {
  return kind !== 'settlement';
}

/** Peças de cada mapa: só do catálogo base, que já tem tudo de pedra, terra e areia. */
const TILE = {
  stone: 'piso-pedra',
  dirt: 'terra',
  mud: 'lama',
  water: 'agua',
  sand: 'areia',
  cracked: 'chao-rachado',
  planks: 'piso-madeira',
} as const;
const WALL_STYLE = 'parede-pedra';
const WAREHOUSE_WALL = 'parede-madeira';
const PIECE = {
  torch: 'tocha',
  pillar: 'pilar',
  rock: 'rocha',
  tree: 'arvore',
  palm: 'nat-palmeira',
  cactus: 'nat-cacto',
  deadTree: 'nat-arvore-seca',
  mushrooms: 'nat-cogumelos',
  pebbles: 'nat-seixos',
  grass: 'nat-capim',
  bush: 'nat-arbusto',
  chest: 'bau',
  barrel: 'barril',
  crate: 'caixa',
  cargo: 'med-caixote',
} as const;
const DOCK_PROPS: readonly string[] = [PIECE.barrel, PIECE.crate, PIECE.cargo, PIECE.barrel];

/** Barcos do maior para o menor: cada cais recebe o maior que couber ao lado dele. */
const BOATS: readonly { key: string; width: number; depth: number }[] = [
  { key: 'med-navio', width: 4, depth: 10 },
  { key: 'med-pesqueiro', width: 2, depth: 4 },
  { key: 'med-bote', width: 1, depth: 2 },
];
const DUNGEON_PROPS: readonly string[] = [PIECE.barrel, PIECE.crate, PIECE.barrel, PIECE.chest];

const ONE_CELL = { width: 1, depth: 1 } as const;
const FULL_TURN = 4;

/** Masmorra: a área se divide em setores; cada setor tem no máximo uma sala. */
const DUNGEON_SECTOR = 22;
const ROOM_MIN = 5;
const ROOM_MAX = 15;
const ROOM_CHANCE = 0.85;
/** Sala com este lado ou mais ganha pilares por dentro. */
const PILLAR_ROOM_SIDE = 9;
const CORRIDOR_WIDE_CHANCE = 0.35;
const CELLS_PER_DUNGEON_PROP = 22;

/** Caverna: autômato celular clássico (cada casa vira rocha se a maioria em volta é rocha). */
const CAVE_OPEN_CHANCE = 0.44;
const CAVE_STEPS = 4;
const CAVE_SOLID_NEIGHBORS = 5;
const CAVE_ROCK_CHANCE = 0.025;
const CAVE_TORCH_CHANCE = 0.002;
const CAVE_MUSHROOM_CHANCE = 0.012;
const CAVE_PEBBLE_CHANCE = 0.01;
const CAVE_WALL_MIN = 3;
const CAVE_WALL_MAX = 6;

/** Ruído de "manchas" (lama, água, chão rachado): um valor sorteado a cada NOISE_CELL casas. */
const NOISE_CELL = 14;
const CAVE_MUD_ABOVE = 0.68;
const CAVE_WATER_ABOVE = 0.86;

const DESERT_CRACKED_ABOVE = 0.62;
const DESERT_ROCK_CHANCE = 0.012;
const DESERT_CACTUS_CHANCE = 0.007;
const DESERT_DEAD_TREE_CHANCE = 0.0015;
const CELLS_PER_RUIN = 1400;
const RUIN_MIN = 4;
const RUIN_MAX = 9;
const RUIN_WALL_KEEP = 0.6;
const RUIN_WALL_MAX = 3;
const CELLS_PER_OASIS = 4000;
const OASIS_RADIUS_MIN = 2;
const OASIS_RADIUS_MAX = 4;
const OASIS_TREE_CHANCE = 0.45;

/** Mapa menor que isto não cabe uma sala com borda: sai só o chão. */
const MIN_CARVED_SIDE = 8;
const ROCK_SCALE_MIN = 0.6;
const ROCK_SCALE_RANGE = 0.9;

export type WildOptions = {
  readonly kind: WildKind;
  readonly size: GridSize;
  readonly seed: number;
};

export type WildPlan = {
  readonly size: GridSize;
  readonly kind: WildKind;
  /** Peça de chão de cada casa, linha a linha; null = rocha maciça. */
  readonly tiles: readonly (string | null)[];
  readonly walls: readonly MapWall[];
  readonly pieces: readonly PlannedPiece[];
  /** Salas da masmorra, ruínas do deserto, regiões da caverna: o número que a prévia mostra. */
  readonly features: number;
};

type Canvas = {
  readonly size: GridSize;
  readonly tiles: (string | null)[];
  readonly walls: MapWall[];
  readonly pieces: PlannedPiece[];
  readonly random: Random;
};

type Rect = { x: number; z: number; width: number; depth: number };

function canvasFor(size: GridSize, seed: number, fill: string | null): Canvas {
  return {
    size,
    tiles: new Array<string | null>(size.width * size.depth).fill(fill),
    walls: [],
    pieces: [],
    random: createRandom(seed),
  };
}

function inside(size: GridSize, x: number, z: number): boolean {
  return x >= 0 && z >= 0 && x < size.width && z < size.depth;
}

function tileAt(canvas: Canvas, x: number, z: number): string | null {
  return inside(canvas.size, x, z) ? canvas.tiles[z * canvas.size.width + x]! : null;
}

function paint(canvas: Canvas, x: number, z: number, tile: string | null): void {
  if (inside(canvas.size, x, z)) canvas.tiles[z * canvas.size.width + x] = tile;
}

function addPiece(canvas: Canvas, key: string, x: number, z: number, scale = 1): void {
  const rotation = canvas.random.between(0, FULL_TURN - 1);
  canvas.pieces.push({ key, x, z, rotation, footprint: ONE_CELL, scale });
}

/** Manchas suaves em [0, 1): valores sorteados numa grade grossa, misturados entre os vizinhos. */
function patchNoise(size: GridSize, random: Random) {
  const columns = Math.ceil(size.width / NOISE_CELL) + 2;
  const rows = Math.ceil(size.depth / NOISE_CELL) + 2;
  const values = Array.from({ length: columns * rows }, () => random.next());
  const at = (column: number, row: number) => values[row * columns + column]!;
  return (x: number, z: number) => {
    const fx = x / NOISE_CELL;
    const fz = z / NOISE_CELL;
    const column = Math.floor(fx);
    const row = Math.floor(fz);
    const tx = fx - column;
    const tz = fz - row;
    const top = at(column, row) * (1 - tx) + at(column + 1, row) * tx;
    const bottom = at(column, row + 1) * (1 - tx) + at(column + 1, row + 1) * tx;
    return top * (1 - tz) + bottom * tz;
  };
}

/**
 * Parede em toda aresta entre chão e rocha maciça: a sala fica fechada sem que cada gerador
 * precise pensar nas bordas. A borda do mapa é sempre rocha, então as paredes ficam dentro.
 */
function wallUpSolids(canvas: Canvas, height: () => number): void {
  const { width, depth } = canvas.size;
  for (let z = 0; z < depth; z += 1) {
    for (let x = 0; x < width; x += 1) {
      const open = tileAt(canvas, x, z) !== null;
      if (open !== (tileAt(canvas, x, z - 1) !== null) && z > 0) {
        canvas.walls.push(wallAt(x, z, 'north', height()));
      }
      if (open !== (tileAt(canvas, x - 1, z) !== null) && x > 0) {
        canvas.walls.push(wallAt(x, z, 'west', height()));
      }
    }
  }
}

function wallAt(x: number, z: number, side: MapWall['side'], height: number): MapWall {
  return { x, z, side, style: WALL_STYLE, height, level: 0 };
}

function fillRect(canvas: Canvas, rect: Rect, tile: string): void {
  for (let z = rect.z; z < rect.z + rect.depth; z += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) paint(canvas, x, z, tile);
  }
}

function center(rect: Rect) {
  return { x: rect.x + Math.floor(rect.width / 2), z: rect.z + Math.floor(rect.depth / 2) };
}

/** Corredor em L entre os centros de duas salas; não pinta por cima do chão das salas. */
function carveCorridor(canvas: Canvas, from: Rect, to: Rect): void {
  const a = center(from);
  const b = center(to);
  const wide = canvas.random.chance(CORRIDOR_WIDE_CHANCE) ? 1 : 0;
  const dig = (x: number, z: number) => {
    for (let dz = 0; dz <= wide; dz += 1) {
      for (let dx = 0; dx <= wide; dx += 1) {
        const cx = Math.min(Math.max(x + dx, 1), canvas.size.width - 2);
        const cz = Math.min(Math.max(z + dz, 1), canvas.size.depth - 2);
        if (tileAt(canvas, cx, cz) === null) paint(canvas, cx, cz, TILE.dirt);
      }
    }
  };
  const horizontalFirst = canvas.random.chance(0.5);
  const corner = horizontalFirst ? { x: b.x, z: a.z } : { x: a.x, z: b.z };
  for (const [start, end] of [
    [a, corner],
    [corner, b],
  ] as const) {
    const stepX = Math.sign(end.x - start.x);
    const stepZ = Math.sign(end.z - start.z);
    let x = start.x;
    let z = start.z;
    dig(x, z);
    while (x !== end.x || z !== end.z) {
      x += stepX;
      z += stepZ;
      dig(x, z);
    }
  }
}

/** Tochas nos cantos, pilares nas salas grandes e alguns barris, caixas e baús. */
function furnishRoom(canvas: Canvas, room: Rect): void {
  const right = room.x + room.width - 1;
  const far = room.z + room.depth - 1;
  addPiece(canvas, PIECE.torch, room.x, room.z);
  addPiece(canvas, PIECE.torch, right, far);
  if (canvas.random.chance(0.5)) addPiece(canvas, PIECE.torch, right, room.z);
  const taken = new Set([`${room.x},${room.z}`, `${right},${far}`, `${right},${room.z}`]);
  if (room.width >= PILLAR_ROOM_SIDE && room.depth >= PILLAR_ROOM_SIDE) {
    for (const [x, z] of [
      [room.x + 2, room.z + 2],
      [right - 2, room.z + 2],
      [room.x + 2, far - 2],
      [right - 2, far - 2],
    ] as const) {
      canvas.pieces.push({ key: PIECE.pillar, x, z, rotation: 0, footprint: ONE_CELL, scale: 1 });
      taken.add(`${x},${z}`);
    }
  }
  const props = Math.floor((room.width * room.depth) / CELLS_PER_DUNGEON_PROP);
  for (let index = 0; index < props; index += 1) {
    // Encostado numa parede, como num depósito: o meio da sala fica livre para a luta.
    const alongX = canvas.random.chance(0.5);
    const x = alongX ? canvas.random.between(room.x, right) : canvas.random.pick([room.x, right]);
    const z = alongX ? canvas.random.pick([room.z, far]) : canvas.random.between(room.z, far);
    if (taken.has(`${x},${z}`)) continue;
    taken.add(`${x},${z}`);
    addPiece(canvas, canvas.random.pick(DUNGEON_PROPS), x, z);
  }
}

function planDungeon(canvas: Canvas): number {
  const { width, depth } = canvas.size;
  const columns = Math.max(1, Math.floor((width - 2) / DUNGEON_SECTOR));
  const rows = Math.max(1, Math.floor((depth - 2) / DUNGEON_SECTOR));
  const sectorWidth = Math.floor((width - 2) / columns);
  const sectorDepth = Math.floor((depth - 2) / rows);
  const rooms: (Rect | null)[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const lonely = columns * rows === 1;
      if (!lonely && !canvas.random.chance(ROOM_CHANCE)) {
        rooms.push(null);
        continue;
      }
      const roomWidth = canvas.random.between(ROOM_MIN, Math.min(ROOM_MAX, sectorWidth - 2));
      const roomDepth = canvas.random.between(ROOM_MIN, Math.min(ROOM_MAX, sectorDepth - 2));
      const x = 1 + column * sectorWidth + canvas.random.between(1, sectorWidth - roomWidth - 1);
      const z = 1 + row * sectorDepth + canvas.random.between(1, sectorDepth - roomDepth - 1);
      rooms.push({ x, z, width: roomWidth, depth: roomDepth });
    }
  }
  const built = rooms.filter((room): room is Rect => room !== null);
  for (const room of built) fillRect(canvas, room, TILE.stone);
  // Cada sala liga com a próxima que existir à direita e abaixo: a masmorra toda fica ligada.
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const room = rooms[row * columns + column];
      if (!room) continue;
      const east = rooms.slice(row * columns + column + 1, (row + 1) * columns).find(Boolean);
      if (east) carveCorridor(canvas, room, east);
      for (let below = row + 1; below < rows; below += 1) {
        const south = rooms[below * columns + column];
        if (!south) continue;
        carveCorridor(canvas, room, south);
        break;
      }
    }
  }
  linkLonelyRows(canvas, rooms, columns, rows);
  wallUpSolids(canvas, () => STORY_HEIGHT_STEPS);
  for (const room of built) furnishRoom(canvas, room);
  return built.length;
}

/**
 * Coluna inteira sem sala deixa a parte de baixo solta da de cima: liga a primeira sala de cada
 * linha com a primeira da linha seguinte que tiver sala.
 */
function linkLonelyRows(
  canvas: Canvas,
  rooms: readonly (Rect | null)[],
  columns: number,
  rows: number,
): void {
  const firsts = Array.from({ length: rows }, (_, row) =>
    rooms.slice(row * columns, (row + 1) * columns).find(Boolean),
  ).filter((room): room is Rect => Boolean(room));
  for (let index = 1; index < firsts.length; index += 1) {
    carveCorridor(canvas, firsts[index - 1]!, firsts[index]!);
  }
}

function countSolidAround(open: Uint8Array, size: GridSize, x: number, z: number): number {
  let solid = 0;
  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dz === 0) continue;
      const nx = x + dx;
      const nz = z + dz;
      if (!inside(size, nx, nz) || open[nz * size.width + nx] === 0) solid += 1;
    }
  }
  return solid;
}

/** Só a maior região de chão fica: cavidades soltas, sem passagem, viram rocha. */
function keepLargestRegion(open: Uint8Array, size: GridSize): number {
  const region = new Int32Array(open.length).fill(-1);
  const queue = new Int32Array(open.length);
  let best = -1;
  let bestSize = 0;
  let regions = 0;
  for (let start = 0; start < open.length; start += 1) {
    if (open[start] === 0 || region[start] !== -1) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    region[start] = regions;
    while (head < tail) {
      const cell = queue[head++]!;
      const x = cell % size.width;
      const z = (cell - x) / size.width;
      for (const [nx, nz] of [
        [x + 1, z],
        [x - 1, z],
        [x, z + 1],
        [x, z - 1],
      ] as const) {
        if (!inside(size, nx, nz)) continue;
        const next = nz * size.width + nx;
        if (open[next] === 0 || region[next] !== -1) continue;
        region[next] = regions;
        queue[tail++] = next;
      }
    }
    if (tail > bestSize) {
      best = regions;
      bestSize = tail;
    }
    regions += 1;
  }
  for (let cell = 0; cell < open.length; cell += 1) {
    if (region[cell] !== best) open[cell] = 0;
  }
  return bestSize;
}

function planCave(canvas: Canvas): number {
  const { size, random } = canvas;
  const { width, depth } = size;
  let open = new Uint8Array(width * depth);
  for (let z = 1; z < depth - 1; z += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      open[z * width + x] = random.chance(CAVE_OPEN_CHANCE) ? 1 : 0;
    }
  }
  for (let step = 0; step < CAVE_STEPS; step += 1) {
    const next = new Uint8Array(open.length);
    for (let z = 1; z < depth - 1; z += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        next[z * width + x] = countSolidAround(open, size, x, z) >= CAVE_SOLID_NEIGHBORS ? 0 : 1;
      }
    }
    open = next;
  }
  if (keepLargestRegion(open, size) === 0) return planOpenFloor(canvas, TILE.dirt);
  const noise = patchNoise(size, random);
  for (let z = 0; z < depth; z += 1) {
    for (let x = 0; x < width; x += 1) {
      if (open[z * width + x] === 0) continue;
      const patch = noise(x, z);
      const tile =
        patch > CAVE_WATER_ABOVE ? TILE.water : patch > CAVE_MUD_ABOVE ? TILE.mud : TILE.dirt;
      paint(canvas, x, z, tile);
    }
  }
  wallUpSolids(canvas, () => random.between(CAVE_WALL_MIN, CAVE_WALL_MAX));
  for (let z = 0; z < depth; z += 1) {
    for (let x = 0; x < width; x += 1) {
      const tile = tileAt(canvas, x, z);
      if (tile === null || tile === TILE.water) continue;
      if (random.chance(CAVE_ROCK_CHANCE)) {
        addPiece(canvas, PIECE.rock, x, z, ROCK_SCALE_MIN + random.next() * ROCK_SCALE_RANGE);
      } else if (random.chance(CAVE_TORCH_CHANCE)) {
        addPiece(canvas, PIECE.torch, x, z);
      } else if (random.chance(CAVE_MUSHROOM_CHANCE)) {
        addPiece(canvas, PIECE.mushrooms, x, z);
      } else if (random.chance(CAVE_PEBBLE_CHANCE)) {
        addPiece(canvas, PIECE.pebbles, x, z);
      }
    }
  }
  return 1;
}

/** Mapa pequeno demais para cavar: chão inteiro, sem rocha em volta. */
function planOpenFloor(canvas: Canvas, tile: string): number {
  canvas.tiles.fill(tile);
  return 0;
}

/** Ruína: piso de laje e o que sobrou das paredes, com pilares nos cantos. */
function placeRuin(canvas: Canvas): boolean {
  const { random, size } = canvas;
  const width = random.between(RUIN_MIN, RUIN_MAX);
  const depth = random.between(RUIN_MIN, RUIN_MAX);
  if (width + 2 >= size.width || depth + 2 >= size.depth) return false;
  const x0 = random.between(1, size.width - width - 1);
  const z0 = random.between(1, size.depth - depth - 1);
  if (tileAt(canvas, x0, z0) !== TILE.sand && tileAt(canvas, x0, z0) !== TILE.cracked) return false;
  fillRect(canvas, { x: x0, z: z0, width, depth }, TILE.stone);
  const height = () => random.between(1, RUIN_WALL_MAX);
  for (let x = x0; x < x0 + width; x += 1) {
    if (random.chance(RUIN_WALL_KEEP)) canvas.walls.push(wallAt(x, z0, 'north', height()));
    if (random.chance(RUIN_WALL_KEEP)) canvas.walls.push(wallAt(x, z0 + depth, 'north', height()));
  }
  for (let z = z0; z < z0 + depth; z += 1) {
    if (random.chance(RUIN_WALL_KEEP)) canvas.walls.push(wallAt(x0, z, 'west', height()));
    if (random.chance(RUIN_WALL_KEEP)) canvas.walls.push(wallAt(x0 + width, z, 'west', height()));
  }
  for (const [x, z] of [
    [x0, z0],
    [x0 + width - 1, z0 + depth - 1],
  ] as const) {
    canvas.pieces.push({ key: PIECE.pillar, x, z, rotation: 0, footprint: ONE_CELL, scale: 1 });
  }
  if (random.chance(0.3)) addPiece(canvas, PIECE.chest, x0 + 1, z0 + 1);
  return true;
}

function placeOasis(canvas: Canvas): void {
  const { random, size } = canvas;
  const radius = random.between(OASIS_RADIUS_MIN, OASIS_RADIUS_MAX);
  const margin = radius + 2;
  if (margin * 2 >= size.width || margin * 2 >= size.depth) return;
  const cx = random.between(margin, size.width - margin - 1);
  const cz = random.between(margin, size.depth - margin - 1);
  for (let z = cz - radius - 1; z <= cz + radius + 1; z += 1) {
    for (let x = cx - radius - 1; x <= cx + radius + 1; x += 1) {
      const distance = Math.hypot(x - cx, z - cz);
      if (distance <= radius) paint(canvas, x, z, TILE.water);
      else if (distance <= radius + 1 && random.chance(OASIS_TREE_CHANCE)) {
        addPiece(canvas, PIECE.palm, x, z);
      }
    }
  }
}

function planDesert(canvas: Canvas): number {
  const { size, random } = canvas;
  const noise = patchNoise(size, random);
  for (let z = 0; z < size.depth; z += 1) {
    for (let x = 0; x < size.width; x += 1) {
      paint(canvas, x, z, noise(x, z) > DESERT_CRACKED_ABOVE ? TILE.cracked : TILE.sand);
    }
  }
  const area = size.width * size.depth;
  const oases = Math.floor(area / CELLS_PER_OASIS);
  for (let index = 0; index < oases; index += 1) placeOasis(canvas);
  let ruins = 0;
  const attempts = Math.max(1, Math.floor(area / CELLS_PER_RUIN));
  for (let index = 0; index < attempts; index += 1) if (placeRuin(canvas)) ruins += 1;
  const busy = new Set(canvas.pieces.map((piece) => `${piece.x},${piece.z}`));
  for (let z = 0; z < size.depth; z += 1) {
    for (let x = 0; x < size.width; x += 1) {
      const tile = tileAt(canvas, x, z);
      if (tile === TILE.water || tile === TILE.stone || busy.has(`${x},${z}`)) continue;
      if (random.chance(DESERT_ROCK_CHANCE)) {
        addPiece(canvas, PIECE.rock, x, z, ROCK_SCALE_MIN + random.next() * ROCK_SCALE_RANGE);
      } else if (random.chance(DESERT_CACTUS_CHANCE)) {
        addPiece(canvas, PIECE.cactus, x, z);
      } else if (random.chance(DESERT_DEAD_TREE_CHANCE)) {
        addPiece(canvas, PIECE.deadTree, x, z);
      }
    }
  }
  return ruins;
}

/** Mato na terra firme do porto (só no chão de terra: piso de armazém e cais ficam livres). */
function greenLand(canvas: Canvas, busy: ReadonlySet<string>): void {
  const { size, random } = canvas;
  for (let z = 0; z < size.depth; z += 1) {
    for (let x = 0; x < size.width; x += 1) {
      if (tileAt(canvas, x, z) !== TILE.dirt || busy.has(`${x},${z}`)) continue;
      if (random.chance(PORT_TREE_CHANCE)) addPiece(canvas, random.pick(PORT_TREES), x, z);
      else if (random.chance(PORT_GREEN_CHANCE)) addPiece(canvas, random.pick(PORT_GREENS), x, z);
    }
  }
}

/** Porto: terra firme perto de z = 0, mar no fundo, cais de madeira entrando na água. */
const SEA_SHARE = 0.45;
const SHORE_WAVE = 3;
const BOARDWALK = 2;
const PIER_SPACING = 12;
const PIER_WIDTH = 2;
const PIER_MIN = 5;
const PIER_MAX = 14;
const DOCK_PROP_CHANCE = 0.12;
const DOCK_TORCH_EVERY = 6;
const CELLS_PER_WAREHOUSE = 900;
const PORT_TREE_CHANCE = 0.006;
const PORT_GREEN_CHANCE = 0.02;
const PORT_TREES: readonly string[] = [PIECE.palm, PIECE.tree, PIECE.palm];
const PORT_GREENS: readonly string[] = [PIECE.grass, PIECE.grass, PIECE.bush, PIECE.pebbles];
const WAREHOUSE_MIN = 5;
const WAREHOUSE_MAX = 9;

/** Linha da praia em cada coluna: ondula devagar, com o mar ocupando o fundo do mapa. */
function shoreline(canvas: Canvas): number[] {
  const { size, random } = canvas;
  const noise = patchNoise(size, random);
  const base = Math.round(size.depth * (1 - SEA_SHARE));
  return Array.from({ length: size.width }, (_, x) =>
    Math.min(size.depth - 1, Math.max(1, base + Math.round((noise(x, 0) - 0.5) * 2 * SHORE_WAVE))),
  );
}

/** Barco atracado à direita do cais, proa para o mar; nenhum se não houver água para ele. */
function mooredBoat(canvas: Canvas, pierX: number, start: number, length: number): void {
  const x = pierX + PIER_WIDTH;
  for (const boat of BOATS) {
    if (boat.depth > length) continue;
    const rect = { x, z: start + length - boat.depth, width: boat.width, depth: boat.depth };
    if (!rectIsWater(canvas, rect)) continue;
    canvas.pieces.push({
      key: boat.key,
      x: rect.x,
      z: rect.z,
      rotation: 0,
      footprint: { width: boat.width, depth: boat.depth },
      scale: 1,
    });
    return;
  }
}

function rectIsWater(canvas: Canvas, rect: Rect): boolean {
  for (let z = rect.z; z < rect.z + rect.depth; z += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      if (tileAt(canvas, x, z) !== TILE.water) return false;
    }
  }
  return true;
}

/** Armazém de madeira sem telhado (o diorama mostra o que tem dentro), porta virada para o mar. */
function placeWarehouse(canvas: Canvas, landDepth: number): boolean {
  const { random, size } = canvas;
  const width = random.between(WAREHOUSE_MIN, WAREHOUSE_MAX);
  const depth = random.between(WAREHOUSE_MIN, WAREHOUSE_MAX);
  if (width + 2 >= size.width || depth + 2 >= landDepth) return false;
  const x0 = random.between(1, size.width - width - 1);
  const z0 = random.between(1, landDepth - depth - 1);
  for (let z = z0 - 1; z <= z0 + depth; z += 1) {
    for (let x = x0 - 1; x <= x0 + width; x += 1) {
      if (tileAt(canvas, x, z) !== TILE.dirt) return false;
    }
  }
  fillRect(canvas, { x: x0, z: z0, width, depth }, TILE.planks);
  const door = x0 + Math.floor(width / 2);
  const wall = (x: number, z: number, side: MapWall['side']) =>
    canvas.walls.push({ x, z, side, style: WAREHOUSE_WALL, height: STORY_HEIGHT_STEPS, level: 0 });
  for (let x = x0; x < x0 + width; x += 1) {
    wall(x, z0, 'north');
    if (x !== door) wall(x, z0 + depth, 'north');
  }
  for (let z = z0; z < z0 + depth; z += 1) {
    wall(x0, z, 'west');
    wall(x0 + width, z, 'west');
  }
  for (let x = x0; x < x0 + width; x += 2) addPiece(canvas, random.pick(DOCK_PROPS), x, z0);
  return true;
}

function planPort(canvas: Canvas): number {
  const { size, random } = canvas;
  const shore = shoreline(canvas);
  for (let x = 0; x < size.width; x += 1) {
    const line = shore[x]!;
    for (let z = 0; z < size.depth; z += 1) {
      const tile =
        z >= line
          ? TILE.water
          : z >= line - BOARDWALK
            ? TILE.planks
            : z === line - BOARDWALK - 1
              ? TILE.sand
              : TILE.dirt;
      paint(canvas, x, z, tile);
    }
  }
  let piers = 0;
  for (let pierX = PIER_SPACING / 2; pierX + PIER_WIDTH < size.width; pierX += PIER_SPACING) {
    const start = Math.max(...shore.slice(pierX, pierX + PIER_WIDTH));
    const length = Math.min(random.between(PIER_MIN, PIER_MAX), size.depth - start - 1);
    if (length < PIER_MIN) continue;
    fillRect(canvas, { x: pierX, z: start, width: PIER_WIDTH, depth: length }, TILE.planks);
    mooredBoat(canvas, pierX, start, length);
    addPiece(canvas, PIECE.torch, pierX, start + length - 1);
    piers += 1;
  }
  const landDepth = Math.min(...shore) - BOARDWALK - 1;
  const houses = Math.floor((size.width * landDepth) / CELLS_PER_WAREHOUSE);
  for (let index = 0; index < houses; index += 1) placeWarehouse(canvas, landDepth);
  const busy = new Set(canvas.pieces.map((piece) => `${piece.x},${piece.z}`));
  for (let x = 0; x < size.width; x += 1) {
    const z = shore[x]! - BOARDWALK;
    if (busy.has(`${x},${z}`)) continue;
    if (x % DOCK_TORCH_EVERY === 0) addPiece(canvas, PIECE.torch, x, z);
    else if (random.chance(DOCK_PROP_CHANCE)) addPiece(canvas, random.pick(DOCK_PROPS), x, z);
  }
  greenLand(canvas, busy);
  return piers;
}

const PLANNERS: Readonly<Record<WildKind, (canvas: Canvas) => number>> = {
  dungeon: planDungeon,
  cave: planCave,
  desert: planDesert,
  port: planPort,
};

/** Chão de quem não tem onde cavar sala: masmorra e caverna pequenas viram um piso inteiro. */
const SMALL_MAP_FLOOR: Readonly<Record<WildKind, string>> = {
  dungeon: TILE.stone,
  cave: TILE.dirt,
  desert: TILE.sand,
  port: TILE.dirt,
};

export function planWilds(options: WildOptions): WildPlan {
  const { kind, size, seed } = options;
  const carved = kind === 'dungeon' || kind === 'cave';
  const tooSmall = Math.min(size.width, size.depth) < MIN_CARVED_SIDE;
  const canvas = canvasFor(size, deriveSeed(seed, WILD_KINDS.indexOf(kind)), null);
  const features =
    carved && tooSmall ? planOpenFloor(canvas, SMALL_MAP_FLOOR[kind]) : PLANNERS[kind](canvas);
  return { size, kind, tiles: canvas.tiles, walls: canvas.walls, pieces: canvas.pieces, features };
}

const AMBIENCE: Readonly<
  Record<WildKind, { preset?: string; fogColor?: string; light?: number; backdrop: Backdrop }>
> = {
  dungeon: { preset: 'masmorra', backdrop: 'dungeon' },
  cave: { preset: 'caverna', fogColor: '#0c0908', light: 0.5, backdrop: 'dungeon' },
  desert: { light: 1, backdrop: 'desert' },
  port: { light: 1, backdrop: 'sea' },
};

function headerFor(kind: WildKind): MapHeader {
  const header = createDefaultHeader();
  return { ...header, ambience: { ...header.ambience, ...AMBIENCE[kind] } };
}

export type GeneratedWilds = { readonly model: MapModel; readonly stats: GenerationStats };

export function buildWilds(plan: WildPlan): GeneratedWilds {
  const assembler = createAssembler(plan.size);
  for (const wall of plan.walls) assembler.addWall(wall);
  for (const piece of plan.pieces) {
    const { key, ...placement } = piece;
    assembler.addPiece({ asset: { source: 'catalog', key }, level: 0, ...placement });
  }
  const { keys, index } = createTileKeys();
  const tiles = new Uint16Array(plan.tiles.length);
  plan.tiles.forEach((tile, cell) => {
    tiles[cell] = index(tile);
  });
  const { model, walls, pieces, dropped } = assembler.finish({ keys, tiles }, headerFor(plan.kind));
  return { model, stats: { buildings: plan.features, walls, pieces, dropped } };
}

/** Masmorra, caverna ou deserto do tamanho pedido. Mesmo tipo, tamanho e semente: o mesmo mapa. */
export function generateWilds(options: WildOptions): GeneratedWilds {
  const { size } = options;
  if (!isValidMapSizeV2(size)) {
    throw new RangeError(
      `Tamanho ${size.width}×${size.depth} inválido: use de 1 a ${MAX_MAP_SIZE_V2} casas por lado.`,
    );
  }
  return buildWilds(planWilds(options));
}

export type MapGenerationOptions = {
  readonly kind: MapKind;
  /** Só vale para vila ou cidade. */
  readonly style: SettlementStyle;
  readonly size: GridSize;
  readonly seed: number;
};

/** Ponto único do formulário: escolhe o gerador pelo tipo de mapa. */
export function generateMap(options: MapGenerationOptions): GeneratedWilds {
  const { kind, style, size, seed } = options;
  return isWildKind(kind)
    ? generateWilds({ kind, size, seed })
    : generateSettlement({ style, size, seed });
}
