/**
 * Bairro da Orla (RPG-63): bairro moderno pensado à mão, descendo a encosta até o lago. Ao sul,
 * a água um degrau abaixo da praia, com o píer; acima, a avenida da orla. Subindo, o parque da
 * fonte e o mercado com o estacionamento; depois, duas ruas de casas com quintal, cada uma num
 * degrau, ligadas pela rua que sobe do lago.
 *
 * Os prédios vêm da planta do gerador no estilo moderno (reboco colorido, telhado, mobília) [#6].
 */
import type { Cell } from '../../grid';
import { type CellRect, type Footprint } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createSketch, stampBuildings, type SketchBuilding, type SketchPiece } from './sketch';

export const MODERN_TOWN_SIZE = { width: 48, depth: 48 } as const;

const TILE = {
  grass: 'grama',
  sand: 'areia',
  water: 'agua',
  planks: 'piso-madeira',
  road: 'mod-asfalto',
  sidewalk: 'mod-calcada',
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
  mailbox: 'mod-caixa-correio',
  grill: 'mod-churrasqueira',
  fence: 'mod-cerca-branca',
  shrub: 'mod-arbusto',
  box: 'mod-caixa-papelao',
  fountain: 'pra-fonte',
  bed: 'pra-canteiro',
  car: 'mod-carro',
  taxi: 'mod-taxi',
  hatch: 'mod-hatch-esportivo',
  pickup: 'mod-picape',
  van: 'mod-van',
  boat: 'med-bote',
  palm: 'nat-palmeira',
  oak: 'nat-carvalho',
  birch: 'nat-betula',
  tree: 'arvore',
  flowers: 'nat-flores',
  roses: 'nat-roseira',
  bush: 'nat-arbusto',
} as const;
/** Medidas dos carros na escala do boneco: as mesmas do catálogo. */
const CAR: Footprint = { width: 3, depth: 5 };
const VAN: Footprint = { width: 3, depth: 6 };

/** A margem do lago ondula; a praia ocupa as casas entre a calçada da orla e a água. */
const SHORE = { base: 41, wave: 1.2, period: 5 } as const;
const HEIGHT = { water: 0, shore: 1, park: 2, middle: 3, top: 4 } as const;
/** Faixas de altura, do norte para o sul: até a linha `toZ`, a altura `height`. */
const BANDS: readonly { readonly toZ: number; readonly height: number }[] = [
  { toZ: 13, height: HEIGHT.top },
  { toZ: 21, height: HEIGHT.middle },
  { toZ: 31, height: HEIGHT.park },
  { toZ: Number.POSITIVE_INFINITY, height: HEIGHT.shore },
];

const ROADS: readonly CellRect[] = [
  { x: 0, z: 34, width: 48, depth: 4 },
  { x: 0, z: 11, width: 48, depth: 2 },
  { x: 22, z: 0, width: 4, depth: 34 },
];
const SIDEWALKS: readonly CellRect[] = [
  { x: 0, z: 33, width: 48, depth: 1 },
  { x: 0, z: 38, width: 48, depth: 1 },
  { x: 0, z: 10, width: 48, depth: 1 },
  { x: 0, z: 13, width: 48, depth: 1 },
  { x: 21, z: 0, width: 1, depth: 33 },
  { x: 26, z: 0, width: 1, depth: 33 },
];
const PARKING: CellRect = { x: 35, z: 23, width: 12, depth: 9 };
const PIER: CellRect = { x: 30, z: 39, width: 2, depth: 7 };

type BuildingPlace = Omit<SketchBuilding, 'style' | 'use' | 'width' | 'depth' | 'level'> &
  Partial<Pick<SketchBuilding, 'use' | 'width' | 'depth'>>;

function bandHeight(z: number): number {
  return BANDS.find((band) => z <= band.toZ)!.height;
}

/** Casa moderna de 6×6 no degrau da sua faixa, salvo quando o lugar pede outra coisa. */
const building = (place: BuildingPlace): SketchBuilding => ({
  style: 'modern',
  use: 'house',
  width: 6,
  depth: 6,
  level: bandHeight(place.z),
  ...place,
});

/** Cada prédio no seu lugar; as casas com fachada de reboco (variantes 1 a 4) têm telhado. */
const BUILDINGS: readonly SketchBuilding[] = [
  // Rua de cima: casas viradas para o sul.
  building({ x: 2, z: 3, stories: 2, rotation: 2, variant: 1 }),
  building({ x: 10, z: 3, stories: 1, rotation: 2, variant: 2 }),
  building({ x: 29, z: 3, stories: 2, rotation: 2, variant: 3 }),
  building({ x: 37, z: 3, stories: 1, rotation: 2, variant: 4 }),
  // Rua do meio: casas viradas para o norte, de fundos para o parque.
  building({ x: 2, z: 14, stories: 1, rotation: 0, variant: 3 }),
  building({ x: 10, z: 14, stories: 2, rotation: 0, variant: 4 }),
  building({ x: 29, z: 14, stories: 1, rotation: 0, variant: 0, use: 'shop', width: 8 }),
  building({ x: 39, z: 14, stories: 2, rotation: 0, variant: 1 }),
  // O mercado ao lado do estacionamento, de porta para a rua que sobe.
  building({ x: 27, z: 23, stories: 2, rotation: 1, variant: 0, use: 'shop', width: 8 }),
];

export type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;

function inRect(rect: CellRect, x: number, z: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && z >= rect.z && z < rect.z + rect.depth;
}

function shoreZ(x: number): number {
  return SHORE.base + Math.round(SHORE.wave * Math.sin(x / SHORE.period));
}

/** O ladrilho da casa em terra firme: rua, calçada, estacionamento, praia ou gramado. */
function landTile(x: number, z: number): string {
  if (ROADS.some((rect) => inRect(rect, x, z)) || inRect(PARKING, x, z)) return TILE.road;
  if (SIDEWALKS.some((rect) => inRect(rect, x, z))) return TILE.sidewalk;
  return z > SIDEWALKS[1]!.z ? TILE.sand : TILE.grass;
}

/** Chão de cada casa do bairro: o lago, o píer, a praia e as faixas da encosta. */
export function modernTownFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (let z = 0; z < MODERN_TOWN_SIZE.depth; z += 1) {
    for (let x = 0; x < MODERN_TOWN_SIZE.width; x += 1) {
      let floor: Floor;
      if (inRect(PIER, x, z)) floor = { tile: TILE.planks, height: HEIGHT.shore };
      else if (z >= shoreZ(x)) floor = { tile: TILE.water, height: HEIGHT.water };
      else floor = { tile: landTile(x, z), height: bandHeight(z) };
      floors.set(key({ x, z }), floor);
    }
  }
  return floors;
}

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

/** Postes, hidrantes, lixeiras e placas nas calçadas. */
function furnishSidewalks(place: Place): void {
  for (const x of [2, 10, 18, 30, 38, 46]) {
    place(PIECE.lamp, { x, z: 33 });
    place(PIECE.lamp, { x, z: 38 });
  }
  for (const x of [6, 16, 32, 44]) {
    place(PIECE.lamp, { x, z: 10 });
    place(PIECE.lamp, { x, z: 13 });
  }
  for (const z of [2, 8, 16, 24, 30]) {
    place(PIECE.lamp, { x: 21, z });
    place(PIECE.lamp, { x: 26, z });
  }
  place(PIECE.sign, { x: 21, z: 33 });
  place(PIECE.sign, { x: 26, z: 13 });
  place(PIECE.hydrant, { x: 14, z: 33 });
  place(PIECE.hydrant, { x: 40, z: 10 });
  place(PIECE.trash, { x: 24, z: 38 });
  place(PIECE.trash, { x: 8, z: 13 });
  place(PIECE.kiosk, { x: 42, z: 38 });
  place(PIECE.bollard, { x: 22, z: 38 });
  place(PIECE.bollard, { x: 25, z: 38 });
}

/** O parque: a fonte no meio, caminhos de bancos, canteiros e árvores. */
function furnishPark(place: Place): void {
  place(PIECE.fountain, { x: 9, z: 25 });
  for (const [x, z] of [
    [6, 24],
    [13, 24],
    [6, 29],
    [13, 29],
  ] as const) {
    place(PIECE.bench, { x, z });
  }
  for (const [x, z, tree] of [
    [3, 22, PIECE.oak],
    [17, 22, PIECE.birch],
    [3, 31, PIECE.tree],
    [17, 31, PIECE.oak],
    [10, 31, PIECE.birch],
    [2, 27, PIECE.oak],
  ] as const) {
    place(tree, { x, z });
  }
  place(PIECE.bed, { x: 8, z: 22 });
  place(PIECE.bed, { x: 8, z: 30 });
  for (const [x, z] of [
    [15, 26],
    [4, 25],
    [16, 28],
  ] as const) {
    place(PIECE.flowers, { x, z });
  }
  place(PIECE.trash, { x: 12, z: 27 });
}

/** O estacionamento do mercado: carros nas vagas, a van de entrega e as caixas. */
function furnishParking(place: Place): void {
  place(PIECE.car, { x: 35, z: 23 }, { footprint: CAR });
  place(PIECE.taxi, { x: 39, z: 23 }, { footprint: CAR });
  place(PIECE.pickup, { x: 43, z: 23 }, { footprint: CAR });
  place(PIECE.van, { x: 36, z: 31 - VAN.width + 1 }, { footprint: VAN, rotation: 1 });
  for (const [x, z] of [
    [46, 30],
    [46, 31],
    [45, 31],
  ] as const) {
    place(PIECE.box, { x, z });
  }
  place(PIECE.cone, { x: 44, z: 29 });
  place(PIECE.lamp, { x: 35, z: 31 });
  place(PIECE.lamp, { x: 46, z: 23 });
}

/** Os quintais: cerca branca, caixa de correio na frente, churrasqueira nos fundos e plantas. */
function furnishYards(place: Place): void {
  for (const x of [2, 10, 29, 37]) {
    place(PIECE.mailbox, { x: x + 4, z: 9 });
    place(PIECE.shrub, { x, z: 9 });
  }
  for (const x of [2, 10, 39]) {
    place(PIECE.mailbox, { x: x + 1, z: 13 });
    place(PIECE.grill, { x: x + 1, z: 21 });
  }
  for (let x = 0; x < 20; x += 1) place(PIECE.fence, { x, z: 1 });
  for (let x = 28; x < 44; x += 1) place(PIECE.fence, { x, z: 1 });
  for (const [x, z, plant] of [
    [8, 5, PIECE.roses],
    [16, 6, PIECE.bush],
    [35, 6, PIECE.flowers],
    [44, 4, PIECE.oak],
    [46, 8, PIECE.birch],
    [8, 16, PIECE.flowers],
    [16, 18, PIECE.roses],
    [37, 16, PIECE.bush],
    [46, 17, PIECE.tree],
    [19, 4, PIECE.oak],
    [28, 19, PIECE.birch],
  ] as const) {
    place(plant, { x, z });
  }
  place(PIECE.planter, { x: 34, z: 21 });
}

/** A orla: carros na avenida, coqueiros e bancos na praia, o píer e os botes. */
function furnishShore(place: Place): void {
  place(PIECE.hatch, { x: 4, z: 34 }, { footprint: CAR, rotation: 1 });
  place(PIECE.car, { x: 33, z: 35 }, { footprint: CAR, rotation: 1 });
  for (const x of [3, 12, 20, 36, 45]) place(PIECE.palm, { x, z: 39 });
  place(PIECE.bench, { x: 7, z: 39 });
  place(PIECE.bench, { x: 40, z: 39 });
  place(PIECE.lamp, { x: 30, z: 45 });
  place(PIECE.boat, { x: 28, z: 43 });
  place(PIECE.boat, { x: 33, z: 44 });
}

export function buildModernTownMap(): AssembledMap {
  const sketch = createSketch(MODERN_TOWN_SIZE, null);
  const floors = modernTownFloors();
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    sketch.ground({ x: x!, z: z!, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  const indoors = stampBuildings(sketch, BUILDINGS);
  const place: Place = (piece, cell, options = {}) => {
    const floor = floors.get(key(cell));
    if (!floor) throw new Error(`Peça ${piece} fora do bairro em ${key(cell)}.`);
    if (indoors.has(key(cell))) throw new Error(`Peça ${piece} dentro de prédio em ${key(cell)}.`);
    sketch.piece(piece, cell, { ...options, level: floor.height });
  };
  furnishSidewalks(place);
  furnishPark(place);
  furnishParking(place);
  furnishYards(place);
  furnishShore(place);
  return sketch.build(styleHeader(STYLE_KITS.modern));
}
