/**
 * Cais Cromo (RPG-63): porto industrial cyberpunk pensado à mão. Ao norte, o beco das agulhas
 * corre entre os megaprédios, cheio de letreiros e máquinas de venda; a leste, a boate e a
 * torre de neon com o estacionamento. A rua do cais cruza o mapa; ao sul dela, o armazém, o
 * pátio de contêineres com a plataforma do guindaste e o cais com dois píeres sobre o mar
 * escuro, um degrau abaixo.
 *
 * Os prédios vêm da planta do gerador no estilo cyberpunk (concreto, vitrines, neon) [#6].
 */
import type { Cell } from '../../grid';
import { type CellRect, type Footprint } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createSketch, stampBuildings, type SketchBuilding, type SketchPiece } from './sketch';

export const CHROME_DOCKS_SIZE = { width: 48, depth: 48 } as const;

const TILE = {
  asphalt: 'cyb-asfalto',
  sidewalk: 'cyb-calcada',
  grate: 'cyb-piso-grade',
  neon: 'cyb-praca-neon',
  water: 'agua',
} as const;
const PIECE = {
  lamp: 'cyb-poste-neon',
  sign: 'cyb-letreiro',
  panel: 'cyb-painel-neon',
  hologram: 'cyb-holograma',
  vending: 'cyb-maquina-venda',
  megaNeon: 'cyb-megapredio-neon',
  mega: 'cyb-megapredio',
  midBlock: 'cyb-predio-medio',
  lowBlock: 'cyb-predio-baixo',
  car: 'fut-carro',
  crate: 'fut-caixa-carga',
  chest: 'fut-bau-carga',
  barrel: 'fut-tambor',
  fan: 'fut-ventilador',
  pipe: 'fut-tubulacao',
  rail: 'fut-guarda-corpo',
  terminal: 'fut-terminal',
  stairs: 'fut-escada-metal',
  bin: 'mod-lixeira',
  cone: 'mod-cone',
  deadTree: 'nat-arvore-seca',
  palm: 'nat-palmeira',
} as const;
/** Medidas na escala do boneco: as mesmas do catálogo. */
const CAR: Footprint = { width: 2, depth: 3 };
const PANEL: Footprint = { width: 2, depth: 1 };
const PIPE: Footprint = { width: 2, depth: 1 };
const BLOCK: Footprint = { width: 6, depth: 6 };
/** Carros deitados ao longo do eixo leste-oeste. */
const ALONG_X = 1;

/** O mar um degrau abaixo do cais; a plataforma do guindaste um acima. */
const HEIGHT = { sea: 0, street: 1, platform: 2 } as const;

const ROADS: readonly CellRect[] = [
  { x: 0, z: 18, width: 48, depth: 3 },
  { x: 22, z: 0, width: 3, depth: 34 },
];
const SIDEWALKS: readonly CellRect[] = [
  { x: 0, z: 17, width: 48, depth: 1 },
  { x: 0, z: 21, width: 48, depth: 1 },
  { x: 21, z: 0, width: 1, depth: 34 },
  { x: 25, z: 0, width: 1, depth: 34 },
];
/** O mar ocupa o sul; o cais fica logo acima dele, e os píeres entram na água. */
const SEA: CellRect = { x: 0, z: 38, width: 48, depth: 10 };
const QUAY: CellRect = { x: 0, z: 34, width: 48, depth: 4 };
const PIERS: readonly CellRect[] = [
  { x: 6, z: 38, width: 3, depth: 8 },
  { x: 30, z: 38, width: 3, depth: 7 },
];
const ALLEY_CROSSING: CellRect = { x: 7, z: 7, width: 2, depth: 2 };
const CONTAINER_YARD: CellRect = { x: 27, z: 23, width: 20, depth: 11 };
const PLATFORM: CellRect = { x: 40, z: 24, width: 6, depth: 4 };

/** Os megaprédios do beco das agulhas: blocos de 6 × 6, com becos de 2 casas entre eles. */
const ALLEY_BLOCKS: readonly { readonly piece: string; readonly cell: Cell }[] = [
  { piece: PIECE.megaNeon, cell: { x: 1, z: 1 } },
  { piece: PIECE.midBlock, cell: { x: 9, z: 1 } },
  { piece: PIECE.lowBlock, cell: { x: 1, z: 9 } },
  { piece: PIECE.mega, cell: { x: 9, z: 9 } },
];

type BuildingPlace = Omit<SketchBuilding, 'style' | 'level'>;

const building = (place: BuildingPlace): SketchBuilding => ({
  style: 'cyberpunk',
  level: HEIGHT.street,
  ...place,
});

const BUILDINGS: readonly SketchBuilding[] = [
  // A boate e a torre de neon, de frente para o estacionamento.
  building({ use: 'shop', x: 30, z: 3, width: 10, depth: 8, stories: 2, rotation: 2, variant: 0 }),
  building({ use: 'tower', x: 41, z: 2, width: 6, depth: 8, stories: 4, rotation: 2, variant: 0 }),
  // O armazém e o escritório do porto, de frente para a rua do cais.
  building({ use: 'shop', x: 2, z: 23, width: 10, depth: 8, stories: 2, rotation: 0, variant: 1 }),
  building({ use: 'house', x: 13, z: 24, width: 6, depth: 6, stories: 2, rotation: 0, variant: 1 }),
];

export type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;

function inRect(rect: CellRect, x: number, z: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && z >= rect.z && z < rect.z + rect.depth;
}

function floorAt(x: number, z: number): Floor {
  const street = (tile: string): Floor => ({ tile, height: HEIGHT.street });
  if (PIERS.some((rect) => inRect(rect, x, z))) return street(TILE.grate);
  if (inRect(SEA, x, z)) return { tile: TILE.water, height: HEIGHT.sea };
  if (inRect(QUAY, x, z)) return street(TILE.sidewalk);
  if (inRect(PLATFORM, x, z)) return { tile: TILE.grate, height: HEIGHT.platform };
  if (ROADS.some((rect) => inRect(rect, x, z))) return street(TILE.asphalt);
  if (SIDEWALKS.some((rect) => inRect(rect, x, z))) return street(TILE.sidewalk);
  if (inRect(ALLEY_CROSSING, x, z)) return street(TILE.neon);
  if (inRect(CONTAINER_YARD, x, z)) return street(TILE.grate);
  return street(TILE.asphalt);
}

/** Chão de cada casa do porto: rua, calçada, beco, pátio, cais, píer ou o mar. */
export function chromeDocksFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (let z = 0; z < CHROME_DOCKS_SIZE.depth; z += 1) {
    for (let x = 0; x < CHROME_DOCKS_SIZE.width; x += 1) {
      floors.set(key({ x, z }), floorAt(x, z));
    }
  }
  return floors;
}

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

function placeAll(place: Place, piece: string, cells: readonly (readonly [number, number])[]) {
  for (const [x, z] of cells) place(piece, { x, z });
}

/** O beco das agulhas: os megaprédios e, entre eles, letreiros, máquinas e o lixo. */
function furnishAlleys(place: Place): void {
  for (const { piece, cell } of ALLEY_BLOCKS) place(piece, cell, { footprint: BLOCK });
  place(PIECE.hologram, { x: 7, z: 7 });
  placeAll(place, PIECE.sign, [
    [7, 2],
    [8, 5],
    [7, 11],
    [8, 14],
    [2, 7],
    [12, 8],
    [16, 3],
    [16, 11],
  ]);
  placeAll(place, PIECE.vending, [
    [8, 1],
    [7, 13],
    [15, 7],
    [0, 8],
  ]);
  placeAll(place, PIECE.barrel, [
    [8, 10],
    [5, 8],
    [17, 14],
    [18, 14],
  ]);
  placeAll(place, PIECE.bin, [
    [7, 4],
    [14, 7],
    [3, 15],
  ]);
  placeAll(place, PIECE.lamp, [
    [8, 7],
    [15, 1],
    [15, 15],
    [0, 15],
  ]);
  place(PIECE.panel, { x: 17, z: 8 }, { footprint: PANEL });
  place(PIECE.deadTree, { x: 19, z: 4 });
  place(PIECE.fan, { x: 19, z: 1 });
}

/** A boate: a fila de cones, os carros no estacionamento e os painéis de neon. */
function furnishClub(place: Place): void {
  place(PIECE.car, { x: 28, z: 12 }, { footprint: CAR });
  place(PIECE.car, { x: 31, z: 13 }, { footprint: CAR });
  place(PIECE.car, { x: 42, z: 12 }, { footprint: CAR });
  placeAll(place, PIECE.cone, [
    [35, 12],
    [35, 13],
    [35, 14],
  ]);
  placeAll(place, PIECE.rail, [
    [36, 12],
    [36, 14],
  ]);
  place(PIECE.panel, { x: 37, z: 11 }, { footprint: PANEL });
  place(PIECE.hologram, { x: 39, z: 13 });
  placeAll(place, PIECE.lamp, [
    [27, 11],
    [40, 15],
    [46, 15],
  ]);
  placeAll(place, PIECE.vending, [
    [46, 11],
    [26, 1],
  ]);
  place(PIECE.palm, { x: 27, z: 1 });
}

/** A rua do cais: postes, letreiros e o tráfego. */
function furnishStreets(place: Place): void {
  for (const x of [2, 9, 16, 30, 37, 44]) {
    place(PIECE.lamp, { x, z: 17 });
    place(PIECE.lamp, { x, z: 21 });
  }
  for (const z of [5, 12, 27]) {
    place(PIECE.lamp, { x: 21, z });
    place(PIECE.lamp, { x: 25, z });
  }
  place(PIECE.car, { x: 5, z: 18 }, { footprint: CAR, rotation: ALONG_X });
  place(PIECE.car, { x: 38, z: 18 }, { footprint: CAR, rotation: ALONG_X });
  place(PIECE.car, { x: 22, z: 26 }, { footprint: CAR });
  placeAll(place, PIECE.sign, [
    [20, 21],
    [26, 21],
  ]);
}

/** O armazém e o pátio dos fundos: caixas, tambores e a tubulação encostada. */
function furnishWarehouseYard(place: Place): void {
  placeAll(place, PIECE.crate, [
    [2, 32],
    [3, 32],
    [2, 33],
    [10, 31],
    [11, 31],
    [19, 31],
  ]);
  placeAll(place, PIECE.barrel, [
    [13, 31],
    [14, 31],
    [20, 24],
  ]);
  place(PIECE.pipe, { x: 15, z: 33 }, { footprint: PIPE });
  place(PIECE.vending, { x: 12, z: 22 });
}

/** O pátio de contêineres: fileiras de caixas e baús e a plataforma do guindaste. */
function furnishContainerYard(place: Place): void {
  for (const x of [28, 29, 31, 32, 34, 35]) {
    place(PIECE.crate, { x, z: 24 });
    place(PIECE.crate, { x, z: 25 });
    place(PIECE.chest, { x, z: 28 });
    place(PIECE.chest, { x, z: 29 });
  }
  for (const x of [28, 30, 33, 36, 39, 42, 45]) place(PIECE.barrel, { x, z: 32 });
  placeAll(place, PIECE.terminal, [
    [42, 25],
    [44, 26],
  ]);
  placeAll(place, PIECE.fan, [
    [40, 24],
    [45, 24],
  ]);
  placeAll(place, PIECE.rail, [
    [41, 27],
    [43, 27],
  ]);
  placeAll(place, PIECE.lamp, [
    [37, 23],
    [46, 30],
  ]);
}

/** O cais e os píeres: guarda-corpos na borda, carga para embarcar e as luzes da ponta. */
function furnishQuay(place: Place): void {
  const onPier = (x: number) => PIERS.some((pier) => x >= pier.x && x < pier.x + pier.width);
  for (let x = 0; x < CHROME_DOCKS_SIZE.width; x += 2) {
    if (!onPier(x)) place(PIECE.rail, { x, z: 37 });
  }
  for (const pier of PIERS) {
    const end = pier.z + pier.depth - 1;
    place(PIECE.lamp, { x: pier.x, z: end });
    place(PIECE.lamp, { x: pier.x + pier.width - 1, z: end });
    place(PIECE.barrel, { x: pier.x, z: pier.z + 2 });
    place(PIECE.crate, { x: pier.x + pier.width - 1, z: pier.z + 3 });
  }
  placeAll(place, PIECE.chest, [
    [12, 35],
    [13, 35],
    [36, 35],
  ]);
  placeAll(place, PIECE.lamp, [
    [3, 34],
    [18, 34],
    [27, 34],
    [42, 34],
  ]);
  place(PIECE.stairs, { x: 46, z: 36 });
  place(PIECE.deadTree, { x: 22, z: 35 });
}

export function buildChromeDocksMap(): AssembledMap {
  const sketch = createSketch(CHROME_DOCKS_SIZE, null);
  const floors = chromeDocksFloors();
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    sketch.ground({ x: x!, z: z!, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  const indoors = stampBuildings(sketch, BUILDINGS);
  const place: Place = (piece, cell, options = {}) => {
    const floor = floors.get(key(cell));
    if (!floor || floor.tile === TILE.water) {
      throw new Error(`Peça ${piece} fora do chão do porto em ${key(cell)}.`);
    }
    if (indoors.has(key(cell))) throw new Error(`Peça ${piece} dentro de prédio em ${key(cell)}.`);
    sketch.piece(piece, cell, { ...options, level: floor.height });
  };
  furnishAlleys(place);
  furnishClub(place);
  furnishStreets(place);
  furnishWarehouseYard(place);
  furnishContainerYard(place);
  furnishQuay(place);
  return sketch.build(styleHeader(STYLE_KITS.cyberpunk));
}
