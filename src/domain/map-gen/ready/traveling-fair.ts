/**
 * Feira Itinerante de Lumevento (RPG-101, pedido do usuário em 26/11: "mais mapas, versões
 * maiores"): o circo e a feira que chegam ao campo, num mapa 104×88. No meio, o picadeiro de areia
 * cercado pelas barreiras, com o estandarte e as bandeiras; a noroeste, o acampamento dos artistas
 * com as tendas, as carroças e a fogueira. A avenida da feira corre de oeste a leste com as
 * barracas do mercado e os postes de lanterna; o caminho de entrada sobe do sul até o picadeiro.
 * A nordeste, o lago com os botes; a leste, as mesas de comida e as duas casas do campo; ao sul,
 * os trigais e os bosques.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, rotatedFootprint, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import type { BuildingUse } from '../blueprint';
import { propFootprint } from '../kits';
import { createPlacer } from './placer';
import { createSketch, stampBuildings, type Sketch, type SketchBuilding } from './sketch';

export const TRAVELING_FAIR_SIZE = { width: 104, depth: 88 } as const;

const TILE = { grass: 'grama', dirt: 'terra', sand: 'areia', water: 'agua' } as const;
const PIECE = {
  barrier: 'kay-barreira',
  banner: 'kay-estandarte-triplo',
  redFlag: 'kay-bandeira-vermelha',
  blueFlag: 'kay-bandeira-azul',
  yellowFlag: 'kay-bandeira-amarela',
  greenFlag: 'kay-bandeira-verde',
  tent: 'kay-tenda',
  wagon: 'med-carroca',
  campfire: 'cav-fogueira',
  market: 'kay-mercado',
  yellowMarket: 'kay-mercado-amarelo',
  greenMarket: 'kay-mercado-verde',
  feastTable: 'kay-mesa-banquete-toalha',
  lamp: 'kay-poste-lanterna',
  crates: 'kay-caixotes',
  wheat: 'kay-trigal',
  grove: 'kay-bosque',
  tree: 'kay-arvore-vila',
  torch: 'tocha',
  barrel: 'barril',
  boat: 'med-bote',
  rock: 'rocha',
} as const;

/** O picadeiro, o lago, a avenida da feira e o caminho de entrada. */
const ARENA: CellRect = { x: 40, z: 30, width: 24, depth: 20 };
const POND: CellRect = { x: 76, z: 8, width: 18, depth: 12 };
const AVENUE: CellRect = { x: 0, z: 56, width: 104, depth: 4 };
const ENTRY_PATH: CellRect = { x: 50, z: 51, width: 4, depth: 37 };
const CAMP: CellRect = { x: 6, z: 8, width: 34, depth: 18 };
/** A boca do picadeiro, no lado sul, na frente do caminho de entrada. */
const MOUTH = { from: ENTRY_PATH.x - 1, to: ENTRY_PATH.x + ENTRY_PATH.width } as const;
/** A barreira tem 3×1; girada um quarto de volta, fica 1×3 nos lados do picadeiro. */
const BARRIER_LENGTH = 3;
const SIDEWAYS = 1;

/** Giro da planta: as portas ficam ao norte (0). */
const DOOR = { north: 0 } as const;
const HOUSE_SIDE = 6;

type Plan = { readonly x: number; readonly z: number; readonly use?: BuildingUse };

function fairBuildings(): SketchBuilding[] {
  const plans: Plan[] = [
    { x: 8, z: 40, use: 'shop' },
    { x: 84, z: 40 },
    { x: 92, z: 40 },
  ];
  return plans.map((plan, i) => ({
    style: 'medieval',
    use: plan.use ?? 'house',
    x: plan.x,
    z: plan.z,
    width: HOUSE_SIDE,
    depth: HOUSE_SIDE,
    stories: i === 1 ? 2 : 1,
    rotation: DOOR.north,
    level: 0,
    variant: i + 1,
  }));
}

function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...TRAVELING_FAIR_SIZE }, TILE.grass);
  sketch.ground(CAMP, TILE.dirt);
  sketch.ground(AVENUE, TILE.dirt);
  sketch.ground(ENTRY_PATH, TILE.dirt);
  sketch.ground(ARENA, TILE.sand);
  sketch.ground(POND, TILE.water);
}

const inside = (cell: Cell, r: CellRect) =>
  cell.x >= r.x && cell.x < r.x + r.width && cell.z >= r.z && cell.z < r.z + r.depth;
const at = (x: number, z: number): Cell => ({ x, z });
/** Só os botes e as pedras ficam no lago. */
const AFLOAT = new Set<string>([PIECE.boat, PIECE.rock]);
const isWet = (cell: Cell) => inside(cell, POND);

export function buildTravelingFairMap(): AssembledMap {
  const sketch = createSketch(TRAVELING_FAIR_SIZE, null);
  lay(sketch);
  const indoors = stampBuildings(sketch, fairBuildings());
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
          if (isWet(spot) !== AFLOAT.has(piece))
            throw new Error(`${piece} fora do lugar (água?) em ${spot.x},${spot.z}.`);
        }
      }
      placer(piece, cell, rotation);
    }
  };

  // O picadeiro: as barreiras em volta, abertas na boca sul, o estandarte e as bandeiras.
  const north: Cell[] = [];
  const south: Cell[] = [];
  for (let x = ARENA.x; x + BARRIER_LENGTH <= ARENA.x + ARENA.width; x += BARRIER_LENGTH) {
    north.push(at(x, ARENA.z - 1));
    const clear = x + BARRIER_LENGTH - 1 < MOUTH.from || x > MOUTH.to;
    if (clear) south.push(at(x, ARENA.z + ARENA.depth));
  }
  place(PIECE.barrier, [...north, ...south]);
  const sides: Cell[] = [];
  for (let z = ARENA.z; z + BARRIER_LENGTH <= ARENA.z + ARENA.depth; z += BARRIER_LENGTH) {
    sides.push(at(ARENA.x - 1, z), at(ARENA.x + ARENA.width, z));
  }
  place(PIECE.barrier, sides, SIDEWAYS);
  place(PIECE.banner, [at(50, 39)]);
  place(PIECE.redFlag, [at(45, 34), at(58, 44)]);
  place(PIECE.blueFlag, [at(58, 34), at(45, 44)]);
  place(PIECE.crates, [at(42, 32)]);
  place(PIECE.barrel, [at(61, 47), at(62, 47)]);
  place(PIECE.yellowFlag, [at(37, 26), at(66, 26)]);
  place(PIECE.greenFlag, [at(37, 52), at(66, 52)]);
  // O acampamento dos artistas: as tendas, as carroças, a fogueira e as tochas.
  for (const x of [8, 14, 20, 26]) place(PIECE.tent, [at(x, 10), at(x, 18)]);
  place(PIECE.wagon, [at(32, 10), at(35, 10), at(32, 18), at(35, 18)]);
  place(PIECE.campfire, [at(17, 24)]);
  place(PIECE.torch, [at(12, 24), at(24, 24)]);
  place(PIECE.barrel, [at(30, 24), at(31, 24)]);
  // A avenida da feira: as barracas do mercado e os postes de lanterna.
  place(PIECE.market, [at(14, 62), at(80, 62)]);
  place(PIECE.yellowMarket, [at(28, 62)]);
  place(PIECE.greenMarket, [at(66, 62)]);
  for (const x of [6, 20, 34, 46, 58, 72, 86, 98]) place(PIECE.lamp, [at(x, 55), at(x, 60)]);
  // As mesas de comida perto das casas do campo.
  place(PIECE.feastTable, [at(70, 36), at(74, 36), at(78, 36)]);
  place(PIECE.barrel, [at(72, 40), at(73, 40)]);
  // O lago: os botes e a pedra.
  place(PIECE.boat, [at(82, 12), at(88, 10)]);
  place(PIECE.rock, [at(90, 16), at(78, 17)]);
  // Os trigais e os bosques do sul, e as árvores do campo.
  place(PIECE.wheat, [at(30, 70), at(60, 72)]);
  place(PIECE.grove, [at(2, 76), at(93, 76)]);
  place(PIECE.tree, [
    at(72, 6),
    at(96, 4),
    at(96, 22),
    at(78, 22),
    at(46, 6),
    at(58, 10),
    at(6, 30),
    at(30, 40),
    at(24, 48),
    at(4, 50),
    at(96, 30),
    at(70, 26),
    at(14, 70),
    at(44, 80),
    at(78, 78),
  ]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'vila', backdrop: 'village' },
  });
}
