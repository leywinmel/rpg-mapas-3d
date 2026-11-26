/**
 * Burgo de Morvane (RPG-95, pedido do usuário em 26/11: "mais mapas, versões maiores"): uma cidade
 * gótica sob o domínio de um conde vampiro, num mapa 104×88. O rio corta a cidade de leste a oeste,
 * com duas pontes. Ao norte, o castelo do conde no pátio murado, a catedral com a torre do sino e
 * a capela, e as casas estreitas do bairro velho. Ao sul, a praça do cadafalso com o mercado
 * noturno, as vielas das casas, o cemitério cercado de ferro com os mausoléus e, no fundo da
 * rua principal, a muralha com o portão da cidade.
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

export const GOTHIC_TOWN_SIZE = { width: 104, depth: 88 } as const;

const TILE = { grass: 'grama', dirt: 'terra', stone: 'piso-pedra', water: 'agua' } as const;
const WALL_STYLE = 'parede-pedra';
const PIECE = {
  castle: 'kay-castelo',
  stoneTower: 'kay-torre-pedra',
  chapel: 'kay-igreja',
  bridge: 'kay-ponte-pedra',
  bridgeB: 'kay-ponte-b',
  scaffold: 'kay-andaime',
  wall: 'kay-muralha',
  wallGate: 'kay-muralha-portao',
  stall: 'kay-mercado',
  well: 'kay-poco',
  fountain: 'pra-fonte',
  bigStatue: 'pra-estatua-grande',
  statue: 'estatua',
  mausoleum: 'kay-mausoleu',
  grave: 'kay-cova-terra',
  ironFence: 'kay-cerca-ferro',
  cemeteryGate: 'kay-portao-cemiterio',
  cemeteryArch: 'kay-arco-cemiterio',
  banner: 'kay-estandarte-vermelho',
  lamp: 'kay-poste-lanterna',
  torch: 'tocha',
  barrel: 'barril',
  crate: 'med-caixote',
  skull: 'kay-cranio',
  bones: 'mas-ossos',
  deadTree: 'nat-arvore-seca',
  boat: 'med-bote',
  rock: 'rocha',
} as const;

/** O rio, as ruas, as vielas, o pátio do castelo, o adro da catedral, a praça e o cemitério. */
const RIVER: CellRect = { x: 0, z: 40, width: 104, depth: 6 };
const NORTH_ROW: CellRect = { x: 0, z: 34, width: 104, depth: 4 };
const SOUTH_ROW: CellRect = { x: 0, z: 48, width: 104, depth: 3 };
const MAIN_STREET: CellRect = { x: 50, z: 20, width: 4, depth: 68 };
const CASTLE_YARD: CellRect = { x: 70, z: 4, width: 30, depth: 30 };
const CATHEDRAL_CLOSE: CellRect = { x: 32, z: 2, width: 34, depth: 32 };
const PLAZA: CellRect = { x: 38, z: 52, width: 28, depth: 16 };
const CEMETERY_PATH: CellRect = { x: 84, z: 53, width: 2, depth: 33 };
const LANES: readonly CellRect[] = [
  { x: 2, z: 11, width: 28, depth: 3 },
  { x: 2, z: 22, width: 28, depth: 3 },
  { x: 2, z: 59, width: 34, depth: 3 },
  { x: 2, z: 71, width: 34, depth: 3 },
];
/** O portão do castelo, no muro sul, de frente para a rua do norte. */
const CASTLE_GATE = { from: 82, to: 85 } as const;

/** Giro da planta: a porta fica ao norte (0) ou ao sul (2); o giro de lado troca largura e fundo. */
const DOOR = { north: 0, south: 2 } as const;
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

function townBuildings(): SketchBuilding[] {
  const plans: Plan[] = [
    // A catedral, de porta para o adro.
    { x: 34, z: 4, door: DOOR.south, width: 14, depth: 16, stories: 2 },
    // O bairro velho: três fileiras de casas estreitas, de porta para o sul.
    ...[4, 16, 26].flatMap((z, row) =>
      [3, 11, 19].map((x, i) => ({ x, z, door: DOOR.south, stories: (i + row) % 2 === 0 ? 2 : 1 })),
    ),
    // As vielas do sul: três fileiras de porta para o norte; a do meio tem a taverna.
    ...[52, 64, 76].flatMap((z, row) =>
      [3, 11, 19, 27].map((x, i) => ({
        x,
        z,
        door: DOOR.north,
        stories: (i + row) % 3 === 0 ? 1 : 2,
        use: row === 1 && i === 3 ? ('shop' as const) : undefined,
      })),
    ),
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
  sketch.ground({ x: 0, z: 0, ...GOTHIC_TOWN_SIZE }, TILE.grass);
  sketch.ground(CATHEDRAL_CLOSE, TILE.stone);
  sketch.ground(CASTLE_YARD, TILE.stone);
  sketch.ground(PLAZA, TILE.stone);
  for (const lane of LANES) sketch.ground(lane, TILE.stone);
  sketch.ground(NORTH_ROW, TILE.stone);
  sketch.ground(SOUTH_ROW, TILE.stone);
  sketch.ground(MAIN_STREET, TILE.stone);
  sketch.ground(CEMETERY_PATH, TILE.dirt);
  sketch.ground(RIVER, TILE.water);
}

/** O muro de pedra do pátio do castelo, aberto no portão sul. */
function castleWalls(sketch: Sketch): void {
  const band = { style: WALL_STYLE, level: 0, height: STORY_HEIGHT_STEPS };
  const { x: x0, z: z0, width, depth } = CASTLE_YARD;
  for (let x = x0; x < x0 + width; x += 1) {
    sketch.wall({ x, z: z0, side: 'north', ...band });
    if (x < CASTLE_GATE.from || x > CASTLE_GATE.to)
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
/** Só o bote e a pedra ficam no rio; as pontes o atravessam e pousam nas duas margens. */
const AFLOAT = new Set<string>([PIECE.boat, PIECE.rock]);
const SPANS = new Set<string>([PIECE.bridge, PIECE.bridgeB]);
const isWet = (cell: Cell) => inside(cell, RIVER);
/** A cerca do lado oeste do cemitério gira um quarto de volta para correr de norte a sul. */
const ALONG_Z = 1;

export function buildGothicTownMap(): AssembledMap {
  const sketch = createSketch(GOTHIC_TOWN_SIZE, null);
  lay(sketch);
  castleWalls(sketch);
  const indoors = stampBuildings(sketch, townBuildings());
  const placer = createPlacer(sketch);
  // Confere todas as casas que a peça ocupa, não só a âncora: o castelo tem 10×11.
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

  // O castelo do conde: as torres, os estandartes, as estátuas, o poço e as árvores secas.
  place(PIECE.castle, [at(79, 8)]);
  place(PIECE.stoneTower, [at(71, 5), at(93, 5)]);
  place(PIECE.banner, [at(78, 22), at(89, 22)]);
  place(PIECE.statue, [at(80, 28), at(87, 28)]);
  place(PIECE.well, [at(92, 20)]);
  place(PIECE.deadTree, [at(72, 26), at(97, 26)]);
  place(PIECE.torch, [at(81, 32), at(86, 32), at(71, 32), at(98, 32)]);
  // A catedral: a torre do sino, a capela com as covas, a fonte e as estátuas do adro.
  place(PIECE.stoneTower, [at(49, 4)]);
  place(PIECE.chapel, [at(58, 6)]);
  place(PIECE.grave, [at(58, 14), at(61, 14)]);
  place(PIECE.fountain, [at(39, 24)]);
  place(PIECE.bigStatue, [at(35, 28), at(45, 28)]);
  place(PIECE.lamp, [at(33, 21), at(48, 21), at(33, 32), at(48, 32)]);
  // O bairro velho: o poço, os barris, os caixotes, as lanternas das vielas e as árvores secas.
  place(PIECE.well, [at(26, 4)]);
  place(PIECE.barrel, [at(9, 4), at(9, 5), at(17, 16)]);
  place(PIECE.crate, [at(18, 16)]);
  place(PIECE.lamp, [at(10, 12), at(18, 23), at(26, 12)]);
  place(PIECE.deadTree, [at(27, 17), at(28, 28)]);
  // As ruas da beira-rio, iluminadas.
  place(PIECE.lamp, [at(8, 37), at(24, 37), at(40, 37), at(60, 37), at(76, 37), at(96, 37)]);
  place(PIECE.lamp, [at(8, 48), at(30, 48), at(44, 48), at(60, 48), at(74, 48), at(96, 48)]);
  // O rio: as duas pontes, as pedras, os botes e as árvores secas das margens.
  place(PIECE.bridge, [at(48, 38)]);
  place(PIECE.bridgeB, [at(14, 38)]);
  place(PIECE.rock, [at(8, 42), at(30, 43), at(70, 41), at(96, 44)]);
  place(PIECE.boat, [at(24, 41), at(80, 42)]);
  place(PIECE.deadTree, [at(4, 38), at(36, 39), at(64, 38), at(90, 46), at(40, 47)]);
  // A praça do cadafalso: o patíbulo, o mercado noturno, a fonte, os crânios e as lanternas.
  place(PIECE.scaffold, [at(55, 54)]);
  place(PIECE.stall, [at(39, 53)]);
  place(PIECE.fountain, [at(42, 62)]);
  place(PIECE.skull, [at(56, 66)]);
  place(PIECE.bones, [at(60, 66)]);
  place(PIECE.lamp, [at(38, 52), at(65, 52), at(38, 67), at(65, 67)]);
  // As vielas do sul: as lanternas, os barris da taverna, o poço e as árvores secas.
  place(PIECE.lamp, [at(10, 60), at(18, 60), at(26, 72)]);
  place(PIECE.barrel, [at(33, 64), at(34, 64)]);
  place(PIECE.crate, [at(9, 64), at(17, 76)]);
  place(PIECE.well, [at(33, 77)]);
  place(PIECE.deadTree, [at(2, 84), at(20, 84), at(34, 86)]);
  // A rua principal até a muralha e o portão da cidade.
  place(PIECE.lamp, [at(49, 72), at(54, 72), at(49, 80), at(54, 80)]);
  place(PIECE.wallGate, [at(47, 83)]);
  place(PIECE.wall, [at(37, 84), at(57, 84)]);
  // O cemitério: a cerca de ferro com o portão, os mausoléus, as covas, os arcos e as árvores secas.
  for (let x = 70; x < 102; x += 2) {
    if (x !== CEMETERY_PATH.x) place(PIECE.ironFence, [at(x, 52)]);
  }
  place(PIECE.cemeteryGate, [at(CEMETERY_PATH.x, 52)]);
  for (let z = 53; z < 85; z += 2) place(PIECE.ironFence, [at(68, z)], ALONG_Z);
  place(PIECE.mausoleum, [at(72, 56), at(78, 56), at(90, 56), at(96, 56)]);
  place(PIECE.mausoleum, [at(72, 70), at(78, 70), at(90, 70), at(96, 70)]);
  for (const z of [62, 66, 76, 80]) {
    place(
      PIECE.grave,
      [72, 75, 78, 81, 88, 91, 94, 97].map((x) => at(x, z)),
    );
  }
  place(PIECE.cemeteryArch, [at(84, 60), at(84, 74)]);
  place(PIECE.lamp, [at(83, 54), at(86, 54)]);
  place(PIECE.skull, [at(86, 65), at(83, 79)]);
  place(PIECE.deadTree, [at(70, 84), at(100, 84), at(100, 64), at(87, 84)]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'floresta', light: 0.55, backdrop: 'forest' },
  });
}
