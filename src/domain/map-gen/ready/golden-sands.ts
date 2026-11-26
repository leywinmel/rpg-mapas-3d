/**
 * Porto das Areias Douradas (RPG-89, pedido do usuário em 26/11: "mais mapas, versões maiores"):
 * uma cidade portuária no deserto num mapa 104×88. O mar fecha o sul e entra pela doca, onde o
 * navio mercante está atracado entre os dois píeres. A avenida de pedra sobe do cais até o
 * obelisco; a estrada das caravanas corta a cidade de leste a oeste. A oeste da avenida, o bazar
 * com as bancas cobertas; a leste, o palácio murado do sultão, com o salão, as torres e o jardim
 * da fonte. Ao sul da estrada, o oásis com o lago e as palmeiras; na praia oeste, o acampamento
 * da caravana; no alto, as casas da cidade velha e a ruína.
 */
import type { Cell } from '../../grid';
import {
  createDefaultHeader,
  rotatedFootprint,
  STORY_HEIGHT_STEPS,
  type CellRect,
} from '../../map-v2';
import type { AssembledMap } from '../assemble';
import type { BuildingUse } from '../blueprint';
import { propFootprint } from '../kits';
import { createPlacer } from './placer';
import { createSketch, stampBuildings, type Sketch, type SketchBuilding } from './sketch';

export const GOLDEN_SANDS_SIZE = { width: 104, depth: 88 } as const;

const TILE = {
  sand: 'areia',
  dirt: 'terra',
  water: 'agua',
  grass: 'grama',
  planks: 'piso-madeira',
  stone: 'piso-pedra',
} as const;
const WALL_STYLE = 'parede-pedra';
const PIECE = {
  ship: 'med-navio',
  boat: 'med-bote',
  stall: 'kay-mercado',
  stallYellow: 'kay-mercado-amarelo',
  stallGreen: 'kay-mercado-verde',
  rug: 'kay-tapete',
  stripedRug: 'kay-tapete-listrado',
  tomatoes: 'kay-caixa-tomates',
  onions: 'kay-caixa-cebolas',
  bread: 'kay-caixa-paes',
  cheese: 'kay-caixa-queijos',
  well: 'kay-poco',
  fountain: 'pra-fonte',
  statue: 'pra-estatua-grande',
  obelisk: 'pra-obelisco',
  stoneTower: 'kay-torre-pedra',
  watchtower: 'kay-torre-vigia',
  banner: 'kay-estandarte-vermelho',
  ruin: 'kay-ruina',
  tent: 'kay-tenda',
  cart: 'med-carroca',
  campfire: 'cav-fogueira',
  barrel: 'barril',
  crate: 'med-caixote',
  torch: 'tocha',
  lamp: 'kay-poste-lanterna',
  palm: 'nat-palmeira',
  cactus: 'nat-cacto',
  boulder: 'nat-pedregulho',
  rock: 'rocha',
  grassTuft: 'nat-capim',
  flowers: 'nat-flores',
} as const;

/** O mar, a doca, o cais, os píeres, as ruas, o bazar, o palácio e o oásis. */
const SEA: CellRect = { x: 0, z: 70, width: 104, depth: 18 };
const HARBOR: CellRect = { x: 44, z: 58, width: 16, depth: 12 };
const QUAY: CellRect = { x: 30, z: 54, width: 44, depth: 4 };
const WEST_PIER: CellRect = { x: 40, z: 58, width: 4, depth: 22 };
const EAST_PIER: CellRect = { x: 60, z: 58, width: 4, depth: 22 };
const AVENUE: CellRect = { x: 50, z: 4, width: 4, depth: 50 };
const CARAVAN_ROAD: CellRect = { x: 0, z: 30, width: 104, depth: 4 };
const BAZAAR: CellRect = { x: 8, z: 36, width: 36, depth: 16 };
const PALACE: CellRect = { x: 66, z: 4, width: 34, depth: 22 };
const PALACE_PATH: CellRect = { x: 81, z: 26, width: 4, depth: 4 };
const OASIS: CellRect = { x: 70, z: 36, width: 26, depth: 16 };
const OASIS_POOL: CellRect = { x: 77, z: 40, width: 12, depth: 8 };
/** O portão do palácio, no muro sul, na boca do caminho que desce para a estrada. */
const PALACE_GATE = { from: PALACE_PATH.x, to: PALACE_PATH.x + PALACE_PATH.width - 1 } as const;

/** Giro da planta: a porta fica ao norte (0), oeste (1), sul (2) ou leste (3). */
const DOOR = { north: 0, west: 1, south: 2, east: 3 } as const;
/** Lado das casas comuns da cidade. */
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

function cityBuildings(): SketchBuilding[] {
  const plans: Plan[] = [
    // A cidade velha: duas fileiras de casas ao norte da estrada, de porta para o sul.
    ...[4, 12, 20, 28, 36].flatMap((x, i) => [
      { x, z: 12, door: DOOR.south, stories: i % 2 === 0 ? 2 : 1 },
      { x, z: 22, door: DOOR.south, stories: i % 3 === 1 ? 2 : 1 },
    ]),
    // O caravançará e a casa de câmbio, de porta para a avenida.
    { x: 56, z: 10, door: DOOR.west, width: 8, depth: 8, stories: 2, use: 'shop' },
    { x: 56, z: 20, door: DOOR.west, width: 8, depth: 6, use: 'shop' },
    // As casas entre a avenida e o oásis, de porta para a estrada.
    { x: 56, z: 36, door: DOOR.north },
    { x: 64, z: 36, door: DOOR.north, stories: 2 },
    // O salão do sultão, de porta para o jardim.
    { x: 74, z: 8, door: DOOR.south, width: 18, depth: 10, stories: 2 },
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
  sketch.ground({ x: 0, z: 0, ...GOLDEN_SANDS_SIZE }, TILE.sand);
  sketch.ground(CARAVAN_ROAD, TILE.dirt);
  sketch.ground(AVENUE, TILE.stone);
  sketch.ground(BAZAAR, TILE.stone);
  sketch.ground(PALACE, TILE.stone);
  sketch.ground(PALACE_PATH, TILE.stone);
  sketch.ground(OASIS, TILE.grass);
  sketch.ground(OASIS_POOL, TILE.water);
  sketch.ground(SEA, TILE.water);
  sketch.ground(HARBOR, TILE.water);
  for (const deck of [QUAY, WEST_PIER, EAST_PIER]) sketch.ground(deck, TILE.planks);
}

/** O muro de pedra do palácio, aberto no portão sul. */
function palaceWalls(sketch: Sketch): void {
  const band = { style: WALL_STYLE, level: 0, height: STORY_HEIGHT_STEPS };
  const { x: x0, z: z0, width, depth } = PALACE;
  for (let x = x0; x < x0 + width; x += 1) {
    sketch.wall({ x, z: z0, side: 'north', ...band });
    if (x < PALACE_GATE.from || x > PALACE_GATE.to) {
      sketch.wall({ x, z: z0 + depth, side: 'north', ...band });
    }
  }
  for (let z = z0; z < z0 + depth; z += 1) {
    sketch.wall({ x: x0, z, side: 'west', ...band });
    sketch.wall({ x: x0 + width, z, side: 'west', ...band });
  }
}

const inside = (cell: Cell, r: CellRect) =>
  cell.x >= r.x && cell.x < r.x + r.width && cell.z >= r.z && cell.z < r.z + r.depth;
const at = (x: number, z: number): Cell => ({ x, z });
/** Só o que flutua ou fica de pé no fundo vai para a água. */
const AFLOAT = new Set<string>([PIECE.ship, PIECE.boat, PIECE.rock]);
const isWet = (cell: Cell) =>
  [SEA, HARBOR, OASIS_POOL].some((r) => inside(cell, r)) &&
  ![WEST_PIER, EAST_PIER].some((r) => inside(cell, r));

export function buildGoldenSandsMap(): AssembledMap {
  const sketch = createSketch(GOLDEN_SANDS_SIZE, null);
  lay(sketch);
  palaceWalls(sketch);
  const indoors = stampBuildings(sketch, cityBuildings());
  const placer = createPlacer(sketch);
  // Confere todas as casas que a peça ocupa, não só a âncora: as bancas do bazar têm 9×7.
  const place = (piece: string, cells: readonly Cell[], rotation = 0) => {
    for (const cell of cells) {
      const size = rotatedFootprint(propFootprint(piece), rotation);
      for (let dz = 0; dz < size.depth; dz += 1) {
        for (let dx = 0; dx < size.width; dx += 1) {
          const spot = at(cell.x + dx, cell.z + dz);
          if (indoors.has(`${spot.x},${spot.z}`))
            throw new Error(`${piece} dentro de casa em ${spot.x},${spot.z}.`);
          if (isWet(spot) !== AFLOAT.has(piece))
            throw new Error(`${piece} fora do lugar (água?) em ${spot.x},${spot.z}.`);
        }
      }
      placer(piece, cell, rotation);
    }
  };

  // O porto: o navio mercante atracado na doca e dois ao largo; os botes junto dos píeres.
  place(PIECE.ship, [at(50, 60), at(18, 74), at(82, 73)]);
  place(PIECE.boat, [at(45, 59), at(57, 59), at(45, 66), at(57, 66), at(30, 72), at(70, 74)]);
  place(PIECE.boat, [at(95, 76)]);
  place(PIECE.rock, [at(6, 82), at(100, 84), at(60, 85)]);
  // O cais: barris, caixotes, lanternas e tochas nas pontas dos píeres.
  place(PIECE.barrel, [at(31, 54), at(32, 54), at(31, 55), at(71, 54), at(72, 54)]);
  place(PIECE.crate, [at(34, 55), at(35, 55), at(68, 55), at(69, 55), at(65, 57)]);
  place(PIECE.lamp, [at(30, 53), at(40, 53), at(64, 53), at(73, 53)]);
  place(PIECE.torch, [at(40, 77), at(63, 77)]);
  // A avenida: o obelisco no alto e as lanternas dos dois lados.
  place(PIECE.obelisk, [at(51, 1)]);
  for (const z of [8, 16, 24, 40, 48]) place(PIECE.lamp, [at(49, z), at(54, z)]);
  // A estrada das caravanas, iluminada dos dois lados.
  place(PIECE.lamp, [at(6, 29), at(22, 29), at(38, 29), at(96, 29)]);
  place(PIECE.lamp, [at(14, 34), at(30, 34), at(60, 34), at(76, 34)]);
  // O bazar: seis bancas cobertas, tapetes de vendedor, caixas de mercadoria e o poço.
  place(PIECE.stall, [at(10, 38), at(32, 45)]);
  place(PIECE.stallYellow, [at(21, 38), at(10, 45)]);
  place(PIECE.stallGreen, [at(32, 38), at(21, 45)]);
  place(PIECE.stripedRug, [at(12, 36), at(34, 36)]);
  place(PIECE.rug, [at(23, 36)]);
  place(PIECE.tomatoes, [at(15, 37), at(28, 37)]);
  place(PIECE.onions, [at(17, 37), at(37, 37)]);
  place(PIECE.bread, [at(26, 37)]);
  place(PIECE.cheese, [at(39, 37)]);
  place(PIECE.barrel, [at(42, 40), at(42, 42), at(42, 44), at(42, 46)]);
  place(PIECE.well, [at(46, 40)]);
  // O palácio: as duas torres, o jardim da fonte, as estátuas e os estandartes.
  place(PIECE.stoneTower, [at(67, 5), at(93, 5)]);
  place(PIECE.fountain, [at(81, 20)]);
  place(PIECE.statue, [at(70, 18), at(95, 18)]);
  place(PIECE.banner, [at(76, 19), at(89, 19)]);
  place(PIECE.palm, [at(68, 20), at(98, 20), at(68, 14), at(98, 14), at(78, 23), at(87, 23)]);
  place(PIECE.torch, [at(79, 24), at(86, 24), at(80, 27), at(85, 27)]);
  place(PIECE.flowers, [at(80, 19), at(84, 19)]);
  // O oásis: palmeiras em volta do lago, a tenda do mercador e o capim.
  place(PIECE.palm, [at(74, 38), at(92, 38), at(74, 49), at(92, 49), at(83, 49), at(80, 37)]);
  place(PIECE.tent, [at(90, 42)]);
  place(PIECE.grassTuft, [at(72, 44), at(76, 50), at(94, 46), at(86, 37)]);
  place(PIECE.flowers, [at(71, 37), at(89, 50)]);
  // A praia oeste: o acampamento da caravana.
  place(PIECE.tent, [at(3, 57), at(9, 59), at(15, 56)]);
  place(PIECE.campfire, [at(9, 64)]);
  place(PIECE.cart, [at(21, 57), at(24, 60)]);
  place(PIECE.crate, [at(20, 64), at(21, 64)]);
  place(PIECE.barrel, [at(5, 63), at(6, 63)]);
  place(PIECE.palm, [at(2, 67), at(13, 67), at(27, 66), at(26, 54)]);
  // O deserto em volta: a ruína velha, cactos, pedregulhos e a torre de vigia da praia leste.
  place(PIECE.ruin, [at(2, 1)]);
  place(PIECE.watchtower, [at(97, 56)]);
  place(PIECE.cactus, [at(46, 2), at(60, 2), at(44, 20), at(100, 28), at(14, 52), at(2, 44)]);
  place(PIECE.boulder, [at(46, 26), at(30, 8), at(101, 40), at(66, 28)]);
  place(PIECE.palm, [at(68, 60), at(76, 64), at(88, 58), at(94, 66), at(102, 64), at(70, 52)]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'vila', backdrop: 'desert' },
  });
}
