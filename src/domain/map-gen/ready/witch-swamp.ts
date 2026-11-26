/**
 * Pântano de Lodoverde (RPG-98, pedido do usuário em 26/11: "mais mapas, versões maiores"): o
 * brejo onde mora a bruxa, num mapa 104×88. Dois canais cortam o pântano em cruz, de leste a
 * oeste e de norte a sul, com pontes de madeira; dois poços fundos ficam a sudoeste e a nordeste.
 * A oeste, a cabana da bruxa com a fogueira e os ossos; no meio, a aldeia dos pescadores; ao
 * norte, as duas casas da margem; ao sul, a ruína afundada no lodo com as covas. Árvores secas,
 * pedras e botes por toda parte.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, rotatedFootprint, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { propFootprint } from '../kits';
import { createPlacer } from './placer';
import { createSketch, stampBuildings, type Sketch, type SketchBuilding } from './sketch';

export const WITCH_SWAMP_SIZE = { width: 104, depth: 88 } as const;

const TILE = { grass: 'grama', dirt: 'terra', water: 'agua' } as const;
const PIECE = {
  bridge: 'kay-ponte-b',
  ruin: 'kay-ruina',
  rubble: 'kay-entulho',
  grave: 'kay-cova-terra',
  skull: 'kay-cranio',
  bones: 'mas-ossos',
  campfire: 'cav-fogueira',
  torch: 'tocha',
  barrel: 'barril',
  crate: 'med-caixote',
  deadTree: 'nat-arvore-seca',
  bush: 'nat-arbusto',
  boat: 'med-bote',
  rock: 'rocha',
} as const;

/** Os canais em cruz e os dois poços fundos. */
const WATERS: readonly CellRect[] = [
  { x: 0, z: 20, width: 104, depth: 5 },
  { x: 40, z: 0, width: 5, depth: 88 },
  { x: 70, z: 50, width: 20, depth: 14 },
  { x: 8, z: 56, width: 18, depth: 16 },
];
/** O lodo em volta da cabana e da ruína, e a trilha da ponte até a cabana. */
const MIRES: readonly CellRect[] = [
  { x: 0, z: 40, width: 30, depth: 14 },
  { x: 48, z: 64, width: 22, depth: 22 },
];
const HUT_PATH: CellRect = { x: 16, z: 27, width: 2, depth: 5 };

/** Giro da planta: a porta fica ao norte (0) ou ao sul (2). */
const DOOR = { north: 0, south: 2 } as const;
/** Lado das casas comuns do pântano. */
const HOUSE_SIDE = 6;

function swampBuildings(): SketchBuilding[] {
  const plans = [
    // A cabana da bruxa, de porta para a fogueira.
    { x: 14, z: 32, door: DOOR.south, width: 8, depth: 7, stories: 2 },
    // A aldeia dos pescadores, de porta para o canal.
    { x: 56, z: 32, door: DOOR.north },
    { x: 64, z: 32, door: DOOR.north, stories: 2 },
    { x: 72, z: 32, door: DOOR.north },
    // As casas da margem norte.
    { x: 84, z: 6, door: DOOR.south },
    { x: 92, z: 6, door: DOOR.south, stories: 2 },
  ];
  return plans.map((plan, i) => ({
    style: 'medieval',
    use: 'house',
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
  sketch.ground({ x: 0, z: 0, ...WITCH_SWAMP_SIZE }, TILE.grass);
  for (const mire of MIRES) sketch.ground(mire, TILE.dirt);
  sketch.ground(HUT_PATH, TILE.dirt);
  for (const water of WATERS) sketch.ground(water, TILE.water);
}

const inside = (cell: Cell, r: CellRect) =>
  cell.x >= r.x && cell.x < r.x + r.width && cell.z >= r.z && cell.z < r.z + r.depth;
const at = (x: number, z: number): Cell => ({ x, z });
/** Só os botes e as pedras ficam na água; as pontes a atravessam e pousam nas duas margens. */
const AFLOAT = new Set<string>([PIECE.boat, PIECE.rock]);
const SPANS = new Set<string>([PIECE.bridge]);
const isWet = (cell: Cell) => WATERS.some((water) => inside(cell, water));
/** Um quarto de volta: a ponte cruza o canal norte-sul de oeste a leste. */
const ACROSS = 1;

export function buildWitchSwampMap(): AssembledMap {
  const sketch = createSketch(WITCH_SWAMP_SIZE, null);
  lay(sketch);
  const indoors = stampBuildings(sketch, swampBuildings());
  const placer = createPlacer(sketch);
  // Confere todas as casas que a peça ocupa, não só a âncora: a ponte tem 7×10 (ou 10×7 girada).
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

  // As pontes: duas sobre o canal leste-oeste e duas sobre o norte-sul.
  place(PIECE.bridge, [at(12, 17), at(60, 17)]);
  place(PIECE.bridge, [at(37, 6), at(37, 50)], ACROSS);
  // A cabana da bruxa: a fogueira, as tochas, o crânio, os ossos e o barril.
  place(PIECE.campfire, [at(17, 41)]);
  place(PIECE.torch, [at(13, 40), at(22, 40)]);
  place(PIECE.skull, [at(24, 34), at(11, 44)]);
  place(PIECE.bones, [at(11, 36), at(25, 46)]);
  place(PIECE.barrel, [at(23, 36)]);
  // A aldeia dos pescadores: barris, caixotes e tochas na frente das casas.
  place(PIECE.barrel, [at(62, 40), at(63, 40)]);
  place(PIECE.crate, [at(70, 40), at(71, 40)]);
  place(PIECE.torch, [at(55, 40), at(78, 40)]);
  // A ruína afundada no lodo, o entulho e as covas.
  place(PIECE.ruin, [at(54, 70)]);
  place(PIECE.rubble, [at(64, 74)]);
  place(PIECE.grave, [at(54, 80), at(58, 80), at(62, 80)]);
  place(PIECE.skull, [at(66, 79)]);
  // As árvores secas e os arbustos.
  place(PIECE.deadTree, [
    at(4, 4),
    at(10, 10),
    at(24, 6),
    at(30, 14),
    at(50, 8),
    at(58, 4),
    at(70, 12),
    at(100, 16),
    at(6, 40),
    at(28, 44),
    at(34, 30),
    at(50, 44),
    at(60, 46),
    at(96, 40),
    at(100, 70),
    at(94, 84),
    at(76, 80),
    at(30, 80),
    at(4, 84),
    at(50, 60),
    at(34, 64),
  ]);
  place(PIECE.bush, [
    at(8, 48),
    at(26, 50),
    at(48, 30),
    at(66, 44),
    at(96, 60),
    at(28, 8),
    at(76, 4),
  ]);
  // As pedras e os botes na água.
  place(PIECE.rock, [
    at(2, 22),
    at(30, 21),
    at(80, 22),
    at(42, 30),
    at(42, 70),
    at(75, 55),
    at(85, 60),
    at(12, 60),
    at(20, 68),
  ]);
  place(PIECE.boat, [at(20, 60), at(84, 52), at(50, 22)]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'floresta', light: 0.5, backdrop: 'forest' },
  });
}
