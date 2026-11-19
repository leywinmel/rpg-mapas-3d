/**
 * Colônia Astra (RPG-63): posto avançado futurista pensado à mão, em três conveses. No convés
 * de cima, as torres e casas de habitação e a praça do terminal; no do meio, a avenida com as
 * lojas e as garagens; no de baixo, o pátio de carga com o armazém e a pista de kart. A via
 * norte-sul atravessa os três conveses, um degrau por vez.
 *
 * Os prédios vêm da planta do gerador no estilo futurista (painéis, portais, mobília) [#6].
 */
import type { Cell } from '../../grid';
import { type CellRect, type Footprint } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createSketch, stampBuildings, type SketchBuilding, type SketchPiece } from './sketch';

export const COLONY_SIZE = { width: 48, depth: 48 } as const;

const TILE = {
  ground: 'fut-placas-escuras',
  road: 'fut-piso-metal',
  sidewalk: 'fut-piso-quadriculado',
  grass: 'grama',
} as const;
const PIECE = {
  lamp: 'fut-coluna',
  floorLight: 'fut-luz-piso',
  terminal: 'fut-terminal',
  crate: 'fut-caixa-carga',
  chest: 'fut-bau-carga',
  barrel: 'fut-tambor',
  fan: 'fut-ventilador',
  pipe: 'fut-tubulacao',
  rail: 'fut-guarda-corpo',
  obelisk: 'pra-obelisco',
  bench: 'pra-banco-pedra',
  car: 'fut-carro',
  kartYellow: 'fut-kart-amarelo',
  kartPink: 'fut-kart-rosa',
  kartGreen: 'fut-kart-verde',
  kartPurple: 'fut-kart-roxo',
  kartBeige: 'fut-kart-bege',
  birch: 'nat-betula',
  tree: 'arvore',
  grassTuft: 'nat-capim',
  pebbles: 'nat-seixos',
} as const;
/** Medidas na escala do boneco: as mesmas do catálogo. */
const CAR: Footprint = { width: 2, depth: 3 };
const KART: Footprint = { width: 1, depth: 2 };
const PIPE: Footprint = { width: 2, depth: 1 };
/** Veículos deitados ao longo do eixo leste-oeste. */
const ALONG_X = 1;

const HEIGHT = { low: 1, middle: 2, high: 3 } as const;
/** Conveses, do norte para o sul: até a linha `toZ`, a altura `height`. */
const DECKS: readonly { readonly toZ: number; readonly height: number }[] = [
  { toZ: 18, height: HEIGHT.high },
  { toZ: 31, height: HEIGHT.middle },
  { toZ: Number.POSITIVE_INFINITY, height: HEIGHT.low },
];

const ROADS: readonly CellRect[] = [
  { x: 0, z: 22, width: 48, depth: 4 },
  { x: 22, z: 0, width: 4, depth: 48 },
];
const SIDEWALKS: readonly CellRect[] = [
  { x: 0, z: 21, width: 48, depth: 1 },
  { x: 0, z: 26, width: 48, depth: 1 },
  { x: 21, z: 0, width: 1, depth: 48 },
  { x: 26, z: 0, width: 1, depth: 48 },
];
const PLAZA: CellRect = { x: 28, z: 3, width: 17, depth: 14 };
/** Gramados: os canteiros da praça, o jardim da borda do convés e o parque da habitação. */
const LAWNS: readonly CellRect[] = [
  { x: 29, z: 4, width: 3, depth: 3 },
  { x: 41, z: 4, width: 3, depth: 3 },
  { x: 29, z: 13, width: 3, depth: 3 },
  { x: 41, z: 13, width: 3, depth: 3 },
  { x: 27, z: 17, width: 21, depth: 2 },
  { x: 0, z: 0, width: 21, depth: 19 },
];
/** Piso de metal do pátio de carga e da pista; a ilha no meio da pista é gramada. */
const CARGO_YARD: CellRect = { x: 0, z: 33, width: 20, depth: 15 };
const TRACK: CellRect = { x: 28, z: 34, width: 19, depth: 13 };
const TRACK_ISLAND: CellRect = { x: 32, z: 38, width: 11, depth: 5 };

type BuildingPlace = Omit<SketchBuilding, 'style' | 'level'>;

function deckHeight(z: number): number {
  return DECKS.find((deck) => z <= deck.toZ)!.height;
}

const building = (place: BuildingPlace): SketchBuilding => ({
  style: 'futurist',
  level: deckHeight(place.z),
  ...place,
});

/** Cada prédio no seu lugar, de portal virado para a passarela mais próxima. */
const BUILDINGS: readonly SketchBuilding[] = [
  // Convés de cima: a torre de habitação e as casas.
  building({ use: 'tower', x: 2, z: 2, width: 8, depth: 8, stories: 3, rotation: 2, variant: 0 }),
  building({ use: 'house', x: 12, z: 2, width: 6, depth: 6, stories: 2, rotation: 2, variant: 1 }),
  building({ use: 'house', x: 2, z: 13, width: 6, depth: 6, stories: 1, rotation: 2, variant: 0 }),
  building({ use: 'house', x: 11, z: 13, width: 6, depth: 6, stories: 2, rotation: 2, variant: 1 }),
  // Convés do meio: lojas de frente para a avenida e as garagens da pista.
  building({ use: 'shop', x: 2, z: 27, width: 8, depth: 4, stories: 1, rotation: 0, variant: 0 }),
  building({ use: 'shop', x: 11, z: 27, width: 8, depth: 4, stories: 2, rotation: 0, variant: 0 }),
  building({ use: 'shop', x: 28, z: 27, width: 8, depth: 4, stories: 1, rotation: 0, variant: 0 }),
  building({ use: 'tower', x: 38, z: 27, width: 8, depth: 4, stories: 2, rotation: 0, variant: 1 }),
  // Convés de baixo: o armazém do pátio de carga.
  building({ use: 'shop', x: 2, z: 38, width: 8, depth: 8, stories: 2, rotation: 0, variant: 0 }),
];

export type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;

function inRect(rect: CellRect, x: number, z: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && z >= rect.z && z < rect.z + rect.depth;
}

/** O ladrilho de cada casa: via, passarela, praça, pátio, pista ou as placas do convés. */
function tileAt(x: number, z: number): string {
  if (ROADS.some((rect) => inRect(rect, x, z))) return TILE.road;
  if (SIDEWALKS.some((rect) => inRect(rect, x, z))) return TILE.sidewalk;
  if (LAWNS.some((rect) => inRect(rect, x, z)) || inRect(TRACK_ISLAND, x, z)) return TILE.grass;
  if (inRect(PLAZA, x, z)) return TILE.sidewalk;
  if (inRect(TRACK, x, z) || inRect(CARGO_YARD, x, z)) return TILE.road;
  return TILE.ground;
}

/** Chão de cada casa da colônia: o ladrilho e o convés da sua faixa. */
export function colonyFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (let z = 0; z < COLONY_SIZE.depth; z += 1) {
    for (let x = 0; x < COLONY_SIZE.width; x += 1) {
      floors.set(key({ x, z }), { tile: tileAt(x, z), height: deckHeight(z) });
    }
  }
  return floors;
}

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

/** Colunas de luz nas passarelas e luzes de piso nas bordas dos conveses. */
function furnishWalkways(place: Place): void {
  for (const x of [2, 14, 30, 42]) {
    place(PIECE.lamp, { x, z: 21 });
    place(PIECE.lamp, { x, z: 26 });
  }
  for (const z of [2, 14, 31, 43]) {
    place(PIECE.lamp, { x: 21, z });
    place(PIECE.lamp, { x: 26, z });
  }
  // Luzes de piso marcam onde o convés muda de altura.
  for (const x of [0, 9, 18, 28, 33, 38, 45]) place(PIECE.floorLight, { x, z: 19 });
  for (const x of [11, 15, 19, 30, 46]) place(PIECE.floorLight, { x, z: 32 });
  place(PIECE.terminal, { x: 21, z: 20 });
  place(PIECE.terminal, { x: 26, z: 27 });
}

/** Os carros na avenida e na via que desce. */
function furnishRoads(place: Place): void {
  place(PIECE.car, { x: 4, z: 23 }, { footprint: CAR, rotation: ALONG_X });
  place(PIECE.car, { x: 33, z: 24 }, { footprint: CAR, rotation: ALONG_X });
  place(PIECE.car, { x: 23, z: 8 }, { footprint: CAR });
  place(PIECE.car, { x: 23, z: 38 }, { footprint: CAR });
}

/** A praça do terminal: o obelisco, bancos, colunas, luzes de piso e os canteiros. */
function furnishPlaza(place: Place): void {
  place(PIECE.obelisk, { x: 36, z: 9 });
  place(PIECE.terminal, { x: 36, z: 12 });
  for (const [x, z] of [
    [33, 7],
    [39, 7],
    [33, 12],
    [39, 12],
  ] as const) {
    place(PIECE.bench, { x, z });
  }
  for (const [x, z] of [
    [32, 9],
    [40, 9],
    [36, 4],
    [36, 15],
  ] as const) {
    place(PIECE.lamp, { x, z });
  }
  for (const [x, z] of [
    [34, 5],
    [38, 5],
    [34, 14],
    [38, 14],
  ] as const) {
    place(PIECE.floorLight, { x, z });
  }
  for (const [x, z, plant] of [
    [30, 5, PIECE.birch],
    [42, 5, PIECE.tree],
    [30, 14, PIECE.tree],
    [42, 14, PIECE.birch],
    [29, 4, PIECE.grassTuft],
    [43, 15, PIECE.grassTuft],
  ] as const) {
    place(plant, { x, z });
  }
  // O jardim da borda do convés, de frente para a avenida lá embaixo.
  for (const x of [28, 33, 39, 45]) place(PIECE.birch, { x, z: 17 });
  for (const x of [30, 36, 42]) place(PIECE.tree, { x, z: 18 });
}

/** Os quintais de habitação: caixas, tambores, ventiladores e plantas entre as casas. */
function furnishHabitat(place: Place): void {
  for (const [x, z, piece] of [
    [19, 3, PIECE.fan],
    [19, 6, PIECE.barrel],
    [11, 10, PIECE.crate],
    [0, 11, PIECE.birch],
    [9, 16, PIECE.grassTuft],
    [8, 1, PIECE.tree],
    [19, 10, PIECE.birch],
    [1, 11, PIECE.grassTuft],
    [18, 15, PIECE.pebbles],
    [19, 17, PIECE.tree],
    [0, 17, PIECE.chest],
  ] as const) {
    place(piece, { x, z });
  }
  for (const z of [0, 1]) place(PIECE.pipe, { x: 12, z }, { footprint: PIPE });
}

/** O pátio de carga: pilhas de caixas e baús, tambores, a tubulação e o carro de serviço. */
function furnishCargoYard(place: Place): void {
  for (const [x, z] of [
    [12, 35],
    [13, 35],
    [12, 36],
    [16, 35],
    [17, 35],
    [16, 36],
    [12, 44],
    [13, 44],
  ] as const) {
    place(PIECE.crate, { x, z });
  }
  for (const [x, z] of [
    [15, 40],
    [16, 40],
    [17, 44],
  ] as const) {
    place(PIECE.chest, { x, z });
  }
  for (const [x, z] of [
    [18, 38],
    [18, 39],
    [19, 39],
    [11, 46],
  ] as const) {
    place(PIECE.barrel, { x, z });
  }
  for (const x of [1, 3, 5, 7]) place(PIECE.pipe, { x, z: 47 }, { footprint: PIPE });
  place(PIECE.car, { x: 12, z: 39 }, { footprint: CAR });
  place(PIECE.fan, { x: 0, z: 34 });
  place(PIECE.lamp, { x: 10, z: 34 });
  place(PIECE.lamp, { x: 19, z: 46 });
}

/** A pista de kart: os karts na largada, guarda-corpos na ilha e as luzes da curva. */
function furnishTrack(place: Place): void {
  const karts = [
    PIECE.kartYellow,
    PIECE.kartPink,
    PIECE.kartGreen,
    PIECE.kartPurple,
    PIECE.kartBeige,
  ];
  karts.forEach((kart, index) => {
    place(kart, { x: 30 + index * 2, z: 35 }, { footprint: KART, rotation: ALONG_X });
  });
  for (let x = TRACK_ISLAND.x; x < TRACK_ISLAND.x + TRACK_ISLAND.width; x += 2) {
    place(PIECE.rail, { x, z: TRACK_ISLAND.z });
    place(PIECE.rail, { x, z: TRACK_ISLAND.z + TRACK_ISLAND.depth - 1 });
  }
  for (const [x, z] of [
    [28, 34],
    [46, 34],
    [28, 46],
    [46, 46],
  ] as const) {
    place(PIECE.floorLight, { x, z });
  }
  place(PIECE.terminal, { x: 37, z: 40 });
  place(PIECE.lamp, { x: 34, z: 40 });
  place(PIECE.lamp, { x: 40, z: 40 });
  for (const [x, z] of [
    [44, 32],
    [45, 32],
    [44, 33],
  ] as const) {
    place(PIECE.barrel, { x, z });
  }
}

export function buildColonyMap(): AssembledMap {
  const sketch = createSketch(COLONY_SIZE, null);
  const floors = colonyFloors();
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    sketch.ground({ x: x!, z: z!, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  const indoors = stampBuildings(sketch, BUILDINGS);
  const place: Place = (piece, cell, options = {}) => {
    const floor = floors.get(key(cell));
    if (!floor) throw new Error(`Peça ${piece} fora da colônia em ${key(cell)}.`);
    if (indoors.has(key(cell))) throw new Error(`Peça ${piece} dentro de prédio em ${key(cell)}.`);
    sketch.piece(piece, cell, { ...options, level: floor.height });
  };
  furnishWalkways(place);
  furnishRoads(place);
  furnishPlaza(place);
  furnishHabitat(place);
  furnishCargoYard(place);
  furnishTrack(place);
  return sketch.build(styleHeader(STYLE_KITS.futurist));
}
