/**
 * Cemitério da Colina (pedido do usuário em 26/11: "mais mapas"): cemitério de vila cercado por
 * grade de ferro, para a noite de mortos-vivos, a cova violada ou o vampiro no mausoléu. O
 * portão abre ao sul; a alameda de lanternas sobe até o mausoléu ao norte e cruza a trilha de
 * leste a oeste. Quatro quadras de túmulos, a cabana do coveiro com os caixões, a horta de
 * abóboras e, a leste, a cova aberta com os ossos espalhados.
 *
 * As peças de cemitério vêm do pacote KayKit Halloween Bits (CC0), em public/assets/graveyard.
 */
import type { Cell } from '../../grid';
import { STORY_HEIGHT_STEPS, type CellRect, type MapWall } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createPlacer, type Place } from './placer';
import { createSketch, type Sketch } from './sketch';

export const GRAVEYARD_SIZE = { width: 40, depth: 40 } as const;

const TILE = {
  grass: 'grama',
  path: 'terra',
  mud: 'lama',
  floor: 'med-assoalho-escuro',
} as const;
const WALL = {
  plain: 'med-parede-rustica',
  door: 'med-rustica-porta',
  window: 'med-rustica-janela',
} as const;
const PIECE = {
  grave: 'kay-cova',
  openGrave: 'kay-cova-aberta',
  tomb: 'kay-tumulo',
  headstone: 'kay-lapide',
  cross: 'kay-cruz-tumulo',
  coffin: 'kay-caixao',
  closedCoffin: 'kay-caixao-ornado',
  crypt: 'kay-mausoleu',
  shrine: 'kay-santuario',
  gate: 'kay-portao-cemiterio',
  fence: 'kay-grade-ferro',
  brokenFence: 'kay-grade-quebrada',
  jackLantern: 'kay-abobora-lanterna',
  pumpkin: 'kay-abobora',
  deadTree: 'kay-arvore-morta',
  thinTree: 'kay-arvore-seca',
  pine: 'kay-pinheiro-outono',
  lantern: 'kay-lanterna',
  lampPost: 'kay-poste-lanterna',
  skullPost: 'kay-estaca-caveira',
  bench: 'kay-banco-cemiterio',
  skullCandle: 'kay-caveira-vela',
  ribs: 'kay-costelas',
  bone: 'kay-ossos',
  strawBed: 'kay-cama-palha',
  shelf: 'kay-estante',
  table: 'kay-mesinha',
  stool: 'kay-banquinho',
  barrel: 'barril',
  statue: 'estatua',
  pillar: 'pilar',
} as const;

/** A grade: cantos de dentro do retângulo cercado. */
const FENCE = { x0: 3, z0: 4, x1: 36, z1: 35 };
/** Colunas do portão e da alameda que sobe até o mausoléu. */
const GATE_X = 19;
const AISLE: CellRect = { x: 19, z: 11, width: 2, depth: 29 };
const CROSS_PATH: CellRect = { x: 4, z: 20, width: 32, depth: 2 };
const CRYPT_CELL: Cell = { x: 18, z: 7 };
/** A cabana do coveiro, no canto sudoeste de dentro da grade. */
const HUT: CellRect = { x: 5, z: 26, width: 6, depth: 7 };
const HUT_DOOR_Z = 29;
const PUMPKIN_PATCH: CellRect = { x: 5, z: 23, width: 6, depth: 2 };
/** Uma grade em tantas é a quebrada. */
const BROKEN_EVERY = 5;

/** Quartos de volta: a frente olha para +z (0) ou para -z (2); um quarto deita a grade. */
const TURN = { south: 0, quarter: 1, north: 2 } as const;

/** Quadras de túmulos: colunas e linhas das lápides (de duas em duas, de três em três). */
const PLOTS: readonly { xs: readonly number[]; zs: readonly number[] }[] = [
  { xs: [6, 8, 10, 12, 14, 16], zs: [8, 11, 14, 17] },
  { xs: [23, 25, 27, 29, 31, 33], zs: [8, 11, 14, 17] },
  { xs: [13, 15, 17], zs: [24, 27, 30, 33] },
  { xs: [23, 25, 27, 29, 31, 33], zs: [24, 27, 30, 33] },
];
const GRAVE_KINDS = [PIECE.grave, PIECE.tomb, PIECE.headstone, PIECE.cross, PIECE.grave] as const;
/** Lápide de cada casa, de uma conta fixa (o mesmo mapa toda vez, sem sorteio). */
const graveAt = (cell: Cell) => GRAVE_KINDS[(cell.x * 7 + cell.z * 3) % GRAVE_KINDS.length]!;

function wall(sketch: Sketch, edge: Pick<MapWall, 'x' | 'z' | 'side'>, style: string): void {
  sketch.wall({ ...edge, style, level: 0, height: STORY_HEIGHT_STEPS });
}

/** A cabana do coveiro: madeira rústica, a porta a leste e uma janela em cada lado. */
function raiseHut(sketch: Sketch): void {
  const { x: x0, z: z0, width, depth } = HUT;
  for (let x = x0; x < x0 + width; x += 1) {
    const window = x === x0 + 2 ? WALL.window : WALL.plain;
    wall(sketch, { x, z: z0, side: 'north' }, window);
    wall(sketch, { x, z: z0 + depth, side: 'north' }, window);
  }
  for (let z = z0; z < z0 + depth; z += 1) {
    wall(sketch, { x: x0, z, side: 'west' }, z === z0 + 3 ? WALL.window : WALL.plain);
    wall(sketch, { x: x0 + width, z, side: 'west' }, z === HUT_DOOR_Z ? WALL.door : WALL.plain);
  }
}

/** A grade de ferro em volta, com o portão ao sul e uma grade quebrada de vez em quando. */
function raiseFence(place: Place): void {
  const fence = (count: number) => (count % BROKEN_EVERY === 3 ? PIECE.brokenFence : PIECE.fence);
  let count = 0;
  for (let x = FENCE.x0; x <= FENCE.x1; x += 2) {
    place(fence((count += 1)), { x, z: FENCE.z0 });
    if (x === GATE_X) place(PIECE.gate, { x, z: FENCE.z1 });
    else place(fence((count += 1)), { x, z: FENCE.z1 });
  }
  for (let z = FENCE.z0 + 1; z < FENCE.z1; z += 2) {
    place(fence((count += 1)), { x: FENCE.x0, z }, TURN.quarter);
    place(fence((count += 1)), { x: FENCE.x1, z }, TURN.quarter);
  }
}

/** As quatro quadras; a cova violada da quadra leste fica aberta, com os ossos em volta. */
function buryTheDead(place: Place): void {
  const openGrave: Cell = { x: 31, z: 27 };
  for (const { xs, zs } of PLOTS) {
    for (const z of zs) {
      for (const x of xs) {
        const cell = { x, z };
        const open = x === openGrave.x && z === openGrave.z;
        place(open ? PIECE.openGrave : graveAt(cell), cell);
      }
    }
  }
  place(PIECE.ribs, { x: 31, z: 28 });
  place(PIECE.bone, { x: 32, z: 28 });
  place(PIECE.bone, { x: 30, z: 26 });
  place(PIECE.coffin, { x: 31, z: 29 }, TURN.quarter);
  place(PIECE.lantern, { x: 33, z: 29 });
}

/** O mausoléu ao norte, entre os pilares, a estátua atrás e os dois santuários de velas. */
function raiseCrypt(place: Place): void {
  place(PIECE.crypt, CRYPT_CELL);
  place(PIECE.statue, { x: 19, z: 5 });
  place(PIECE.pillar, { x: 17, z: 7 });
  place(PIECE.pillar, { x: 21, z: 7 });
  place(PIECE.shrine, { x: 17, z: 10 });
  place(PIECE.shrine, { x: 21, z: 10 });
  place(PIECE.skullCandle, { x: 18, z: 11 });
}

/** A alameda: postes de lanterna dos dois lados e os bancos no cruzamento. */
function lightTheAisle(place: Place): void {
  for (const z of [13, 17, 24, 30]) {
    place(PIECE.lampPost, { x: 18, z });
    place(PIECE.lampPost, { x: 21, z });
  }
  place(PIECE.bench, { x: 17, z: 22 }, TURN.north);
  place(PIECE.bench, { x: 22, z: 22 }, TURN.north);
  place(PIECE.lampPost, { x: 18, z: 36 });
  place(PIECE.lampPost, { x: 21, z: 36 });
  place(PIECE.skullPost, { x: 17, z: 37 });
  place(PIECE.skullPost, { x: 22, z: 37 });
}

/** A cabana: cama de palha, os caixões à espera, a mesa do coveiro e a estante. */
function furnishHut(place: Place): void {
  place(PIECE.strawBed, { x: 6, z: 27 });
  place(PIECE.shelf, { x: 8, z: 26 });
  place(PIECE.coffin, { x: 10, z: 26 });
  place(PIECE.closedCoffin, { x: 10, z: 30 });
  place(PIECE.table, { x: 7, z: 30 });
  place(PIECE.stool, { x: 7, z: 31 });
  place(PIECE.lantern, { x: 6, z: 32 });
  place(PIECE.barrel, { x: 5, z: 32 });
}

/** A horta de abóboras da frente da cabana e as árvores mortas de dentro e de fora da grade. */
function plant(place: Place): void {
  for (let x = PUMPKIN_PATCH.x; x < PUMPKIN_PATCH.x + PUMPKIN_PATCH.width; x += 1) {
    place(x % 3 === 0 ? PIECE.jackLantern : PIECE.pumpkin, { x, z: PUMPKIN_PATCH.z });
  }
  for (const [x, z] of [
    [4, 6],
    [35, 6],
    [4, 18],
    [35, 23],
  ] as const) {
    place(PIECE.deadTree, { x, z });
  }
  for (const [x, z] of [
    [11, 22],
    [27, 22],
    [35, 33],
  ] as const) {
    place(PIECE.thinTree, { x, z });
  }
  for (const [x, z] of [
    [0, 8],
    [37, 12],
    [0, 24],
    [37, 28],
    [8, 0],
    [28, 0],
    [6, 37],
    [30, 37],
  ] as const) {
    place(PIECE.pine, { x, z });
  }
}

/** O chão: grama, as trilhas de terra, a lama perto da cova violada e o assoalho da cabana. */
function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...GRAVEYARD_SIZE }, TILE.grass);
  sketch.ground(CROSS_PATH, TILE.path);
  sketch.ground(AISLE, TILE.path);
  sketch.ground(PUMPKIN_PATCH, TILE.path);
  sketch.ground({ x: 11, z: 28, width: 8, depth: 2 }, TILE.path);
  sketch.ground({ x: 29, z: 25, width: 5, depth: 5 }, TILE.mud);
  sketch.ground(HUT, TILE.floor);
}

export function buildGraveyardMap(): AssembledMap {
  const sketch = createSketch(GRAVEYARD_SIZE, null);
  lay(sketch);
  raiseHut(sketch);
  const place = createPlacer(sketch);
  raiseFence(place);
  raiseCrypt(place);
  buryTheDead(place);
  lightTheAisle(place);
  furnishHut(place);
  plant(place);
  const header = styleHeader(STYLE_KITS.medieval);
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'floresta', light: 0.7, backdrop: 'forest' },
  });
}
