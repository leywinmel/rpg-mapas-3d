/**
 * Ilha da Caveira (RPG-92, pedido do usuário em 26/11: "mais mapas, versões maiores"): uma ilha
 * pirata num mapa 104×88, com o mar em volta. Ao sul, a enseada com o navio atracado no píer; a
 * vila pirata se espalha acima dela, com a taverna, as casas e o acampamento. No noroeste, o forte
 * murado com as torres e os canhões; no nordeste, a selva fechada esconde a ruína da caveira com o
 * tesouro. Na praia leste, o acampamento dos náufragos e a torre de vigia.
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

export const SKULL_ISLAND_SIZE = { width: 104, depth: 88 } as const;

const TILE = {
  sand: 'areia',
  water: 'agua',
  grass: 'grama',
  dirt: 'terra',
  stone: 'piso-pedra',
  planks: 'piso-madeira',
} as const;
const WALL_STYLE = 'parede-pedra';
const PIECE = {
  ship: 'med-navio',
  boat: 'med-bote',
  rock: 'rocha',
  cannon: 'nav-canhao',
  watchtower: 'kay-torre-vigia',
  ruin: 'kay-ruina',
  tent: 'kay-tenda',
  campfire: 'cav-fogueira',
  barrel: 'barril',
  crate: 'med-caixote',
  torch: 'tocha',
  lamp: 'kay-poste-lanterna',
  banner: 'kay-estandarte-vermelho',
  skull: 'kay-cranio',
  bones: 'mas-ossos',
  goldChest: 'kay-bau-ouro',
  coinPile: 'kay-pilha-moedas',
  coins: 'kay-moedas',
  palm: 'nat-palmeira',
  boulder: 'nat-pedregulho',
  bush: 'nat-arbusto',
} as const;

/** A ilha, a enseada, o píer, a vila, o forte e a selva. */
const ISLAND: CellRect = { x: 8, z: 8, width: 88, depth: 72 };
const COVE: CellRect = { x: 40, z: 62, width: 20, depth: 18 };
const PIER: CellRect = { x: 46, z: 56, width: 4, depth: 16 };
const VILLAGE: CellRect = { x: 14, z: 36, width: 42, depth: 24 };
const FORT: CellRect = { x: 12, z: 12, width: 28, depth: 20 };
const FORT_PATH: CellRect = { x: 24, z: 32, width: 4, depth: 4 };
const JUNGLE: CellRect = { x: 56, z: 12, width: 36, depth: 36 };
/** O portão do forte, no muro sul, na boca do caminho que desce para a vila. */
const FORT_GATE = { from: FORT_PATH.x, to: FORT_PATH.x + FORT_PATH.width - 1 } as const;

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

function islandBuildings(): SketchBuilding[] {
  const plans: Plan[] = [
    // O alojamento do forte, de porta para o pátio.
    { x: 20, z: 14, door: DOOR.south, width: 10, depth: 6 },
    // A taverna e as casas da vila, de frente para a praça da fogueira.
    { x: 20, z: 42, door: DOOR.south, width: 10, depth: 8, stories: 2, use: 'shop' },
    { x: 32, z: 42, door: DOOR.south },
    { x: 40, z: 42, door: DOOR.south, stories: 2 },
    ...[16, 24, 32].map((x, i) => ({ x, z: 52, door: DOOR.north, stories: i === 1 ? 2 : 1 })),
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
  sketch.ground({ x: 0, z: 0, ...SKULL_ISLAND_SIZE }, TILE.water);
  sketch.ground(ISLAND, TILE.sand);
  sketch.ground(JUNGLE, TILE.grass);
  sketch.ground(VILLAGE, TILE.dirt);
  sketch.ground(FORT, TILE.stone);
  sketch.ground(FORT_PATH, TILE.dirt);
  sketch.ground(COVE, TILE.water);
  sketch.ground(PIER, TILE.planks);
}

/** O muro de pedra do forte, aberto no portão sul. */
function fortWalls(sketch: Sketch): void {
  const band = { style: WALL_STYLE, level: 0, height: STORY_HEIGHT_STEPS };
  const { x: x0, z: z0, width, depth } = FORT;
  for (let x = x0; x < x0 + width; x += 1) {
    sketch.wall({ x, z: z0, side: 'north', ...band });
    if (x < FORT_GATE.from || x > FORT_GATE.to)
      sketch.wall({ x, z: z0 + depth, side: 'north', ...band });
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
const isWet = (cell: Cell) => (!inside(cell, ISLAND) || inside(cell, COVE)) && !inside(cell, PIER);

export function buildSkullIslandMap(): AssembledMap {
  const sketch = createSketch(SKULL_ISLAND_SIZE, null);
  lay(sketch);
  fortWalls(sketch);
  const indoors = stampBuildings(sketch, islandBuildings());
  const placer = createPlacer(sketch);
  // Confere todas as casas que a peça ocupa, não só a âncora: o navio tem 4×10.
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

  // O mar: o navio atracado na enseada, dois ao largo, os botes e as pedras.
  place(PIECE.ship, [at(52, 64), at(2, 40), at(98, 20)]);
  place(PIECE.boat, [at(42, 64), at(42, 70), at(57, 76), at(88, 82)]);
  place(PIECE.rock, [at(4, 6), at(100, 60), at(20, 84), at(70, 84)]);
  // O forte: as torres, os canhões no muro sul e oeste, a pólvora e a bandeira.
  place(PIECE.watchtower, [at(13, 13), at(33, 13)]);
  place(PIECE.cannon, [
    at(14, 30),
    at(18, 30),
    at(30, 30),
    at(34, 30),
    at(38, 30),
    at(13, 22),
    at(13, 26),
  ]);
  place(PIECE.barrel, [at(14, 24), at(15, 24), at(36, 24)]);
  place(PIECE.crate, [at(37, 24), at(36, 26)]);
  place(PIECE.banner, [at(31, 14)]);
  place(PIECE.torch, [at(23, 32), at(28, 32)]);
  // A vila pirata: a fogueira da praça, as lanternas, o acampamento e a carga do píer.
  place(PIECE.campfire, [at(36, 50)]);
  place(PIECE.lamp, [at(15, 50), at(31, 50), at(41, 50), at(45, 60), at(50, 60)]);
  place(PIECE.tent, [at(42, 38), at(48, 44)]);
  place(PIECE.barrel, [at(44, 56), at(45, 56), at(44, 57), at(50, 57), at(51, 57)]);
  place(PIECE.crate, [at(50, 56), at(51, 56), at(44, 58)]);
  place(PIECE.torch, [at(46, 71), at(49, 71)]);
  // A selva: a ruína da caveira, os crânios, os ossos, o tesouro e as tochas.
  place(PIECE.ruin, [at(72, 24)]);
  place(PIECE.skull, [at(74, 32), at(77, 32)]);
  place(PIECE.bones, [at(70, 28), at(81, 26)]);
  place(PIECE.goldChest, [at(75, 22)]);
  place(PIECE.coinPile, [at(76, 22)]);
  place(PIECE.coins, [at(74, 22)]);
  place(PIECE.torch, [at(71, 22), at(80, 22)]);
  place(PIECE.boulder, [at(66, 20), at(84, 34), at(60, 40), at(88, 14)]);
  place(PIECE.palm, [
    at(58, 14),
    at(62, 18),
    at(68, 14),
    at(80, 16),
    at(86, 22),
    at(90, 30),
    at(58, 28),
  ]);
  place(PIECE.palm, [
    at(64, 34),
    at(70, 40),
    at(78, 42),
    at(86, 44),
    at(60, 46),
    at(92, 40),
    at(66, 26),
  ]);
  place(PIECE.bush, [at(62, 24), at(82, 38), at(74, 44), at(90, 20)]);
  // A praia leste: o acampamento dos náufragos e a torre de vigia.
  place(PIECE.tent, [at(78, 58), at(84, 62)]);
  place(PIECE.campfire, [at(82, 56)]);
  place(PIECE.watchtower, [at(86, 66)]);
  // As palmeiras da praia.
  place(PIECE.palm, [
    at(10, 40),
    at(10, 60),
    at(12, 74),
    at(30, 76),
    at(66, 74),
    at(80, 70),
    at(92, 60),
    at(94, 10),
  ]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'vila', backdrop: 'sea' },
  });
}
