/**
 * Aldeia de Ribeira Clara (RPG-96, pedido do usuário em 26/11: "mais mapas, versões maiores"):
 * uma aldeia de lavradores na época da colheita, num mapa 104×88. A estrada do vale cruza o
 * ribeirão por uma ponte de pedra e encontra a estrada do norte na praça, com o poço e as
 * barracas da feira. Ao norte, o pomar, o moinho d'água na margem e os trigais com os moinhos de
 * vento. Ao sul, a capela, as hortas, a serraria com a lenha e, a leste, o pasto cercado e o
 * celeiro grande com o terreiro. Do outro lado do ribeirão, só o pinheiral. A Fazenda do Vale
 * Dourado é o campo de uma família só; esta é a aldeia inteira, com a praça no meio.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, rotatedFootprint, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import type { BuildingUse } from '../blueprint';
import { propFootprint } from '../kits';
import { createPlacer } from './placer';
import { createSketch, stampBuildings, type Sketch, type SketchBuilding } from './sketch';

export const HARVEST_VILLAGE_SIZE = { width: 104, depth: 88 } as const;

const TILE = { grass: 'grama', dirt: 'terra', stone: 'piso-pedra', water: 'agua' } as const;
const PIECE = {
  bridge: 'kay-ponte-pedra',
  waterMill: 'kay-moinho-agua',
  windmill: 'kay-moinho-vento',
  windmillRed: 'kay-moinho-vermelho',
  wheat: 'kay-trigal',
  sawmill: 'kay-serraria',
  chapel: 'kay-igreja',
  well: 'kay-poco',
  tent: 'kay-tenda',
  bench: 'kay-banco-rua',
  lamp: 'kay-poste-lanterna',
  fence: 'kay-cerca-madeira',
  fenceGate: 'kay-cerca-madeira-portao',
  waterTower: 'kay-caixa-dagua',
  woodPile: 'kay-pilha-madeira',
  stumps: 'kay-tocos-cortados',
  wheelbarrow: 'kay-carrinho-mao',
  pallet: 'kay-palete',
  cart: 'med-carroca',
  bed: 'pra-canteiro',
  villageTree: 'kay-arvore-vila',
  oak: 'nat-carvalho',
  pine: 'nat-pinheiro',
  grass: 'nat-capim',
  flowers: 'nat-flores',
  bush: 'nat-arbusto',
  barrel: 'barril',
  crate: 'med-caixote',
  boat: 'med-bote',
  rock: 'rocha',
} as const;

/** O ribeirão, as estradas, a praça, os campos, as hortas e o terreiro do celeiro. */
const RIVER: CellRect = { x: 6, z: 0, width: 6, depth: 88 };
const VALLEY_ROAD: CellRect = { x: 0, z: 42, width: 104, depth: 4 };
const NORTH_ROAD: CellRect = { x: 50, z: 0, width: 4, depth: 88 };
const PLAZA: CellRect = { x: 42, z: 36, width: 20, depth: 16 };
const FIELDS: CellRect = { x: 58, z: 0, width: 46, depth: 27 };
const GARDENS: CellRect = { x: 26, z: 64, width: 22, depth: 20 };
const FARMYARD: CellRect = { x: 80, z: 60, width: 22, depth: 6 };

/** Giro da planta: a porta fica ao norte (0) ou ao sul (2); o giro de lado troca largura e fundo. */
const DOOR = { north: 0, south: 2 } as const;
/** Lado das casas comuns da aldeia. */
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

function villageBuildings(): SketchBuilding[] {
  const plans: Plan[] = [
    // As casas do lado de cima da estrada, de porta para ela.
    ...[20, 28, 64, 72, 80, 88].map((x, i) => ({
      x,
      z: 28,
      door: DOOR.south,
      stories: i % 3 === 1 ? 2 : 1,
    })),
    // As do lado de baixo, de porta para o norte; a primeira depois da praça é a venda.
    ...[20, 28, 64, 72, 80, 88].map((x, i) => ({
      x,
      z: 54,
      door: DOOR.north,
      stories: i % 2 === 0 ? 1 : 2,
      use: x === 64 ? ('shop' as const) : undefined,
    })),
    // O celeiro grande, de porta para o terreiro.
    { x: 84, z: 66, door: DOOR.north, width: 12, depth: 10, stories: 2 },
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
  sketch.ground({ x: 0, z: 0, ...HARVEST_VILLAGE_SIZE }, TILE.grass);
  sketch.ground(FIELDS, TILE.dirt);
  sketch.ground(GARDENS, TILE.dirt);
  sketch.ground(FARMYARD, TILE.dirt);
  sketch.ground(VALLEY_ROAD, TILE.dirt);
  sketch.ground(NORTH_ROAD, TILE.dirt);
  sketch.ground(PLAZA, TILE.stone);
  sketch.ground(RIVER, TILE.water);
}

const inside = (cell: Cell, r: CellRect) =>
  cell.x >= r.x && cell.x < r.x + r.width && cell.z >= r.z && cell.z < r.z + r.depth;
const at = (x: number, z: number): Cell => ({ x, z });
/** Só o bote e as pedras ficam no ribeirão; a ponte o atravessa e pousa nas duas margens. */
const AFLOAT = new Set<string>([PIECE.boat, PIECE.rock]);
const SPANS = new Set<string>([PIECE.bridge]);
const isWet = (cell: Cell) => inside(cell, RIVER);
/** Um quarto de volta: a ponte cruza o ribeirão de oeste a leste e a cerca corre ao longo de x. */
const ACROSS = 1;
/** Lado de um lance da cerca de madeira. */
const FENCE_RUN = 6;

/** O pasto cercado a leste: quatro lados de lances de cerca, com a porteira no norte. */
function pastureFence(place: (piece: string, cells: readonly Cell[], rotation?: number) => void) {
  const x0 = 60;
  const z0 = 64;
  const runs = 3;
  const x1 = x0 + runs * FENCE_RUN - 1;
  const z1 = z0 + 2 * FENCE_RUN + 1;
  for (let i = 0; i < runs; i += 1) {
    const x = x0 + i * FENCE_RUN;
    place(i === 1 ? PIECE.fenceGate : PIECE.fence, [at(x, z0)], ACROSS);
    place(PIECE.fence, [at(x, z1)], ACROSS);
  }
  for (const z of [z0 + 1, z0 + 1 + FENCE_RUN]) place(PIECE.fence, [at(x0, z), at(x1, z)]);
}

export function buildHarvestVillageMap(): AssembledMap {
  const sketch = createSketch(HARVEST_VILLAGE_SIZE, null);
  lay(sketch);
  const indoors = stampBuildings(sketch, villageBuildings());
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

  // A ponte de pedra da estrada do vale e o moinho d'água na margem leste.
  place(PIECE.bridge, [at(4, 40)], ACROSS);
  place(PIECE.waterMill, [at(12, 20)]);
  place(PIECE.rock, [at(9, 30), at(7, 70), at(10, 84)]);
  place(PIECE.boat, [at(8, 10)]);
  // O pinheiral do outro lado do ribeirão.
  for (const z of [2, 8, 14, 20, 26, 32, 50, 56, 62, 68, 74, 80, 86])
    place(PIECE.pine, [at(z % 4 === 0 ? 1 : 3, z)]);
  // O pomar do norte.
  for (const z of [4, 10, 16, 22]) {
    for (const x of [18, 24, 30, 36, 42]) {
      place((x + z) % 4 === 0 ? PIECE.villageTree : PIECE.oak, [at(x, z)]);
    }
  }
  // Os trigais e os moinhos de vento.
  for (const z of [2, 15]) place(PIECE.wheat, [at(60, z), at(72, z), at(84, z)]);
  place(PIECE.windmill, [at(96, 4)]);
  place(PIECE.windmillRed, [at(96, 16)]);
  place(PIECE.wheelbarrow, [at(56, 10)]);
  place(PIECE.cart, [at(55, 18)]);
  // A praça: o poço, as barracas da feira, os bancos e os lampiões dos cantos.
  place(PIECE.well, [at(45, 37)]);
  place(PIECE.tent, [at(56, 37), at(45, 47), at(56, 47)]);
  place(PIECE.bench, [at(42, 37), at(59, 41)]);
  place(PIECE.crate, [at(55, 41), at(49, 49)]);
  place(PIECE.barrel, [at(54, 49), at(55, 49)]);
  place(PIECE.lamp, [at(43, 50), at(60, 50), at(61, 36)]);
  // Os lampiões ao longo da estrada do vale.
  for (const x of [16, 28, 38, 66, 78, 90, 100]) place(PIECE.lamp, [at(x, 41), at(x, 46)]);
  // A capela e as flores da frente.
  place(PIECE.chapel, [at(36, 54)]);
  place(PIECE.flowers, [at(35, 53), at(41, 53)]);
  // As hortas: fileiras de canteiros.
  for (let z = 66; z <= 81; z += 3) {
    for (let x = 27; x <= 45; x += 3) place(PIECE.bed, [at(x, z)]);
  }
  // A serraria, a lenha e o toco da derrubada.
  place(PIECE.sawmill, [at(13, 64)]);
  place(PIECE.woodPile, [at(21, 64), at(21, 67)]);
  place(PIECE.stumps, [at(13, 76)]);
  // O pasto cercado, com a carroça de feno e o capim.
  pastureFence(place);
  place(PIECE.cart, [at(66, 70)]);
  place(PIECE.grass, [at(62, 66), at(70, 67), at(74, 73), at(63, 75), at(71, 76)]);
  place(PIECE.bush, [at(75, 66)]);
  // O terreiro do celeiro: carroça, lenha, carrinho, barris, paletes e a caixa d'água.
  place(PIECE.cart, [at(82, 61)]);
  place(PIECE.woodPile, [at(88, 62)]);
  place(PIECE.wheelbarrow, [at(94, 61)]);
  place(PIECE.barrel, [at(97, 62), at(98, 62)]);
  place(PIECE.waterTower, [at(99, 62)]);
  place(PIECE.pallet, [at(98, 70), at(98, 73)]);
  place(PIECE.crate, [at(97, 66), at(97, 67)]);
  // As árvores soltas do sul.
  place(PIECE.oak, [at(56, 60), at(56, 70), at(56, 80), at(80, 84), at(92, 84), at(100, 80)]);
  place(PIECE.bush, [at(24, 84), at(48, 86)]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'vila', backdrop: 'forest' },
  });
}
