/**
 * Profundezas de Ferro Negro (RPG-78, pedido do usuário em 26/11: "mais mapas, versões maiores"):
 * uma masmorra inteira num mapa 80×72, para uma noite de exploração. Ao norte, a escadaria que
 * desce da superfície chega ao salão de entrada; a oeste dele fica o depósito de terra batida e a
 * leste o alojamento dos guardas. No meio, o grande salão de banquetes com as duas fileiras de
 * pilares; dele saem a prisão de celas gradeadas (oeste) e o arsenal com o tesouro do senhor
 * (leste). Ao sul, a galeria das armadilhas leva ao covil, com o altar, os sarcófagos e o ouro.
 *
 * As peças vêm do pacote KayKit Dungeon Remastered (CC0) e das peças genéricas de masmorra.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, rectCells, STORY_HEIGHT_STEPS, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { createPlacer, type Place } from './placer';
import { createSketch, outlineWalls, type Sketch } from './sketch';

export const IRON_DEPTHS_SIZE = { width: 80, depth: 72 } as const;

const TILE = { stone: 'piso-pedra', dirt: 'terra' } as const;
const WALL = { stone: 'parede-pedra', bars: 'grade' } as const;
const PIECE = {
  pillar: 'kay-pilar-ornado',
  statue: 'estatua',
  torch: 'tocha',
  rock: 'rocha',
  crate: 'caixa',
  table: 'mesa',
  chair: 'cadeira',
  sarcophagus: 'mas-sarcofago',
  altar: 'mas-altar',
  bones: 'mas-ossos',
  mushrooms: 'nat-cogumelos',
  stairs: 'kay-escada-pedra',
  rubble: 'kay-entulho',
  smallRubble: 'kay-entulho-pequeno',
  spikes: 'kay-armadilha-chao',
  grate: 'kay-grade-chao',
  keys: 'kay-chaveiro',
  brokenArms: 'kay-espada-escudo-quebrados',
  goldArms: 'kay-espada-escudo-ouro',
  arms: 'kay-espada-escudo',
  chest: 'kay-bau-madeira',
  goldChest: 'kay-bau-ouro',
  trunk: 'kay-arca',
  coins: 'kay-moedas',
  coinPile: 'kay-pilha-moedas',
  tripleBanner: 'kay-estandarte-triplo',
  banner: 'kay-estandarte-vermelho',
  bigBarrel: 'kay-barril-grande',
  barrels: 'kay-barris',
  crates: 'kay-caixotes',
  boxes: 'kay-caixas',
  strawBed: 'kay-cama-palha',
  feastTable: 'kay-mesa-banquete',
  clothTable: 'kay-mesa-banquete-toalha',
  stool: 'kay-banquinho',
  shelves: 'kay-estante',
} as const;

/** As salas e os corredores que ligam cada uma ao salão. */
const ROOMS = {
  entrance: { x: 34, z: 2, width: 12, depth: 10 },
  northCorridor: { x: 38, z: 12, width: 4, depth: 6 },
  storePass: { x: 32, z: 7, width: 2, depth: 2 },
  storeroom: { x: 20, z: 4, width: 12, depth: 8 },
  barracksPass: { x: 46, z: 7, width: 2, depth: 2 },
  barracks: { x: 48, z: 4, width: 14, depth: 8 },
  hall: { x: 26, z: 18, width: 28, depth: 20 },
  westCorridor: { x: 16, z: 26, width: 10, depth: 4 },
  prison: { x: 2, z: 18, width: 14, depth: 20 },
  eastCorridor: { x: 54, z: 26, width: 10, depth: 4 },
  armory: { x: 64, z: 18, width: 14, depth: 20 },
  southCorridor: { x: 38, z: 38, width: 4, depth: 6 },
  gallery: { x: 30, z: 44, width: 20, depth: 8 },
  lairCorridor: { x: 38, z: 52, width: 4, depth: 4 },
  lair: { x: 22, z: 56, width: 36, depth: 14 },
} as const satisfies Record<string, CellRect>;

/** As celas da prisão: a grade corre ao longo da linha x da frente e as paredes as separam. */
const CELL_FRONT_X = 6;
const CELL_DIVIDERS_Z = [23, 28, 33] as const;

const at = (x: number, z: number): Cell => ({ x, z });

function placeAll(place: Place, piece: string, cells: readonly Cell[], rotation?: number): void {
  for (const cell of cells) place(piece, cell, rotation);
}

/** O chão de pedra em tudo, com o depósito de terra batida. */
function carve(sketch: Sketch): Cell[] {
  const area: Cell[] = [];
  for (const [name, rect] of Object.entries(ROOMS)) {
    sketch.ground(rect, name === 'storeroom' ? TILE.dirt : TILE.stone);
    area.push(...rectCells(rect));
  }
  return area;
}

/** A grade das celas e as paredes entre elas. */
function prisonWalls(sketch: Sketch): void {
  const { prison } = ROOMS;
  for (let z = prison.z; z < prison.z + prison.depth; z += 1) {
    sketch.wall({
      x: CELL_FRONT_X,
      z,
      side: 'west',
      style: WALL.bars,
      level: 0,
      height: STORY_HEIGHT_STEPS,
    });
  }
  for (const z of CELL_DIVIDERS_Z) {
    for (let x = prison.x; x < CELL_FRONT_X; x += 1) {
      sketch.wall({ x, z, side: 'north', style: WALL.stone, level: 0, height: STORY_HEIGHT_STEPS });
    }
  }
}

/** A entrada: a escadaria da superfície, as estátuas de guarda e o entulho de um desabamento. */
function furnishEntrance(place: Place): void {
  place(PIECE.stairs, at(38, 2));
  placeAll(place, PIECE.statue, [at(35, 3), at(44, 3)]);
  placeAll(place, PIECE.banner, [at(36, 2), at(43, 2)]);
  placeAll(place, PIECE.torch, [at(35, 10), at(44, 10)]);
  place(PIECE.smallRubble, at(35, 7));
  place(PIECE.bones, at(44, 8));
}

/** O depósito: caixotes, barris e o mofo de quem não arejava. */
function furnishStoreroom(place: Place): void {
  placeAll(place, PIECE.crates, [at(21, 5), at(24, 5)]);
  placeAll(place, PIECE.bigBarrel, [at(28, 5), at(29, 5), at(30, 5)]);
  place(PIECE.barrels, at(21, 10));
  place(PIECE.boxes, at(23, 10));
  placeAll(place, PIECE.crate, [at(27, 10), at(28, 10)]);
  place(PIECE.rock, at(30, 10));
  place(PIECE.mushrooms, at(25, 9));
  place(PIECE.torch, at(31, 4));
}

/** O alojamento: as camas de palha, a mesa dos guardas e as armas na parede. */
function furnishBarracks(place: Place): void {
  for (const x of [49, 51, 53, 55, 57, 59]) place(PIECE.strawBed, at(x, 4));
  for (const x of [49, 51, 53]) place(PIECE.strawBed, at(x, 10));
  place(PIECE.feastTable, at(56, 7));
  placeAll(place, PIECE.stool, [at(55, 8), at(58, 8)]);
  place(PIECE.arms, at(59, 10));
  place(PIECE.shelves, at(61, 7));
  place(PIECE.torch, at(61, 4));
}

/** O grande salão: as fileiras de pilares, as mesas do banquete e as estátuas da saída sul. */
function furnishHall(place: Place): void {
  for (const x of [29, 49]) {
    for (const z of [20, 24, 28, 32, 36]) place(PIECE.pillar, at(x, z));
  }
  placeAll(place, PIECE.tripleBanner, [at(32, 18), at(45, 18)]);
  placeAll(place, PIECE.clothTable, [at(34, 24), at(34, 29)]);
  placeAll(place, PIECE.feastTable, [at(44, 24), at(44, 29)]);
  placeAll(place, PIECE.stool, [
    at(33, 25),
    at(36, 25),
    at(33, 30),
    at(36, 30),
    at(43, 25),
    at(46, 25),
    at(43, 30),
    at(46, 30),
  ]);
  placeAll(place, PIECE.torch, [at(26, 18), at(53, 18), at(26, 37), at(53, 37)]);
  placeAll(place, PIECE.statue, [at(37, 36), at(42, 36)]);
  place(PIECE.bones, at(31, 34));
}

/** A prisão: os presos que sobraram nas celas e a mesa do carcereiro com o molho de chaves. */
function furnishPrison(place: Place): void {
  placeAll(place, PIECE.bones, [at(3, 19), at(4, 25), at(2, 30), at(11, 34)]);
  place(PIECE.strawBed, at(2, 34));
  place(PIECE.table, at(10, 20));
  place(PIECE.chair, at(10, 21), 2);
  place(PIECE.keys, at(14, 18));
  place(PIECE.chest, at(14, 20));
  placeAll(place, PIECE.bigBarrel, [at(13, 36), at(14, 36)]);
  place(PIECE.grate, at(9, 30));
  placeAll(place, PIECE.torch, [at(7, 18), at(7, 37), at(15, 24), at(15, 31)]);
}

/** O arsenal: as armas douradas na parede norte, os baús de ouro e os barris de pólvora. */
function furnishArmory(place: Place): void {
  placeAll(place, PIECE.goldArms, [at(66, 18), at(70, 18), at(74, 18)]);
  placeAll(place, PIECE.arms, [at(66, 37), at(70, 37)]);
  placeAll(place, PIECE.goldChest, [at(75, 30), at(75, 32)]);
  place(PIECE.chest, at(75, 34));
  place(PIECE.trunk, at(68, 30));
  place(PIECE.coins, at(73, 31));
  placeAll(place, PIECE.coinPile, [at(73, 33), at(76, 26)]);
  place(PIECE.crates, at(66, 23));
  placeAll(place, PIECE.bigBarrel, [at(70, 24), at(71, 24)]);
  place(PIECE.statue, at(76, 19));
  placeAll(place, PIECE.torch, [at(64, 18), at(77, 18), at(64, 37), at(77, 37)]);
}

/** A galeria das armadilhas: espetos no caminho, a grade do fosso e quem não passou. */
function furnishGallery(place: Place): void {
  placeAll(place, PIECE.spikes, [at(32, 45), at(38, 46), at(44, 45)]);
  place(PIECE.grate, at(35, 48));
  placeAll(place, PIECE.bones, [at(31, 50), at(48, 44)]);
  place(PIECE.brokenArms, at(47, 50));
  place(PIECE.rubble, at(42, 50));
  placeAll(place, PIECE.torch, [at(30, 44), at(49, 47)]);
}

/** O covil: o altar sob o estandarte, as duas fileiras de sarcófagos e o ouro espalhado. */
function furnishLair(place: Place): void {
  place(PIECE.altar, at(39, 66));
  placeAll(place, PIECE.statue, [at(37, 66), at(42, 66)]);
  place(PIECE.tripleBanner, at(38, 69));
  for (const x of [25, 28, 31, 48, 51, 54]) {
    for (const z of [58, 62]) place(PIECE.sarcophagus, at(x, z));
  }
  placeAll(place, PIECE.pillar, [at(33, 58), at(45, 58)]);
  placeAll(place, PIECE.coinPile, [at(34, 64), at(45, 64), at(36, 68), at(43, 68)]);
  place(PIECE.coins, at(44, 67));
  place(PIECE.goldChest, at(35, 67));
  place(PIECE.rubble, at(23, 66));
  place(PIECE.smallRubble, at(52, 66));
  placeAll(place, PIECE.bones, [at(30, 60), at(50, 60)]);
  place(PIECE.mushrooms, at(24, 62));
  placeAll(place, PIECE.torch, [at(22, 56), at(57, 56), at(22, 69), at(57, 69)]);
}

export function buildIronDepthsMap(): AssembledMap {
  const sketch = createSketch(IRON_DEPTHS_SIZE, null);
  const area = carve(sketch);
  outlineWalls(sketch, area, () => [{ style: WALL.stone, level: 0, height: STORY_HEIGHT_STEPS }]);
  prisonWalls(sketch);
  const place = createPlacer(sketch);
  furnishEntrance(place);
  furnishStoreroom(place);
  furnishBarracks(place);
  furnishHall(place);
  furnishPrison(place);
  furnishArmory(place);
  furnishGallery(place);
  furnishLair(place);
  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'masmorra', backdrop: 'dungeon' },
  });
}
