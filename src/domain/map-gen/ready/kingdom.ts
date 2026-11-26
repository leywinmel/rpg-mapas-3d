/**
 * Reino de Valdouro (pedido do usuário em 26/11: "mais mapas, versões maiores"): um reino inteiro
 * num mapa 80×80, para a campanha que começa na vila e termina no trono. Ao norte, o castelo de
 * torres azuis com o quartel, o campo de arqueiros e as quatro torres do pátio; no meio, a vila
 * com a praça do mercado, a igreja, a taverna, a ferraria e a obra de andaimes; ao sul, o rio com
 * a ponte de pedra e o moinho d'água, e depois dele os trigais, o moinho de vento e a serraria.
 * A nordeste, a entrada da mina; a noroeste, o bosque.
 *
 * Os prédios vêm do pacote KayKit Medieval Hexagon (CC0), em public/assets/hexvila.
 */
import type { Cell } from '../../grid';
import type { CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createPlacer, type Place } from './placer';
import { createSketch, type Sketch } from './sketch';

export const KINGDOM_SIZE = { width: 80, depth: 80 } as const;

const TILE = {
  grass: 'grama',
  dirt: 'terra',
  water: 'agua',
  road: 'med-calcamento',
  plaza: 'med-piso-tijolo-vermelho',
  stone: 'piso-pedra',
} as const;
const PIECE = {
  castle: 'kay-castelo',
  church: 'kay-igreja',
  tavern: 'kay-taverna',
  windmill: 'kay-moinho-vento',
  watermill: 'kay-moinho-agua',
  forge: 'kay-ferraria',
  market: 'kay-mercado',
  barracks: 'kay-quartel',
  archery: 'kay-campo-arqueiros',
  sawmill: 'kay-serraria',
  mine: 'kay-mina',
  watchtower: 'kay-torre-vigia',
  catapultTower: 'kay-torre-catapulta',
  house: 'kay-casa-a',
  tallHouse: 'kay-casa-b',
  bridge: 'kay-ponte-pedra',
  ruin: 'kay-ruina',
  scaffolding: 'kay-andaime',
  wheat: 'kay-trigal',
  banner: 'kay-estandarte-azul',
  keg: 'kay-barril-chope',
  fountain: 'pra-fonte',
  bench: 'pra-banco-pedra',
  torch: 'tocha',
  barrel: 'barril',
  crate: 'med-caixote',
  wagon: 'med-carroca',
  boat: 'med-bote',
  oak: 'nat-carvalho',
  pine: 'nat-pinheiro',
  birch: 'nat-betula',
  boulder: 'nat-pedregulho',
  rock: 'rocha',
  log: 'nat-tronco',
} as const;

/** O pátio de pedra do castelo, a praça da vila, as ruas, o rio e o terreiro da mina. */
const COURTYARD: CellRect = { x: 24, z: 2, width: 32, depth: 24 };
const PLAZA: CellRect = { x: 29, z: 29, width: 22, depth: 14 };
const MAIN_ROAD: CellRect = { x: 38, z: 26, width: 3, depth: 54 };
const CROSS_ROAD: CellRect = { x: 6, z: 44, width: 68, depth: 2 };
const MINE_YARD: CellRect = { x: 62, z: 0, width: 18, depth: 19 };
const MINE_PATH: CellRect = { x: 56, z: 20, width: 14, depth: 2 };
const RIVER: CellRect = { x: 0, z: 61, width: 80, depth: 4 };

/** Quartos de volta: a frente olha para +z (0), para -z (2) ou de lado (1). */
const TURN = { south: 0, side: 1, north: 2 } as const;

/** O castelo no alto do pátio, as quatro torres, o quartel e o campo de arqueiros. */
function raiseCastle(place: Place): void {
  place(PIECE.castle, { x: 35, z: 4 });
  place(PIECE.watchtower, { x: 24, z: 2 });
  place(PIECE.watchtower, { x: 51, z: 2 });
  place(PIECE.catapultTower, { x: 24, z: 19 });
  place(PIECE.catapultTower, { x: 51, z: 19 });
  place(PIECE.barracks, { x: 26, z: 9 });
  place(PIECE.archery, { x: 46, z: 9 });
  place(PIECE.banner, { x: 35, z: 15 });
  place(PIECE.banner, { x: 43, z: 15 });
  place(PIECE.torch, { x: 37, z: 16 });
  place(PIECE.torch, { x: 41, z: 16 });
  place(PIECE.wagon, { x: 30, z: 20 });
  place(PIECE.barrel, { x: 33, z: 20 });
  place(PIECE.barrel, { x: 33, z: 21 });
  place(PIECE.crate, { x: 34, z: 20 });
}

/** A praça: o chafariz no meio da rua, o mercado, a igreja, os bancos e a carroça do feirante. */
function buildPlaza(place: Place): void {
  place(PIECE.fountain, { x: 38, z: 34 });
  place(PIECE.market, { x: 42, z: 30 });
  place(PIECE.church, { x: 30, z: 30 });
  place(PIECE.bench, { x: 35, z: 38 });
  place(PIECE.bench, { x: 42, z: 38 });
  place(PIECE.torch, { x: 37, z: 32 });
  place(PIECE.torch, { x: 41, z: 32 });
  place(PIECE.wagon, { x: 46, z: 38 });
  place(PIECE.barrel, { x: 44, z: 39 });
  place(PIECE.crate, { x: 44, z: 40 });
}

/** As casas dos dois lados da rua de terra, a ruína queimada e a obra de andaimes. */
function buildHouses(place: Place): void {
  const houses: readonly Cell[] = [
    { x: 17, z: 30 },
    { x: 17, z: 36 },
    { x: 11, z: 30 },
    { x: 11, z: 36 },
    { x: 24, z: 48 },
    { x: 18, z: 48 },
    { x: 12, z: 48 },
    { x: 50, z: 48 },
    { x: 60, z: 30 },
    { x: 66, z: 30 },
    { x: 54, z: 37 },
  ];
  for (const cell of houses) place(PIECE.house, cell);
  const tallHouses: readonly Cell[] = [
    { x: 23, z: 30 },
    { x: 23, z: 37 },
    { x: 24, z: 53 },
    { x: 17, z: 53 },
    { x: 54, z: 30 },
    { x: 60, z: 36 },
  ];
  for (const cell of tallHouses) place(PIECE.tallHouse, cell);
  place(PIECE.ruin, { x: 66, z: 35 });
  place(PIECE.scaffolding, { x: 56, z: 47 });
  place(PIECE.log, { x: 67, z: 50 });
  place(PIECE.log, { x: 67, z: 53 });
  place(PIECE.crate, { x: 66, z: 48 });
}

/** A taverna e a ferraria logo ao sul da rua de terra. */
function buildTrades(place: Place): void {
  place(PIECE.tavern, { x: 30, z: 47 });
  place(PIECE.keg, { x: 32, z: 54 });
  place(PIECE.barrel, { x: 36, z: 48 });
  place(PIECE.forge, { x: 42, z: 47 });
}

/** O rio: a ponte de pedra da estrada, o moinho d'água na margem e os botes. */
function buildRiver(place: Place): void {
  place(PIECE.bridge, { x: 36, z: 58 });
  place(PIECE.watermill, { x: 50, z: 55 });
  place(PIECE.boat, { x: 20, z: 61 });
  place(PIECE.boat, { x: 62, z: 62 });
}

/** Do outro lado do rio: os trigais, o moinho de vento, a serraria com as toras e a carroça. */
function buildFarms(place: Place): void {
  for (const x of [4, 15, 26]) place(PIECE.wheat, { x, z: 67 });
  place(PIECE.windmill, { x: 44, z: 70 });
  place(PIECE.wagon, { x: 50, z: 72 });
  place(PIECE.sawmill, { x: 60, z: 70 });
  place(PIECE.log, { x: 68, z: 71 });
  place(PIECE.log, { x: 68, z: 73 });
}

/** A entrada da mina no canto nordeste, entre pedregulhos. */
function buildMine(place: Place): void {
  place(PIECE.mine, { x: 66, z: 4 });
  place(PIECE.boulder, { x: 76, z: 4 });
  place(PIECE.boulder, { x: 64, z: 15 });
  place(PIECE.rock, { x: 75, z: 10 });
  place(PIECE.rock, { x: 62, z: 6 });
  place(PIECE.wagon, { x: 70, z: 15 }, TURN.side);
}

/** O bosque do noroeste (fileiras desencontradas) e as árvores soltas pelo resto do reino. */
function plantTrees(place: Place): void {
  const kinds = [PIECE.pine, PIECE.oak, PIECE.birch] as const;
  let count = 0;
  [3, 7, 11, 15, 19, 23].forEach((z, row) => {
    const shift = row % 2 === 1 ? 2 : 0;
    for (const x of [3, 8, 13, 18]) place(kinds[(count += 1) % kinds.length]!, { x: x + shift, z });
  });
  const loose: readonly Cell[] = [
    { x: 8, z: 40 },
    { x: 15, z: 41 },
    { x: 21, z: 41 },
    { x: 2, z: 47 },
    { x: 58, z: 4 },
    { x: 60, z: 10 },
    { x: 58, z: 15 },
    { x: 72, z: 68 },
    { x: 75, z: 70 },
    { x: 73, z: 74 },
    { x: 76, z: 77 },
    { x: 70, z: 77 },
    { x: 52, z: 76 },
    { x: 56, z: 74 },
    { x: 76, z: 50 },
    { x: 2, z: 56 },
  ];
  for (const cell of loose) place(kinds[(count += 1) % kinds.length]!, cell);
}

/** O chão: grama, o pátio, a praça, as ruas, o terreiro da mina e, por cima de tudo, o rio. */
function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...KINGDOM_SIZE }, TILE.grass);
  sketch.ground(MINE_YARD, TILE.dirt);
  sketch.ground(MINE_PATH, TILE.dirt);
  sketch.ground(COURTYARD, TILE.stone);
  sketch.ground(CROSS_ROAD, TILE.dirt);
  sketch.ground(PLAZA, TILE.plaza);
  sketch.ground(MAIN_ROAD, TILE.road);
  sketch.ground(RIVER, TILE.water);
}

export function buildKingdomMap(): AssembledMap {
  const sketch = createSketch(KINGDOM_SIZE, null);
  lay(sketch);
  const place = createPlacer(sketch);
  raiseCastle(place);
  buildPlaza(place);
  buildHouses(place);
  buildTrades(place);
  buildRiver(place);
  buildFarms(place);
  buildMine(place);
  plantTrees(place);
  return sketch.build(styleHeader(STYLE_KITS.medieval));
}
