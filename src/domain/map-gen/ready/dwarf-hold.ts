/**
 * Fortaleza de Khazdur (RPG-93, pedido do usuário em 26/11: "mais mapas, versões maiores"): uma
 * cidade anã escavada na montanha, num mapa 104×88. No alto, o salão do rei com o pátio murado,
 * as torres e os pilares; a oeste dele, o bairro das forjas; a leste, as casas dos clãs. A rua
 * das lanternas corta a cidade de leste a oeste e a avenida desce do portão do rei, passa pela
 * praça do mercado e cruza o abismo pela ponte de pedra. Do outro lado, a oeste, as minas com
 * os túneis, os carrinhos e as pilhas de pedra; a leste, o lago subterrâneo com o quartel da
 * guarda e a segunda ponte. No fundo da avenida, a escadaria desce para as profundezas.
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

export const DWARF_HOLD_SIZE = { width: 104, depth: 88 } as const;

const TILE = { stone: 'piso-pedra', dirt: 'terra', water: 'agua' } as const;
const WALL_STYLE = 'parede-pedra';
const PIECE = {
  mountainA: 'kay-montanha-a',
  mountainB: 'kay-montanha-b',
  mountainC: 'kay-montanha-c',
  bridge: 'kay-ponte-pedra',
  bridgeB: 'kay-ponte-b',
  stoneTower: 'kay-torre-pedra',
  barracks: 'kay-quartel',
  smithy: 'kay-ferraria',
  mine: 'kay-mina',
  mineYard: 'kay-terreno-mina',
  tunnel: 'kay-tunel',
  stairs: 'kay-escada-pedra',
  stall: 'kay-mercado',
  stallGreen: 'kay-mercado-verde',
  tent: 'kay-tenda',
  well: 'kay-poco',
  wellGreen: 'kay-poco-verde',
  fountain: 'pra-fonte',
  statue: 'pra-estatua-grande',
  pillar: 'kay-pilar-ornado',
  banner: 'kay-estandarte-azul',
  goldArms: 'kay-espada-escudo-ouro',
  arms: 'kay-espada-escudo',
  oven: 'kay-forno',
  stove: 'kay-fogareiro',
  barrel: 'barril',
  aleKeg: 'kay-barril-chope',
  crate: 'med-caixote',
  stones: 'kay-pilha-pedras',
  boulderA: 'kay-pedra-a',
  boulderE: 'kay-pedra-e',
  logs: 'kay-pilha-madeira',
  cart: 'kay-carrinho-mao',
  bench: 'kay-banco-rua',
  campfire: 'cav-fogueira',
  torch: 'tocha',
  lamp: 'kay-poste-lanterna',
  mushrooms: 'nat-cogumelos',
  boat: 'med-bote',
  rock: 'rocha',
} as const;

/** O pátio do rei, as ruas, os bairros, o abismo e o lago; as minas ficam na terra batida. */
const KING_YARD: CellRect = { x: 36, z: 12, width: 32, depth: 20 };
const CROSS_STREET: CellRect = { x: 2, z: 32, width: 100, depth: 4 };
const AVENUE: CellRect = { x: 50, z: 32, width: 4, depth: 56 };
const FORGES: CellRect = { x: 4, z: 12, width: 30, depth: 18 };
const CLAN_HOMES: CellRect = { x: 70, z: 12, width: 30, depth: 18 };
const MARKET: CellRect = { x: 36, z: 38, width: 32, depth: 12 };
const CHASM: CellRect = { x: 0, z: 52, width: 104, depth: 8 };
const LAKE: CellRect = { x: 62, z: 66, width: 32, depth: 16 };
/** O portão do pátio, no muro sul, na boca da avenida. */
const KING_GATE = { from: AVENUE.x, to: AVENUE.x + AVENUE.width - 1 } as const;

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

function holdBuildings(): SketchBuilding[] {
  const plans: Plan[] = [
    // O salão do rei, de porta para o pátio.
    { x: 44, z: 14, door: DOOR.south, width: 16, depth: 10, stories: 2 },
    // As duas forjas grandes do bairro oeste.
    { x: 6, z: 14, door: DOOR.south, width: 8, use: 'shop' },
    { x: 18, z: 14, door: DOOR.south, width: 8, stories: 2, use: 'shop' },
    // As casas dos clãs, em duas fileiras de porta para o sul.
    ...[14, 22].flatMap((z, row) =>
      [72, 80, 88].map((x, i) => ({
        x,
        z,
        door: DOOR.south,
        stories: (i + row) % 2 === 0 ? 2 : 1,
      })),
    ),
    // As casas ao sul da rua das lanternas, de porta para o norte, e a cervejaria.
    ...[6, 14, 22].map((x, i) => ({ x, z: 40, door: DOOR.north, stories: i === 1 ? 2 : 1 })),
    ...[72, 80, 88].map((x, i) => ({ x, z: 40, door: DOOR.north, stories: i === 2 ? 2 : 1 })),
    { x: 94, z: 40, door: DOOR.north, use: 'shop' },
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
  sketch.ground({ x: 0, z: 0, ...DWARF_HOLD_SIZE }, TILE.dirt);
  sketch.ground(FORGES, TILE.stone);
  sketch.ground(CLAN_HOMES, TILE.stone);
  sketch.ground(KING_YARD, TILE.stone);
  sketch.ground(MARKET, TILE.stone);
  sketch.ground(CROSS_STREET, TILE.stone);
  sketch.ground(AVENUE, TILE.stone);
  sketch.ground(CHASM, TILE.water);
  sketch.ground(LAKE, TILE.water);
}

/** O muro de pedra do pátio do rei, aberto no portão sul. */
function yardWalls(sketch: Sketch): void {
  const band = { style: WALL_STYLE, level: 0, height: STORY_HEIGHT_STEPS };
  const { x: x0, z: z0, width, depth } = KING_YARD;
  for (let x = x0; x < x0 + width; x += 1) {
    sketch.wall({ x, z: z0, side: 'north', ...band });
    if (x < KING_GATE.from || x > KING_GATE.to)
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
/** Só o bote e a pedra ficam na água; as pontes atravessam o abismo e pousam nas duas bordas. */
const AFLOAT = new Set<string>([PIECE.boat, PIECE.rock]);
const SPANS = new Set<string>([PIECE.bridge, PIECE.bridgeB]);
const isWet = (cell: Cell) => inside(cell, CHASM) || inside(cell, LAKE);

export function buildDwarfHoldMap(): AssembledMap {
  const sketch = createSketch(DWARF_HOLD_SIZE, null);
  lay(sketch);
  yardWalls(sketch);
  const indoors = stampBuildings(sketch, holdBuildings());
  const placer = createPlacer(sketch);
  // Confere todas as casas que a peça ocupa, não só a âncora: a mina tem 8×10.
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

  // A montanha que fecha a cidade ao norte.
  const peaks = [PIECE.mountainA, PIECE.mountainB, PIECE.mountainC];
  for (let i = 0; i < 11; i += 1)
    place(peaks[i % peaks.length] ?? PIECE.mountainA, [at(2 + i * 9, 0)]);
  // O pátio do rei: as torres, a fonte, os pilares do caminho, os estandartes e as armas douradas.
  place(PIECE.stoneTower, [at(37, 13), at(61, 13)]);
  place(PIECE.pillar, [at(47, 26), at(47, 29), at(55, 26), at(55, 29)]);
  place(PIECE.fountain, [at(40, 25), at(61, 25)]);
  place(PIECE.banner, [at(42, 24), at(60, 24)]);
  place(PIECE.goldArms, [at(38, 29), at(64, 29)]);
  place(PIECE.torch, [at(36, 31), at(67, 31), at(49, 31), at(54, 31)]);
  // O bairro das forjas: a ferraria, os fornos, a lenha, o carvão em barris e as pedras.
  place(PIECE.smithy, [at(26, 22)]);
  place(PIECE.oven, [at(8, 22), at(20, 22)]);
  place(PIECE.stove, [at(10, 22)]);
  place(PIECE.barrel, [at(14, 22), at(15, 22), at(14, 23)]);
  place(PIECE.crate, [at(22, 22), at(23, 22)]);
  place(PIECE.stones, [at(5, 26), at(16, 26)]);
  place(PIECE.cart, [at(12, 25)]);
  place(PIECE.logs, [at(27, 13)]);
  place(PIECE.arms, [at(19, 27)]);
  place(PIECE.torch, [at(4, 12), at(33, 12), at(4, 29), at(33, 29)]);
  // As casas dos clãs: o poço, os bancos entre as fileiras e os cogumelos.
  place(PIECE.wellGreen, [at(95, 14)]);
  place(PIECE.bench, [at(75, 20), at(83, 20), at(91, 20)]);
  place(PIECE.mushrooms, [at(78, 28), at(86, 28), at(96, 26)]);
  place(PIECE.torch, [at(70, 12), at(99, 12), at(70, 29), at(99, 29)]);
  // A rua das lanternas, de ponta a ponta.
  place(PIECE.lamp, [at(10, 35), at(26, 35), at(44, 35), at(60, 35), at(78, 35), at(94, 35)]);
  // As casas do sul da rua: o poço e a cervejaria com os barris de chope.
  place(PIECE.well, [at(28, 38)]);
  place(PIECE.barrel, [at(5, 47), at(13, 47)]);
  place(PIECE.aleKeg, [at(95, 47), at(97, 47)]);
  place(PIECE.barrel, [at(99, 46), at(99, 47)]);
  place(PIECE.torch, [at(4, 38), at(34, 48), at(70, 38), at(101, 38)]);
  // A praça do mercado: as bancas, as tendas, as estátuas dos reis e a mercadoria.
  place(PIECE.stall, [at(37, 39)]);
  place(PIECE.stallGreen, [at(58, 39)]);
  place(PIECE.tent, [at(40, 46), at(61, 46)]);
  place(PIECE.statue, [at(47, 46), at(55, 46)]);
  place(PIECE.barrel, [at(46, 40), at(46, 41)]);
  place(PIECE.crate, [at(56, 40), at(56, 41)]);
  place(PIECE.torch, [at(36, 38), at(67, 38), at(36, 49), at(67, 49)]);
  // O abismo: as duas pontes, as pedras lá embaixo e as tochas das cabeceiras.
  place(PIECE.bridge, [at(48, 51)]);
  place(PIECE.bridgeB, [at(84, 51)]);
  place(PIECE.rock, [at(10, 55), at(30, 54), at(70, 56), at(96, 55)]);
  place(PIECE.torch, [at(47, 50), at(56, 50), at(47, 61), at(56, 61)]);
  // As minas: as bocas, o pátio do minério, o túnel, os carrinhos, as pedras e a fogueira.
  place(PIECE.mine, [at(6, 64), at(30, 74)]);
  place(PIECE.mineYard, [at(18, 66), at(18, 78)]);
  place(PIECE.tunnel, [at(36, 63)]);
  place(PIECE.cart, [at(16, 74), at(26, 70)]);
  place(PIECE.stones, [at(24, 64), at(28, 66), at(10, 78), at(14, 82)]);
  place(PIECE.boulderA, [at(40, 70)]);
  place(PIECE.boulderE, [at(4, 80)]);
  place(PIECE.barrel, [at(15, 64), at(15, 65)]);
  place(PIECE.crate, [at(16, 64)]);
  place(PIECE.logs, [at(24, 84)]);
  place(PIECE.campfire, [at(26, 76)]);
  place(PIECE.torch, [at(5, 62), at(43, 62), at(17, 72), at(29, 72), at(43, 84)]);
  // A avenida do sul: a torre da ponte, as estátuas e a escadaria para as profundezas.
  place(PIECE.stoneTower, [at(56, 62)]);
  place(PIECE.statue, [at(47, 70), at(55, 70)]);
  place(PIECE.lamp, [at(49, 64), at(54, 64), at(49, 78), at(54, 78)]);
  place(PIECE.stairs, [at(50, 84)]);
  // O lago subterrâneo: os botes, as pedras, o quartel da guarda e as lanternas da margem.
  place(PIECE.boat, [at(70, 70), at(84, 76)]);
  place(PIECE.rock, [at(66, 68), at(90, 78), at(78, 80)]);
  place(PIECE.barracks, [at(96, 62)]);
  place(PIECE.lamp, [at(60, 70), at(95, 72), at(62, 84), at(94, 84)]);
  place(PIECE.mushrooms, [at(98, 80), at(64, 84), at(80, 84)]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'masmorra', backdrop: 'dungeon' },
  });
}
