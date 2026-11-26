/**
 * Oásis de Zahrim (RPG-99, pedido do usuário em 26/11: "mais mapas, versões maiores"): uma parada
 * de caravanas no meio do deserto, num mapa 104×88. No centro, o lago do oásis com o capim e o
 * anel de palmeiras. A noroeste, o caravançará murado de pedra, com o poço, as tendas e a carga
 * das caravanas; a leste, o mercado de tendas. A estrada sai do portão do caravançará e corre de
 * oeste a leste ao sul do lago, com as casas de barro do povoado. Ao norte, as dunas; a sudeste,
 * a ruína antiga com a estátua e os obeliscos.
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

export const DESERT_OASIS_SIZE = { width: 104, depth: 88 } as const;

const TILE = { sand: 'areia', grass: 'grama', dirt: 'terra', water: 'agua' } as const;
const WALL_STYLE = 'parede-pedra';
const PIECE = {
  dunes: 'kay-colinas',
  mound: 'kay-morro',
  ruin: 'kay-ruina',
  bigStatue: 'pra-estatua-grande',
  obelisk: 'pra-obelisco',
  well: 'kay-poco',
  tent: 'kay-tenda',
  crates: 'kay-caixotes',
  cargo: 'kay-carga',
  stoneA: 'kay-pedra-a',
  stoneE: 'kay-pedra-e',
  palm: 'nat-palmeira',
  deadTree: 'nat-arvore-seca',
  torch: 'tocha',
  barrel: 'barril',
  boat: 'med-bote',
  rock: 'rocha',
} as const;

/** O lago, o capim em volta, o caravançará, o mercado e as estradas. */
const LAKE: CellRect = { x: 40, z: 34, width: 24, depth: 16 };
const MEADOW: CellRect = { x: 34, z: 28, width: 36, depth: 28 };
const CARAVANSERAI: CellRect = { x: 6, z: 6, width: 28, depth: 24 };
const MARKET: CellRect = { x: 72, z: 30, width: 26, depth: 24 };
const GATE_ROAD: CellRect = { x: 18, z: 30, width: 4, depth: 26 };
const MAIN_ROAD: CellRect = { x: 0, z: 56, width: 104, depth: 4 };
/** O portão do caravançará, no muro sul, na boca da estrada. */
const GATE = { from: GATE_ROAD.x, to: GATE_ROAD.x + GATE_ROAD.width - 1 } as const;

/** Giro da planta: as casas do povoado têm a porta ao norte (0), para a estrada. */
const DOOR = { north: 0 } as const;
/** Lado das casas de barro. */
const HOUSE_SIDE = 6;

type Plan = { readonly x: number; readonly z: number; readonly use?: BuildingUse };

function hamletBuildings(): SketchBuilding[] {
  const plans: Plan[] = [30, 38, 46, 54, 62, 70].flatMap((x) => [
    { x, z: 62, use: x === 46 ? ('shop' as const) : undefined },
    { x, z: 74 },
  ]);
  return plans.map((plan, i) => ({
    style: 'medieval',
    use: plan.use ?? 'house',
    x: plan.x,
    z: plan.z,
    width: HOUSE_SIDE,
    depth: HOUSE_SIDE,
    stories: i % 3 === 0 ? 2 : 1,
    rotation: DOOR.north,
    level: 0,
    variant: i + 1,
  }));
}

function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...DESERT_OASIS_SIZE }, TILE.sand);
  sketch.ground(MEADOW, TILE.grass);
  sketch.ground(CARAVANSERAI, TILE.dirt);
  sketch.ground(MARKET, TILE.dirt);
  sketch.ground(GATE_ROAD, TILE.dirt);
  sketch.ground(MAIN_ROAD, TILE.dirt);
  sketch.ground(LAKE, TILE.water);
}

/** O muro de pedra do caravançará, aberto no portão sul. */
function caravanseraiWalls(sketch: Sketch): void {
  const band = { style: WALL_STYLE, level: 0, height: STORY_HEIGHT_STEPS };
  const { x: x0, z: z0, width, depth } = CARAVANSERAI;
  for (let x = x0; x < x0 + width; x += 1) {
    sketch.wall({ x, z: z0, side: 'north', ...band });
    if (x < GATE.from || x > GATE.to) sketch.wall({ x, z: z0 + depth, side: 'north', ...band });
  }
  for (let z = z0; z < z0 + depth; z += 1) {
    sketch.wall({ x: x0, z, side: 'west', ...band });
    sketch.wall({ x: x0 + width, z, side: 'west', ...band });
  }
}

const inside = (cell: Cell, r: CellRect) =>
  cell.x >= r.x && cell.x < r.x + r.width && cell.z >= r.z && cell.z < r.z + r.depth;
const at = (x: number, z: number): Cell => ({ x, z });
/** Só o bote e a pedra ficam no lago. */
const AFLOAT = new Set<string>([PIECE.boat, PIECE.rock]);
const isWet = (cell: Cell) => inside(cell, LAKE);

export function buildDesertOasisMap(): AssembledMap {
  const sketch = createSketch(DESERT_OASIS_SIZE, null);
  lay(sketch);
  caravanseraiWalls(sketch);
  const indoors = stampBuildings(sketch, hamletBuildings());
  const placer = createPlacer(sketch);
  // Confere todas as casas que a peça ocupa, não só a âncora: nada dentro de casa nem na água.
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

  // O caravançará: o poço no meio, as tendas dos cantos, a carga e as tochas do portão.
  place(PIECE.well, [at(18, 16)]);
  place(PIECE.tent, [at(9, 9), at(28, 9), at(9, 24), at(28, 24)]);
  place(PIECE.crates, [at(13, 8), at(22, 8)]);
  place(PIECE.cargo, [at(13, 20), at(23, 20)]);
  place(PIECE.barrel, [at(14, 26), at(15, 26), at(23, 26)]);
  place(PIECE.torch, [at(17, 29), at(22, 29), at(17, 31), at(22, 31)]);
  // O oásis: o anel de palmeiras em volta do lago, o bote e a pedra.
  for (const x of [36, 42, 48, 54, 60, 66]) place(PIECE.palm, [at(x, 30), at(x, 52)]);
  for (const z of [36, 42, 48]) place(PIECE.palm, [at(36, z), at(67, z)]);
  place(PIECE.boat, [at(50, 40)]);
  place(PIECE.rock, [at(44, 46), at(58, 37)]);
  // O mercado de tendas, com a carga entre elas.
  for (const z of [32, 38, 44, 50]) {
    place(PIECE.tent, [at(74, z), at(80, z), at(86, z), at(92, z)]);
  }
  place(PIECE.crates, [at(77, 35), at(89, 47)]);
  place(PIECE.barrel, [at(84, 42), at(84, 43)]);
  // As dunas do norte.
  place(PIECE.dunes, [at(60, 2), at(70, 2), at(82, 2), at(92, 12)]);
  place(PIECE.mound, [at(40, 4), at(48, 12)]);
  // A estrada: as tochas dos dois lados.
  for (const x of [30, 42, 54, 66, 78, 90]) place(PIECE.torch, [at(x, 55), at(x, 60)]);
  // A ruína antiga: a estátua e os obeliscos.
  place(PIECE.ruin, [at(84, 64)]);
  place(PIECE.bigStatue, [at(80, 66)]);
  place(PIECE.obelisk, [at(82, 76), at(86, 76)]);
  // As dunas do sul, as pedras e as árvores secas.
  place(PIECE.mound, [at(94, 66), at(4, 66), at(4, 78), at(88, 80)]);
  place(PIECE.stoneA, [at(100, 30), at(12, 44), at(26, 84)]);
  place(PIECE.stoneE, [at(60, 84)]);
  place(PIECE.deadTree, [at(30, 40), at(98, 48), at(10, 52), at(50, 84)]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'vila', backdrop: 'desert' },
  });
}
