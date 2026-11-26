/**
 * Bosque de Lothariel (RPG-91, pedido do usuário em 26/11: "mais mapas, versões maiores"): uma
 * cidade élfica no meio da floresta, num mapa 104×88. No alto, o salão da rainha com o pátio, a
 * fonte e as duas torres; dele desce o caminho principal até a praça do conselho, com as bancas
 * do mercado. A oeste, as casas dos elfos em fileiras; a leste, o bairro dos guardiões com a torre
 * de vigia. O caminho da floresta corta o mapa de leste a oeste; ao sul dele, o lago da lua com a
 * ilha da estátua e o moinho d’água, o bosque sagrado dos druidas com o círculo de pedras e,
 * em volta de tudo, a mata fechada.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, rotatedFootprint, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import type { BuildingUse } from '../blueprint';
import { propFootprint } from '../kits';
import { createPlacer } from './placer';
import { createSketch, stampBuildings, type Sketch, type SketchBuilding } from './sketch';

export const LOTHARIEL_SIZE = { width: 104, depth: 88 } as const;

const TILE = { grass: 'grama', dirt: 'terra', stone: 'piso-pedra', water: 'agua' } as const;
const PIECE = {
  bigForest: 'kay-bosque-grande',
  forest: 'kay-bosque',
  treeHill: 'kay-colina-arvores',
  treeHillB: 'kay-colinas-arvores-b',
  treeHillC: 'kay-colinas-arvores-c',
  midTrees: 'kay-arvores-medias',
  stoneTower: 'kay-torre-pedra',
  watchtower: 'kay-torre-verde',
  waterMill: 'kay-moinho-agua',
  well: 'kay-poco-verde',
  stall: 'kay-mercado',
  stallGreen: 'kay-mercado-verde',
  tent: 'kay-tenda',
  fountain: 'pra-fonte',
  statue: 'pra-estatua-grande',
  banner: 'kay-estandarte-verde',
  lamp: 'kay-poste-lanterna',
  altar: 'mas-altar',
  campfire: 'cav-fogueira',
  boat: 'med-bote',
  rock: 'rocha',
  boulder: 'nat-pedregulho',
  oak: 'nat-carvalho',
  birch: 'nat-betula',
  pine: 'nat-pinheiro',
  bush: 'nat-arbusto',
  roses: 'nat-roseira',
  flowers: 'nat-flores',
  mushrooms: 'nat-cogumelos',
} as const;

/** O pátio do salão, os caminhos, a praça do conselho, o lago e a ilha. */
const PALACE_YARD: CellRect = { x: 40, z: 2, width: 24, depth: 16 };
const MAIN_PATH: CellRect = { x: 50, z: 18, width: 4, depth: 70 };
const FOREST_PATH: CellRect = { x: 0, z: 44, width: 104, depth: 4 };
const PLAZA: CellRect = { x: 38, z: 24, width: 28, depth: 18 };
const LAKE: CellRect = { x: 64, z: 52, width: 26, depth: 18 };
const ISLAND: CellRect = { x: 74, z: 58, width: 6, depth: 6 };

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
    // O salão da rainha, de porta para o pátio.
    { x: 44, z: 4, door: DOOR.south, width: 16, depth: 10, stories: 2 },
    // O bairro oeste: três fileiras de casas, de porta para o sul.
    ...[14, 26, 36].flatMap((z, row) =>
      [4, 12, 20, 28].map((x, i) => ({
        x,
        z,
        door: DOOR.south,
        stories: (i + row) % 3 === 0 ? 2 : 1,
      })),
    ),
    // As casas ao sul do caminho da floresta, de porta para o norte.
    ...[6, 16, 26, 36].map((x, i) => ({
      x,
      z: 50,
      door: DOOR.north,
      stories: i % 2 === 0 ? 1 : 2,
    })),
    ...[16, 26, 36].map((x) => ({ x, z: 60, door: DOOR.north })),
    // O bairro dos guardiões, a leste da praça, com a loja do armeiro.
    ...[70, 78, 86].map((x, i) => ({ x, z: 22, door: DOOR.south, stories: i === 1 ? 2 : 1 })),
    { x: 70, z: 34, door: DOOR.south, use: 'shop' as const },
    ...[78, 86, 94].map((x, i) => ({ x, z: 34, door: DOOR.south, stories: i === 2 ? 2 : 1 })),
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
  sketch.ground({ x: 0, z: 0, ...LOTHARIEL_SIZE }, TILE.grass);
  sketch.ground(FOREST_PATH, TILE.dirt);
  sketch.ground(MAIN_PATH, TILE.dirt);
  sketch.ground(PALACE_YARD, TILE.stone);
  sketch.ground(PLAZA, TILE.stone);
  sketch.ground(LAKE, TILE.water);
  sketch.ground(ISLAND, TILE.grass);
}

const inside = (cell: Cell, r: CellRect) =>
  cell.x >= r.x && cell.x < r.x + r.width && cell.z >= r.z && cell.z < r.z + r.depth;
const at = (x: number, z: number): Cell => ({ x, z });
/** Só o bote e a pedra vão para o lago. */
const AFLOAT = new Set<string>([PIECE.boat, PIECE.rock]);
const isWet = (cell: Cell) => inside(cell, LAKE) && !inside(cell, ISLAND);

export function buildLotharielMap(): AssembledMap {
  const sketch = createSketch(LOTHARIEL_SIZE, null);
  lay(sketch);
  const indoors = stampBuildings(sketch, cityBuildings());
  const placer = createPlacer(sketch);
  // Confere todas as casas que a peça ocupa, não só a âncora: os bosques têm até 10×10.
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

  // A mata fechada nos cantos e na borda leste.
  place(PIECE.bigForest, [at(2, 1), at(92, 62), at(64, 74)]);
  place(PIECE.midTrees, [at(14, 2), at(93, 2)]);
  place(PIECE.treeHillB, [at(26, 3)]);
  place(PIECE.treeHill, [at(72, 2)]);
  place(PIECE.forest, [at(82, 3), at(93, 50), at(88, 76)]);
  place(PIECE.treeHillC, [at(76, 76)]);
  // O salão da rainha: as duas torres, a fonte do pátio, os estandartes, as roseiras e lanternas.
  place(PIECE.stoneTower, [at(34, 4), at(64, 4)]);
  place(PIECE.fountain, [at(50, 15)]);
  place(PIECE.banner, [at(43, 15), at(60, 15)]);
  place(PIECE.roses, [at(41, 8), at(62, 8), at(41, 12), at(62, 12)]);
  place(PIECE.lamp, [at(42, 5), at(61, 5)]);
  place(PIECE.statue, [at(47, 20), at(54, 20)]);
  // A praça do conselho: as bancas do mercado, a tenda, a fonte e as flores nos cantos.
  place(PIECE.stallGreen, [at(39, 25), at(39, 34)]);
  place(PIECE.stall, [at(56, 25)]);
  place(PIECE.tent, [at(58, 35)]);
  place(PIECE.fountain, [at(50, 31)]);
  place(PIECE.flowers, [at(38, 24), at(65, 24), at(38, 41), at(65, 41)]);
  place(PIECE.lamp, [at(49, 22), at(54, 22)]);
  // O caminho da floresta e o caminho principal, iluminados.
  place(PIECE.lamp, [
    at(8, 43),
    at(24, 43),
    at(40, 43),
    at(60, 43),
    at(70, 43),
    at(86, 43),
    at(100, 43),
  ]);
  place(PIECE.lamp, [at(16, 48), at(32, 48), at(58, 48), at(76, 48), at(92, 48)]);
  for (const z of [52, 60, 68, 76, 84]) place(PIECE.lamp, [at(49, z), at(54, z)]);
  // O bairro oeste: arbustos entre as casas, o poço e as árvores da borda.
  place(PIECE.bush, [at(11, 24), at(19, 24), at(27, 24), at(11, 34), at(19, 34), at(27, 34)]);
  place(PIECE.well, [at(7, 60)]);
  place(PIECE.oak, [
    at(1, 16),
    at(1, 24),
    at(1, 32),
    at(1, 40),
    at(1, 46),
    at(1, 52),
    at(2, 60),
    at(3, 66),
  ]);
  // O bairro dos guardiões: a torre de vigia e as bétulas.
  place(PIECE.watchtower, [at(96, 24)]);
  place(PIECE.birch, [at(66, 20), at(78, 14), at(92, 14), at(102, 16), at(102, 40)]);
  place(PIECE.pine, [at(100, 20)]);
  place(PIECE.mushrooms, [at(37, 21), at(67, 21)]);
  // O lago da lua: a estátua na ilha, os botes, as pedras, o moinho d’água e as bétulas da margem.
  place(PIECE.statue, [at(76, 60)]);
  place(PIECE.birch, [at(74, 58), at(79, 63)]);
  place(PIECE.boat, [at(66, 54), at(86, 66)]);
  place(PIECE.rock, [at(70, 66), at(84, 54)]);
  place(PIECE.waterMill, [at(57, 52)]);
  place(PIECE.birch, [at(62, 60), at(62, 66), at(91, 56), at(70, 71), at(84, 71)]);
  // O bosque sagrado dos druidas: o círculo de pedras, o altar, a fogueira e os cogumelos.
  place(PIECE.boulder, [at(10, 72), at(20, 72), at(24, 77), at(20, 83), at(10, 83), at(6, 77)]);
  place(PIECE.altar, [at(15, 77)]);
  place(PIECE.campfire, [at(16, 79)]);
  place(PIECE.mushrooms, [at(13, 75), at(19, 80), at(12, 80), at(22, 75)]);
  place(PIECE.oak, [at(4, 70), at(28, 72), at(28, 84), at(3, 86), at(16, 86)]);
  // A mata do sul, entre o caminho principal e o bosque.
  place(PIECE.oak, [
    at(36, 20),
    at(44, 56),
    at(44, 66),
    at(46, 74),
    at(58, 66),
    at(58, 76),
    at(56, 84),
    at(46, 84),
    at(34, 70),
  ]);
  place(PIECE.pine, [at(101, 84), at(101, 76), at(60, 86)]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'vila', backdrop: 'forest' },
  });
}
