/**
 * Estação Vega (RPG-63): estação espacial pensada à mão, por dentro, para aventura de ficção
 * científica. A ponte de comando fica ao norte, com o estrado do capitão; o corredor central
 * desce até o hangar das naves, ao sul. O corredor transversal liga as alas: alojamentos e
 * refeitório a oeste, laboratório e reator a leste, com o poço do núcleo um degrau abaixo.
 * Nos cantos do norte, o mirante e o depósito.
 *
 * Fora das salas não há chão: é o vazio do espaço, e as paredes do casco fecham tudo.
 */
import type { Cell } from '../../grid';
import { rectCells, STORY_HEIGHT_STEPS, type CellRect, type Footprint } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createSketch, outlineWalls, type SketchPiece } from './sketch';

export const STATION_SIZE = { width: 44, depth: 44 } as const;

const TILE = {
  smooth: 'fut-piso-liso',
  metal: 'fut-piso-metal',
  checker: 'fut-piso-quadriculado',
  plates: 'fut-placas-escuras',
} as const;
const WALL = {
  plain: 'fut-painel-faixa',
  window: 'fut-parede-janela',
  door: 'fut-portal',
} as const;
const PIECE = {
  terminal: 'fut-terminal',
  crate: 'fut-caixa-carga',
  chest: 'fut-bau-carga',
  barrel: 'fut-tambor',
  fan: 'fut-ventilador',
  floorLight: 'fut-luz-piso',
  pipe: 'fut-tubulacao',
  rail: 'fut-guarda-corpo',
  column: 'fut-coluna',
  shuttle: 'fut-carro',
  roverYellow: 'fut-kart-amarelo',
  roverGreen: 'fut-kart-verde',
  roverPurple: 'fut-kart-roxo',
  table: 'mesa',
  chair: 'cadeira',
  bed: 'mod-cama',
  sofa: 'mod-sofa',
  wardrobe: 'mod-armario',
  bookcase: 'mod-estante',
  shelf: 'mod-prateleira',
  fridge: 'mod-geladeira',
  stove: 'mod-fogao',
  counter: 'mod-balcao',
  screen: 'mod-tv',
  plant: 'mod-vaso-planta',
} as const;
/** Medidas na escala do boneco: as mesmas do catálogo. */
const SHUTTLE: Footprint = { width: 2, depth: 3 };
const ROVER: Footprint = { width: 1, depth: 2 };
const PIPE: Footprint = { width: 2, depth: 1 };

/** O convés inteiro num degrau; o estrado da ponte sobe um e o poço do reator desce um. */
const HEIGHT = { pit: 0, deck: 1, dais: 2 } as const;
/** Casco com janela a cada tantas casas, nas salas da borda. */
const HULL_WINDOW_EVERY = 4;

type Area = { readonly rect: CellRect; readonly tile: string; readonly room: boolean };

const room = (rect: CellRect, tile: string): Area => ({ rect, tile, room: true });
const corridor = (rect: CellRect): Area => ({ rect, tile: TILE.checker, room: false });

const AREAS = {
  observation: room({ x: 1, z: 1, width: 10, depth: 7 }, TILE.checker),
  bridge: room({ x: 14, z: 1, width: 16, depth: 8 }, TILE.smooth),
  storage: room({ x: 33, z: 1, width: 10, depth: 7 }, TILE.metal),
  quarters: room({ x: 1, z: 10, width: 12, depth: 9 }, TILE.smooth),
  lab: room({ x: 31, z: 10, width: 12, depth: 9 }, TILE.checker),
  mess: room({ x: 1, z: 25, width: 12, depth: 9 }, TILE.smooth),
  reactor: room({ x: 31, z: 25, width: 12, depth: 9 }, TILE.metal),
  hangar: room({ x: 8, z: 36, width: 28, depth: 7 }, TILE.plates),
  spine: corridor({ x: 21, z: 9, width: 2, depth: 27 }),
  cross: corridor({ x: 6, z: 21, width: 32, depth: 2 }),
  westNorth: corridor({ x: 6, z: 19, width: 2, depth: 2 }),
  westSouth: corridor({ x: 6, z: 23, width: 2, depth: 2 }),
  eastNorth: corridor({ x: 36, z: 19, width: 2, depth: 2 }),
  eastSouth: corridor({ x: 36, z: 23, width: 2, depth: 2 }),
  observationLink: corridor({ x: 5, z: 8, width: 2, depth: 2 }),
  storageLink: corridor({ x: 37, z: 8, width: 2, depth: 2 }),
} as const satisfies Record<string, Area>;

const DAIS: CellRect = { x: 19, z: 2, width: 6, depth: 2 };
const PIT: CellRect = { x: 34, z: 27, width: 6, depth: 5 };

/** Portas de correr: a aresta norte de cada casa onde um corredor encontra uma sala. */
const DOORS: readonly Cell[] = [
  ...[21, 22].flatMap((x) => [
    { x, z: 9 },
    { x, z: 36 },
  ]),
  ...[6, 7].flatMap((x) => [
    { x, z: 19 },
    { x, z: 25 },
  ]),
  ...[36, 37].flatMap((x) => [
    { x, z: 19 },
    { x, z: 25 },
  ]),
  ...[5, 6].flatMap((x) => [
    { x, z: 8 },
    { x, z: 10 },
  ]),
  ...[37, 38].flatMap((x) => [
    { x, z: 8 },
    { x, z: 10 },
  ]),
];

export type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;

function inRect(rect: CellRect, cell: Cell): boolean {
  const { x, z } = cell;
  return x >= rect.x && x < rect.x + rect.width && z >= rect.z && z < rect.z + rect.depth;
}

function heightAt(cell: Cell): number {
  if (inRect(DAIS, cell)) return HEIGHT.dais;
  if (inRect(PIT, cell)) return HEIGHT.pit;
  return HEIGHT.deck;
}

/** Chão de cada casa da estação; o vazio do espaço fica de fora. */
export function stationFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (const area of Object.values(AREAS)) {
    for (const cell of rectCells(area.rect)) {
      floors.set(key(cell), { tile: area.tile, height: heightAt(cell) });
    }
  }
  return floors;
}

/** Janelas no casco: a ponte e o mirante olham as estrelas, o hangar tem o campo de força. */
function wallStyleAt(cell: Cell): string {
  const { observation, bridge, hangar } = AREAS;
  if (inRect(observation.rect, cell)) return WALL.window;
  if (inRect(bridge.rect, cell) && cell.z === bridge.rect.z) return WALL.window;
  if (inRect(hangar.rect, cell) && cell.z === hangar.rect.z + hangar.rect.depth - 1) {
    return WALL.window;
  }
  const onHull = cell.x <= 1 || cell.x >= STATION_SIZE.width - 2;
  const isRoom = Object.values(AREAS).some((area) => area.room && inRect(area.rect, cell));
  if (onHull && isRoom && (cell.x + cell.z) % HULL_WINDOW_EVERY === 0) return WALL.window;
  return WALL.plain;
}

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

function placeAll(place: Place, piece: string, cells: readonly (readonly [number, number])[]) {
  for (const [x, z] of cells) place(piece, { x, z });
}

/** A ponte: os consoles do estrado, a mesa de navegação e as colunas da proa. */
function furnishBridge(place: Place): void {
  placeAll(place, PIECE.terminal, [
    [19, 2],
    [21, 2],
    [22, 2],
    [24, 2],
    [15, 2],
    [15, 5],
    [28, 2],
    [28, 5],
  ]);
  place(PIECE.chair, { x: 21, z: 3 });
  place(PIECE.chair, { x: 22, z: 3 });
  placeAll(place, PIECE.table, [
    [21, 6],
    [22, 6],
  ]);
  place(PIECE.chair, { x: 20, z: 6 }, { rotation: 3 });
  place(PIECE.chair, { x: 23, z: 6 }, { rotation: 1 });
  placeAll(place, PIECE.column, [
    [14, 1],
    [29, 1],
  ]);
  placeAll(place, PIECE.floorLight, [
    [14, 8],
    [29, 8],
    [17, 6],
    [26, 6],
  ]);
}

/** O mirante: sofás de frente para as janelas, plantas e a mesinha. */
function furnishObservation(place: Place): void {
  place(PIECE.sofa, { x: 2, z: 3 });
  place(PIECE.sofa, { x: 8, z: 3 });
  placeAll(place, PIECE.table, [
    [5, 3],
    [6, 3],
  ]);
  placeAll(place, PIECE.plant, [
    [1, 1],
    [10, 1],
    [1, 7],
    [10, 7],
  ]);
  place(PIECE.terminal, { x: 10, z: 5 });
}

/** O depósito: pilhas de caixas, baús e tambores de combustível. */
function furnishStorage(place: Place): void {
  placeAll(place, PIECE.crate, [
    [33, 1],
    [34, 1],
    [33, 2],
    [41, 1],
    [42, 1],
    [42, 2],
  ]);
  placeAll(place, PIECE.chest, [
    [36, 3],
    [39, 3],
    [41, 5],
  ]);
  placeAll(place, PIECE.barrel, [
    [33, 6],
    [34, 6],
    [42, 6],
    [42, 5],
  ]);
  place(PIECE.fan, { x: 35, z: 1 });
}

/** Os alojamentos: beliches nas paredes, armários e a mesa comum. */
function furnishQuarters(place: Place): void {
  for (const x of [1, 3, 9, 11]) {
    place(PIECE.bed, { x, z: 11 });
    place(PIECE.bed, { x, z: 17 });
  }
  placeAll(place, PIECE.wardrobe, [
    [12, 13],
    [1, 14],
  ]);
  placeAll(place, PIECE.table, [
    [5, 14],
    [6, 14],
  ]);
  place(PIECE.chair, { x: 4, z: 14 }, { rotation: 3 });
  place(PIECE.chair, { x: 7, z: 14 }, { rotation: 1 });
  place(PIECE.plant, { x: 12, z: 16 });
  place(PIECE.terminal, { x: 1, z: 13 });
}

/** O laboratório: consoles de análise, bancadas, estantes e as amostras. */
function furnishLab(place: Place): void {
  placeAll(place, PIECE.terminal, [
    [42, 11],
    [42, 13],
    [42, 15],
  ]);
  placeAll(place, PIECE.table, [
    [33, 13],
    [34, 13],
    [33, 15],
    [34, 15],
  ]);
  place(PIECE.chair, { x: 35, z: 13 }, { rotation: 1 });
  place(PIECE.chair, { x: 35, z: 15 }, { rotation: 1 });
  placeAll(place, PIECE.bookcase, [
    [31, 10],
    [32, 10],
  ]);
  placeAll(place, PIECE.shelf, [
    [40, 10],
    [41, 10],
  ]);
  place(PIECE.chest, { x: 31, z: 18 });
  placeAll(place, PIECE.barrel, [
    [40, 17],
    [41, 17],
  ]);
  place(PIECE.fridge, { x: 42, z: 17 });
}

/** O refeitório: duas mesas compridas, a cozinha e o telão. */
function furnishMess(place: Place): void {
  for (let x = 3; x <= 8; x += 1) {
    place(PIECE.table, { x, z: 28 });
    place(PIECE.table, { x, z: 31 });
    place(PIECE.chair, { x, z: 27 });
    place(PIECE.chair, { x, z: 29 }, { rotation: 2 });
    place(PIECE.chair, { x, z: 32 }, { rotation: 2 });
  }
  placeAll(place, PIECE.stove, [
    [12, 26],
    [12, 27],
  ]);
  place(PIECE.fridge, { x: 12, z: 25 });
  placeAll(place, PIECE.counter, [
    [11, 30],
    [11, 31],
    [11, 32],
  ]);
  place(PIECE.screen, { x: 1, z: 30 }, { rotation: 1 });
  placeAll(place, PIECE.plant, [
    [1, 25],
    [1, 33],
  ]);
}

/** O reator: o núcleo no fundo do poço, guarda-corpos na borda, tubulação e consoles. */
function furnishReactor(place: Place): void {
  placeAll(place, PIECE.column, [
    [36, 29],
    [37, 29],
  ]);
  placeAll(place, PIECE.floorLight, [
    [34, 27],
    [39, 27],
    [34, 31],
    [39, 31],
  ]);
  placeAll(place, PIECE.rail, [
    [34, 26],
    [39, 26],
    [34, 32],
    [35, 32],
    [38, 32],
    [39, 32],
    [33, 28],
    [33, 30],
    [40, 28],
    [40, 30],
  ]);
  placeAll(place, PIECE.terminal, [
    [32, 26],
    [41, 26],
  ]);
  place(PIECE.pipe, { x: 31, z: 33 }, { footprint: PIPE });
  place(PIECE.pipe, { x: 40, z: 33 }, { footprint: PIPE });
  placeAll(place, PIECE.barrel, [
    [42, 30],
    [42, 31],
    [31, 29],
  ]);
  place(PIECE.fan, { x: 42, z: 25 });
}

/** O hangar: duas naves de transporte, os jipes de superfície e a carga do desembarque. */
function furnishHangar(place: Place): void {
  place(PIECE.shuttle, { x: 11, z: 38 }, { footprint: SHUTTLE });
  place(PIECE.shuttle, { x: 16, z: 38 }, { footprint: SHUTTLE });
  [PIECE.roverYellow, PIECE.roverGreen, PIECE.roverPurple].forEach((rover, index) => {
    place(rover, { x: 28 + index * 2, z: 37 }, { footprint: ROVER });
  });
  placeAll(place, PIECE.crate, [
    [34, 41],
    [35, 41],
    [35, 40],
    [8, 41],
    [8, 42],
    [9, 42],
  ]);
  placeAll(place, PIECE.chest, [
    [25, 41],
    [26, 41],
  ]);
  placeAll(place, PIECE.barrel, [
    [19, 41],
    [24, 41],
  ]);
  placeAll(place, PIECE.floorLight, [
    [10, 42],
    [14, 42],
    [18, 42],
    [27, 42],
    [31, 42],
  ]);
  place(PIECE.terminal, { x: 24, z: 37 });
  placeAll(place, PIECE.column, [
    [8, 36],
    [35, 36],
  ]);
}

/** Luzes de piso nos corredores, para quem anda no escuro. */
function furnishCorridors(place: Place): void {
  placeAll(place, PIECE.floorLight, [
    [21, 14],
    [22, 30],
    [10, 21],
    [33, 22],
  ]);
}

export function buildStationMap(): AssembledMap {
  const sketch = createSketch(STATION_SIZE, null);
  const floors = stationFloors();
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    sketch.ground({ x: x!, z: z!, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  const area = [...floors.keys()].map((text) => {
    const [x, z] = text.split(',').map(Number);
    return { x: x!, z: z! };
  });
  outlineWalls(sketch, area, (cell) => [
    { style: wallStyleAt(cell), level: HEIGHT.deck, height: STORY_HEIGHT_STEPS },
  ]);
  for (const cell of DOORS) {
    sketch.wall({
      ...cell,
      side: 'north',
      style: WALL.door,
      level: HEIGHT.deck,
      height: STORY_HEIGHT_STEPS,
    });
  }
  const place: Place = (piece, cell, options = {}) => {
    const floor = floors.get(key(cell));
    if (!floor) throw new Error(`Peça ${piece} fora da estação em ${key(cell)}.`);
    sketch.piece(piece, cell, { ...options, level: floor.height });
  };
  furnishBridge(place);
  furnishObservation(place);
  furnishStorage(place);
  furnishQuarters(place);
  furnishLab(place);
  furnishMess(place);
  furnishReactor(place);
  furnishHangar(place);
  furnishCorridors(place);
  const header = styleHeader(STYLE_KITS.futurist);
  // Uma estação no espaço não tem cidade em volta: só a névoa escura.
  return sketch.build({ ...header, ambience: { ...header.ambience, backdrop: 'none' } });
}
