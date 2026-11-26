/**
 * Vale das Duas Coroas (pedido do usuário em 26/11: "mais mapas, versões maiores"): uma campanha
 * inteira num mapa 128×112. A oeste, Verdelar, o reino dos telhados verdes, com o castelo entre
 * pinhais, o quartel, o templo, a ferraria e a vila com o mercado e a taverna. A leste, Auricampo,
 * o reino dos telhados dourados, com o castelo de torres de catapulta, o campo de arqueiros, a
 * igreja, a vila dos mercadores, a serraria e a mina de ouro. No meio, a praça neutra da
 * encruzilhada, com as tendas da feira e o chafariz. Ao sul, o rio com três pontes; depois dele, a
 * floresta de Verdelar a oeste, o acampamento dos viajantes no meio e os trigais de Auricampo a
 * leste. Montanhas fecham o norte.
 *
 * As peças vêm do pacote KayKit Medieval Hexagon (CC0), em public/assets/hexvila.
 */
import type { Cell } from '../../grid';
import type { CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createPlacer, type Place } from './placer';
import { createSketch, type Sketch } from './sketch';

export const TWO_CROWNS_SIZE = { width: 128, depth: 112 } as const;

const TILE = {
  grass: 'grama',
  dirt: 'terra',
  water: 'agua',
  road: 'med-calcamento',
  stone: 'piso-pedra',
  plaza: 'med-piso-tijolo-vermelho',
} as const;
const PIECE = {
  greenCastle: 'kay-castelo-verde',
  greenBarracks: 'kay-quartel-verde',
  greenTemple: 'kay-igreja-verde',
  greenTavern: 'kay-taverna-verde',
  greenMarket: 'kay-mercado-verde',
  greenHouse: 'kay-casa-verde',
  greenTallHouse: 'kay-sobrado-verde',
  greenWindmill: 'kay-moinho-verde',
  greenForge: 'kay-ferraria-verde',
  greenTower: 'kay-torre-verde',
  greenWell: 'kay-poco-verde',
  goldCastle: 'kay-castelo-amarelo',
  goldChurch: 'kay-igreja-amarela',
  goldTavern: 'kay-taverna-amarela',
  goldMarket: 'kay-mercado-amarelo',
  goldHouse: 'kay-casa-amarela',
  goldTallHouse: 'kay-sobrado-amarelo',
  goldWatermill: 'kay-moinho-agua-amarelo',
  goldSawmill: 'kay-serraria-amarela',
  goldCatapult: 'kay-torre-catapulta-amarela',
  goldArchery: 'kay-campo-arqueiros-amarelo',
  goldMine: 'kay-mina-amarela',
  wheat: 'kay-trigal',
  bridge: 'kay-ponte-pedra',
  wideBridge: 'kay-ponte-b',
  greenFlag: 'kay-bandeira-verde',
  goldFlag: 'kay-bandeira-amarela',
  tent: 'kay-tenda',
  lumber: 'kay-pilha-madeira',
  stones: 'kay-pilha-pedras',
  crate: 'kay-caixote-grande',
  sack: 'kay-saco',
  wheelbarrow: 'kay-carrinho-mao',
  fountain: 'pra-fonte',
  wagon: 'med-carroca',
  boat: 'med-bote',
  torch: 'tocha',
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
  pine: 'kay-arvore-vila',
  tallPine: 'kay-pinheiro-vila',
} as const;

/** Os pátios dos dois castelos, a praça neutra, as estradas e o rio. */
const GREEN_COURTYARD: CellRect = { x: 11, z: 11, width: 32, depth: 24 };
const GOLD_COURTYARD: CellRect = { x: 87, z: 10, width: 36, depth: 22 };
const PLAZA: CellRect = { x: 52, z: 30, width: 24, depth: 16 };
const KINGS_ROAD: CellRect = { x: 62, z: 0, width: 4, depth: 112 };
const CROSS_ROAD: CellRect = { x: 4, z: 36, width: 120, depth: 3 };
const GREEN_GATE_ROAD: CellRect = { x: 24, z: 25, width: 3, depth: 11 };
const GREEN_RIVER_ROAD: CellRect = { x: 24, z: 39, width: 3, depth: 31 };
const GOLD_GATE_ROAD: CellRect = { x: 102, z: 23, width: 3, depth: 13 };
const GOLD_RIVER_ROAD: CellRect = { x: 102, z: 39, width: 3, depth: 31 };
const MINE_YARD: CellRect = { x: 116, z: 39, width: 12, depth: 13 };
const CAMP: CellRect = { x: 54, z: 82, width: 20, depth: 14 };
const RIVER: CellRect = { x: 0, z: 74, width: 128, depth: 4 };

/** Verdelar: o castelo verde, as torres, o quartel, o templo, a ferraria e o poço. */
function raiseVerdelar(place: Place): void {
  place(PIECE.greenCastle, { x: 21, z: 14 });
  place(PIECE.greenTower, { x: 12, z: 12 });
  place(PIECE.greenTower, { x: 37, z: 12 });
  place(PIECE.greenBarracks, { x: 13, z: 20 });
  place(PIECE.greenTemple, { x: 34, z: 20 });
  place(PIECE.greenForge, { x: 33, z: 28 });
  place(PIECE.greenWell, { x: 30, z: 30 });
  place(PIECE.greenFlag, { x: 20, z: 26 });
  place(PIECE.greenFlag, { x: 31, z: 26 });
  place(PIECE.torch, { x: 23, z: 27 });
  place(PIECE.torch, { x: 27, z: 27 });
}

/** A vila de Verdelar ao sul da estrada, o moinho e a torre da fronteira. */
function buildVerdelarTown(place: Place): void {
  for (const cell of [
    { x: 4, z: 40 },
    { x: 10, z: 40 },
    { x: 4, z: 48 },
    { x: 16, z: 49 },
  ]) {
    place(PIECE.greenHouse, cell);
  }
  place(PIECE.greenTallHouse, { x: 16, z: 40 });
  place(PIECE.greenTallHouse, { x: 10, z: 48 });
  place(PIECE.greenTavern, { x: 28, z: 40 });
  place(PIECE.greenMarket, { x: 35, z: 40 });
  place(PIECE.greenWindmill, { x: 30, z: 52 });
  place(PIECE.greenTower, { x: 46, z: 46 });
  place(PIECE.torch, { x: 27, z: 41 });
}

/** Auricampo: o castelo dourado, as torres de catapulta, os arqueiros e a igreja. */
function raiseAuricampo(place: Place): void {
  place(PIECE.goldCastle, { x: 100, z: 12 });
  place(PIECE.goldCatapult, { x: 89, z: 11 });
  place(PIECE.goldCatapult, { x: 116, z: 11 });
  place(PIECE.goldArchery, { x: 89, z: 22 });
  place(PIECE.goldChurch, { x: 112, z: 24 });
  place(PIECE.goldFlag, { x: 99, z: 25 });
  place(PIECE.goldFlag, { x: 110, z: 25 });
  place(PIECE.torch, { x: 101, z: 24 });
  place(PIECE.torch, { x: 105, z: 24 });
}

/** A vila dos mercadores, a serraria, a mina de ouro e a torre que vigia a fronteira. */
function buildAuricampoTown(place: Place): void {
  place(PIECE.goldTavern, { x: 80, z: 40 });
  place(PIECE.goldMarket, { x: 88, z: 40 });
  place(PIECE.goldHouse, { x: 97, z: 40 });
  place(PIECE.goldTallHouse, { x: 106, z: 40 });
  place(PIECE.goldHouse, { x: 112, z: 40 });
  place(PIECE.goldHouse, { x: 80, z: 50 });
  place(PIECE.goldTallHouse, { x: 86, z: 50 });
  place(PIECE.goldHouse, { x: 93, z: 50 });
  place(PIECE.goldSawmill, { x: 106, z: 50 });
  place(PIECE.lumber, { x: 114, z: 52 });
  place(PIECE.goldMine, { x: 118, z: 40 });
  place(PIECE.wheelbarrow, { x: 126, z: 44 });
  place(PIECE.stones, { x: 124, z: 50 });
  place(PIECE.goldCatapult, { x: 78, z: 56 });
  place(PIECE.goldWatermill, { x: 90, z: 68 });
}

/** A praça neutra da encruzilhada: tendas da feira, o chafariz, as bandeiras dos dois reinos. */
function buildCrossroads(place: Place): void {
  for (const cell of [
    { x: 53, z: 31 },
    { x: 57, z: 31 },
    { x: 68, z: 31 },
    { x: 72, z: 31 },
    { x: 53, z: 41 },
    { x: 71, z: 41 },
  ]) {
    place(PIECE.tent, cell);
  }
  place(PIECE.fountain, { x: 62, z: 40 });
  place(PIECE.crate, { x: 57, z: 41 });
  place(PIECE.sack, { x: 58, z: 41 });
  place(PIECE.wagon, { x: 67, z: 41 });
  place(PIECE.greenFlag, { x: 52, z: 34 });
  place(PIECE.goldFlag, { x: 75, z: 34 });
  place(PIECE.torch, { x: 60, z: 34 });
  place(PIECE.torch, { x: 67, z: 34 });
}

/** O rio: as três pontes (uma de cada reino e a da estrada do rei) e os botes. */
function buildRiver(place: Place): void {
  place(PIECE.bridge, { x: 22, z: 70 });
  place(PIECE.wideBridge, { x: 60, z: 70 });
  place(PIECE.bridge, { x: 100, z: 70 });
  place(PIECE.boat, { x: 40, z: 75 });
  place(PIECE.boat, { x: 84, z: 75 });
}

/** Do outro lado do rio: o acampamento dos viajantes e os trigais dourados. */
function beyondTheRiver(place: Place): void {
  place(PIECE.tent, { x: 56, z: 86 });
  place(PIECE.tent, { x: 67, z: 86 });
  place(PIECE.wagon, { x: 58, z: 91 });
  place(PIECE.stones, { x: 68, z: 92 });
  place(PIECE.torch, { x: 60, z: 88 });
  place(PIECE.torch, { x: 66, z: 88 });
  for (const x of [78, 90, 102, 114]) place(PIECE.wheat, { x, z: 82 });
  for (const x of [78, 90, 102]) place(PIECE.wheat, { x, z: 96 });
}

/** Montanhas ao norte, as colinas entre os reinos e as florestas de Verdelar. */
function landscape(place: Place): void {
  place(PIECE.greenMountain, { x: 0, z: 0 });
  place(PIECE.tallGreenMountain, { x: 10, z: 0 });
  place(PIECE.mountain, { x: 44, z: 0 });
  place(PIECE.mound, { x: 68, z: 2 });
  place(PIECE.wideMountain, { x: 76, z: 0 });
  place(PIECE.tallMountain, { x: 119, z: 0 });
  place(PIECE.woodedHill, { x: 44, z: 12 });
  place(PIECE.hills, { x: 74, z: 14 });
  place(PIECE.thicket, { x: 0, z: 10 });
  place(PIECE.pines, { x: 0, z: 26 });
  place(PIECE.thicket, { x: 0, z: 80 });
  place(PIECE.thicket, { x: 0, z: 92 });
  place(PIECE.thicket, { x: 0, z: 102 });
  place(PIECE.pines, { x: 12, z: 100 });
  place(PIECE.pines, { x: 36, z: 100 });
  place(PIECE.grove, { x: 46, z: 80 });
  place(PIECE.grove, { x: 66, z: 100 });
  plantRows(place, { xs: [2, 8, 14, 30, 36, 42, 48], zs: [58, 64], shift: 0 });
  plantRows(place, { xs: [12, 18, 30, 36], zs: [81, 87, 93], shift: 3 });
  const loose: readonly Cell[] = [
    { x: 118, z: 100 },
    { x: 122, z: 106 },
    { x: 54, z: 50 },
    { x: 70, z: 50 },
    { x: 54, z: 62 },
    { x: 70, z: 62 },
  ];
  for (const cell of loose) place(PIECE.pine, cell);
}

/** Fileiras de árvores, com as linhas ímpares deslocadas para o bosque não parecer pomar. */
function plantRows(
  place: Place,
  rows: { xs: readonly number[]; zs: readonly number[]; shift: number },
): void {
  rows.zs.forEach((z, row) => {
    const offset = row % 2 === 1 ? rows.shift : 0;
    rows.xs.forEach((x, column) => {
      place((row + column) % 2 === 0 ? PIECE.pine : PIECE.tallPine, { x: x + offset, z });
    });
  });
}

/** O chão: grama, os pátios, a praça, as estradas, o terreiro da mina, o acampamento e o rio. */
function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...TWO_CROWNS_SIZE }, TILE.grass);
  sketch.ground(MINE_YARD, TILE.dirt);
  sketch.ground(CAMP, TILE.dirt);
  sketch.ground(GREEN_COURTYARD, TILE.stone);
  sketch.ground(GOLD_COURTYARD, TILE.stone);
  for (const road of [GREEN_GATE_ROAD, GREEN_RIVER_ROAD, GOLD_GATE_ROAD, GOLD_RIVER_ROAD]) {
    sketch.ground(road, TILE.dirt);
  }
  sketch.ground(CROSS_ROAD, TILE.dirt);
  sketch.ground(PLAZA, TILE.plaza);
  sketch.ground(KINGS_ROAD, TILE.road);
  sketch.ground(RIVER, TILE.water);
}

export function buildTwoCrownsMap(): AssembledMap {
  const sketch = createSketch(TWO_CROWNS_SIZE, null);
  lay(sketch);
  const place = createPlacer(sketch);
  raiseVerdelar(place);
  buildVerdelarTown(place);
  raiseAuricampo(place);
  buildAuricampoTown(place);
  buildCrossroads(place);
  buildRiver(place);
  beyondTheRiver(place);
  landscape(place);
  return sketch.build(styleHeader(STYLE_KITS.medieval));
}
