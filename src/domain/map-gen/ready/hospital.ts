/**
 * Hospital Central (RPG-65): um complexo hospitalar inteiro de 200×200 casas, cercado e de
 * frente para duas avenidas. Ao norte, o parque dos pacientes com o lago, a fonte e o heliponto
 * no canto; no meio, a rua interna entre as alas de internação, torres de cinco andares com
 * enfermarias montadas (leitos nas paredes, soro, monitor, armário de remédios); ao sul, a torre
 * principal de frente para a praça da entrada, a farmácia, o pronto-socorro com a baía das
 * ambulâncias e os estacionamentos de visitantes e funcionários.
 *
 * As enfermarias saem da arrumação de enfermaria do gerador e os prédios da planta do estilo
 * moderno [#6].
 */
import type { Cell } from '../../grid';
import { type CellRect, type Footprint } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createSketch, stampBuildings, type SketchBuilding, type SketchPiece } from './sketch';

export const HOSPITAL_SIZE = { width: 200, depth: 200 } as const;

const TILE = {
  grass: 'grama',
  road: 'mod-asfalto',
  sidewalk: 'mod-calcada',
  stone: 'piso-pedra',
  water: 'agua',
} as const;
const PIECE = {
  fence: 'mod-cerca-branca',
  lamp: 'mod-poste',
  bench: 'mod-banco-praca',
  trash: 'mod-lixeira',
  hydrant: 'mod-hidrante',
  sign: 'mod-placa-rua',
  bollard: 'mod-balizador',
  planter: 'pra-canteiro',
  fountain: 'pra-fonte',
  statue: 'pra-estatua-grande',
  cone: 'mod-cone',
  flag: 'esc-mastro',
  drink: 'esc-bebedouro',
  helipad: 'hos-heliponto',
  stretcher: 'hos-maca',
  wheelchair: 'hos-cadeira-rodas',
  ambulance: 'mod-ambulancia',
  car: 'mod-carro',
  suv: 'mod-utilitario',
  hatch: 'mod-hatch-esportivo',
  convertible: 'mod-conversivel',
  sports: 'mod-esportivo',
  taxi: 'mod-taxi',
  van: 'mod-van',
  police: 'mod-viatura',
  bus: 'mod-onibus',
  oak: 'nat-carvalho',
  birch: 'nat-betula',
  pine: 'nat-pinheiro',
  tree: 'arvore',
  bush: 'nat-arbusto',
  flowers: 'nat-flores',
  roses: 'nat-roseira',
} as const;
/** Medidas dos veículos na escala do boneco: as mesmas do catálogo. */
const CAR: Footprint = { width: 3, depth: 5 };
const VAN: Footprint = { width: 3, depth: 6 };
const BUS: Footprint = { width: 4, depth: 13 };
/** Giros: a frente do modelo para o sul (0), leste (1), norte (2) ou oeste (3). */
const TURN = { south: 0, east: 1, north: 2, west: 3 } as const;
/** Os carros dos estacionamentos, em rodízio, para a fileira não sair toda igual. */
const PARKED = [
  PIECE.car,
  PIECE.suv,
  PIECE.hatch,
  PIECE.convertible,
  PIECE.car,
  PIECE.sports,
  PIECE.suv,
  PIECE.taxi,
] as const;

/** O lago fica no fundo; o campus, um degrau acima; a praça e o heliponto, mais um. */
const HEIGHT = { water: 0, street: 1, plaza: 2 } as const;

const ROADS: readonly CellRect[] = [
  { x: 0, z: 188, width: 200, depth: 8 },
  { x: 0, z: 0, width: 8, depth: 188 },
];
const SIDEWALKS: readonly CellRect[] = [
  { x: 0, z: 185, width: 200, depth: 3 },
  { x: 0, z: 196, width: 200, depth: 4 },
  { x: 8, z: 0, width: 3, depth: 185 },
];
/** A cerca corre na linha z = 184 e na coluna x = 11, aberta nos três portões do sul. */
const FENCE_ROW = 184;
const FENCE_COLUMN = 11;
const VISITOR_GATE: CellRect = { x: 40, z: FENCE_ROW, width: 8, depth: 1 };
const MAIN_GATE: CellRect = { x: 90, z: FENCE_ROW, width: 10, depth: 1 };
const AMBULANCE_GATE: CellRect = { x: 150, z: FENCE_ROW, width: 8, depth: 1 };
const GATES = [VISITOR_GATE, MAIN_GATE, AMBULANCE_GATE];

/** O lago do parque: um retângulo de cantos cortados. */
const LAKE: CellRect = { x: 40, z: 18, width: 32, depth: 22 };
const LAKE_CORNER = 4;
const PARK_PATHS: readonly CellRect[] = [
  { x: 14, z: 46, width: 140, depth: 3 },
  { x: 90, z: 4, width: 3, depth: 60 },
  { x: 14, z: 60, width: 186, depth: 4 },
];
const HELIPAD: CellRect = { x: 166, z: 8, width: 24, depth: 24 };
/** A rua interna entre as alas, a calçada das torres e a praça da entrada. */
const WALKS: readonly CellRect[] = [
  { x: 14, z: 96, width: 186, depth: 8 },
  { x: 84, z: 64, width: 4, depth: 32 },
  { x: 116, z: 104, width: 4, depth: 80 },
];
const PLAZAS: readonly CellRect[] = [{ x: 84, z: 128, width: 32, depth: 56 }, MAIN_GATE];
const PARKING: readonly CellRect[] = [
  { x: 14, z: 134, width: 66, depth: 50 },
  VISITOR_GATE,
  { x: 140, z: 128, width: 58, depth: 56 },
  AMBULANCE_GATE,
];

type BuildingPlace = Omit<SketchBuilding, 'style' | 'level'> & { readonly level?: number };

const building = ({ level = HEIGHT.street, ...place }: BuildingPlace): SketchBuilding => ({
  style: 'modern',
  level,
  ...place,
});

const WARD = { use: 'tower', width: 16, depth: 12, stories: 5, interior: 'ward' } as const;

const BUILDINGS: readonly SketchBuilding[] = [
  // As alas de internação do norte, de porta para a rua interna.
  ...[30, 52, 96, 118, 140].map((x, index) =>
    building({ ...WARD, x, z: 84, rotation: 2, variant: index }),
  ),
  // As alas do sul, de porta para a mesma rua.
  ...[30, 52, 140].map((x, index) =>
    building({ ...WARD, x, z: 104, rotation: 0, variant: index + 1, stories: 4 }),
  ),
  // A torre principal, de frente para a praça, com a recepção no térreo.
  building({ ...WARD, x: 88, z: 112, width: 24, depth: 14, stories: 6, rotation: 2, variant: 1 }),
  // O pronto-socorro de dois andares, de frente para a baía das ambulâncias.
  building({ ...WARD, x: 146, z: 116, width: 16, depth: 10, stories: 2, rotation: 2, variant: 0 }),
  // A farmácia ao lado da praça e a capela do parque.
  building({
    use: 'shop',
    x: 122,
    z: 140,
    width: 12,
    depth: 8,
    stories: 1,
    rotation: 1,
    variant: 0,
  }),
  building({
    use: 'house',
    x: 110,
    z: 20,
    width: 8,
    depth: 10,
    stories: 1,
    rotation: 0,
    variant: 0,
  }),
];

export type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;

function inRect(rect: CellRect, x: number, z: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && z >= rect.z && z < rect.z + rect.depth;
}

const inAny = (rects: readonly CellRect[], x: number, z: number) =>
  rects.some((rect) => inRect(rect, x, z));

/** Dentro do lago, menos os cantos cortados em diagonal. */
function inLake(x: number, z: number): boolean {
  if (!inRect(LAKE, x, z)) return false;
  const dx = Math.min(x - LAKE.x, LAKE.x + LAKE.width - 1 - x);
  const dz = Math.min(z - LAKE.z, LAKE.z + LAKE.depth - 1 - z);
  return dx + dz >= LAKE_CORNER;
}

/** O ladrilho de cada casa: rua, calçada, praça, estacionamento, lago ou grama. */
function floorAt(x: number, z: number): Floor {
  const street = (tile: string): Floor => ({ tile, height: HEIGHT.street });
  if (inAny(ROADS, x, z)) return street(TILE.road);
  if (inAny(SIDEWALKS, x, z)) return street(TILE.sidewalk);
  if (inAny(PLAZAS, x, z) || inRect(HELIPAD, x, z)) {
    return { tile: TILE.stone, height: HEIGHT.plaza };
  }
  if (inAny(PARKING, x, z)) return street(TILE.road);
  if (inLake(x, z)) return { tile: TILE.water, height: HEIGHT.water };
  if (inAny(PARK_PATHS, x, z) || inAny(WALKS, x, z)) return street(TILE.sidewalk);
  return street(TILE.grass);
}

/** Chão de cada casa do hospital, antes dos prédios. */
export function hospitalFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (let z = 0; z < HOSPITAL_SIZE.depth; z += 1) {
    for (let x = 0; x < HOSPITAL_SIZE.width; x += 1) floors.set(key({ x, z }), floorAt(x, z));
  }
  return floors;
}

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

/** A cerca branca em volta do complexo, aberta nos portões. */
function fenceCampus(place: Place): void {
  for (let x = FENCE_COLUMN; x < HOSPITAL_SIZE.width; x += 1) {
    if (inAny(GATES, x, FENCE_ROW)) continue;
    place(PIECE.fence, { x, z: FENCE_ROW });
  }
  for (let z = 0; z < FENCE_ROW; z += 1) {
    place(PIECE.fence, { x: FENCE_COLUMN, z }, { rotation: TURN.east });
  }
}

/** As avenidas: postes, placas, hidrantes, o ônibus no ponto e o trânsito. */
function furnishStreets(place: Place): void {
  for (let x = 14; x < HOSPITAL_SIZE.width; x += 12) place(PIECE.lamp, { x, z: 185 });
  for (let z = 6; z < 182; z += 12) place(PIECE.lamp, { x: 10, z });
  place(PIECE.sign, { x: 10, z: 185 });
  for (const x of [36, 104, 164]) place(PIECE.hydrant, { x, z: 185 });
  for (const x of [86, 102]) place(PIECE.bench, { x, z: 186 });
  place(PIECE.bus, { x: 62, z: 188 }, { footprint: BUS, rotation: TURN.east });
  place(PIECE.taxi, { x: 104, z: 189 }, { footprint: CAR, rotation: TURN.east });
  place(PIECE.taxi, { x: 112, z: 189 }, { footprint: CAR, rotation: TURN.east });
  place(PIECE.ambulance, { x: 130, z: 192 }, { footprint: VAN, rotation: TURN.east });
  place(PIECE.car, { x: 2, z: 40 }, { footprint: CAR });
  place(PIECE.police, { x: 2, z: 120 }, { footprint: CAR, rotation: TURN.north });
}

/** O parque: o lago com árvores em volta, bancos, a fonte no cruzamento e a capela. */
function furnishPark(place: Place): void {
  place(PIECE.fountain, { x: 90, z: 46 });
  for (let x = 36; x < 78; x += 6) {
    place(PIECE.oak, { x, z: 14 });
    place(PIECE.birch, { x: x + 2, z: 43 });
  }
  for (let z = 18; z < 42; z += 6) {
    place(PIECE.pine, { x: 35, z });
    place(PIECE.tree, { x: 76, z });
  }
  for (const x of [20, 44, 64, 100, 124, 144]) place(PIECE.bench, { x, z: 49 });
  for (const x of [30, 56, 110, 134]) place(PIECE.lamp, { x, z: 45 });
  for (const z of [10, 24, 36, 56]) place(PIECE.bench, { x: 93, z }, { rotation: TURN.west });
  for (const [x, z, plant] of [
    [20, 10, PIECE.roses],
    [24, 30, PIECE.flowers],
    [18, 54, PIECE.bush],
    [60, 54, PIECE.roses],
    [100, 8, PIECE.flowers],
    [130, 12, PIECE.oak],
    [140, 30, PIECE.birch],
    [128, 38, PIECE.tree],
    [150, 54, PIECE.flowers],
    [104, 36, PIECE.roses],
  ] as const) {
    place(plant, { x, z });
  }
  place(PIECE.statue, { x: 113, z: 32 });
  place(PIECE.trash, { x: 89, z: 50 });
}

/** O heliponto no canto do parque, com cones, balizadores, postes e a ambulância à espera. */
function furnishHelipad(place: Place): void {
  place(PIECE.helipad, { x: 176, z: 18 });
  for (const [x, z] of [
    [172, 14],
    [183, 14],
    [172, 25],
    [183, 25],
  ] as const) {
    place(PIECE.cone, { x, z });
  }
  for (const [x, z] of [
    [HELIPAD.x, HELIPAD.z],
    [HELIPAD.x + HELIPAD.width - 1, HELIPAD.z],
    [HELIPAD.x, HELIPAD.z + HELIPAD.depth - 1],
    [HELIPAD.x + HELIPAD.width - 1, HELIPAD.z + HELIPAD.depth - 1],
  ] as const) {
    place(PIECE.lamp, { x, z });
  }
  place(PIECE.ambulance, { x: 168, z: 24 }, { footprint: VAN, rotation: TURN.north });
  place(PIECE.stretcher, { x: 172, z: 22 });
  for (let x = 167; x < 190; x += 4) place(PIECE.bollard, { x, z: HELIPAD.z + HELIPAD.depth });
}

/** A rua interna: bancos e árvores entre as portas das alas, cadeiras de rodas e bebedouros. */
function furnishWalks(place: Place): void {
  for (const x of [20, 48, 70, 92, 114, 136, 160, 180]) place(PIECE.oak, { x, z: 100 });
  for (const x of [24, 74, 112, 162, 184]) place(PIECE.bench, { x, z: 97 });
  for (const x of [26, 76, 164]) place(PIECE.trash, { x, z: 102 });
  for (const x of [50, 116, 158]) place(PIECE.drink, { x, z: 97 });
  for (const x of [28, 94, 138]) place(PIECE.wheelchair, { x, z: 102 });
  for (const x of [17, 66, 112, 186]) place(PIECE.lamp, { x, z: 103 });
  for (const z of [70, 80, 90]) place(PIECE.birch, { x: 89, z });
  for (const z of [110, 124, 156, 170]) place(PIECE.bush, { x: 121, z });
}

/** A praça da entrada: mastros, a fonte, bancos, canteiros e árvores. */
function furnishPlaza(place: Place): void {
  for (const x of [92, 99, 106]) place(PIECE.flag, { x, z: 132 });
  place(PIECE.fountain, { x: 98, z: 150 });
  for (const [x, z] of [
    [88, 140],
    [110, 140],
    [88, 160],
    [110, 160],
    [88, 174],
    [110, 174],
  ] as const) {
    place(PIECE.bench, { x, z });
  }
  for (const [x, z] of [
    [86, 130],
    [114, 130],
    [86, 150],
    [114, 150],
    [86, 168],
    [114, 168],
    [86, 182],
    [114, 182],
  ] as const) {
    place(PIECE.oak, { x, z });
  }
  for (const [x, z] of [
    [92, 145],
    [104, 145],
    [92, 157],
    [104, 157],
  ] as const) {
    place(PIECE.planter, { x, z });
  }
  for (const z of [138, 164, 178]) {
    place(PIECE.lamp, { x: 95, z });
    place(PIECE.lamp, { x: 104, z });
  }
  place(PIECE.wheelchair, { x: 96, z: 128 });
  place(PIECE.trash, { x: 108, z: 136 });
}

/** O estacionamento de visitantes: quatro fileiras de carros e a faixa livre do portão. */
function furnishVisitorParking(place: Place): void {
  const columns = [16, 20, 24, 28, 32, 36, 50, 54, 58, 62, 66, 70, 74];
  [136, 148, 160, 172].forEach((z, row) =>
    columns.forEach((x, index) => {
      if ((index + row) % 5 === 3) return;
      const rotation = row % 2 === 0 ? TURN.south : TURN.north;
      place(PARKED[(index + row) % PARKED.length]!, { x, z }, { footprint: CAR, rotation });
    }),
  );
  for (const z of [142, 154, 166, 178]) {
    place(PIECE.lamp, { x: 39, z });
    place(PIECE.lamp, { x: 48, z });
  }
  place(PIECE.cone, { x: 42, z: 182 });
  place(PIECE.cone, { x: 45, z: 182 });
}

/** A baía das ambulâncias na porta do pronto-socorro e o estacionamento dos funcionários. */
function furnishEmergency(place: Place): void {
  [144, 148, 156, 160].forEach((x) =>
    place(PIECE.ambulance, { x, z: 130 }, { footprint: VAN, rotation: TURN.north }),
  );
  place(PIECE.stretcher, { x: 152, z: 129 });
  place(PIECE.stretcher, { x: 155, z: 129 });
  place(PIECE.wheelchair, { x: 151, z: 128 });
  for (const x of [142, 164]) place(PIECE.bollard, { x, z: 128 });
  for (const z of [140, 156, 172]) {
    place(PIECE.cone, { x: 150, z });
    place(PIECE.cone, { x: 157, z });
  }
  place(PIECE.police, { x: 162, z: 140 }, { footprint: CAR, rotation: TURN.north });
  place(PIECE.van, { x: 142, z: 150 }, { footprint: VAN });
  const columns = [170, 174, 178, 182, 186, 190, 194];
  [130, 142, 154, 166, 176].forEach((z, row) =>
    columns.forEach((x, index) => {
      if ((index * 3 + row) % 4 === 1) return;
      const rotation = row % 2 === 0 ? TURN.south : TURN.north;
      place(PARKED[(index + row + 3) % PARKED.length]!, { x, z }, { footprint: CAR, rotation });
    }),
  );
  for (const z of [136, 160]) place(PIECE.lamp, { x: 168, z });
}

/** Os gramados entre as alas e a beira dos estacionamentos. */
function furnishLawns(place: Place): void {
  for (const x of [16, 22, 72, 78, 162, 168, 176, 186, 194]) place(PIECE.tree, { x, z: 68 });
  for (const x of [16, 24, 74, 166, 176, 190]) place(PIECE.birch, { x, z: 120 });
  for (const z of [72, 80, 88, 112, 124]) place(PIECE.pine, { x: 14, z });
  for (const x of [20, 32, 56, 68]) place(PIECE.bush, { x, z: 130 });
  for (const x of [126, 134]) place(PIECE.roses, { x, z: 128 });
  for (const z of [72, 84]) place(PIECE.flowers, { x: 194, z });
  // Os jardins de descanso entre as alas do sul e a torre principal.
  for (const z of [108, 116, 124]) {
    for (const x of [72, 78, 124, 130]) place(z === 116 ? PIECE.birch : PIECE.oak, { x, z });
    place(PIECE.bench, { x: 80, z: z + 2 });
    place(PIECE.bench, { x: 134, z: z + 2 });
  }
}

export function buildHospitalMap(): AssembledMap {
  const sketch = createSketch(HOSPITAL_SIZE, null);
  const floors = hospitalFloors();
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    sketch.ground({ x: x!, z: z!, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  const indoors = stampBuildings(sketch, BUILDINGS);
  const place: Place = (piece, cell, options = {}) => {
    const floor = floors.get(key(cell));
    if (!floor) throw new Error(`Peça ${piece} fora do hospital em ${key(cell)}.`);
    if (floor.tile === TILE.water) throw new Error(`Peça ${piece} no lago em ${key(cell)}.`);
    if (indoors.has(key(cell))) throw new Error(`Peça ${piece} dentro de prédio em ${key(cell)}.`);
    sketch.piece(piece, cell, { ...options, level: floor.height });
  };
  fenceCampus(place);
  furnishStreets(place);
  furnishPark(place);
  furnishHelipad(place);
  furnishWalks(place);
  furnishPlaza(place);
  furnishVisitorParking(place);
  furnishEmergency(place);
  furnishLawns(place);
  return sketch.build(styleHeader(STYLE_KITS.modern));
}
