/**
 * Fortim de Grukmar (RPG-94, pedido do usuário em 26/11: "mais mapas, versões maiores"): o
 * acampamento de guerra de uma horda orc, num mapa 104×88. A paliçada de madeira cerca o salão do
 * chefe, as duas casas compridas, as fileiras de tendas, a arena de terra com a fogueira, a forja
 * e o butim. Fora dela, ao norte, as montanhas fecham o vale; a oeste, a mata seca; ao sul, as
 * catapultas, a ruína saqueada e o bando de saqueadores. A leste, a estrada desce do portão até
 * a ponte sobre o rio, e do outro lado fica o posto dos batedores.
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

export const ORC_CAMP_SIZE = { width: 104, depth: 88 } as const;

const TILE = { grass: 'grama', dirt: 'terra', sand: 'areia', water: 'agua' } as const;
const WALL_STYLE = 'parede-madeira';
const PIECE = {
  mountainA: 'kay-montanha-a',
  mountainB: 'kay-montanha-b',
  mountainC: 'kay-montanha-c',
  bridge: 'kay-ponte-b',
  watchtower: 'kay-torre-vigia',
  redWatchtower: 'kay-torre-vigia-vermelha',
  catapult: 'kay-torre-catapulta',
  smithy: 'kay-ferraria',
  ruin: 'kay-ruina',
  rubble: 'kay-entulho',
  tent: 'kay-tenda',
  campfire: 'cav-fogueira',
  banner: 'kay-estandarte-vermelho',
  arms: 'kay-espada-escudo',
  crates: 'kay-caixotes',
  barrel: 'barril',
  goldChest: 'kay-bau-ouro',
  coinPile: 'kay-pilha-moedas',
  skull: 'kay-cranio',
  bones: 'mas-ossos',
  torch: 'tocha',
  boulder: 'nat-pedregulho',
  stoneA: 'kay-pedra-a',
  stoneE: 'kay-pedra-e',
  deadTree: 'nat-arvore-seca',
  boat: 'med-bote',
  rock: 'rocha',
} as const;

/** A paliçada, a arena, as estradas e o rio. */
const PALISADE: CellRect = { x: 20, z: 16, width: 56, depth: 56 };
const ARENA: CellRect = { x: 40, z: 38, width: 16, depth: 14 };
const SOUTH_ROAD: CellRect = { x: 46, z: 72, width: 4, depth: 16 };
const EAST_ROAD: CellRect = { x: 76, z: 42, width: 12, depth: 4 };
const RIVER: CellRect = { x: 88, z: 0, width: 8, depth: 88 };
/** Os portões da paliçada: o sul, na boca da estrada do sul, e o leste, na da estrada da ponte. */
const SOUTH_GATE = { from: SOUTH_ROAD.x, to: SOUTH_ROAD.x + SOUTH_ROAD.width - 1 } as const;
const EAST_GATE = { from: EAST_ROAD.z, to: EAST_ROAD.z + EAST_ROAD.depth - 1 } as const;

/** Giro da planta: a porta fica ao norte (0), oeste (1), sul (2) ou leste (3). */
const DOOR = { north: 0, west: 1, south: 2, east: 3 } as const;

type Plan = {
  readonly x: number;
  readonly z: number;
  readonly door: number;
  readonly width: number;
  readonly depth: number;
  readonly stories?: number;
  readonly use?: BuildingUse;
};

function campBuildings(): SketchBuilding[] {
  const plans: Plan[] = [
    // O salão do chefe, de porta para a arena.
    { x: 41, z: 20, door: DOOR.south, width: 14, depth: 10, stories: 2 },
    // As duas casas compridas dos guerreiros, de porta para as tendas.
    { x: 26, z: 22, door: DOOR.south, width: 6, depth: 10 },
    { x: 64, z: 22, door: DOOR.south, width: 6, depth: 10 },
  ];
  return plans.map((plan, i) => ({
    style: 'medieval',
    use: plan.use ?? 'house',
    x: plan.x,
    z: plan.z,
    width: plan.width,
    depth: plan.depth,
    stories: plan.stories ?? 1,
    rotation: plan.door,
    level: 0,
    variant: i + 1,
  }));
}

function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...ORC_CAMP_SIZE }, TILE.grass);
  sketch.ground(PALISADE, TILE.dirt);
  sketch.ground(ARENA, TILE.sand);
  sketch.ground(SOUTH_ROAD, TILE.dirt);
  sketch.ground(EAST_ROAD, TILE.dirt);
  sketch.ground(RIVER, TILE.water);
}

/** A paliçada de madeira, aberta nos portões sul e leste. */
function palisadeWalls(sketch: Sketch): void {
  const band = { style: WALL_STYLE, level: 0, height: STORY_HEIGHT_STEPS };
  const { x: x0, z: z0, width, depth } = PALISADE;
  for (let x = x0; x < x0 + width; x += 1) {
    sketch.wall({ x, z: z0, side: 'north', ...band });
    if (x < SOUTH_GATE.from || x > SOUTH_GATE.to)
      sketch.wall({ x, z: z0 + depth, side: 'north', ...band });
  }
  for (let z = z0; z < z0 + depth; z += 1) {
    sketch.wall({ x: x0, z, side: 'west', ...band });
    if (z < EAST_GATE.from || z > EAST_GATE.to)
      sketch.wall({ x: x0 + width, z, side: 'west', ...band });
  }
}

const inside = (cell: Cell, r: CellRect) =>
  cell.x >= r.x && cell.x < r.x + r.width && cell.z >= r.z && cell.z < r.z + r.depth;
const at = (x: number, z: number): Cell => ({ x, z });
/** Só o bote e a pedra ficam no rio; a ponte o atravessa e pousa nas duas margens. */
const AFLOAT = new Set<string>([PIECE.boat, PIECE.rock]);
const SPANS = new Set<string>([PIECE.bridge]);
const isWet = (cell: Cell) => inside(cell, RIVER);
/** A ponte gira um quarto de volta para cruzar o rio de oeste a leste. */
const ACROSS = 1;

export function buildOrcCampMap(): AssembledMap {
  const sketch = createSketch(ORC_CAMP_SIZE, null);
  lay(sketch);
  palisadeWalls(sketch);
  const indoors = stampBuildings(sketch, campBuildings());
  const placer = createPlacer(sketch);
  // Confere todas as casas que a peça ocupa, não só a âncora: a ponte tem 10×7 depois de girar.
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

  // As montanhas que fecham o vale ao norte.
  const peaks = [PIECE.mountainB, PIECE.mountainA, PIECE.mountainC];
  for (let i = 0; i < 9; i += 1)
    place(peaks[i % peaks.length] ?? PIECE.mountainA, [at(2 + i * 9, 0)]);
  // As torres de vigia nos cantos da paliçada.
  place(PIECE.watchtower, [at(21, 17), at(70, 17), at(21, 65), at(70, 65)]);
  // O salão do chefe: os estandartes, as tochas e o ouro da horda ao lado.
  place(PIECE.banner, [at(39, 31), at(56, 31)]);
  place(PIECE.torch, [at(41, 31), at(54, 31)]);
  place(PIECE.coinPile, [at(57, 24), at(58, 24)]);
  place(PIECE.goldChest, [at(57, 26)]);
  // As tendas dos guerreiros, em fileiras dos dois lados da arena.
  for (const z of [36, 41, 46, 51]) {
    place(PIECE.tent, [at(23, z), at(28, z), at(63, z), at(68, z)]);
  }
  // A arena: as pedras dos cantos, a fogueira no meio, os crânios e as armas.
  place(PIECE.boulder, [at(40, 38), at(54, 38), at(40, 50), at(54, 50)]);
  place(PIECE.campfire, [at(47, 44)]);
  place(PIECE.skull, [at(44, 41), at(51, 41), at(44, 48), at(51, 48)]);
  place(PIECE.arms, [at(46, 39), at(46, 50)]);
  // As fogueiras do acampamento e os ossos espalhados.
  place(PIECE.campfire, [at(34, 45), at(60, 45), at(36, 62), at(57, 66)]);
  place(PIECE.bones, [at(38, 66), at(56, 60), at(24, 34), at(72, 34)]);
  // A forja e o butim: os caixotes, os barris e o baú do saque.
  place(PIECE.smithy, [at(27, 58)]);
  place(PIECE.crates, [at(60, 58), at(62, 58)]);
  place(PIECE.barrel, [at(65, 58), at(66, 58), at(65, 59)]);
  place(PIECE.goldChest, [at(64, 62)]);
  place(PIECE.coinPile, [at(65, 62)]);
  place(PIECE.arms, [at(36, 58)]);
  // Os portões: as tochas e os estandartes do sul e do leste.
  place(PIECE.torch, [at(45, 70), at(50, 70), at(74, 41), at(74, 46)]);
  place(PIECE.banner, [at(43, 69), at(52, 69)]);
  // A mata seca a oeste, com as pedras.
  place(PIECE.deadTree, [
    at(3, 20),
    at(8, 28),
    at(10, 34),
    at(4, 40),
    at(12, 46),
    at(16, 52),
    at(6, 58),
    at(14, 64),
    at(2, 70),
  ]);
  place(PIECE.stoneA, [at(8, 14), at(15, 40)]);
  place(PIECE.stoneE, [at(3, 50)]);
  // O sul: as catapultas, a ruína saqueada, o entulho, os ossos e o bando de saqueadores.
  place(PIECE.catapult, [at(30, 76), at(60, 76)]);
  place(PIECE.ruin, [at(6, 78)]);
  place(PIECE.rubble, [at(16, 84)]);
  place(PIECE.skull, [at(15, 78), at(20, 80)]);
  place(PIECE.bones, [at(24, 82), at(38, 80), at(70, 84)]);
  place(PIECE.tent, [at(70, 76), at(76, 78)]);
  place(PIECE.campfire, [at(73, 82)]);
  place(PIECE.torch, [at(45, 74), at(50, 74), at(45, 84), at(50, 84)]);
  // A estrada da ponte, a ponte e as pedras e o bote no rio.
  place(PIECE.torch, [at(78, 41), at(78, 46), at(85, 41), at(85, 46)]);
  place(PIECE.bridge, [at(87, 40)], ACROSS);
  place(PIECE.rock, [at(90, 10), at(93, 30), at(89, 60), at(92, 78)]);
  place(PIECE.boat, [at(91, 66)]);
  // O posto dos batedores do outro lado do rio.
  place(PIECE.redWatchtower, [at(98, 20)]);
  place(PIECE.tent, [at(98, 50), at(98, 56)]);
  place(PIECE.campfire, [at(99, 60)]);
  place(PIECE.stoneA, [at(100, 74)]);
  place(PIECE.deadTree, [at(101, 8), at(97, 84)]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'floresta', light: 0.75, backdrop: 'forest' },
  });
}
