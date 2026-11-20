/**
 * Escola do Bairro Alto (RPG-65): uma escola inteira de 100×100 casas, cercada e de frente
 * para a avenida. Ao norte, a fileira de pavilhões de aula de dois andares, cada andar uma sala
 * com lousa, mesa do professor e carteiras; no meio, o corredor coberto, mais pavilhões e o
 * refeitório; ao sul, o campo de futebol com a pista de terra, o pátio com a estátua, a quadra
 * de basquete, a enfermaria, a secretaria de frente para a praça da entrada (com o mastro e a
 * fonte) e o estacionamento dos professores. Na avenida, o ônibus escolar espera.
 *
 * As salas saem da arrumação de sala de aula do gerador e os prédios da planta do estilo
 * moderno [#6].
 */
import type { Cell } from '../../grid';
import { type CellRect, type Footprint } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createSketch, stampBuildings, type SketchBuilding, type SketchPiece } from './sketch';

export const SCHOOL_SIZE = { width: 100, depth: 100 } as const;

const TILE = {
  grass: 'grama',
  road: 'mod-asfalto',
  sidewalk: 'mod-calcada',
  stone: 'piso-pedra',
  dirt: 'terra',
} as const;
const PIECE = {
  fence: 'mod-cerca-branca',
  lamp: 'mod-poste',
  bench: 'mod-banco-praca',
  trash: 'mod-lixeira',
  hydrant: 'mod-hidrante',
  sign: 'mod-placa-rua',
  planter: 'pra-canteiro',
  fountain: 'pra-fonte',
  statue: 'pra-estatua-grande',
  cone: 'mod-cone',
  flag: 'esc-mastro',
  fountainDrink: 'esc-bebedouro',
  hoop: 'esc-cesta-basquete',
  goal: 'esc-trave',
  car: 'mod-carro',
  suv: 'mod-utilitario',
  hatch: 'mod-hatch-esportivo',
  van: 'mod-van',
  taxi: 'mod-taxi',
  bus: 'mod-onibus',
  oak: 'nat-carvalho',
  birch: 'nat-betula',
  tree: 'arvore',
  bush: 'nat-arbusto',
  flowers: 'nat-flores',
} as const;
/** Medidas dos veículos na escala do boneco: as mesmas do catálogo. */
const CAR: Footprint = { width: 3, depth: 5 };
const VAN: Footprint = { width: 3, depth: 6 };
const BUS: Footprint = { width: 4, depth: 13 };
/** Giros: a frente do modelo para o sul (0), leste (1), norte (2) ou oeste (3). */
const TURN = { south: 0, east: 1, north: 2, west: 3 } as const;

/** A rua e o campus ficam no mesmo nível; o pátio e a praça da entrada, um degrau acima. */
const HEIGHT = { street: 1, plaza: 2 } as const;

const ROADS: readonly CellRect[] = [
  { x: 0, z: 91, width: 100, depth: 6 },
  { x: 0, z: 0, width: 6, depth: 91 },
];
const SIDEWALKS: readonly CellRect[] = [
  { x: 0, z: 88, width: 100, depth: 3 },
  { x: 0, z: 97, width: 100, depth: 3 },
  { x: 6, z: 0, width: 3, depth: 88 },
];
/** A cerca corre na linha z = 87 e na coluna x = 9, com os dois portões no sul. */
const FENCE_ROW = 87;
const FENCE_COLUMN = 9;
const GATES: readonly CellRect[] = [
  { x: 50, z: FENCE_ROW, width: 6, depth: 1 },
  { x: 72, z: FENCE_ROW, width: 6, depth: 1 },
];
const FIELD: CellRect = { x: 14, z: 40, width: 26, depth: 30 };
const TRACK: CellRect = { x: 12, z: 38, width: 30, depth: 34 };
const COURT: CellRect = { x: 70, z: 38, width: 16, depth: 28 };
const PARKING: readonly CellRect[] = [
  { x: 68, z: 74, width: 29, depth: 13 },
  { x: 72, z: FENCE_ROW, width: 6, depth: 1 },
];
/** O pátio (entre o campo e a quadra) e a praça da entrada, de pedra e um degrau acima. */
const PLAZAS: readonly CellRect[] = [
  { x: 44, z: 36, width: 24, depth: 36 },
  { x: 42, z: 72, width: 26, depth: 15 },
  { x: 50, z: FENCE_ROW, width: 6, depth: 1 },
];
/** Os corredores de calçada entre as fileiras de pavilhões. */
const CORRIDORS: readonly CellRect[] = [
  { x: 12, z: 12, width: 84, depth: 12 },
  { x: 12, z: 32, width: 84, depth: 4 },
];

type BuildingPlace = Omit<SketchBuilding, 'style' | 'level'> & { readonly level?: number };

const building = ({ level = HEIGHT.street, ...place }: BuildingPlace): SketchBuilding => ({
  style: 'modern',
  level,
  ...place,
});

const PAVILION = { use: 'house', width: 12, depth: 8, stories: 2, interior: 'classroom' } as const;
/** Colunas dos pavilhões: 12 casas de largura e 4 de vão entre um e outro. */
const NORTH_ROW = [14, 30, 46, 62, 78];

const BUILDINGS: readonly SketchBuilding[] = [
  // A fileira do norte, de porta para o corredor do sul; cada andar uma sala de aula.
  ...NORTH_ROW.map((x, index) => building({ ...PAVILION, x, z: 3, rotation: 2, variant: index })),
  // A fileira do meio, de porta para o mesmo corredor, com o refeitório no centro.
  ...[14, 30, 66, 82].map((x, index) =>
    building({ ...PAVILION, x, z: 24, rotation: 0, variant: index + 1 }),
  ),
  building({ use: 'shop', x: 46, z: 24, width: 16, depth: 8, stories: 1, rotation: 0, variant: 0 }),
  // A secretaria de frente para a praça da entrada e a enfermaria ao lado da quadra.
  building({
    use: 'tower',
    x: 50,
    z: 62,
    width: 12,
    depth: 8,
    stories: 2,
    rotation: 2,
    variant: 0,
    level: HEIGHT.plaza,
  }),
  building({
    use: 'house',
    x: 90,
    z: 44,
    width: 8,
    depth: 6,
    stories: 1,
    rotation: 1,
    variant: 1,
    interior: 'ward',
  }),
];

export type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;

function inRect(rect: CellRect, x: number, z: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && z >= rect.z && z < rect.z + rect.depth;
}

const inAny = (rects: readonly CellRect[], x: number, z: number) =>
  rects.some((rect) => inRect(rect, x, z));

/** O ladrilho de cada casa: rua, calçada, pátio, quadra, campo, pista ou grama. */
function floorAt(x: number, z: number): Floor {
  const street = (tile: string): Floor => ({ tile, height: HEIGHT.street });
  if (inAny(ROADS, x, z)) return street(TILE.road);
  if (inAny(SIDEWALKS, x, z)) return street(TILE.sidewalk);
  if (inAny(PLAZAS, x, z)) return { tile: TILE.stone, height: HEIGHT.plaza };
  if (inAny(PARKING, x, z) || inRect(COURT, x, z)) return street(TILE.road);
  if (inRect(FIELD, x, z)) return street(TILE.grass);
  if (inRect(TRACK, x, z)) return street(TILE.dirt);
  if (inAny(CORRIDORS, x, z)) return street(TILE.sidewalk);
  return street(TILE.grass);
}

/** Chão de cada casa da escola, antes dos prédios. */
export function schoolFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (let z = 0; z < SCHOOL_SIZE.depth; z += 1) {
    for (let x = 0; x < SCHOOL_SIZE.width; x += 1) floors.set(key({ x, z }), floorAt(x, z));
  }
  return floors;
}

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

/** A cerca branca em volta do campus, aberta nos dois portões. */
function fenceCampus(place: Place): void {
  for (let x = FENCE_COLUMN; x < SCHOOL_SIZE.width; x += 1) {
    if (inAny(GATES, x, FENCE_ROW)) continue;
    place(PIECE.fence, { x, z: FENCE_ROW });
  }
  for (let z = 0; z < FENCE_ROW; z += 1) {
    place(PIECE.fence, { x: FENCE_COLUMN, z }, { rotation: TURN.east });
  }
}

/** A avenida: postes, hidrante, placa, o ônibus escolar parado em frente ao portão e um táxi. */
function furnishStreets(place: Place): void {
  for (let x = 10; x < SCHOOL_SIZE.width; x += 12) place(PIECE.lamp, { x, z: 88 });
  for (let z = 4; z < 84; z += 12) place(PIECE.lamp, { x: 8, z });
  place(PIECE.sign, { x: 8, z: 88 });
  place(PIECE.hydrant, { x: 20, z: 88 });
  place(PIECE.trash, { x: 44, z: 88 });
  place(PIECE.trash, { x: 62, z: 88 });
  place(PIECE.bus, { x: 32, z: 91 }, { footprint: BUS, rotation: TURN.east });
  place(PIECE.taxi, { x: 62, z: 93 }, { footprint: CAR, rotation: TURN.east });
  place(PIECE.car, { x: 2, z: 30 }, { footprint: CAR });
}

/** Os corredores: bebedouros e lixeiras nos vãos, bancos e árvores no meio. */
function furnishCorridors(place: Place): void {
  for (const x of [27, 43, 59, 75]) {
    place(PIECE.fountainDrink, { x, z: 11 });
    place(PIECE.trash, { x: x + 1, z: 11 });
  }
  for (const x of [17, 33, 49, 65, 81]) place(PIECE.bench, { x, z: 17 });
  for (const x of [26, 42, 58, 74, 90]) place(PIECE.birch, { x, z: 17 });
  for (const x of [12, 28, 44, 60, 76, 92]) place(PIECE.oak, { x, z: 1 });
  for (const z of [14, 20, 26, 32, 38]) place(PIECE.tree, { x: 97, z });
  for (const x of [27, 43, 63, 79]) place(PIECE.bush, { x, z: 29 });
}

/** O campo de futebol: as traves nas pontas, cones nos cantos e bancos da torcida. */
function furnishField(place: Place): void {
  place(PIECE.goal, { x: 26, z: FIELD.z }, { rotation: TURN.south });
  place(PIECE.goal, { x: 26, z: FIELD.z + FIELD.depth - 1 }, { rotation: TURN.north });
  for (const [x, z] of [
    [FIELD.x, FIELD.z],
    [FIELD.x + FIELD.width - 1, FIELD.z],
    [FIELD.x, FIELD.z + FIELD.depth - 1],
    [FIELD.x + FIELD.width - 1, FIELD.z + FIELD.depth - 1],
  ] as const) {
    place(PIECE.cone, { x, z });
  }
  for (const z of [46, 52, 58, 64]) place(PIECE.bench, { x: 10, z }, { rotation: TURN.east });
  place(PIECE.fountainDrink, { x: 10, z: 42 });
  place(PIECE.lamp, { x: 10, z: 70 });
  for (const z of [74, 78, 82]) place(PIECE.oak, { x: 14, z });
  for (const z of [76, 80, 84]) place(PIECE.birch, { x: 30, z });
}

/** O pátio de pedra: a estátua no meio, bancos, canteiros e árvores. */
function furnishPatio(place: Place): void {
  place(PIECE.statue, { x: 55, z: 46 });
  for (const [x, z] of [
    [47, 44],
    [61, 44],
    [47, 52],
    [61, 52],
  ] as const) {
    place(PIECE.bench, { x, z });
  }
  for (const [x, z, tree] of [
    [45, 38, PIECE.oak],
    [66, 38, PIECE.birch],
    [45, 58, PIECE.birch],
    [66, 58, PIECE.oak],
  ] as const) {
    place(tree, { x, z });
  }
  place(PIECE.planter, { x: 52, z: 40 });
  place(PIECE.planter, { x: 58, z: 40 });
  place(PIECE.trash, { x: 53, z: 54 });
  place(PIECE.fountainDrink, { x: 44, z: 48 });
  place(PIECE.lamp, { x: 50, z: 48 });
  place(PIECE.lamp, { x: 61, z: 48 });
}

/** A quadra: as tabelas nas pontas, bancos do lado e a enfermaria com o jardim. */
function furnishCourt(place: Place): void {
  place(PIECE.hoop, { x: 77, z: COURT.z }, { rotation: TURN.south });
  place(PIECE.hoop, { x: 77, z: COURT.z + COURT.depth - 1 }, { rotation: TURN.north });
  for (const z of [42, 48, 54, 60]) place(PIECE.bench, { x: 87, z }, { rotation: TURN.west });
  place(PIECE.lamp, { x: 69, z: COURT.z });
  place(PIECE.lamp, { x: 69, z: COURT.z + COURT.depth - 1 });
  for (const [x, z, plant] of [
    [92, 40, PIECE.flowers],
    [96, 42, PIECE.bush],
    [96, 54, PIECE.oak],
    [92, 56, PIECE.flowers],
    [94, 62, PIECE.birch],
    [90, 68, PIECE.tree],
  ] as const) {
    place(plant, { x, z });
  }
}

/** A praça da entrada: o mastro, a fonte, bancos, árvores e os postes do portão. */
function furnishEntrance(place: Place): void {
  place(PIECE.flag, { x: 47, z: 75 });
  place(PIECE.flag, { x: 63, z: 75 });
  place(PIECE.fountain, { x: 54, z: 79 });
  for (const [x, z] of [
    [45, 79],
    [45, 83],
    [62, 79],
    [62, 83],
  ] as const) {
    place(PIECE.bench, { x, z });
  }
  for (const [x, z] of [
    [43, 73],
    [66, 73],
    [43, 85],
    [66, 85],
  ] as const) {
    place(PIECE.oak, { x, z });
  }
  place(PIECE.lamp, { x: 49, z: 86 });
  place(PIECE.lamp, { x: 56, z: 86 });
  place(PIECE.planter, { x: 50, z: 72 });
  place(PIECE.planter, { x: 59, z: 72 });
}

/** O estacionamento: duas fileiras de carros, a van da escola e a faixa livre do portão. */
function furnishParking(place: Place): void {
  const cars = [PIECE.car, PIECE.suv, PIECE.hatch, PIECE.car, PIECE.suv, PIECE.hatch, PIECE.car];
  [69, 73, 77, 81, 85, 89, 93].forEach((x, index) =>
    place(cars[index]!, { x, z: 75 }, { footprint: CAR }),
  );
  [81, 85, 89].forEach((x, index) =>
    place(cars[index + 2]!, { x, z: 81 }, { footprint: CAR, rotation: TURN.north }),
  );
  place(PIECE.van, { x: 93, z: 81 }, { footprint: VAN, rotation: TURN.north });
  place(PIECE.cone, { x: 71, z: 84 });
  place(PIECE.cone, { x: 78, z: 84 });
  place(PIECE.lamp, { x: 68, z: 81 });
  place(PIECE.lamp, { x: 96, z: 74 });
}

export function buildSchoolMap(): AssembledMap {
  const sketch = createSketch(SCHOOL_SIZE, null);
  const floors = schoolFloors();
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    sketch.ground({ x: x!, z: z!, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  const indoors = stampBuildings(sketch, BUILDINGS);
  const place: Place = (piece, cell, options = {}) => {
    const floor = floors.get(key(cell));
    if (!floor) throw new Error(`Peça ${piece} fora da escola em ${key(cell)}.`);
    if (indoors.has(key(cell))) throw new Error(`Peça ${piece} dentro de prédio em ${key(cell)}.`);
    sketch.piece(piece, cell, { ...options, level: floor.height });
  };
  fenceCampus(place);
  furnishStreets(place);
  furnishCorridors(place);
  furnishField(place);
  furnishPatio(place);
  furnishCourt(place);
  furnishEntrance(place);
  furnishParking(place);
  return sketch.build(styleHeader(STYLE_KITS.modern));
}
