/**
 * Enseada do Corsário (RPG-84, pedido do usuário em 26/11: "mais mapas, versões maiores"): o
 * refúgio dos piratas num mapa 104×88. O mar fecha o sul e entra pela doca, onde o navio dos
 * corsários está atracado entre os dois píeres; outros dois navios esperam ao largo. Ao norte do
 * cais, a vila: a rua principal com a taverna, o armazém e as casas; a ruína velha no alto. A leste,
 * o forte de pedra com o quartel, a torre de vigia e a fileira de canhões apontada para o mar. Na
 * praia oeste, o acampamento com tendas e fogueira; na praia leste, o tesouro enterrado.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, STORY_HEIGHT_STEPS, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import type { BuildingUse } from '../blueprint';
import { createPlacer } from './placer';
import { createSketch, stampBuildings, type Sketch, type SketchBuilding } from './sketch';

export const CORSAIR_COVE_SIZE = { width: 104, depth: 88 } as const;

const TILE = {
  sand: 'areia',
  dirt: 'terra',
  water: 'agua',
  planks: 'piso-madeira',
  stone: 'piso-pedra',
} as const;
const WALL_STYLE = 'parede-pedra';
const PIECE = {
  ship: 'med-navio',
  boat: 'med-bote',
  cannon: 'nav-canhao',
  net: 'nav-rede',
  tower: 'kay-torre-vigia',
  ruin: 'kay-ruina',
  banner: 'kay-estandarte-vermelho',
  tent: 'kay-tenda',
  campfire: 'cav-fogueira',
  chest: 'bau',
  coins: 'kay-pilha-moedas',
  skull: 'kay-cranio',
  dugHole: 'kay-cova-terra',
  barrel: 'barril',
  crate: 'med-caixote',
  torch: 'tocha',
  lamp: 'kay-poste-lanterna',
  palm: 'nat-palmeira',
  rock: 'rocha',
  grassTuft: 'nat-capim',
} as const;

/** O mar, a doca, o cais, os dois píeres, as ruas e o pátio do forte. */
const SEA: CellRect = { x: 0, z: 62, width: 104, depth: 26 };
const HARBOR: CellRect = { x: 40, z: 46, width: 16, depth: 16 };
const QUAY: CellRect = { x: 30, z: 42, width: 36, depth: 4 };
const WEST_PIER: CellRect = { x: 36, z: 46, width: 4, depth: 30 };
const EAST_PIER: CellRect = { x: 56, z: 46, width: 4, depth: 30 };
const MAIN_STREET: CellRect = { x: 0, z: 22, width: 78, depth: 4 };
const HARBOR_STREET: CellRect = { x: 46, z: 0, width: 4, depth: 42 };
const FORT: CellRect = { x: 78, z: 4, width: 24, depth: 30 };
/** O portão do forte, no muro oeste, na saída da rua principal. */
const FORT_GATE = { from: MAIN_STREET.z, to: MAIN_STREET.z + MAIN_STREET.depth - 1 } as const;

/** Giro da planta: a porta fica ao norte (0), oeste (1), sul (2) ou leste (3). */
const DOOR = { north: 0, west: 1, south: 2, east: 3 } as const;
/** Lado das casas comuns da vila. */
const HOUSE_SIDE = 6;

type Plan = {
  readonly x: number;
  readonly z: number;
  readonly door: number;
  readonly width?: number;
  readonly depth?: number;
  readonly stories?: number;
  readonly use?: BuildingUse;
};

function coveBuildings(): SketchBuilding[] {
  const plans: Plan[] = [
    // A fileira norte da rua principal, de porta para a rua.
    ...[4, 12, 20, 28, 36, 54, 62].map((x, i) => ({
      x,
      z: 12,
      door: DOOR.south,
      stories: i % 3 === 1 ? 2 : 1,
    })),
    // A fileira sul: casas, a taverna, o armazém do porto.
    { x: 4, z: 28, door: DOOR.north },
    { x: 12, z: 28, door: DOOR.north, stories: 2 },
    { x: 24, z: 28, door: DOOR.north, width: 12, depth: 8, stories: 2, use: 'shop' },
    { x: 38, z: 28, door: DOOR.north },
    { x: 52, z: 28, door: DOOR.north, width: 10, depth: 8, use: 'shop' },
    { x: 64, z: 28, door: DOOR.north },
    // O quartel do forte, de porta para o pátio.
    { x: 82, z: 6, door: DOOR.south, width: 10, depth: 6, stories: 2 },
  ];
  return plans.map((plan, i) => ({
    style: 'medieval',
    use: plan.use ?? 'house',
    x: plan.x,
    z: plan.z,
    width: plan.width ?? HOUSE_SIDE,
    depth: plan.depth ?? HOUSE_SIDE,
    stories: plan.stories ?? 1,
    rotation: plan.door,
    level: 0,
    variant: i + 1,
  }));
}

function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...CORSAIR_COVE_SIZE }, TILE.sand);
  sketch.ground(MAIN_STREET, TILE.dirt);
  sketch.ground(HARBOR_STREET, TILE.dirt);
  sketch.ground(FORT, TILE.stone);
  sketch.ground(SEA, TILE.water);
  sketch.ground(HARBOR, TILE.water);
  for (const deck of [QUAY, WEST_PIER, EAST_PIER]) sketch.ground(deck, TILE.planks);
}

/** O muro de pedra do forte, aberto no portão oeste. */
function fortWalls(sketch: Sketch): void {
  const band = { style: WALL_STYLE, level: 0, height: STORY_HEIGHT_STEPS };
  const { x: x0, z: z0, width, depth } = FORT;
  for (let x = x0; x < x0 + width; x += 1) {
    sketch.wall({ x, z: z0, side: 'north', ...band });
    sketch.wall({ x, z: z0 + depth, side: 'north', ...band });
  }
  for (let z = z0; z < z0 + depth; z += 1) {
    if (z < FORT_GATE.from || z > FORT_GATE.to) sketch.wall({ x: x0, z, side: 'west', ...band });
    sketch.wall({ x: x0 + width, z, side: 'west', ...band });
  }
}

const inside = (cell: Cell, r: CellRect) =>
  cell.x >= r.x && cell.x < r.x + r.width && cell.z >= r.z && cell.z < r.z + r.depth;
const at = (x: number, z: number): Cell => ({ x, z });
/** Só o que flutua ou fica de pé no fundo vai para a água. */
const AFLOAT = new Set<string>([PIECE.ship, PIECE.boat, PIECE.rock]);

export function buildCorsairCoveMap(): AssembledMap {
  const sketch = createSketch(CORSAIR_COVE_SIZE, null);
  lay(sketch);
  fortWalls(sketch);
  const indoors = stampBuildings(sketch, coveBuildings());
  const placer = createPlacer(sketch);
  const place = (piece: string, cells: readonly Cell[]) => {
    for (const cell of cells) {
      if (indoors.has(`${cell.x},${cell.z}`))
        throw new Error(`${piece} dentro de casa em ${cell.x},${cell.z}.`);
      const wet =
        [SEA, HARBOR].some((r) => inside(cell, r)) &&
        ![WEST_PIER, EAST_PIER].some((r) => inside(cell, r));
      if (wet !== AFLOAT.has(piece))
        throw new Error(`${piece} fora do lugar (água?) em ${cell.x},${cell.z}.`);
      placer(piece, cell);
    }
  };

  // Os navios: o dos corsários atracado na doca e dois ao largo; os botes junto dos píeres.
  place(PIECE.ship, [at(44, 50), at(66, 68), at(20, 70)]);
  place(PIECE.boat, [at(41, 48), at(54, 47), at(41, 57), at(53, 56), at(34, 66), at(61, 64)]);
  place(PIECE.rock, [at(5, 80), at(95, 78), at(82, 85), at(50, 84)]);
  // O cais: barris, caixotes, redes e lanternas.
  place(PIECE.barrel, [
    at(31, 42),
    at(32, 42),
    at(31, 43),
    at(63, 42),
    at(64, 42),
    at(38, 74),
    at(57, 74),
  ]);
  place(PIECE.crate, [at(34, 43), at(35, 43), at(60, 43), at(61, 43), at(58, 60)]);
  place(PIECE.net, [at(37, 52), at(58, 50)]);
  place(PIECE.lamp, [at(30, 41), at(40, 41), at(56, 41), at(65, 41)]);
  place(PIECE.torch, [at(36, 46), at(59, 46), at(36, 75), at(59, 75)]);
  // A vila: lanternas na rua, barris e caixotes nas portas da taverna e do armazém.
  for (const x of [2, 18, 34, 52, 70]) place(PIECE.lamp, [at(x, 21), at(x + 8, 26)]);
  place(PIECE.barrel, [at(23, 27), at(36, 27), at(51, 27), at(62, 27)]);
  place(PIECE.crate, [at(50, 36), at(51, 36), at(62, 37)]);
  // A ruína velha no alto da vila.
  place(PIECE.ruin, [at(2, 2)]);
  place(PIECE.palm, [at(14, 4), at(24, 6), at(40, 3), at(58, 5), at(70, 9)]);
  // O forte: a torre de vigia, o estandarte, a fileira de canhões e a munição.
  place(PIECE.tower, [at(95, 6)]);
  place(PIECE.banner, [at(89, 18)]);
  place(PIECE.cannon, [
    at(81, 32),
    at(84, 32),
    at(87, 32),
    at(90, 32),
    at(93, 32),
    at(96, 32),
    at(99, 32),
  ]);
  place(PIECE.barrel, [at(80, 14), at(81, 14), at(80, 15), at(100, 20), at(100, 21)]);
  place(PIECE.crate, [at(97, 14), at(98, 14), at(85, 28), at(92, 28)]);
  place(PIECE.torch, [at(79, 21), at(79, 26), at(84, 13), at(91, 13)]);
  // A praia oeste: o acampamento dos piratas.
  place(PIECE.tent, [at(4, 50), at(10, 52), at(16, 49)]);
  place(PIECE.campfire, [at(9, 57)]);
  place(PIECE.barrel, [at(6, 56), at(13, 57), at(14, 57)]);
  place(PIECE.chest, [at(20, 52)]);
  place(PIECE.palm, [at(2, 44), at(22, 46), at(28, 55), at(3, 60), at(25, 60), at(33, 50)]);
  // A praia leste: o tesouro enterrado entre as palmeiras.
  place(PIECE.dugHole, [at(86, 50)]);
  place(PIECE.chest, [at(88, 51)]);
  place(PIECE.coins, [at(89, 52), at(85, 53)]);
  place(PIECE.skull, [at(88, 53)]);
  place(PIECE.palm, [
    at(64, 48),
    at(72, 54),
    at(78, 46),
    at(94, 44),
    at(100, 52),
    at(82, 58),
    at(70, 38),
    at(99, 38),
  ]);
  place(PIECE.grassTuft, [at(66, 56), at(76, 50), at(92, 56), at(97, 47), at(8, 47), at(30, 58)]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'vila', backdrop: 'sea' },
  });
}
