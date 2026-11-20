/**
 * Posto da Rodovia (RPG-45): um posto de gasolina inteiro de 50×50 casas, de frente para a
 * estrada. Ao sul, a rodovia de duas mãos com a entrada e a saída do posto; no meio, o pátio
 * de asfalto com as duas coberturas sobre oito bombas, o calibrador e o totem de preços na
 * beira da estrada; ao norte, a loja de conveniência (com o mercadinho montado) e a oficina,
 * os carros parados na frente da loja e a carreta que pernoita no canto.
 *
 * A loja sai da arrumação de mercado do gerador e os prédios da planta do estilo moderno [#6].
 */
import type { Cell } from '../../grid';
import { STORY_HEIGHT_STEPS, type CellRect, type Footprint } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createSketch, stampBuildings, type SketchBuilding, type SketchPiece } from './sketch';

export const GAS_STATION_SIZE = { width: 50, depth: 50 } as const;

const TILE = {
  grass: 'grama',
  road: 'mod-asfalto',
  concrete: 'mod-calcada',
} as const;
const PIECE = {
  pump: 'pos-bomba',
  pillar: 'pos-pilar',
  canopy: 'pos-cobertura',
  air: 'pos-calibrador',
  prices: 'pos-placa-precos',
  ice: 'pos-freezer-gelo',
  lamp: 'mod-poste',
  trash: 'mod-lixeira',
  hydrant: 'mod-hidrante',
  bollard: 'mod-balizador',
  cone: 'mod-cone',
  drum: 'fut-tambor',
  boxes: 'mod-caixa-papelao',
  car: 'mod-carro',
  pickup: 'mod-picape',
  hatch: 'mod-hatch-esportivo',
  taxi: 'mod-taxi',
  truck: 'mod-carreta',
  oak: 'nat-carvalho',
  tree: 'arvore',
  bush: 'nat-arbusto',
} as const;
/** Medidas dos veículos na escala do boneco: as mesmas do catálogo. */
const CAR: Footprint = { width: 3, depth: 5 };
const TRUCK: Footprint = { width: 3, depth: 12 };
/** Giros: a frente do modelo para o sul (0), leste (1), norte (2) ou oeste (3). */
const TURN = { south: 0, east: 1, north: 2, west: 3 } as const;

/** Tudo no mesmo nível: estrada, pátio e grama. A cobertura fica seis degraus acima do pátio. */
const STREET = 1;
const CANOPY_LEVEL = STREET + (3 * STORY_HEIGHT_STEPS) / 2;

const HIGHWAY: CellRect = { x: 0, z: 42, width: 50, depth: 8 };
/** A faixa de grama entre o pátio e a estrada, aberta na entrada e na saída. */
const VERGE: CellRect = { x: 0, z: 39, width: 50, depth: 3 };
const DRIVEWAYS: readonly CellRect[] = [
  { x: 6, z: 39, width: 8, depth: 3 },
  { x: 36, z: 39, width: 8, depth: 3 },
];
const FORECOURT: CellRect = { x: 4, z: 14, width: 42, depth: 25 };
/** A laje de concreto debaixo das coberturas e a calçada da frente da loja e da oficina. */
const PADS: readonly CellRect[] = [
  { x: 12, z: 27, width: 24, depth: 8 },
  { x: 6, z: 13, width: 36, depth: 1 },
];
/** As duas coberturas de 12×8, lado a lado sobre a laje. */
const CANOPIES: readonly Cell[] = [
  { x: 12, z: 27 },
  { x: 24, z: 27 },
];
/** As duas ilhas de bombas e os pilares que seguram as coberturas, nas mesmas fileiras. */
const PUMP_ROWS = [29, 33];
const PUMP_COLUMNS = [15, 21, 27, 33];
const PILLAR_COLUMNS = [18, 30];

const BUILDINGS: readonly SketchBuilding[] = [
  // A loja de conveniência, de porta para o pátio, com caixas, gôndolas e geladeiras.
  {
    style: 'modern',
    use: 'shop',
    x: 8,
    z: 5,
    width: 12,
    depth: 8,
    stories: 1,
    rotation: 2,
    level: STREET,
    variant: 0,
    interior: 'market',
  },
  // A oficina e troca de óleo ao lado.
  {
    style: 'modern',
    use: 'shop',
    x: 30,
    z: 5,
    width: 10,
    depth: 8,
    stories: 1,
    rotation: 2,
    level: STREET,
    variant: 1,
  },
];

export type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;

function inRect(rect: CellRect, x: number, z: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && z >= rect.z && z < rect.z + rect.depth;
}

const inAny = (rects: readonly CellRect[], x: number, z: number) =>
  rects.some((rect) => inRect(rect, x, z));

/** O ladrilho de cada casa: estrada, entrada, laje, pátio ou grama. */
function floorAt(x: number, z: number): Floor {
  const at = (tile: string): Floor => ({ tile, height: STREET });
  if (inRect(HIGHWAY, x, z) || inAny(DRIVEWAYS, x, z)) return at(TILE.road);
  if (inRect(VERGE, x, z)) return at(TILE.grass);
  if (inAny(PADS, x, z)) return at(TILE.concrete);
  if (inRect(FORECOURT, x, z)) return at(TILE.road);
  return at(TILE.grass);
}

/** Chão de cada casa do posto, antes dos prédios. */
export function gasStationFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (let z = 0; z < GAS_STATION_SIZE.depth; z += 1) {
    for (let x = 0; x < GAS_STATION_SIZE.width; x += 1) floors.set(key({ x, z }), floorAt(x, z));
  }
  return floors;
}

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

/** As bombas nas ilhas, os pilares entre elas, as coberturas no alto e um carro abastecendo. */
function furnishPumps(place: Place, placeHigh: Place): void {
  for (const z of PUMP_ROWS) {
    for (const x of PUMP_COLUMNS) place(PIECE.pump, { x, z }, { rotation: TURN.east });
    for (const x of PILLAR_COLUMNS) place(PIECE.pillar, { x, z });
    place(PIECE.trash, { x: 13, z });
  }
  for (const cell of CANOPIES) placeHigh(PIECE.canopy, cell);
  place(PIECE.car, { x: 16, z: 30 }, { footprint: CAR, rotation: TURN.west });
  place(PIECE.taxi, { x: 28, z: 30 }, { footprint: CAR, rotation: TURN.east });
  place(PIECE.hatch, { x: 22, z: 34 }, { footprint: CAR, rotation: TURN.east });
}

/** A frente da loja e da oficina: carros parados, o freezer de gelo, tambores e caixas. */
function furnishShops(place: Place): void {
  [9, 13].forEach((x) => place(PIECE.car, { x, z: 15 }, { footprint: CAR, rotation: TURN.north }));
  place(PIECE.pickup, { x: 31, z: 15 }, { footprint: CAR, rotation: TURN.north });
  place(PIECE.ice, { x: 18, z: 13 });
  place(PIECE.trash, { x: 7, z: 13 });
  for (const x of [40, 41]) place(PIECE.drum, { x, z: 13 });
  place(PIECE.boxes, { x: 29, z: 13 });
  place(PIECE.cone, { x: 35, z: 20 });
  place(PIECE.cone, { x: 38, z: 20 });
}

/** O canto dos caminhões: a carreta parada para a noite e os balizadores em volta. */
function furnishTruckBay(place: Place): void {
  place(PIECE.truck, { x: 42, z: 16 }, { footprint: TRUCK, rotation: TURN.north });
  for (const z of [16, 22, 28]) place(PIECE.bollard, { x: 41, z });
  place(PIECE.air, { x: 38, z: 30 });
}

/** A estrada e a beira dela: carros passando, o totem de preços, postes, hidrante e as árvores da divisa. */
function furnishRoadside(place: Place): void {
  place(PIECE.car, { x: 10, z: 43 }, { footprint: CAR, rotation: TURN.east });
  place(PIECE.pickup, { x: 34, z: 46 }, { footprint: CAR, rotation: TURN.west });
  place(PIECE.prices, { x: 24, z: 40 });
  for (const x of [2, 18, 30, 47]) place(PIECE.lamp, { x, z: 40 });
  place(PIECE.hydrant, { x: 34, z: 40 });
  for (const x of [20, 22, 26, 28]) place(PIECE.bush, { x, z: 40 });
  for (const z of [4, 10, 16, 22, 28, 34]) {
    place(PIECE.oak, { x: 1, z });
    place(PIECE.tree, { x: 48, z });
  }
  for (const x of [4, 22, 26, 44]) place(PIECE.oak, { x, z: 1 });
  for (const [x, z] of [
    [23, 6],
    [26, 10],
  ] as const) {
    place(PIECE.bush, { x, z });
  }
  for (const [x, z] of [
    [6, 20],
    [6, 30],
    [44, 36],
  ] as const) {
    place(PIECE.lamp, { x, z });
  }
}

export function buildGasStationMap(): AssembledMap {
  const sketch = createSketch(GAS_STATION_SIZE, null);
  const floors = gasStationFloors();
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    sketch.ground({ x: x!, z: z!, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  const indoors = stampBuildings(sketch, BUILDINGS);
  const check = (piece: string, cell: Cell): Floor => {
    const floor = floors.get(key(cell));
    if (!floor) throw new Error(`Peça ${piece} fora do posto em ${key(cell)}.`);
    if (indoors.has(key(cell))) throw new Error(`Peça ${piece} dentro de prédio em ${key(cell)}.`);
    return floor;
  };
  const place: Place = (piece, cell, options = {}) => {
    sketch.piece(piece, cell, { ...options, level: check(piece, cell).height });
  };
  const placeHigh: Place = (piece, cell, options = {}) => {
    check(piece, cell);
    sketch.piece(piece, cell, { ...options, level: CANOPY_LEVEL });
  };
  furnishPumps(place, placeHigh);
  furnishShops(place);
  furnishTruckBay(place);
  furnishRoadside(place);
  return sketch.build(styleHeader(STYLE_KITS.modern));
}
