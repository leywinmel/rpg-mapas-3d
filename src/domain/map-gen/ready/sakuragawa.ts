/**
 * Vila de Sakuragawa (RPG-79, pedido do usuário em 26/11: "mais mapas, versões maiores"): uma vila
 * japonesa inteira num mapa 96×80, para a campanha de samurais. O rio corta a vila de leste a oeste
 * e a ponte de pedra leva a estrada principal de um lado ao outro. Ao norte, as casas das duas
 * fileiras da rua de cima e, a leste, o templo com o pagode, o campanário e o portal torii; entre
 * elas, o jardim do lago e o bambuzal. Ao sul do rio, a rua do mercado com as lojas de frente para a
 * estrada; mais abaixo, o dojo com os bonecos de treino, as casas do sul e as cerejeiras.
 *
 * As casas usam as paredes de madeira e os telhados de beiral curvo do pacote japonês.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import type { BuildingUse } from '../blueprint';
import type { WallSet } from '../kits';
import { createPlacer } from './placer';
import { createSketch, stampBuildings, type Sketch, type SketchBuilding } from './sketch';

export const SAKURAGAWA_SIZE = { width: 96, depth: 80 } as const;

const TILE = {
  grass: 'grama',
  dirt: 'terra',
  stone: 'piso-pedra',
  water: 'agua',
} as const;
const PIECE = {
  torii: 'jap-torii',
  lantern: 'jap-lanterna',
  sakura: 'jap-sakura',
  bamboo: 'jap-bambu',
  pagoda: 'jap-pagode',
  bell: 'jap-campanario',
  incense: 'jap-incensario',
  dummy: 'jap-boneco-treino',
  pine: 'nat-pinheiro',
  grassTuft: 'nat-capim',
  flowers: 'nat-flores',
  rock: 'rocha',
  pebbles: 'nat-seixos',
  barrel: 'barril',
} as const;

const JAPANESE_WALLS: WallSet = {
  plain: 'jap-parede',
  door: 'jap-parede-porta',
  window: 'jap-parede-janela',
  roofs: [
    { key: 'jap-telhado-4x4', footprint: { width: 4, depth: 4 } },
    { key: 'jap-telhado-2x4', footprint: { width: 2, depth: 4 } },
    { key: 'jap-telhado-2x2', footprint: { width: 2, depth: 2 } },
  ],
};

/** O rio, a ponte, as três ruas, o pátio do templo e o lago do jardim. */
const RIVER: CellRect = { x: 0, z: 36, width: 96, depth: 6 };
const BRIDGE: CellRect = { x: 46, z: 36, width: 4, depth: 6 };
const MAIN_ROAD: CellRect = { x: 46, z: 0, width: 4, depth: 80 };
const NORTH_STREET: CellRect = { x: 0, z: 16, width: 96, depth: 3 };
const SOUTH_STREET: CellRect = { x: 0, z: 59, width: 96, depth: 3 };
const TEMPLE_YARD: CellRect = { x: 60, z: 1, width: 34, depth: 14 };
const POND: CellRect = { x: 60, z: 24, width: 8, depth: 5 };

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

let variantCount = 0;
function building(plan: Plan): SketchBuilding {
  variantCount += 1;
  return {
    style: 'medieval',
    use: plan.use ?? 'house',
    x: plan.x,
    z: plan.z,
    width: plan.width ?? HOUSE_SIDE,
    depth: plan.depth ?? HOUSE_SIDE,
    stories: plan.stories ?? 1,
    rotation: plan.door,
    level: 0,
    variant: variantCount,
    walls: JAPANESE_WALLS,
  };
}

function villageBuildings(): SketchBuilding[] {
  variantCount = 0;
  const columns = [4, 12, 20, 28, 36];
  return [
    // As duas fileiras da rua de cima, de porta para a rua.
    ...columns.map((x, i) => building({ x, z: 8, door: DOOR.south, stories: i % 2 ? 2 : 1 })),
    ...columns.map((x) => building({ x, z: 20, door: DOOR.north })),
    // O salão do templo, de porta para o pátio.
    building({ x: 62, z: 3, door: DOOR.south, width: 12, depth: 8 }),
    // A rua do mercado, ao sul do rio: lojas dos dois lados da estrada.
    ...[43, 50].flatMap((z) => [
      building({ x: 38, z, door: DOOR.east, use: 'shop' }),
      building({ x: 52, z, door: DOOR.west, use: 'shop' }),
    ]),
    // O dojo e as casas do sul.
    building({ x: 20, z: 64, door: DOOR.north, width: 12, depth: 8 }),
    ...[60, 68, 76, 84].map((x, i) =>
      building({ x, z: 64, door: DOOR.north, stories: i % 2 ? 1 : 2 }),
    ),
  ];
}

function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...SAKURAGAWA_SIZE }, TILE.grass);
  sketch.ground(TEMPLE_YARD, TILE.stone);
  sketch.ground(NORTH_STREET, TILE.dirt);
  sketch.ground(SOUTH_STREET, TILE.dirt);
  sketch.ground(MAIN_ROAD, TILE.dirt);
  sketch.ground(RIVER, TILE.water);
  sketch.ground(POND, TILE.water);
  sketch.ground(BRIDGE, TILE.stone);
}

const at = (x: number, z: number): Cell => ({ x, z });

export function buildSakuragawaMap(): AssembledMap {
  const sketch = createSketch(SAKURAGAWA_SIZE, null);
  lay(sketch);
  const indoors = stampBuildings(sketch, villageBuildings());
  const placer = createPlacer(sketch);
  const water = (cell: Cell) =>
    [RIVER, POND].some(
      (r) => cell.x >= r.x && cell.x < r.x + r.width && cell.z >= r.z && cell.z < r.z + r.depth,
    );
  const place = (piece: string, cells: readonly Cell[]) => {
    for (const cell of cells) {
      if (indoors.has(`${cell.x},${cell.z}`))
        throw new Error(`${piece} dentro de casa em ${cell.x},${cell.z}.`);
      if (water(cell) && piece !== PIECE.rock)
        throw new Error(`${piece} na água em ${cell.x},${cell.z}.`);
      placer(piece, cell);
    }
  };

  // Os portais: o da entrada da vila e o do templo.
  place(PIECE.torii, [at(46, 1), at(74, 14)]);
  // Lanternas ao longo da estrada principal e no pátio do templo.
  for (const z of [5, 11, 23, 29, 45, 52, 66, 73]) place(PIECE.lantern, [at(45, z), at(50, z)]);
  place(PIECE.lantern, [at(72, 12), at(78, 12), at(45, 34), at(50, 34), at(45, 43), at(50, 43)]);
  // O templo: o pagode, o campanário, o incensário e as cerejeiras do pátio.
  place(PIECE.pagoda, [at(80, 4)]);
  place(PIECE.bell, [at(87, 10)]);
  place(PIECE.incense, [at(75, 9)]);
  place(PIECE.sakura, [at(91, 3), at(62, 12), at(91, 12), at(85, 2)]);
  // O jardim do lago: cerejeiras, pedras e flores em volta da água.
  place(PIECE.sakura, [at(58, 23), at(69, 23), at(58, 30), at(69, 30), at(63, 31)]);
  place(PIECE.rock, [at(61, 25), at(66, 27)]);
  place(PIECE.flowers, [at(60, 30), at(66, 30), at(70, 26)]);
  place(PIECE.pebbles, [at(64, 23)]);
  // O bambuzal, a leste do jardim.
  for (let z = 21; z <= 33; z += 2) {
    for (let x = 76; x <= 92; x += 3) place(PIECE.bamboo, [at(x + (z % 4 === 1 ? 1 : 0), z)]);
  }
  // A beira do rio: capim, pedras e pinheiros.
  place(PIECE.grassTuft, [
    at(3, 34),
    at(14, 35),
    at(30, 34),
    at(60, 35),
    at(84, 34),
    at(8, 43),
    at(26, 42),
    at(70, 42),
    at(90, 43),
  ]);
  place(PIECE.rock, [at(20, 35), at(72, 35), at(36, 42), at(80, 42)]);
  place(PIECE.pine, [at(2, 2), at(40, 4), at(2, 28), at(56, 4), at(94, 20)]);
  // O mercado: barris na frente das lojas.
  place(PIECE.barrel, [at(44, 47), at(44, 54), at(51, 47), at(51, 54)]);
  // O dojo: os bonecos de treino no terreiro.
  place(PIECE.dummy, [at(22, 74), at(25, 74), at(28, 74), at(31, 74)]);
  place(PIECE.lantern, [at(19, 63), at(32, 63)]);
  // As cerejeiras e os pinheiros do sul.
  place(PIECE.sakura, [
    at(4, 66),
    at(10, 70),
    at(6, 76),
    at(38, 72),
    at(56, 75),
    at(72, 76),
    at(88, 76),
    at(93, 70),
  ]);
  place(PIECE.pine, [
    at(2, 50),
    at(12, 46),
    at(24, 50),
    at(30, 46),
    at(64, 46),
    at(76, 50),
    at(88, 46),
  ]);
  place(PIECE.flowers, [at(8, 56), at(20, 54), at(70, 54), at(84, 56)]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'floresta', backdrop: 'forest' },
  });
}
