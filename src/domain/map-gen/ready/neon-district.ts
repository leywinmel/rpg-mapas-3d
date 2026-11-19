/**
 * Distrito Neon (RPG-63): bairro cyberpunk pensado à mão. A rua dos letreiros corta o norte,
 * com lojas e torres de vitrine acesa; a avenida desce até a ponte sobre o canal sujo. A oeste,
 * o mercado noturno de barracas e máquinas de venda; a leste, a praça do holograma, um degrau
 * acima da rua. Do outro lado do canal, os prédios de neon e o cortiço.
 *
 * Os prédios vêm da planta do gerador no estilo cyberpunk (concreto, vitrines, neon) [#6].
 */
import type { Cell } from '../../grid';
import { type CellRect, type Footprint } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createSketch, stampBuildings, type SketchBuilding, type SketchPiece } from './sketch';

export const NEON_DISTRICT_SIZE = { width: 48, depth: 48 } as const;

const TILE = {
  asphalt: 'cyb-asfalto',
  sidewalk: 'cyb-calcada',
  plaza: 'cyb-praca-neon',
  grate: 'cyb-piso-grade',
  water: 'agua',
} as const;
const PIECE = {
  lamp: 'cyb-poste-neon',
  sign: 'cyb-letreiro',
  panel: 'cyb-painel-neon',
  hologram: 'cyb-holograma',
  vending: 'cyb-maquina-venda',
  lowBlock: 'cyb-predio-baixo',
  midBlock: 'cyb-predio-medio',
  car: 'fut-carro',
  crate: 'fut-caixa-carga',
  barrel: 'fut-tambor',
  fan: 'fut-ventilador',
  rail: 'fut-guarda-corpo',
  table: 'mesa',
  chair: 'cadeira',
  bench: 'mod-banco-praca',
  bin: 'mod-lixeira',
  cone: 'mod-cone',
  palm: 'nat-palmeira',
  deadTree: 'nat-arvore-seca',
  pebbles: 'nat-seixos',
} as const;
/** Medidas na escala do boneco: as mesmas do catálogo. */
const CAR: Footprint = { width: 2, depth: 3 };
const PANEL: Footprint = { width: 2, depth: 1 };
const BENCH: Footprint = { width: 2, depth: 1 };
const BLOCK: Footprint = { width: 6, depth: 6 };
/** Carros deitados ao longo do eixo leste-oeste. */
const ALONG_X = 1;

/** O canal um degrau abaixo da rua; a praça um degrau acima. */
const HEIGHT = { canal: 0, street: 1, plaza: 2 } as const;

const ROADS: readonly CellRect[] = [
  { x: 0, z: 12, width: 48, depth: 4 },
  { x: 22, z: 0, width: 4, depth: 48 },
];
const SIDEWALKS: readonly CellRect[] = [
  { x: 0, z: 11, width: 48, depth: 1 },
  { x: 0, z: 16, width: 48, depth: 1 },
  { x: 21, z: 0, width: 1, depth: 48 },
  { x: 26, z: 0, width: 1, depth: 48 },
  // As margens do canal.
  { x: 0, z: 32, width: 48, depth: 1 },
  { x: 0, z: 36, width: 48, depth: 1 },
];
/** O canal corre de leste a oeste; a avenida passa por cima dele, na ponte. */
const CANAL: CellRect = { x: 0, z: 33, width: 48, depth: 3 };
const BRIDGE: CellRect = { x: 21, z: 33, width: 6, depth: 3 };
const MARKET: CellRect = { x: 1, z: 18, width: 19, depth: 13 };
const PLAZA: CellRect = { x: 29, z: 18, width: 16, depth: 12 };

type BuildingPlace = Omit<SketchBuilding, 'style' | 'level'>;

const building = (place: BuildingPlace): SketchBuilding => ({
  style: 'cyberpunk',
  level: HEIGHT.street,
  ...place,
});

/** Cada prédio de porta virada para a rua ou para a margem do canal. */
const BUILDINGS: readonly SketchBuilding[] = [
  // A rua dos letreiros: lojas e torres de frente para o sul.
  building({ use: 'shop', x: 1, z: 2, width: 8, depth: 8, stories: 2, rotation: 2, variant: 0 }),
  building({ use: 'tower', x: 11, z: 1, width: 8, depth: 9, stories: 4, rotation: 2, variant: 0 }),
  building({ use: 'shop', x: 28, z: 3, width: 8, depth: 7, stories: 1, rotation: 2, variant: 1 }),
  building({ use: 'tower', x: 38, z: 1, width: 8, depth: 9, stories: 3, rotation: 2, variant: 1 }),
  // Do outro lado do canal: o cortiço e as lojas da margem, de frente para o norte.
  building({ use: 'shop', x: 14, z: 38, width: 6, depth: 6, stories: 2, rotation: 0, variant: 1 }),
  building({ use: 'tower', x: 28, z: 38, width: 8, depth: 8, stories: 3, rotation: 0, variant: 0 }),
  building({ use: 'house', x: 38, z: 38, width: 8, depth: 6, stories: 2, rotation: 0, variant: 1 }),
];

export type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;

function inRect(rect: CellRect, x: number, z: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && z >= rect.z && z < rect.z + rect.depth;
}

function floorAt(x: number, z: number): Floor {
  if (inRect(CANAL, x, z) && !inRect(BRIDGE, x, z)) return { tile: TILE.water, height: 0 };
  if (inRect(PLAZA, x, z)) return { tile: TILE.plaza, height: HEIGHT.plaza };
  if (ROADS.some((rect) => inRect(rect, x, z))) return { tile: TILE.asphalt, height: 1 };
  if (SIDEWALKS.some((rect) => inRect(rect, x, z)) || inRect(BRIDGE, x, z)) {
    return { tile: TILE.sidewalk, height: HEIGHT.street };
  }
  if (inRect(MARKET, x, z)) return { tile: TILE.grate, height: HEIGHT.street };
  return { tile: TILE.asphalt, height: HEIGHT.street };
}

/** Chão de cada casa do distrito: a rua, a calçada, o mercado, a praça ou o canal. */
export function neonDistrictFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (let z = 0; z < NEON_DISTRICT_SIZE.depth; z += 1) {
    for (let x = 0; x < NEON_DISTRICT_SIZE.width; x += 1) {
      floors.set(key({ x, z }), floorAt(x, z));
    }
  }
  return floors;
}

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

function placeAll(place: Place, piece: string, cells: readonly (readonly [number, number])[]) {
  for (const [x, z] of cells) place(piece, { x, z });
}

/** Postes de neon nas calçadas, letreiros nas fachadas e os carros parados na rua. */
function furnishStreets(place: Place): void {
  for (const x of [3, 9, 15, 31, 37, 43]) {
    place(PIECE.lamp, { x, z: 11 });
    place(PIECE.lamp, { x, z: 16 });
  }
  for (const z of [3, 9, 20, 26, 40, 45]) {
    place(PIECE.lamp, { x: 21, z });
    place(PIECE.lamp, { x: 26, z });
  }
  placeAll(place, PIECE.sign, [
    [0, 10],
    [10, 10],
    [20, 10],
    [27, 10],
    [37, 10],
    [47, 10],
  ]);
  place(PIECE.panel, { x: 5, z: 10 }, { footprint: PANEL });
  place(PIECE.panel, { x: 42, z: 10 }, { footprint: PANEL });
  placeAll(place, PIECE.vending, [
    [19, 11],
    [27, 16],
  ]);
  place(PIECE.car, { x: 4, z: 13 }, { footprint: CAR, rotation: ALONG_X });
  place(PIECE.car, { x: 34, z: 12 }, { footprint: CAR, rotation: ALONG_X });
  place(PIECE.car, { x: 23, z: 4 }, { footprint: CAR });
  place(PIECE.car, { x: 24, z: 22 }, { footprint: CAR });
  place(PIECE.car, { x: 23, z: 41 }, { footprint: CAR });
  placeAll(place, PIECE.cone, [
    [22, 28],
    [23, 28],
    [24, 28],
  ]);
}

/** O mercado noturno: fileiras de barracas, máquinas de venda, caixas e os letreiros. */
function furnishMarket(place: Place): void {
  for (const z of [20, 24, 28]) {
    for (const x of [3, 9, 15]) {
      place(PIECE.table, { x, z });
      place(PIECE.table, { x: x + 1, z });
      place(PIECE.sign, { x: x + 2, z });
      place(PIECE.chair, { x, z: z + 1 }, { rotation: 2 });
    }
  }
  placeAll(place, PIECE.vending, [
    [1, 18],
    [1, 22],
    [1, 26],
    [19, 30],
  ]);
  placeAll(place, PIECE.crate, [
    [6, 19],
    [7, 19],
    [12, 23],
    [18, 27],
    [18, 26],
    [6, 30],
  ]);
  placeAll(place, PIECE.barrel, [
    [1, 30],
    [2, 30],
    [13, 30],
  ]);
  placeAll(place, PIECE.lamp, [
    [6, 22],
    [12, 26],
    [18, 19],
  ]);
  place(PIECE.hologram, { x: 10, z: 30 });
}

/** A praça do holograma: o holograma no meio, bancos, palmeiras e painéis de neon na borda. */
function furnishPlaza(place: Place): void {
  place(PIECE.hologram, { x: 36, z: 23 });
  place(PIECE.hologram, { x: 37, z: 24 });
  for (const [x, z] of [
    [33, 21],
    [39, 21],
    [33, 26],
    [39, 26],
  ] as const) {
    place(PIECE.bench, { x, z }, { footprint: BENCH });
  }
  placeAll(place, PIECE.palm, [
    [30, 19],
    [43, 19],
    [30, 28],
    [43, 28],
  ]);
  placeAll(place, PIECE.lamp, [
    [29, 18],
    [44, 18],
    [29, 29],
    [44, 29],
  ]);
  place(PIECE.panel, { x: 35, z: 18 }, { footprint: PANEL });
  place(PIECE.panel, { x: 38, z: 29 }, { footprint: PANEL });
  placeAll(place, PIECE.vending, [
    [44, 23],
    [44, 24],
  ]);
  placeAll(place, PIECE.bin, [
    [32, 23],
    [41, 24],
  ]);
}

/** O canal: guarda-corpos nas margens, árvores secas, tambores e o lixo na beira. */
function furnishCanal(place: Place): void {
  for (let x = 0; x < NEON_DISTRICT_SIZE.width; x += 2) {
    if (x >= BRIDGE.x && x < BRIDGE.x + BRIDGE.width) continue;
    place(PIECE.rail, { x, z: 32 });
    place(PIECE.rail, { x: x + 1, z: 36 });
  }
  placeAll(place, PIECE.rail, [
    [21, 34],
    [26, 34],
  ]);
  placeAll(place, PIECE.deadTree, [
    [5, 31],
    [35, 31],
    [45, 37],
  ]);
  placeAll(place, PIECE.barrel, [
    [16, 31],
    [17, 31],
    [41, 31],
    [10, 37],
  ]);
  placeAll(place, PIECE.pebbles, [
    [28, 31],
    [12, 37],
  ]);
}

/** Do outro lado do canal: os prédios de neon que fazem a linha dos fundos e o pátio deles. */
function furnishSouthBank(place: Place): void {
  place(PIECE.lowBlock, { x: 1, z: 39 }, { footprint: BLOCK });
  place(PIECE.midBlock, { x: 7, z: 41 }, { footprint: BLOCK });
  placeAll(place, PIECE.crate, [
    [13, 46],
    [20, 45],
    [20, 46],
  ]);
  placeAll(place, PIECE.vending, [
    [27, 37],
    [37, 37],
  ]);
  placeAll(place, PIECE.fan, [
    [36, 46],
    [47, 46],
  ]);
  placeAll(place, PIECE.palm, [
    [27, 46],
    [47, 39],
  ]);
}

export function buildNeonDistrictMap(): AssembledMap {
  const sketch = createSketch(NEON_DISTRICT_SIZE, null);
  const floors = neonDistrictFloors();
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    sketch.ground({ x: x!, z: z!, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  const indoors = stampBuildings(sketch, BUILDINGS);
  const place: Place = (piece, cell, options = {}) => {
    const floor = floors.get(key(cell));
    if (!floor || floor.tile === TILE.water) {
      throw new Error(`Peça ${piece} fora do chão do distrito em ${key(cell)}.`);
    }
    if (indoors.has(key(cell))) throw new Error(`Peça ${piece} dentro de prédio em ${key(cell)}.`);
    sketch.piece(piece, cell, { ...options, level: floor.height });
  };
  furnishStreets(place);
  furnishMarket(place);
  furnishPlaza(place);
  furnishCanal(place);
  furnishSouthBank(place);
  return sketch.build(styleHeader(STYLE_KITS.cyberpunk));
}
