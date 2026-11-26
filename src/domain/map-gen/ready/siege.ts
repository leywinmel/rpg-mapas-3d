/**
 * Cerco de Rubraforte (pedido do usuário em 26/11: "mais mapas, versões maiores"): uma batalha
 * inteira num mapa 96×80. Ao norte, a fortaleza do reino rival, de telhados vermelhos, fechada por
 * muralhas com torres nos cantos e um portão ao sul; dentro, o castelo, o quartel, o campo de
 * arqueiros, a igreja, a taverna e o poço. Ao sul, o acampamento azul que veio cercá-la: tendas
 * atrás da paliçada, duas torres de catapulta apontadas para o portão e o campo de arqueiros, com
 * pedras de catapulta caídas no meio do caminho. Montanhas nas bordas, um lago a leste, a aldeia
 * queimada a oeste e bosques ao sul.
 *
 * As peças vêm do pacote KayKit Medieval Hexagon (CC0), em public/assets/hexvila.
 */
import type { Cell } from '../../grid';
import type { CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createPlacer, type Place } from './placer';
import { createSketch, type Sketch } from './sketch';

export const SIEGE_SIZE = { width: 96, depth: 80 } as const;

const TILE = {
  grass: 'grama',
  dirt: 'terra',
  mud: 'lama',
  water: 'agua',
  stone: 'piso-pedra',
} as const;
const PIECE = {
  wall: 'kay-muralha',
  gate: 'kay-muralha-portao',
  tower: 'kay-torre-vigia-vermelha',
  castle: 'kay-castelo-vermelho',
  barracks: 'kay-quartel-vermelho',
  archery: 'kay-campo-arqueiros-vermelho',
  church: 'kay-igreja-vermelha',
  tavern: 'kay-taverna-vermelha',
  well: 'kay-poco',
  redFlag: 'kay-bandeira-vermelha',
  blueFlag: 'kay-bandeira-azul',
  weapons: 'kay-suporte-armas',
  siegeTower: 'kay-torre-catapulta',
  blueArchery: 'kay-campo-arqueiros',
  tent: 'kay-tenda',
  palisade: 'kay-cerca-madeira',
  lumber: 'kay-pilha-madeira',
  arrows: 'kay-balde-flechas',
  crate: 'kay-caixote-grande',
  openCrate: 'kay-caixote-aberto',
  sack: 'kay-saco',
  wheelbarrow: 'kay-carrinho-mao',
  boulder: 'kay-pedra-catapulta',
  ruin: 'kay-ruina',
  redHouse: 'kay-casa-vermelha',
  mountain: 'kay-montanha-a',
  tallMountain: 'kay-montanha-b',
  wideMountain: 'kay-montanha-c',
  greenMountain: 'kay-montanha-verde',
  tallGreenMountain: 'kay-montanha-verde-b',
  woodedHill: 'kay-colina-arvores',
  hills: 'kay-colinas',
  mound: 'kay-morro',
  thicket: 'kay-bosque-grande',
  pines: 'kay-pinhal-grande',
  grove: 'kay-bosque',
  stumps: 'kay-clareira-tocos',
  pine: 'kay-arvore-vila',
  tallPine: 'kay-pinheiro-vila',
  rock: 'kay-pedra-c',
  flatRock: 'kay-pedra-a',
  lily: 'kay-vitoria-regia',
  reed: 'kay-junco',
  torch: 'tocha',
} as const;

/** O pátio da fortaleza, a estrada do portão, o lago, a lama do acampamento e a aldeia queimada. */
const COURTYARD: CellRect = { x: 28, z: 2, width: 40, depth: 32 };
const ROAD: CellRect = { x: 46, z: 34, width: 4, depth: 46 };
const LAKE: CellRect = { x: 70, z: 36, width: 16, depth: 8 };
const CAMP: CellRect = { x: 10, z: 47, width: 24, depth: 16 };
const BURNT_VILLAGE: CellRect = { x: 10, z: 32, width: 14, depth: 12 };

/** Quartos de volta: a frente olha para +z (0) ou para -z (2); um quarto deita a muralha. */
const TURN = { south: 0, side: 1, north: 2 } as const;
/** Comprimento de um lance de muralha reta, em casas. */
const WALL_SPAN = 10;

/** As muralhas: torres nos quatro cantos, três lances em cima, dois de cada lado e o portão. */
function raiseWalls(place: Place): void {
  for (const cell of [
    { x: 28, z: 2 },
    { x: 63, z: 2 },
    { x: 28, z: 28 },
    { x: 63, z: 28 },
  ]) {
    place(PIECE.tower, cell);
  }
  for (const x of [33, 43, 53]) place(PIECE.wall, { x, z: 4 });
  for (const z of [8, 8 + WALL_SPAN]) {
    place(PIECE.wall, { x: 29, z }, TURN.side);
    place(PIECE.wall, { x: 63, z }, TURN.side);
  }
  place(PIECE.wall, { x: 33, z: 29 });
  place(PIECE.gate, { x: 43, z: 29 });
  place(PIECE.wall, { x: 53, z: 29 });
}

/** Dentro das muralhas: o castelo, o quartel, o campo de arqueiros, a igreja, a taverna e o poço. */
function fillFortress(place: Place): void {
  place(PIECE.castle, { x: 43, z: 9 });
  place(PIECE.barracks, { x: 34, z: 10 });
  place(PIECE.archery, { x: 53, z: 10 });
  place(PIECE.church, { x: 34, z: 20 });
  place(PIECE.tavern, { x: 55, z: 20 });
  place(PIECE.well, { x: 46, z: 22 });
  place(PIECE.redFlag, { x: 42, z: 24 });
  place(PIECE.redFlag, { x: 51, z: 24 });
  place(PIECE.weapons, { x: 40, z: 21 });
  place(PIECE.weapons, { x: 41, z: 21 });
  place(PIECE.torch, { x: 45, z: 27 });
  place(PIECE.torch, { x: 50, z: 27 });
}

/** O acampamento azul: paliçada, tendas, as torres de catapulta, os arqueiros e os suprimentos. */
function buildCamp(place: Place): void {
  for (const x of [10, 16, 22, 28, 62, 68, 74, 80]) place(PIECE.palisade, { x, z: 45 }, TURN.side);
  for (const z of [50, 55]) for (const x of [12, 16, 20]) place(PIECE.tent, { x, z });
  place(PIECE.siegeTower, { x: 36, z: 48 }, TURN.north);
  place(PIECE.siegeTower, { x: 56, z: 48 }, TURN.north);
  place(PIECE.blueArchery, { x: 66, z: 56 });
  place(PIECE.lumber, { x: 26, z: 52 });
  place(PIECE.weapons, { x: 26, z: 56 });
  place(PIECE.weapons, { x: 27, z: 56 });
  place(PIECE.arrows, { x: 28, z: 58 });
  place(PIECE.arrows, { x: 41, z: 50 });
  place(PIECE.crate, { x: 24, z: 59 });
  place(PIECE.openCrate, { x: 26, z: 60 });
  place(PIECE.sack, { x: 29, z: 60 });
  place(PIECE.wheelbarrow, { x: 31, z: 57 });
  for (const cell of [
    { x: 14, z: 59 },
    { x: 18, z: 59 },
    { x: 34, z: 55 },
    { x: 61, z: 55 },
  ]) {
    place(PIECE.blueFlag, cell);
  }
  place(PIECE.torch, { x: 15, z: 54 });
  place(PIECE.torch, { x: 19, z: 54 });
}

/** O campo de batalha entre o acampamento e o portão: pedras de catapulta e a aldeia queimada. */
function battlefield(place: Place): void {
  for (const cell of [
    { x: 38, z: 42 },
    { x: 57, z: 41 },
    { x: 52, z: 38 },
    { x: 41, z: 37 },
    { x: 60, z: 36 },
  ]) {
    place(PIECE.boulder, cell);
  }
  place(PIECE.ruin, { x: 10, z: 34 });
  place(PIECE.redHouse, { x: 19, z: 38 });
}

/** Montanhas nas bordas de oeste e de leste, colinas, bosques ao sul e o lago com as plantas. */
function landscape(place: Place): void {
  place(PIECE.mountain, { x: 0, z: 0 });
  place(PIECE.tallGreenMountain, { x: 0, z: 10 });
  place(PIECE.wideMountain, { x: 0, z: 20 });
  place(PIECE.tallMountain, { x: 87, z: 0 });
  place(PIECE.greenMountain, { x: 87, z: 10 });
  place(PIECE.mountain, { x: 87, z: 20 });
  place(PIECE.wideMountain, { x: 87, z: 30 });
  place(PIECE.woodedHill, { x: 0, z: 40 });
  place(PIECE.hills, { x: 88, z: 44 });
  place(PIECE.mound, { x: 60, z: 74 });
  place(PIECE.thicket, { x: 0, z: 70 });
  place(PIECE.stumps, { x: 10, z: 71 });
  place(PIECE.grove, { x: 76, z: 71 });
  place(PIECE.pines, { x: 86, z: 70 });
  const pines: readonly Cell[] = [
    { x: 20, z: 4 },
    { x: 14, z: 12 },
    { x: 22, z: 18 },
    { x: 72, z: 4 },
    { x: 78, z: 14 },
    { x: 70, z: 22 },
    { x: 24, z: 66 },
    { x: 36, z: 70 },
  ];
  pines.forEach((cell, index) => place(index % 2 === 0 ? PIECE.tallPine : PIECE.pine, cell));
  for (const cell of [
    { x: 12, z: 26 },
    { x: 80, z: 26 },
    { x: 66, z: 66 },
  ]) {
    place(PIECE.rock, cell);
  }
  place(PIECE.flatRock, { x: 54, z: 66 });
  place(PIECE.lily, { x: 74, z: 38 });
  place(PIECE.lily, { x: 80, z: 40 });
  place(PIECE.reed, { x: 70, z: 36 });
  place(PIECE.reed, { x: 85, z: 43 });
}

/** O chão: grama, o pátio de pedra, a estrada, a lama do acampamento, a terra queimada e o lago. */
function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...SIEGE_SIZE }, TILE.grass);
  sketch.ground(COURTYARD, TILE.stone);
  sketch.ground(CAMP, TILE.mud);
  sketch.ground(BURNT_VILLAGE, TILE.dirt);
  sketch.ground(ROAD, TILE.dirt);
  sketch.ground(LAKE, TILE.water);
}

export function buildSiegeMap(): AssembledMap {
  const sketch = createSketch(SIEGE_SIZE, null);
  lay(sketch);
  const place = createPlacer(sketch);
  raiseWalls(place);
  fillFortress(place);
  buildCamp(place);
  battlefield(place);
  landscape(place);
  const header = styleHeader(STYLE_KITS.medieval);
  return sketch.build({ ...header, ambience: { ...header.ambience, light: 0.85 } });
}
