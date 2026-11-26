/**
 * Vila Mineira de Pedravela (RPG-100, pedido do usuário em 26/11: "mais mapas, versões maiores"):
 * a vila de mineiros ao pé da serra, num mapa 104×88. Ao norte, a serra com as três bocas de mina
 * (uma delas a de ouro), o pátio de cascalho com os carrinhos e a carga. A estrada desce da serra
 * de norte a sul, cruza o rio pela ponte de madeira e chega à vila, que se espalha ao longo da rua
 * de oeste a leste. Na margem norte do rio, a roda-d’água; ao sul, a serraria com os tocos
 * cortados. Bosques nos cantos do sul.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, rotatedFootprint, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import type { BuildingUse } from '../blueprint';
import { propFootprint } from '../kits';
import { createPlacer } from './placer';
import { createSketch, stampBuildings, type Sketch, type SketchBuilding } from './sketch';

export const MINING_TOWN_SIZE = { width: 104, depth: 88 } as const;

const TILE = { grass: 'grama', dirt: 'terra', gravel: 'piso-pedra', water: 'agua' } as const;
const PIECE = {
  hills: 'kay-colinas',
  mound: 'kay-morro',
  mine: 'kay-mina',
  goldMine: 'kay-mina-amarela',
  cart: 'kay-carrinho-mao',
  crates: 'kay-caixotes',
  cargo: 'kay-carga',
  bridge: 'kay-ponte-b',
  waterMill: 'kay-moinho-agua',
  sawmill: 'kay-serraria',
  stumps: 'kay-tocos-cortados',
  grove: 'kay-bosque',
  tree: 'kay-arvore-vila',
  keg: 'kay-barril-chope',
  well: 'kay-poco',
  stone: 'kay-pedra-a',
  torch: 'tocha',
  barrel: 'barril',
  boat: 'med-bote',
  rock: 'rocha',
} as const;

/** O pátio das minas, o rio, a estrada da serra e a rua da vila. */
const YARD: CellRect = { x: 0, z: 14, width: 104, depth: 8 };
const RIVER: CellRect = { x: 0, z: 40, width: 104, depth: 5 };
const MOUNTAIN_ROAD: CellRect = { x: 49, z: 22, width: 5, depth: 66 };
const MAIN_STREET: CellRect = { x: 0, z: 62, width: 104, depth: 4 };

/** Giro da planta: a porta fica ao norte (0) ou ao sul (2), sempre para a rua. */
const DOOR = { north: 0, south: 2 } as const;
/** Lado das casas da vila. */
const HOUSE_SIDE = 6;

type Plan = {
  readonly x: number;
  readonly z: number;
  readonly door: number;
  readonly use?: BuildingUse;
};

function townBuildings(): SketchBuilding[] {
  const columns = [30, 38, 58, 66, 74, 82];
  const plans: Plan[] = columns.flatMap((x) => [
    // A fileira de cima, de porta para a rua (sul); a de baixo, de porta para o norte.
    { x, z: 55, door: DOOR.south, use: x === 58 ? ('shop' as const) : undefined },
    { x, z: 67, door: DOOR.north, use: x === 38 ? ('shop' as const) : undefined },
  ]);
  return plans.map((plan, i) => ({
    style: 'medieval',
    use: plan.use ?? 'house',
    x: plan.x,
    z: plan.z,
    width: HOUSE_SIDE,
    depth: HOUSE_SIDE,
    stories: i % 4 === 1 ? 2 : 1,
    rotation: plan.door,
    level: 0,
    variant: i + 1,
  }));
}

function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...MINING_TOWN_SIZE }, TILE.grass);
  sketch.ground({ x: 0, z: 0, width: 104, depth: 14 }, TILE.dirt);
  sketch.ground(YARD, TILE.gravel);
  sketch.ground(MOUNTAIN_ROAD, TILE.dirt);
  sketch.ground(MAIN_STREET, TILE.dirt);
  sketch.ground(RIVER, TILE.water);
}

const inside = (cell: Cell, r: CellRect) =>
  cell.x >= r.x && cell.x < r.x + r.width && cell.z >= r.z && cell.z < r.z + r.depth;
const at = (x: number, z: number): Cell => ({ x, z });
/** Só os botes e as pedras ficam no rio; a ponte o atravessa e pousa nas duas margens. */
const AFLOAT = new Set<string>([PIECE.boat, PIECE.rock]);
const SPANS = new Set<string>([PIECE.bridge]);
const isWet = (cell: Cell) => inside(cell, RIVER);

export function buildMiningTownMap(): AssembledMap {
  const sketch = createSketch(MINING_TOWN_SIZE, null);
  lay(sketch);
  const indoors = stampBuildings(sketch, townBuildings());
  const placer = createPlacer(sketch);
  // Confere todas as casas que a peça ocupa, não só a âncora: nada dentro de casa nem no lugar errado.
  const place = (piece: string, cells: readonly Cell[], rotation = 0) => {
    for (const cell of cells) {
      const size = rotatedFootprint(propFootprint(piece), rotation);
      for (let dz = 0; dz < size.depth; dz += 1) {
        for (let dx = 0; dx < size.width; dx += 1) {
          const spot = at(cell.x + dx, cell.z + dz);
          if (indoors.has(`${spot.x},${spot.z}`))
            throw new Error(`${piece} dentro de casa em ${spot.x},${spot.z}.`);
          if (!SPANS.has(piece) && isWet(spot) !== AFLOAT.has(piece))
            throw new Error(`${piece} fora do lugar (água?) em ${spot.x},${spot.z}.`);
        }
      }
      placer(piece, cell, rotation);
    }
  };

  // A serra: as colinas entre as bocas de mina.
  place(PIECE.hills, [at(2, 2), at(10, 2), at(32, 2), at(56, 2), at(82, 2), at(92, 2)]);
  place(PIECE.mine, [at(20, 4), at(44, 4)]);
  place(PIECE.goldMine, [at(70, 4)]);
  place(PIECE.mound, [at(62, 10), at(96, 12)]);
  // O pátio das minas: os carrinhos, a carga, os barris e as tochas.
  place(PIECE.cart, [at(29, 15), at(43, 15), at(79, 15)]);
  place(PIECE.crates, [at(14, 16), at(36, 16), at(88, 16)]);
  place(PIECE.cargo, [at(60, 17), at(66, 17)]);
  place(PIECE.barrel, [at(31, 19), at(32, 19), at(80, 19)]);
  place(PIECE.torch, [at(19, 15), at(28, 15), at(42, 15), at(52, 15), at(69, 15), at(78, 15)]);
  // A ponte sobre o rio, a roda-d’água na margem norte e os botes.
  place(PIECE.bridge, [at(48, 37)]);
  place(PIECE.waterMill, [at(20, 34)]);
  place(PIECE.boat, [at(30, 41), at(80, 42)]);
  place(PIECE.rock, [at(10, 42), at(66, 41), at(94, 43)]);
  // A serraria e os tocos cortados, na margem sul.
  place(PIECE.sawmill, [at(6, 47)]);
  place(PIECE.stumps, [at(16, 47)]);
  // A vila: o poço da praça, os barris de chope da taverna e as tochas da rua.
  place(PIECE.well, [at(46, 74)]);
  place(PIECE.keg, [at(59, 52), at(62, 52)]);
  for (const x of [28, 46, 56, 72, 90]) place(PIECE.torch, [at(x, 61), at(x, 66)]);
  for (const z of [26, 34, 50]) place(PIECE.torch, [at(48, z), at(54, z)]);
  // Os bosques do sul, as árvores e as pedras.
  place(PIECE.grove, [at(2, 74), at(92, 74)]);
  place(PIECE.tree, [
    at(6, 26),
    at(32, 28),
    at(64, 26),
    at(88, 30),
    at(98, 50),
    at(40, 48),
    at(20, 56),
    at(14, 66),
    at(62, 80),
    at(76, 80),
    at(30, 80),
  ]);
  place(PIECE.stone, [at(12, 30), at(76, 28), at(96, 22), at(24, 82)]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'vila', backdrop: 'forest' },
  });
}
