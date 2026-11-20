/**
 * Cômodos com arrumação própria (RPG-65): a sala de aula (lousa no fundo, mesa do professor,
 * fileiras de carteiras com corredor e armários na parede da porta) e a enfermaria (leitos
 * encostados nas paredes dos lados, soro e monitor ao lado de cada um, recepção no térreo).
 * Os prédios públicos (RPG-34) seguem a mesma ideia: a delegacia tem o balcão do plantão,
 * as mesas dos investigadores e os arquivos no fundo; os correios, o balcão de atendimento
 * e a triagem atrás dele; o mercado, os caixas na entrada, os corredores de prateleiras e as
 * geladeiras na parede do fundo.
 * Diferente da mobília sorteada da casa comum, a arrumação segue o uso do cômodo: a mesma
 * planta sai sempre igual, sem sorteio.
 */
import type { Cell } from '../grid';
import { rotatedFootprint, type Footprint } from '../map-v2';
import { propFootprint } from './kits';

export type Interior = 'classroom' | 'ward' | 'police' | 'post' | 'market';

export const INTERIOR_PIECES = {
  desk: 'esc-carteira',
  teacherDesk: 'esc-mesa-professor',
  board: 'esc-lousa',
  locker: 'esc-armario',
  bed: 'hos-leito',
  drip: 'hos-soro',
  monitor: 'hos-monitor',
  reception: 'hos-balcao',
  wheelchair: 'hos-cadeira-rodas',
  cabinet: 'hos-armario',
  counter: 'mod-balcao',
  officeDesk: 'mesa',
  chair: 'cadeira',
  bookcase: 'mod-estante',
  parcel: 'mod-caixa-papelao',
  shelf: 'mod-prateleira',
  fridge: 'mod-geladeira',
} as const;

/** Peça arrumada no cômodo, em coordenadas locais da planta. */
export type InteriorPiece = {
  readonly key: string;
  readonly x: number;
  readonly z: number;
  readonly rotation: number;
  readonly footprint: Footprint;
};

export type InteriorRoom = {
  readonly width: number;
  readonly depth: number;
  /** Coluna da porta, na face norte (z = 0). */
  readonly door: number;
  /** Casas da escada, que ficam livres. */
  readonly stairs: readonly Cell[];
  /** Andar (0 = térreo): só o térreo da enfermaria tem a recepção. */
  readonly story: number;
};

/** Giros: a frente do modelo (+z) virada para o sul (0), leste (1), norte (2) ou oeste (3). */
const TURN = { south: 0, east: 1, north: 2, west: 3 } as const;
/** Corredor entre os grupos de carteiras: uma coluna livre a cada tantas. */
const DESK_AISLE_EVERY = 3;
/** Casas entre um leito e o próximo na mesma parede (o leito e a do soro). */
const BED_PITCH = 2;
/** Mesas da delegacia: uma coluna livre a cada tantas (o corredor até o fundo). */
const OFFICE_AISLE_EVERY = 3;
/** Linha do balcão de atendimento (delegacia e correios): duas casas de fila na frente. */
const COUNTER_ROW = 3;
/** Caixas do mercado: um a cada tantas colunas, na linha logo depois da entrada. */
const CHECKOUT_EVERY = 3;
const CHECKOUT_ROW = 2;
/** Primeira linha dos corredores de prateleira, depois dos caixas e da fila. */
const FIRST_SHELF_ROW = 4;
/** Menor cômodo que recebe a arrumação: menos que isto, não cabe a sala de aula nem a enfermaria. */
export const MIN_INTERIOR_SIDE = 6;

type Arranger = {
  readonly room: InteriorRoom;
  /** Põe a peça se ela cabe no cômodo sem cobrir casa ocupada; diz se pôs. */
  readonly put: (key: string, cell: Cell, rotation: number) => boolean;
  readonly pieces: InteriorPiece[];
};

function arranger(room: InteriorRoom): Arranger {
  const taken = new Set(room.stairs.map((cell) => `${cell.x},${cell.z}`));
  // A casa da porta e a da frente dela ficam livres: o boneco entra sem tropeçar.
  taken.add(`${room.door},0`).add(`${room.door},1`);
  const pieces: InteriorPiece[] = [];
  const put = (key: string, cell: Cell, rotation: number): boolean => {
    const footprint = propFootprint(key);
    const size = rotatedFootprint(footprint, rotation);
    if (cell.x < 0 || cell.z < 0) return false;
    if (cell.x + size.width > room.width || cell.z + size.depth > room.depth) return false;
    const cells: string[] = [];
    for (let dz = 0; dz < size.depth; dz += 1) {
      for (let dx = 0; dx < size.width; dx += 1) cells.push(`${cell.x + dx},${cell.z + dz}`);
    }
    if (cells.some((text) => taken.has(text))) return false;
    for (const text of cells) taken.add(text);
    pieces.push({ key, x: cell.x, z: cell.z, rotation, footprint });
    return true;
  };
  return { room, put, pieces };
}

/** Lousa e mesa do professor no fundo, carteiras olhando para elas e armários na frente. */
function classroom({ room, put }: Arranger): void {
  const { width, depth, door } = room;
  const center = Math.floor(width / 2) - 1;
  put(INTERIOR_PIECES.board, { x: center, z: depth - 1 }, TURN.north);
  put(INTERIOR_PIECES.teacherDesk, { x: center, z: depth - 3 }, TURN.north);
  for (let z = 2; z <= depth - 5; z += 1) {
    for (let x = 1; x <= width - 2; x += 1) {
      if (x % DESK_AISLE_EVERY === 0) continue;
      put(INTERIOR_PIECES.desk, { x, z }, TURN.south);
    }
  }
  for (let x = 0; x < width; x += 1) {
    if (Math.abs(x - door) <= 1) continue;
    put(INTERIOR_PIECES.locker, { x, z: 0 }, TURN.south);
  }
}

/** Leitos com a cabeceira nas paredes dos lados; o soro e o monitor ficam entre um e outro. */
function ward({ room, put }: Arranger): void {
  const { width, depth, door, story } = room;
  if (story === 0) {
    put(INTERIOR_PIECES.reception, { x: door + 1, z: 2 }, TURN.north);
    put(INTERIOR_PIECES.wheelchair, { x: door - 2, z: 1 }, TURN.south);
  }
  const firstBed = story === 0 ? 4 : 1;
  for (let z = firstBed; z + 1 < depth; z += BED_PITCH) {
    if (put(INTERIOR_PIECES.bed, { x: 0, z }, TURN.east)) {
      put(INTERIOR_PIECES.drip, { x: 0, z: z + 1 }, TURN.east);
    }
    if (put(INTERIOR_PIECES.bed, { x: width - 2, z }, TURN.west)) {
      put(INTERIOR_PIECES.monitor, { x: width - 1, z: z + 1 }, TURN.west);
    }
  }
  put(INTERIOR_PIECES.cabinet, { x: door, z: depth - 1 }, TURN.north);
}

/**
 * Balcão de lado a lado na linha de atendimento, com uma passagem na ponta oposta à porta: o
 * público fica na frente, os funcionários atrás.
 */
function counterRow({ room, put }: Arranger): void {
  const passage = room.door < room.width / 2 ? room.width - 1 : 0;
  for (let x = 0; x < room.width; x += 1) {
    if (x !== passage) put(INTERIOR_PIECES.counter, { x, z: COUNTER_ROW }, TURN.north);
  }
}

/** Plantão no balcão, mesas com cadeira em fileiras e arquivos encostados no fundo. */
function police(context: Arranger): void {
  const { room, put } = context;
  const { width, depth } = room;
  if (room.story === 0) counterRow(context);
  const firstDesk = room.story === 0 ? COUNTER_ROW + 2 : 2;
  for (let z = firstDesk; z + 1 <= depth - 2; z += 2) {
    for (let x = 1; x <= width - 2; x += 1) {
      if (x % OFFICE_AISLE_EVERY === 0) continue;
      if (put(INTERIOR_PIECES.officeDesk, { x, z }, TURN.south)) {
        put(INTERIOR_PIECES.chair, { x, z: z + 1 }, TURN.north);
      }
    }
  }
  for (let x = 0; x < width; x += 1) put(INTERIOR_PIECES.bookcase, { x, z: depth - 1 }, TURN.north);
}

/** Balcão de atendimento, estantes de triagem no fundo e pacotes empilhados entre elas. */
function post(context: Arranger): void {
  const { room, put } = context;
  const { width, depth } = room;
  if (room.story === 0) counterRow(context);
  for (let x = 0; x < width; x += 1) put(INTERIOR_PIECES.bookcase, { x, z: depth - 1 }, TURN.north);
  for (let z = COUNTER_ROW + 2; z < depth - 2; z += 2) {
    for (let x = 1; x < width - 1; x += 2) put(INTERIOR_PIECES.parcel, { x, z }, TURN.south);
  }
}

/** Caixas na entrada, corredores de prateleiras e geladeiras na parede do fundo. */
function market({ room, put }: Arranger): void {
  const { width, depth } = room;
  for (let x = 1; x < width - 1; x += CHECKOUT_EVERY) {
    put(INTERIOR_PIECES.counter, { x, z: CHECKOUT_ROW }, TURN.north);
  }
  for (let z = FIRST_SHELF_ROW; z < depth - 2; z += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (x % OFFICE_AISLE_EVERY === 0) continue;
      put(INTERIOR_PIECES.shelf, { x, z }, x % OFFICE_AISLE_EVERY === 1 ? TURN.west : TURN.east);
    }
  }
  for (let x = 0; x < width; x += 1) put(INTERIOR_PIECES.fridge, { x, z: depth - 1 }, TURN.north);
}

const ARRANGERS: Readonly<Record<Interior, (context: Arranger) => void>> = {
  classroom,
  ward,
  police,
  post,
  market,
};

/** A arrumação do cômodo; vazia se ele é pequeno demais para o uso. */
export function arrangeInterior(interior: Interior, room: InteriorRoom): InteriorPiece[] {
  if (Math.min(room.width, room.depth) < MIN_INTERIOR_SIDE) return [];
  const context = arranger(room);
  ARRANGERS[interior](context);
  return context.pieces;
}
