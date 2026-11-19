/**
 * Navio de guerra do tamanho do mapa (RPG-62), montado à mão para jogar dentro: porão com redes
 * dos marujos, carga e cela; convés com dois mastros, canhões dos dois lados e escotilhas;
 * cabine do capitão na popa com o tombadilho em cima (timão e mastro de mezena); gurupés na
 * proa. Proa para +z (sul), como os barcos do catálogo.
 *
 * Escala: o boneco tem 1,5 de altura; o porão e a cabine têm um andar (4 degraus, ~2,3 m) e o
 * casco passa meio metro do convés, a amurada.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, rectCells, STORY_HEIGHT_STEPS } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { createSketch, outlineWalls, type Sketch, type WallBand } from './sketch';

export const SHIP_SIZE = { width: 27, depth: 46 } as const;

const CENTER_X = 13;
/** Linha da popa (a primeira do casco) e da ponta da proa. */
const STERN_Z = 6;
const BOW_Z = 39;
/** Fim da cabine do capitão: daí para a proa é convés aberto. */
const CABIN_END_Z = 10;

/** Degraus de cada piso: porão no nível da água, convés um andar acima, tombadilho mais um. */
const HOLD = 0;
const DECK = STORY_HEIGHT_STEPS;
const QUARTERDECK = 2 * STORY_HEIGHT_STEPS;
/** A amurada sobe um degrau acima do piso. */
const RAIL = 1;

const TILE = {
  sea: 'agua',
  hold: 'med-assoalho-escuro',
  deck: 'med-assoalho-claro',
} as const;

const WALL = {
  hull: 'parede-madeira',
  cabin: 'med-parede-rustica',
  cabinDoor: 'med-rustica-porta',
  cabinWindow: 'med-rustica-janela',
  bars: 'grade',
} as const;

const PIECE = {
  mast: 'nav-mastro',
  wheel: 'nav-timao',
  cannon: 'nav-canhao',
  bowsprit: 'nav-gurupes',
  hammock: 'nav-rede',
  stairs: 'med-escada-interna',
  barrel: 'barril',
  crate: 'caixa',
  bigCrate: 'med-caixote',
  chest: 'bau',
  table: 'mesa',
  chair: 'cadeira',
  bed: 'mod-cama',
  shelf: 'mod-estante',
  torch: 'tocha',
} as const;

/** Giro de quem olha para +x (boreste) e para -x (bombordo). */
const FACE_EAST = 1;
const FACE_WEST = 3;
const FACE_NORTH = 2;

/** Meia largura do casco (em casas, além da coluna do meio) em cada linha: popa reta, proa fina. */
function halfBeam(z: number): number | null {
  if (z < STERN_Z || z > BOW_Z) return null;
  if (z <= CABIN_END_Z) return 3;
  if (z <= 30) return 4;
  if (z <= 33) return 3;
  if (z <= 36) return 2;
  if (z <= 38) return 1;
  return 0;
}

function hullCells(): Cell[] {
  const cells: Cell[] = [];
  for (let z = STERN_Z; z <= BOW_Z; z += 1) {
    const half = halfBeam(z)!;
    for (let x = CENTER_X - half; x <= CENTER_X + half; x += 1) cells.push({ x, z });
  }
  return cells;
}

const isCabin = (cell: Cell) => cell.z <= CABIN_END_Z;

/** Escotilhas: a escada do porão sobe para -z e chega ao convés na casa antes do vão. */
const HATCHES: readonly Cell[] = [
  { x: CENTER_X, z: 14 },
  { x: CENTER_X, z: 28 },
];
/** Escadas do convés para o tombadilho, encostadas na frente da cabine. */
const QUARTER_STAIRS: readonly Cell[] = [
  { x: CENTER_X - 3, z: CABIN_END_Z + 1 },
  { x: CENTER_X + 3, z: CABIN_END_Z + 1 },
];
const STAIR_LENGTH = 3;

const stairCells = (start: Cell) =>
  Array.from({ length: STAIR_LENGTH }, (_, dz) => ({ x: start.x, z: start.z + dz }));

/** Casco: tábuas do porão até a amurada; na popa, sobe com a cabine e o tombadilho. */
function hullBands(cell: Cell): WallBand[] {
  if (!isCabin(cell)) return [{ style: WALL.hull, level: HOLD, height: DECK + RAIL }];
  const cabinWall = cell.z === STERN_Z + 2 ? WALL.cabinWindow : WALL.cabin;
  return [
    { style: WALL.hull, level: HOLD, height: DECK },
    { style: cabinWall, level: DECK, height: STORY_HEIGHT_STEPS },
    { style: WALL.hull, level: QUARTERDECK, height: RAIL },
  ];
}

function buildHull(sketch: Sketch, hull: readonly Cell[]): void {
  for (const cell of hull) sketch.ground({ ...cell, width: 1, depth: 1 }, TILE.hold, HOLD);
  outlineWalls(sketch, hull, hullBands);
  const holes = new Set([...HATCHES.flatMap(stairCells)].map((cell) => `${cell.x},${cell.z}`));
  sketch.deck(
    hull.filter((cell) => !holes.has(`${cell.x},${cell.z}`)),
    TILE.deck,
    DECK,
  );
  for (const hatch of HATCHES) sketch.piece(PIECE.stairs, hatch, { level: HOLD });
}

/** Cabine do capitão (popa, no nível do convés) e o tombadilho por cima dela. */
function buildCabin(sketch: Sketch): void {
  const front = CABIN_END_Z + 1;
  const half = halfBeam(CABIN_END_Z)!;
  for (let x = CENTER_X - half; x <= CENTER_X + half; x += 1) {
    const style =
      x === CENTER_X
        ? WALL.cabinDoor
        : Math.abs(x - CENTER_X) === 2
          ? WALL.cabinWindow
          : WALL.cabin;
    sketch.wall({ x, z: front, side: 'north', style, level: DECK, height: STORY_HEIGHT_STEPS });
    // Parapeito do tombadilho, aberto onde as escadas chegam.
    if (QUARTER_STAIRS.some((stairs) => stairs.x === x)) continue;
    sketch.wall({ x, z: front, side: 'north', style: WALL.hull, level: QUARTERDECK, height: RAIL });
  }
  const roof = rectCells({
    x: CENTER_X - half,
    z: STERN_Z,
    width: 2 * half + 1,
    depth: CABIN_END_Z - STERN_Z + 1,
  });
  sketch.deck(roof, TILE.deck, QUARTERDECK);
  for (const stairs of QUARTER_STAIRS) sketch.piece(PIECE.stairs, stairs, { level: DECK });

  // Dentro da cabine: cama encostada na popa, mesa de cartas no meio, baú e estante.
  sketch.piece(PIECE.bed, { x: CENTER_X - half, z: STERN_Z }, { level: DECK });
  sketch.piece(PIECE.shelf, { x: CENTER_X - 1, z: STERN_Z }, { level: DECK });
  sketch.piece(PIECE.shelf, { x: CENTER_X, z: STERN_Z }, { level: DECK });
  sketch.piece(PIECE.chest, { x: CENTER_X + half, z: STERN_Z }, { level: DECK });
  sketch.piece(PIECE.table, { x: CENTER_X, z: STERN_Z + 2 }, { level: DECK });
  sketch.piece(PIECE.chair, { x: CENTER_X - 1, z: STERN_Z + 2 }, { level: DECK, rotation: 1 });
  sketch.piece(PIECE.chair, { x: CENTER_X + 1, z: STERN_Z + 2 }, { level: DECK, rotation: 3 });
  sketch.piece(PIECE.chair, { x: CENTER_X, z: STERN_Z + 3 }, { level: DECK, rotation: 2 });
  sketch.piece(PIECE.torch, { x: CENTER_X + half, z: CABIN_END_Z }, { level: DECK });

  // Tombadilho: mastro de mezena e o timão olhando para a proa.
  sketch.piece(PIECE.mast, { x: CENTER_X, z: STERN_Z + 1 }, { level: QUARTERDECK });
  sketch.piece(PIECE.wheel, { x: CENTER_X, z: STERN_Z + 3 }, { level: QUARTERDECK });
}

const CANNON_ROWS: readonly number[] = [14, 17, 20, 23, 26, 29];
const MAST_ROWS: readonly number[] = [19, 32];

/** Convés aberto: mastros no meio, canhões nas duas amuradas, carga solta e o gurupés. */
function buildDeck(sketch: Sketch): void {
  for (const z of MAST_ROWS) sketch.piece(PIECE.mast, { x: CENTER_X, z }, { level: DECK });
  for (const z of CANNON_ROWS) {
    const half = halfBeam(z)!;
    sketch.piece(PIECE.cannon, { x: CENTER_X - half, z }, { level: DECK, rotation: FACE_WEST });
    sketch.piece(PIECE.cannon, { x: CENTER_X + half, z }, { level: DECK, rotation: FACE_EAST });
  }
  const cargo: ReadonlyArray<[string, Cell]> = [
    [PIECE.barrel, { x: CENTER_X - 1, z: 20 }],
    [PIECE.barrel, { x: CENTER_X + 1, z: 20 }],
    [PIECE.crate, { x: CENTER_X - 1, z: 33 }],
    [PIECE.barrel, { x: CENTER_X + 1, z: 33 }],
    [PIECE.torch, { x: CENTER_X - 2, z: 24 }],
    [PIECE.torch, { x: CENTER_X + 2, z: 24 }],
  ];
  for (const [key, cell] of cargo) sketch.piece(key, cell, { level: DECK });
  sketch.piece(PIECE.bowsprit, { x: CENTER_X, z: BOW_Z }, { level: DECK });
}

/** Porão: redes dos marujos, carga, a cela de grades na proa e tochas. */
function buildHold(sketch: Sketch): void {
  for (const z of [17, 20, 23]) {
    for (const x of [CENTER_X - 4, CENTER_X - 2, CENTER_X + 2, CENTER_X + 4]) {
      sketch.piece(PIECE.hammock, { x, z }, { level: HOLD });
    }
  }
  sketch.piece(PIECE.chest, { x: CENTER_X - 3, z: 17 }, { level: HOLD });
  sketch.piece(PIECE.chest, { x: CENTER_X + 3, z: 20 }, { level: HOLD, rotation: FACE_NORTH });
  sketch.piece(PIECE.table, { x: CENTER_X - 3, z: 12 }, { level: HOLD });
  sketch.piece(PIECE.chair, { x: CENTER_X - 2, z: 12 }, { level: HOLD, rotation: FACE_WEST });
  // Antepara entre os marujos e a carga, com passagem no meio.
  for (let x = CENTER_X - 4; x <= CENTER_X + 4; x += 1) {
    if (x === CENTER_X) continue;
    sketch.wall({ x, z: 26, side: 'north', style: WALL.hull, level: HOLD, height: DECK });
  }
  const cargo: ReadonlyArray<[string, Cell]> = [
    [PIECE.bigCrate, { x: CENTER_X - 4, z: 26 }],
    [PIECE.bigCrate, { x: CENTER_X - 4, z: 27 }],
    [PIECE.barrel, { x: CENTER_X - 3, z: 26 }],
    [PIECE.barrel, { x: CENTER_X - 3, z: 27 }],
    [PIECE.crate, { x: CENTER_X - 2, z: 29 }],
    [PIECE.barrel, { x: CENTER_X + 3, z: 26 }],
    [PIECE.barrel, { x: CENTER_X + 4, z: 26 }],
    [PIECE.bigCrate, { x: CENTER_X + 4, z: 27 }],
    [PIECE.crate, { x: CENTER_X + 3, z: 29 }],
    [PIECE.barrel, { x: CENTER_X + 2, z: 31 }],
    [PIECE.barrel, { x: CENTER_X - 2, z: 31 }],
  ];
  for (const [key, cell] of cargo) sketch.piece(key, cell, { level: HOLD });
  // Paiol na popa, debaixo da cabine: pólvora e água doce longe da proa, onde bate o mar.
  const half = halfBeam(STERN_Z)!;
  for (let x = CENTER_X - half; x <= CENTER_X + half; x += 1) {
    sketch.piece(PIECE.barrel, { x, z: STERN_Z }, { level: HOLD });
    if (Math.abs(x - CENTER_X) >= 2)
      sketch.piece(PIECE.barrel, { x, z: STERN_Z + 1 }, { level: HOLD });
  }
  sketch.piece(PIECE.bigCrate, { x: CENTER_X - half, z: STERN_Z + 3 }, { level: HOLD });
  sketch.piece(PIECE.bigCrate, { x: CENTER_X + half, z: STERN_Z + 3 }, { level: HOLD });
  for (const cell of [
    { x: CENTER_X - 4, z: 12 },
    { x: CENTER_X + 3, z: 25 },
    { x: CENTER_X - 2, z: 33 },
  ]) {
    sketch.piece(PIECE.torch, cell, { level: HOLD });
  }
  // Cela na proa: grades na frente e dos lados, aberta para o casco.
  const brigFront = 35;
  for (let x = CENTER_X - 1; x <= CENTER_X + 1; x += 1) {
    sketch.wall({ x, z: brigFront, side: 'north', style: WALL.bars, level: HOLD, height: DECK });
  }
  for (const z of [brigFront, brigFront + 1]) {
    sketch.wall({ x: CENTER_X - 1, z, side: 'west', style: WALL.bars, level: HOLD, height: DECK });
    sketch.wall({ x: CENTER_X + 2, z, side: 'west', style: WALL.bars, level: HOLD, height: DECK });
  }
}

export function buildShipMap(): AssembledMap {
  const sketch = createSketch(SHIP_SIZE, TILE.sea);
  buildHull(sketch, hullCells());
  buildCabin(sketch);
  buildDeck(sketch);
  buildHold(sketch);
  const header = createDefaultHeader();
  return sketch.build({ ...header, ambience: { ...header.ambience, light: 1, backdrop: 'sea' } });
}
