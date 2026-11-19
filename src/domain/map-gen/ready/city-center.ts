/**
 * Centro da Cidade (RPG-63): o miolo de uma cidade moderna pensado à mão. Duas avenidas se
 * cruzam no meio e dividem quatro quadras: ao noroeste, as torres de escritório com o
 * estacionamento dos fundos; ao nordeste, a praça cívica um degrau acima da rua, com a estátua;
 * ao sudoeste, a fileira de lojas, o beco das entregas e o prédio de apartamentos com o jardim;
 * ao sudeste, o quartel dos bombeiros, o pátio da polícia e a torre de vidro.
 *
 * Os prédios vêm da planta do gerador no estilo moderno (vidro, metal, tijolo, mobília) [#6].
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, type CellRect, type Footprint } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { createSketch, stampBuildings, type SketchBuilding, type SketchPiece } from './sketch';

export const CITY_CENTER_SIZE = { width: 48, depth: 48 } as const;

const TILE = {
  grass: 'grama',
  road: 'mod-asfalto',
  sidewalk: 'mod-calcada',
  plaza: 'piso-pedra',
} as const;
const PIECE = {
  lamp: 'mod-poste',
  bench: 'mod-banco-praca',
  trash: 'mod-lixeira',
  hydrant: 'mod-hidrante',
  sign: 'mod-placa-rua',
  kiosk: 'mod-banca',
  planter: 'mod-canteiro',
  bollard: 'mod-balizador',
  cone: 'mod-cone',
  drain: 'mod-bueiro',
  box: 'mod-caixa-papelao',
  statue: 'pra-estatua-grande',
  bed: 'pra-canteiro',
  car: 'mod-carro',
  taxi: 'mod-taxi',
  suv: 'mod-utilitario',
  sports: 'mod-esportivo',
  convertible: 'mod-conversivel',
  police: 'mod-viatura',
  policeSuv: 'mod-viatura-suv',
  ambulance: 'mod-ambulancia',
  fireTruck: 'mod-bombeiros',
  garbageTruck: 'mod-caminhao-lixo',
  bus: 'mod-onibus',
  oak: 'nat-carvalho',
  birch: 'nat-betula',
  tree: 'arvore',
  flowers: 'nat-flores',
  bush: 'nat-arbusto',
} as const;
/** Medidas dos veículos na escala do boneco: as mesmas do catálogo. */
const CAR: Footprint = { width: 3, depth: 5 };
const VAN: Footprint = { width: 3, depth: 6 };
const TRUCK: Footprint = { width: 3, depth: 8 };
const BUS: Footprint = { width: 4, depth: 13 };
/** Os veículos deitados ao longo da avenida leste-oeste. */
const ALONG_X = 1;

const HEIGHT = { street: 1, plaza: 2 } as const;

/** As duas avenidas de quatro pistas que se cruzam no meio. */
const ROADS: readonly CellRect[] = [
  { x: 0, z: 20, width: 48, depth: 4 },
  { x: 20, z: 0, width: 4, depth: 48 },
];
const SIDEWALKS: readonly CellRect[] = [
  { x: 0, z: 19, width: 48, depth: 1 },
  { x: 0, z: 24, width: 48, depth: 1 },
  { x: 19, z: 0, width: 1, depth: 48 },
  { x: 24, z: 0, width: 1, depth: 48 },
];
/** Asfalto dentro das quadras: estacionamentos, beco e pátio da polícia. */
const LOTS: readonly CellRect[] = [
  { x: 1, z: 1, width: 17, depth: 6 },
  { x: 0, z: 32, width: 19, depth: 2 },
  { x: 37, z: 26, width: 10, depth: 9 },
];
const PLAZA: CellRect = { x: 27, z: 2, width: 19, depth: 15 };
/** Canteiros de grama na praça e no jardim do prédio de apartamentos. */
const LAWNS: readonly CellRect[] = [
  { x: 28, z: 3, width: 4, depth: 4 },
  { x: 41, z: 3, width: 4, depth: 4 },
  { x: 28, z: 12, width: 4, depth: 4 },
  { x: 41, z: 12, width: 4, depth: 4 },
  { x: 11, z: 35, width: 7, depth: 12 },
  { x: 42, z: 37, width: 5, depth: 10 },
];

type BuildingPlace = Omit<SketchBuilding, 'style' | 'level'>;

const building = (place: BuildingPlace): SketchBuilding => ({
  style: 'modern',
  level: HEIGHT.street,
  ...place,
});

/** Cada prédio no seu lugar, de porta virada para a calçada mais próxima. */
const BUILDINGS: readonly SketchBuilding[] = [
  // Torres de escritório, de frente para a avenida.
  building({ use: 'tower', x: 2, z: 9, width: 8, depth: 8, stories: 4, rotation: 2, variant: 0 }),
  building({ use: 'tower', x: 11, z: 9, width: 6, depth: 8, stories: 3, rotation: 2, variant: 1 }),
  // Lojas de vitrine para a avenida e o prédio de apartamentos atrás do beco.
  building({ use: 'shop', x: 1, z: 26, width: 8, depth: 6, stories: 1, rotation: 0, variant: 0 }),
  building({ use: 'shop', x: 10, z: 26, width: 8, depth: 6, stories: 2, rotation: 0, variant: 0 }),
  building({ use: 'tower', x: 1, z: 35, width: 8, depth: 8, stories: 3, rotation: 0, variant: 0 }),
  // Quartel dos bombeiros e a torre de vidro do sudeste.
  building({ use: 'shop', x: 27, z: 26, width: 8, depth: 8, stories: 2, rotation: 0, variant: 0 }),
  building({ use: 'tower', x: 32, z: 37, width: 8, depth: 8, stories: 4, rotation: 3, variant: 1 }),
];

export type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;

function inRect(rect: CellRect, x: number, z: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && z >= rect.z && z < rect.z + rect.depth;
}

/** O ladrilho de cada casa: rua, calçada, praça, grama ou o calçamento das quadras. */
function floorAt(x: number, z: number): Floor {
  const street = (tile: string): Floor => ({ tile, height: HEIGHT.street });
  if (ROADS.some((rect) => inRect(rect, x, z))) return street(TILE.road);
  if (SIDEWALKS.some((rect) => inRect(rect, x, z))) return street(TILE.sidewalk);
  if (LAWNS.some((rect) => inRect(rect, x, z))) {
    return { tile: TILE.grass, height: inRect(PLAZA, x, z) ? HEIGHT.plaza : HEIGHT.street };
  }
  if (inRect(PLAZA, x, z)) return { tile: TILE.plaza, height: HEIGHT.plaza };
  if (LOTS.some((rect) => inRect(rect, x, z))) return street(TILE.road);
  return street(TILE.sidewalk);
}

/** Chão de cada casa do centro: as avenidas, as calçadas, a praça e o miolo das quadras. */
export function cityCenterFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (let z = 0; z < CITY_CENTER_SIZE.depth; z += 1) {
    for (let x = 0; x < CITY_CENTER_SIZE.width; x += 1) {
      floors.set(key({ x, z }), floorAt(x, z));
    }
  }
  return floors;
}

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

/** Postes, placas, hidrantes e bueiros nas calçadas das avenidas. */
function furnishSidewalks(place: Place): void {
  for (const x of [2, 8, 14, 28, 34, 40, 46]) {
    place(PIECE.lamp, { x, z: 19 });
    place(PIECE.lamp, { x, z: 24 });
  }
  for (const z of [2, 8, 14, 29, 35, 41, 46]) {
    place(PIECE.lamp, { x: 19, z });
    place(PIECE.lamp, { x: 24, z });
  }
  place(PIECE.sign, { x: 19, z: 19 });
  place(PIECE.sign, { x: 24, z: 24 });
  place(PIECE.hydrant, { x: 11, z: 19 });
  place(PIECE.hydrant, { x: 36, z: 24 });
  place(PIECE.trash, { x: 5, z: 24 });
  place(PIECE.trash, { x: 31, z: 19 });
  place(PIECE.kiosk, { x: 24, z: 17 });
  for (const [x, z] of [
    [18, 22],
    [25, 21],
    [21, 18],
    [22, 25],
  ] as const) {
    place(PIECE.drain, { x, z });
  }
}

/** As avenidas: o ônibus na faixa da direita, táxi, carros e uma viatura parada. */
function furnishAvenues(place: Place): void {
  place(PIECE.bus, { x: 2, z: 22 - BUS.width + 2 }, { footprint: BUS, rotation: ALONG_X });
  place(PIECE.taxi, { x: 27, z: 20 }, { footprint: CAR, rotation: ALONG_X });
  place(PIECE.car, { x: 38, z: 21 }, { footprint: CAR, rotation: ALONG_X });
  place(PIECE.suv, { x: 20, z: 4 }, { footprint: CAR });
  place(PIECE.convertible, { x: 21, z: 33 }, { footprint: CAR });
  place(PIECE.police, { x: 21, z: 40 }, { footprint: CAR });
}

/** O estacionamento das torres: carros em fila, cones e a cabine do manobrista. */
function furnishOfficeLot(place: Place): void {
  place(PIECE.sports, { x: 2, z: 1 }, { footprint: CAR, rotation: ALONG_X });
  place(PIECE.car, { x: 8, z: 1 }, { footprint: CAR, rotation: ALONG_X });
  place(PIECE.suv, { x: 2, z: 4 }, { footprint: CAR, rotation: ALONG_X });
  place(PIECE.taxi, { x: 12, z: 4 }, { footprint: CAR, rotation: ALONG_X });
  place(PIECE.cone, { x: 16, z: 2 });
  place(PIECE.cone, { x: 17, z: 3 });
  place(PIECE.lamp, { x: 0, z: 7 });
  place(PIECE.lamp, { x: 18, z: 7 });
  for (const x of [10, 18]) place(PIECE.planter, { x, z: 9 });
  place(PIECE.bush, { x: 0, z: 12 });
}

/** A praça cívica: a estátua no centro, bancos em volta, árvores nos canteiros. */
function furnishPlaza(place: Place): void {
  place(PIECE.statue, { x: 35, z: 8 });
  for (const [x, z] of [
    [33, 6],
    [38, 6],
    [33, 11],
    [38, 11],
  ] as const) {
    place(PIECE.bench, { x, z });
  }
  for (const [x, z, tree] of [
    [29, 4, PIECE.oak],
    [43, 4, PIECE.birch],
    [29, 13, PIECE.tree],
    [43, 13, PIECE.oak],
    [30, 5, PIECE.flowers],
    [42, 14, PIECE.flowers],
  ] as const) {
    place(tree, { x, z });
  }
  place(PIECE.bed, { x: 35, z: 3 });
  place(PIECE.bed, { x: 35, z: 14 });
  place(PIECE.trash, { x: 40, z: 9 });
  place(PIECE.lamp, { x: 32, z: 8 });
  place(PIECE.lamp, { x: 40, z: 8 });
  for (const x of [27, 31, 41, 45]) place(PIECE.bollard, { x, z: 17 });
}

/** O beco das lojas, com o caminhão do lixo, e o jardim do prédio de apartamentos. */
function furnishSouthWest(place: Place): void {
  // Longe da porta do prédio (5,34): o caminhão para no meio do beco.
  place(PIECE.garbageTruck, { x: 9, z: 32 }, { footprint: VAN, rotation: ALONG_X });
  for (const [x, z] of [
    [16, 32],
    [17, 32],
    [16, 33],
  ] as const) {
    place(PIECE.box, { x, z });
  }
  place(PIECE.trash, { x: 18, z: 33 });
  for (const [x, z, tree] of [
    [12, 36, PIECE.oak],
    [16, 38, PIECE.birch],
    [13, 42, PIECE.tree],
    [16, 45, PIECE.oak],
    [11, 46, PIECE.birch],
  ] as const) {
    place(tree, { x, z });
  }
  place(PIECE.bench, { x: 14, z: 39 });
  place(PIECE.bench, { x: 14, z: 44 });
  for (const [x, z] of [
    [12, 40],
    [17, 42],
  ] as const) {
    place(PIECE.flowers, { x, z });
  }
  place(PIECE.planter, { x: 3, z: 34 });
  place(PIECE.lamp, { x: 10, z: 44 });
  place(PIECE.bush, { x: 0, z: 45 });
}

/** O quartel com o caminhão na saída, o pátio das viaturas e a ambulância. */
function furnishSouthEast(place: Place): void {
  place(PIECE.fireTruck, { x: 28, z: 34 }, { footprint: TRUCK, rotation: ALONG_X });
  place(PIECE.police, { x: 38, z: 27 }, { footprint: CAR });
  place(PIECE.policeSuv, { x: 42, z: 27 }, { footprint: CAR });
  place(PIECE.ambulance, { x: 38, z: 34 - VAN.width + 1 }, { footprint: VAN, rotation: ALONG_X });
  place(PIECE.cone, { x: 46, z: 33 });
  place(PIECE.cone, { x: 45, z: 34 });
  place(PIECE.hydrant, { x: 36, z: 26 });
  place(PIECE.lamp, { x: 46, z: 26 });
  for (const [x, z, plant] of [
    [27, 40, PIECE.oak],
    [27, 45, PIECE.birch],
    [43, 38, PIECE.tree],
    [46, 41, PIECE.birch],
    [44, 44, PIECE.oak],
    [46, 46, PIECE.tree],
    [41, 46, PIECE.bush],
    [43, 42, PIECE.flowers],
  ] as const) {
    place(plant, { x, z });
  }
  // O jardim de bolso ao lado da torre: bancos virados para o caminho da porta.
  place(PIECE.bench, { x: 42, z: 40 });
  place(PIECE.bench, { x: 42, z: 45 });
  place(PIECE.trash, { x: 42, z: 43 });
  place(PIECE.planter, { x: 30, z: 41 });
}

export function buildCityCenterMap(): AssembledMap {
  const sketch = createSketch(CITY_CENTER_SIZE, null);
  const floors = cityCenterFloors();
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    sketch.ground({ x: x!, z: z!, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  const indoors = stampBuildings(sketch, BUILDINGS);
  const place: Place = (piece, cell, options = {}) => {
    const floor = floors.get(key(cell));
    if (!floor) throw new Error(`Peça ${piece} fora do centro em ${key(cell)}.`);
    if (indoors.has(key(cell))) throw new Error(`Peça ${piece} dentro de prédio em ${key(cell)}.`);
    sketch.piece(piece, cell, { ...options, level: floor.height });
  };
  furnishSidewalks(place);
  furnishAvenues(place);
  furnishOfficeLot(place);
  furnishPlaza(place);
  furnishSouthWest(place);
  furnishSouthEast(place);
  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, light: 1, backdrop: 'city' },
  });
}
