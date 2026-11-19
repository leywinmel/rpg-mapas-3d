/**
 * Areias do sol (RPG-63): deserto pensado à mão, com dunas em degraus. A noroeste, o oásis:
 * a água um degrau abaixo da grama, cercada de palmeiras; no meio, as ruínas de um templo
 * sobre um platô de pedra; a sudoeste, a caravana acampada; a sudeste, o rochedo que sobe em
 * degraus até o mirante.
 *
 * As dunas vêm de duas ondas fixas (sem sorteio, sempre iguais) e cada lugar plano se funde
 * nelas aos poucos, para nenhum passo subir mais de um degrau.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { createSketch, type SketchPiece } from './sketch';

export const DESERT_SIZE = { width: 48, depth: 48 } as const;

const TILE = {
  sand: 'areia',
  cracked: 'chao-rachado',
  stone: 'piso-pedra',
  grass: 'grama',
  water: 'agua',
  dirt: 'terra',
} as const;
const WALL_STYLE = 'parede-pedra';
const PIECE = {
  palm: 'nat-palmeira',
  cactus: 'nat-cacto',
  deadTree: 'nat-arvore-seca',
  grass: 'nat-capim',
  rock: 'rocha',
  boulder: 'nat-pedregulho',
  pebbles: 'nat-seixos',
  pillar: 'pilar',
  statue: 'estatua',
  bigStatue: 'pra-estatua-grande',
  obelisk: 'pra-obelisco',
  altar: 'mas-altar',
  bones: 'mas-ossos',
  chest: 'bau',
  wagon: 'med-carroca',
  campfire: 'cav-fogueira',
  log: 'nat-tronco',
  barrel: 'barril',
  crate: 'caixa',
  torch: 'tocha',
} as const;

/** As dunas: altura de base e o quanto cada onda sobe e desce. */
const DUNE = { base: 2.4, waveX: 1.4, periodX: 5.5, waveZ: 1.1, periodZ: 7 } as const;
const DUNE_MIN = 1;
const DUNE_MAX = 4;
/** Topo de duna acima disto vira chão rachado de sol. */
const CRACKED_ABOVE = 3.4;
/** Quantas casas a borda de um lugar plano leva para se fundir na duna. */
const BLEND = 3;

const OASIS = { cx: 11.5, cz: 12.5, water: 3.6, shore: 6.2 } as const;
const OASIS_HEIGHT = { water: 0, shore: 1 } as const;
const TEMPLE: CellRect = { x: 24, z: 10, width: 13, depth: 12 };
const TEMPLE_HEIGHT = 3;
const CAMP = { cx: 13.5, cz: 35.5, radius: 5 } as const;
const CAMP_HEIGHT = 1;
const HILL = { cx: 38.5, cz: 37.5, top: 8, radius: 2 } as const;

/** Paredes do templo em ruína: a altura de cada trecho e onde ele já caiu. */
const RUIN_WALL_MAX = 3;
const RUIN_GAP_EVERY = 5;

type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;

function duneHeight(x: number, z: number): number {
  return (
    DUNE.base +
    DUNE.waveX * Math.sin(x / DUNE.periodX + z / 11) +
    DUNE.waveZ * Math.cos(z / DUNE.periodZ - x / 13)
  );
}

/** Distância da casa até a borda de um retângulo (0 dentro dele). */
function rectDistance(rect: CellRect, x: number, z: number): number {
  const dx = Math.max(rect.x - x, 0, x - (rect.x + rect.width - 1));
  const dz = Math.max(rect.z - z, 0, z - (rect.z + rect.depth - 1));
  return Math.hypot(dx, dz);
}

/** Puxa a altura para `target` dentro do lugar e aos poucos na borda dele. */
function blendTo(height: number, target: number, distance: number): number {
  if (distance <= 0) return target;
  if (distance >= BLEND) return height;
  const weight = 1 - distance / BLEND;
  return height + (target - height) * weight;
}

/** Chão de cada casa do deserto: duna, oásis, platô do templo, acampamento e rochedo. */
export function desertFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (let z = 0; z < DESERT_SIZE.depth; z += 1) {
    for (let x = 0; x < DESERT_SIZE.width; x += 1) {
      const dune = duneHeight(x, z);
      let height = Math.min(Math.max(dune, DUNE_MIN), DUNE_MAX);
      let tile: string = dune > CRACKED_ABOVE ? TILE.cracked : TILE.sand;

      const oasis = Math.hypot(x + 0.5 - OASIS.cx, z + 0.5 - OASIS.cz);
      height = blendTo(height, OASIS_HEIGHT.shore, oasis - OASIS.shore);
      if (oasis <= OASIS.shore) tile = TILE.grass;

      const camp = Math.hypot(x + 0.5 - CAMP.cx, z + 0.5 - CAMP.cz);
      height = blendTo(height, CAMP_HEIGHT, camp - CAMP.radius);
      if (camp <= CAMP.radius) tile = TILE.dirt;

      const temple = rectDistance(TEMPLE, x, z);
      height = blendTo(height, TEMPLE_HEIGHT, temple);
      if (temple === 0) tile = TILE.stone;

      // O rochedo sobe um degrau por casa até o topo: escada natural, sem parede.
      const hill = Math.hypot(x + 0.5 - HILL.cx, z + 0.5 - HILL.cz) - HILL.radius;
      const slope = HILL.top - Math.max(hill, 0);
      if (slope > height) {
        height = slope;
        tile = TILE.cracked;
      }

      if (oasis <= OASIS.water) {
        floors.set(key({ x, z }), { tile: TILE.water, height: OASIS_HEIGHT.water });
        continue;
      }
      floors.set(key({ x, z }), { tile, height: Math.round(height) });
    }
  }
  return floors;
}

/** Paredes caídas do templo: cada trecho com a sua altura, e uma falha a cada poucas casas. */
function ruinWalls(sketch: ReturnType<typeof createSketch>): void {
  const { x: x0, z: z0, width, depth } = TEMPLE;
  const door = x0 + Math.floor(width / 2);
  const height = (x: number, z: number) => 1 + ((x * 5 + z * 3) % RUIN_WALL_MAX);
  const standing = (x: number, z: number) => (x + z * 2) % RUIN_GAP_EVERY !== 0;
  const band = (x: number, z: number) => ({
    style: WALL_STYLE,
    level: TEMPLE_HEIGHT,
    height: height(x, z),
  });
  for (let x = x0; x < x0 + width; x += 1) {
    if (standing(x, z0)) sketch.wall({ x, z: z0, side: 'north', ...band(x, z0) });
    const south = z0 + depth;
    if (Math.abs(x - door) > 1 && standing(x, south)) {
      sketch.wall({ x, z: south, side: 'north', ...band(x, south) });
    }
  }
  for (let z = z0; z < z0 + depth; z += 1) {
    if (standing(x0, z)) sketch.wall({ x: x0, z, side: 'west', ...band(x0, z) });
    const east = x0 + width;
    if (standing(east, z)) sketch.wall({ x: east, z, side: 'west', ...band(east, z) });
  }
}

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

function furnishOasis(place: Place): void {
  for (const [x, z] of [
    [7, 7],
    [15, 7],
    [17, 12],
    [16, 17],
    [10, 18],
    [5, 15],
    [6, 10],
  ] as const) {
    place(PIECE.palm, { x, z });
  }
  for (const [x, z] of [
    [12, 7],
    [6, 13],
    [14, 17],
  ] as const) {
    place(PIECE.grass, { x, z });
  }
  place(PIECE.rock, { x: 17, z: 15 });
}

/** O templo: duas fileiras de pilares, o altar ao fundo e a estátua grande guardando a porta. */
function furnishTemple(place: Place): void {
  for (const x of [26, 34]) {
    for (const z of [12, 15, 18]) place(PIECE.pillar, { x, z });
  }
  place(PIECE.altar, { x: 29, z: 11 });
  place(PIECE.statue, { x: 28, z: 11 });
  place(PIECE.statue, { x: 32, z: 11 });
  place(PIECE.obelisk, { x: 25, z: 20 });
  place(PIECE.obelisk, { x: 34, z: 20 });
  place(PIECE.chest, { x: 30, z: 13 }, { rotation: 2 });
  place(PIECE.bones, { x: 28, z: 16 });
  place(PIECE.bones, { x: 33, z: 13 });
  place(PIECE.pebbles, { x: 31, z: 17 });
  place(PIECE.rock, { x: 35, z: 16 });
  place(PIECE.torch, { x: 29, z: 20 });
  place(PIECE.torch, { x: 31, z: 20 });
  place(PIECE.bigStatue, { x: 29, z: 24 });
}

/** A caravana: a carroça, a fogueira com os troncos e a carga descarregada. */
function furnishCamp(place: Place): void {
  place(PIECE.wagon, { x: 9, z: 32 });
  place(PIECE.campfire, { x: 14, z: 35 });
  place(PIECE.log, { x: 13, z: 33 });
  place(PIECE.log, { x: 13, z: 37 });
  place(PIECE.log, { x: 16, z: 35 }, { rotation: 1 });
  for (const [x, z] of [
    [9, 36],
    [10, 37],
    [11, 37],
  ] as const) {
    place(PIECE.barrel, { x, z });
  }
  place(PIECE.crate, { x: 12, z: 31 });
  place(PIECE.crate, { x: 13, z: 31 });
  place(PIECE.chest, { x: 17, z: 33 }, { rotation: 3 });
  place(PIECE.torch, { x: 18, z: 37 });
}

/** O rochedo: pedras na encosta e o mirante no topo. */
function furnishHill(place: Place): void {
  place(PIECE.torch, { x: 38, z: 37 });
  place(PIECE.chest, { x: 39, z: 38 });
  for (const [x, z] of [
    [34, 33],
    [43, 35],
    [36, 42],
  ] as const) {
    place(PIECE.boulder, { x, z });
  }
  place(PIECE.rock, { x: 41, z: 33 });
  place(PIECE.rock, { x: 34, z: 39 });
}

/** O resto do deserto: cactos, árvores secas, pedras e ossos espalhados à mão. */
function furnishDunes(place: Place): void {
  for (const [x, z] of [
    [3, 26],
    [22, 4],
    [40, 5],
    [44, 20],
    [21, 30],
    [27, 42],
    [5, 44],
    [42, 26],
    [23, 38],
    [3, 3],
  ] as const) {
    place(PIECE.cactus, { x, z });
  }
  for (const [x, z] of [
    [20, 23],
    [44, 10],
    [28, 33],
  ] as const) {
    place(PIECE.deadTree, { x, z });
  }
  for (const [x, z] of [
    [8, 24],
    [39, 24],
    [18, 44],
    [45, 45],
    [33, 3],
  ] as const) {
    place(PIECE.rock, { x, z });
  }
  place(PIECE.bones, { x: 24, z: 28 });
  place(PIECE.bones, { x: 41, z: 15 });
  place(PIECE.pebbles, { x: 19, z: 8 });
}

export function buildDesertMap(): AssembledMap {
  const sketch = createSketch(DESERT_SIZE, null);
  const floors = desertFloors();
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    sketch.ground({ x: x!, z: z!, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  ruinWalls(sketch);
  const place: Place = (piece, cell, options = {}) => {
    const floor = floors.get(key(cell));
    if (!floor) throw new Error(`Peça ${piece} fora do deserto em ${key(cell)}.`);
    sketch.piece(piece, cell, { ...options, level: floor.height });
  };
  furnishOasis(place);
  furnishTemple(place);
  furnishCamp(place);
  furnishHill(place);
  furnishDunes(place);
  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, light: 1, backdrop: 'desert' },
  });
}
