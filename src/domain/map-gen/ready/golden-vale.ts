/**
 * Fazenda do Vale Dourado (RPG-80, pedido do usuário em 26/11: "mais mapas, versões maiores"): o
 * campo inteiro num mapa 104×88, para aventuras rurais. A estrada corta o vale de oeste a leste e
 * cruza o rio por uma ponte de tábuas; a trilha da fazenda desce de norte a sul. A oeste ficam a
 * sede, o celeiro, o galpão e o terreiro com o poço; ao norte da estrada, os trigais cercados e a
 * horta de abóboras; ao sul, o pasto cercado, o pomar, o lago e o povoado com a ferraria. Do outro
 * lado do rio, o moinho de vento, a serraria, o moinho d'água, as colinas e o bosque.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import type { BuildingUse } from '../blueprint';
import { createPlacer } from './placer';
import { createSketch, stampBuildings, type Sketch, type SketchBuilding } from './sketch';

export const GOLDEN_VALE_SIZE = { width: 104, depth: 88 } as const;

const TILE = {
  grass: 'grama',
  dirt: 'terra',
  water: 'agua',
  planks: 'piso-madeira',
} as const;
const PIECE = {
  wheat: 'kay-trigal',
  windmill: 'kay-moinho-vento',
  watermill: 'kay-moinho-agua',
  sawmill: 'kay-serraria',
  smithy: 'kay-ferraria',
  logs: 'kay-pilha-madeira',
  well: 'kay-poco',
  hills: 'kay-colinas',
  grove: 'kay-bosque-grande',
  pines: 'kay-pinhal-grande',
  stumps: 'kay-clareira-tocos',
  villageTree: 'kay-arvore-vila',
  tent: 'kay-tenda',
  fieldFence: 'kay-cerca-madeira',
  fence: 'med-cerca-madeira',
  cart: 'med-carroca',
  wheelbarrow: 'kay-carrinho-mao',
  pumpkin: 'kay-abobora',
  carrots: 'kay-caixa-cenouras',
  potatoes: 'kay-caixa-batatas',
  sack: 'kay-saco',
  crate: 'med-caixote',
  barrel: 'barril',
  lamp: 'kay-poste-lanterna',
  shrine: 'kay-santuario',
  reeds: 'kay-junco',
  lily: 'kay-vitoria-regia',
  oak: 'nat-carvalho',
  pine: 'nat-pinheiro',
  bush: 'nat-arbusto',
  grassTuft: 'nat-capim',
  flowers: 'nat-flores',
  rock: 'rocha',
} as const;

/** A estrada, a trilha, o rio, a ponte, o lago e os chãos de terra batida. */
const ROAD: CellRect = { x: 0, z: 42, width: 104, depth: 4 };
const LANE: CellRect = { x: 30, z: 0, width: 3, depth: 88 };
const RIVER: CellRect = { x: 70, z: 0, width: 6, depth: 88 };
const BRIDGE: CellRect = { x: 70, z: 42, width: 6, depth: 4 };
const POND: CellRect = { x: 38, z: 70, width: 12, depth: 7 };
const BARNYARD: CellRect = { x: 4, z: 18, width: 24, depth: 10 };
const HOUSE_YARD: CellRect = { x: 4, z: 36, width: 24, depth: 6 };
const GARDEN: CellRect = { x: 36, z: 30, width: 30, depth: 9 };
/** O pasto cercado, com a porteira voltada para a estrada. */
const PASTURE: CellRect = { x: 4, z: 50, width: 23, depth: 19 };
const GATE = { from: 14, to: 16 } as const;

/** Giro da planta: a porta fica ao norte (0), oeste (1), sul (2) ou leste (3). */
const DOOR = { north: 0, west: 1, south: 2, east: 3 } as const;
/** Lado dos chalés do povoado. */
const COTTAGE_SIDE = 6;

type Plan = {
  readonly x: number;
  readonly z: number;
  readonly door: number;
  readonly width?: number;
  readonly depth?: number;
  readonly stories?: number;
  readonly use?: BuildingUse;
};

function farmBuildings(): SketchBuilding[] {
  const plans: Plan[] = [
    // A sede, de porta para o terreiro da frente.
    { x: 6, z: 28, door: DOOR.south, width: 12, depth: 8, stories: 2 },
    // O celeiro e o galpão de ferramentas, de porta para o terreiro.
    { x: 6, z: 8, door: DOOR.south, width: 12, depth: 10, use: 'shop' },
    { x: 21, z: 12, door: DOOR.south },
    // Os chalés do povoado, de porta para a estrada.
    { x: 36, z: 50, door: DOOR.north },
    { x: 45, z: 50, door: DOOR.north, stories: 2 },
    { x: 54, z: 50, door: DOOR.north },
  ];
  return plans.map((plan, i) => ({
    style: 'medieval',
    use: plan.use ?? 'house',
    x: plan.x,
    z: plan.z,
    width: plan.width ?? COTTAGE_SIDE,
    depth: plan.depth ?? COTTAGE_SIDE,
    stories: plan.stories ?? 1,
    rotation: plan.door,
    level: 0,
    variant: i + 1,
  }));
}

function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...GOLDEN_VALE_SIZE }, TILE.grass);
  for (const area of [BARNYARD, HOUSE_YARD, GARDEN, LANE, ROAD]) sketch.ground(area, TILE.dirt);
  sketch.ground(RIVER, TILE.water);
  sketch.ground(POND, TILE.water);
  sketch.ground(BRIDGE, TILE.planks);
}

const inside = (cell: Cell, r: CellRect) =>
  cell.x >= r.x && cell.x < r.x + r.width && cell.z >= r.z && cell.z < r.z + r.depth;
const at = (x: number, z: number): Cell => ({ x, z });

/** As casas da borda de um retângulo, menos as da porteira no lado norte. */
function fenceCells(area: CellRect): Cell[] {
  const right = area.x + area.width - 1;
  const bottom = area.z + area.depth - 1;
  const cells: Cell[] = [];
  for (let x = area.x; x <= right; x += 1) {
    if (x < GATE.from || x > GATE.to) cells.push(at(x, area.z));
    cells.push(at(x, bottom));
  }
  for (let z = area.z + 1; z < bottom; z += 1) cells.push(at(area.x, z), at(right, z));
  return cells;
}

export function buildGoldenValeMap(): AssembledMap {
  const sketch = createSketch(GOLDEN_VALE_SIZE, null);
  lay(sketch);
  const indoors = stampBuildings(sketch, farmBuildings());
  const placer = createPlacer(sketch);
  const place = (piece: string, cells: readonly Cell[], rotation = 0) => {
    for (const cell of cells) {
      if (indoors.has(`${cell.x},${cell.z}`))
        throw new Error(`${piece} dentro de casa em ${cell.x},${cell.z}.`);
      const blocked = [ROAD, LANE, RIVER].some((r) => inside(cell, r));
      if (blocked) throw new Error(`${piece} no caminho ou no rio em ${cell.x},${cell.z}.`);
      if (inside(cell, POND) && piece !== PIECE.lily)
        throw new Error(`${piece} no lago em ${cell.x},${cell.z}.`);
      placer(piece, cell, rotation);
    }
  };

  // Os trigais cercados ao norte da estrada.
  place(PIECE.wheat, [at(36, 3), at(48, 3), at(60, 3), at(36, 16), at(48, 16), at(60, 16)]);
  place(PIECE.fieldFence, [at(34, 3), at(34, 9), at(34, 15), at(34, 21)]);
  // A horta: fileiras de abóboras e os caixotes da colheita.
  for (const z of [31, 33]) {
    for (let x = 37; x <= 64; x += 3) place(PIECE.pumpkin, [at(x, z)]);
  }
  place(PIECE.carrots, [at(38, 36), at(44, 36), at(56, 36)]);
  place(PIECE.potatoes, [at(41, 36), at(50, 36), at(62, 36)]);
  place(PIECE.wheelbarrow, [at(53, 35)]);
  // O terreiro do celeiro: a carroça, sacos, barris e o carrinho de mão.
  place(PIECE.cart, [at(22, 21)]);
  place(PIECE.wheelbarrow, [at(19, 21)]);
  place(PIECE.sack, [at(5, 19), at(6, 19), at(5, 20), at(17, 20)]);
  place(PIECE.barrel, [at(26, 19), at(26, 20), at(20, 25)]);
  place(PIECE.crate, [at(25, 25), at(26, 25), at(8, 25)]);
  // A frente da sede: o poço, a lenha e as flores.
  place(PIECE.well, [at(21, 30)]);
  place(PIECE.logs, [at(21, 37)]);
  place(PIECE.flowers, [at(6, 37), at(10, 37), at(14, 37), at(18, 37)]);
  place(PIECE.bush, [at(4, 30), at(4, 34), at(26, 30)]);
  // Os postes de lanterna ao longo da estrada.
  for (const x of [10, 26, 40, 56, 66, 80, 96]) place(PIECE.lamp, [at(x, 41), at(x + 2, 46)]);
  // O pasto cercado, com a tenda do pastor e o capim.
  place(PIECE.fence, fenceCells(PASTURE));
  place(PIECE.tent, [at(20, 62)]);
  place(PIECE.grassTuft, [at(7, 53), at(12, 57), at(18, 54), at(9, 64), at(15, 61), at(23, 56)]);
  place(PIECE.rock, [at(7, 60), at(17, 66)]);
  // O pomar.
  for (const z of [73, 79]) {
    for (const x of [4, 9, 14, 19, 24]) place(PIECE.villageTree, [at(x, z)]);
  }
  place(PIECE.oak, [at(2, 86), at(12, 85), at(27, 85)]);
  // O povoado: o poço, a ferraria e os barris.
  place(PIECE.well, [at(46, 60)]);
  place(PIECE.smithy, [at(62, 50)]);
  place(PIECE.barrel, [at(42, 51), at(60, 57), at(61, 57)]);
  place(PIECE.cart, [at(51, 58)]);
  // O lago: juncos na margem e vitórias-régias na água.
  place(PIECE.reeds, [at(37, 72), at(50, 71), at(44, 77), at(37, 75), at(50, 75)]);
  place(PIECE.lily, [at(40, 72), at(45, 74), at(47, 71)]);
  place(PIECE.oak, [at(36, 80), at(54, 70), at(58, 78), at(64, 66)]);
  // Do outro lado do rio: o moinho de vento, a serraria, o moinho d'água e as colinas.
  place(PIECE.windmill, [at(84, 6)]);
  place(PIECE.sawmill, [at(82, 20)]);
  place(PIECE.logs, [at(91, 22), at(91, 25)]);
  place(PIECE.watermill, [at(76, 28)]);
  place(PIECE.hills, [at(94, 4)]);
  place(PIECE.sack, [at(83, 11), at(84, 11), at(90, 8)]);
  // O bosque, o pinhal e a clareira dos lenhadores, com o santuário à beira da estrada.
  place(PIECE.grove, [at(84, 56)]);
  place(PIECE.pines, [at(78, 72)]);
  place(PIECE.stumps, [at(92, 72)]);
  place(PIECE.shrine, [at(96, 50)]);
  place(PIECE.pine, [at(78, 50), at(80, 62), at(100, 58), at(101, 36), at(96, 30), at(78, 38)]);
  place(PIECE.rock, [at(67, 40), at(77, 40), at(68, 60), at(77, 84)]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'vila', backdrop: 'forest' },
  });
}
