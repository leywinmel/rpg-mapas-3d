/**
 * Vinícola de Monterrubro (RPG-102, pedido do usuário em 26/11: "mais mapas, versões maiores"): a
 * quinta de vinho na encosta, num mapa 104×88. Ao norte, a encosta com os morros; no meio, as
 * fileiras de vinhedos (campos de trigal fazem as vezes de lavoura) separadas por cercas. A estrada
 * sobe do sul até o pátio do casarão, com o poço, a adega e as casas dos trabalhadores. A leste, o
 * açude com os botes e o moinho-d’água; a oeste, o pomar e o bosque.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, rotatedFootprint, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import type { BuildingUse } from '../blueprint';
import { propFootprint } from '../kits';
import { createPlacer } from './placer';
import { createSketch, stampBuildings, type Sketch, type SketchBuilding } from './sketch';

export const VINEYARD_SIZE = { width: 104, depth: 88 } as const;

const TILE = { grass: 'grama', dirt: 'terra', stone: 'piso-pedra', water: 'agua' } as const;
const PIECE = {
  hills: 'kay-colinas',
  mound: 'kay-morro',
  field: 'kay-trigal',
  fence: 'kay-cerca-madeira',
  windmill: 'kay-moinho-vento',
  waterMill: 'kay-moinho-agua',
  well: 'kay-poco',
  cart: 'med-carroca',
  crates: 'kay-caixotes',
  pallet: 'kay-palete',
  keg: 'kay-barril-chope',
  grove: 'kay-bosque',
  tree: 'kay-arvore-vila',
  lamp: 'kay-poste-lanterna',
  barrel: 'barril',
  boat: 'med-bote',
  rock: 'rocha',
} as const;

/** O pátio do casarão, a estrada, a trilha entre os vinhedos e o açude. */
const COURTYARD: CellRect = { x: 38, z: 50, width: 30, depth: 18 };
const ROAD: CellRect = { x: 51, z: 68, width: 4, depth: 20 };
const VINE_LANE: CellRect = { x: 0, z: 44, width: 104, depth: 3 };
const POND: CellRect = { x: 80, z: 52, width: 18, depth: 14 };

/** Giro da planta: a porta fica ao norte (0) ou ao sul (2). */
const DOOR = { north: 0, south: 2 } as const;
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

function estateBuildings(): SketchBuilding[] {
  const plans: Plan[] = [
    // O casarão, de porta para o pátio.
    { x: 46, z: 60, door: DOOR.north, width: 12, depth: 8, stories: 2 },
    // A adega, comprida e baixa, a oeste do pátio.
    { x: 38, z: 60, door: DOOR.north, width: 6, depth: 8, use: 'shop' },
    // As casas dos trabalhadores, a leste.
    { x: 62, z: 60, door: DOOR.north },
    { x: 62, z: 72, door: DOOR.south },
    { x: 40, z: 74, door: DOOR.north },
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
  sketch.ground({ x: 0, z: 0, ...VINEYARD_SIZE }, TILE.grass);
  sketch.ground(VINE_LANE, TILE.dirt);
  sketch.ground(COURTYARD, TILE.stone);
  sketch.ground(ROAD, TILE.dirt);
  sketch.ground(POND, TILE.water);
}

const inside = (cell: Cell, r: CellRect) =>
  cell.x >= r.x && cell.x < r.x + r.width && cell.z >= r.z && cell.z < r.z + r.depth;
const at = (x: number, z: number): Cell => ({ x, z });
/** Só os botes e as pedras ficam no açude. */
const AFLOAT = new Set<string>([PIECE.boat, PIECE.rock]);
const isWet = (cell: Cell) => inside(cell, POND);

export function buildVineyardMap(): AssembledMap {
  const sketch = createSketch(VINEYARD_SIZE, null);
  lay(sketch);
  const indoors = stampBuildings(sketch, estateBuildings());
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

  // A encosta do norte: os morros e as colinas.
  place(PIECE.hills, [at(2, 2), at(26, 2), at(50, 2), at(74, 2), at(94, 2)]);
  place(PIECE.mound, [at(12, 4), at(38, 4), at(62, 4), at(86, 10)]);
  // As fileiras de vinhedos em dois andares da encosta, com as cercas entre elas.
  for (const x of [4, 18, 32, 46, 60, 74, 88]) place(PIECE.field, [at(x, 14), at(x, 30)]);
  for (const x of [15, 29, 43, 57, 71, 85]) place(PIECE.fence, [at(x, 15), at(x, 31)]);
  place(PIECE.windmill, [at(4, 47)]);
  // O pátio do casarão: o poço, a carroça com a colheita, os barris e as lanternas.
  place(PIECE.well, [at(52, 52)]);
  place(PIECE.cart, [at(41, 52), at(58, 52)]);
  place(PIECE.crates, [at(44, 53), at(64, 52)]);
  place(PIECE.pallet, [at(46, 56)]);
  place(PIECE.keg, [at(38, 58), at(40, 58)]);
  place(PIECE.barrel, [at(56, 57), at(57, 57), at(60, 57)]);
  place(PIECE.lamp, [at(39, 50), at(66, 50), at(50, 69), at(56, 69), at(50, 80), at(56, 80)]);
  // O açude, o moinho-d’água na margem e os botes.
  place(PIECE.waterMill, [at(74, 54)]);
  place(PIECE.boat, [at(86, 56), at(92, 60)]);
  place(PIECE.rock, [at(82, 63), at(95, 54)]);
  // O pomar e o bosque a oeste, e as árvores do campo.
  for (const x of [8, 14, 20, 26]) place(PIECE.tree, [at(x, 56), at(x, 63)]);
  place(PIECE.grove, [at(2, 74), at(92, 74)]);
  place(PIECE.tree, [at(30, 72), at(72, 80), at(80, 70), at(100, 48), at(20, 82)]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'vila', backdrop: 'village' },
  });
}
