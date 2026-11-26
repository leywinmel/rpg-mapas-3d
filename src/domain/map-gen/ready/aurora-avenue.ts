/**
 * Avenida Aurora (pedido do usuário em 26/11: "mais mapas, versões maiores"): o centro de uma
 * cidade grande, 64×64, para a perseguição policial, o assalto ao banco ou o encontro no beco.
 * Duas avenidas largas se cruzam no meio com semáforos nas esquinas; em volta, quatro quarteirões
 * de prédios de tijolo com as fachadas viradas para a avenida, os becos das caçambas nos fundos,
 * o estacionamento com a caixa-d'água a noroeste e a praça arborizada a nordeste. Ao sul, uma
 * rua menor fecha o mapa. No asfalto, a viatura que acabou de bater no cruzamento e outra
 * perseguindo um sedã pela avenida.
 *
 * Os prédios, carros e a mobília de rua vêm do pacote KayKit City Builder Bits (CC0), em
 * public/assets/citybits.
 */
import type { Cell } from '../../grid';
import type { CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createPlacer, type Place } from './placer';
import { createSketch, type Sketch } from './sketch';

export const AURORA_AVENUE_SIZE = { width: 64, depth: 64 } as const;

const TILE = {
  grass: 'grama',
  road: 'mod-asfalto',
  sidewalk: 'mod-calcada',
} as const;
const PIECE = {
  brickHouse: 'kay-predio-a',
  wideHouse: 'kay-predio-b',
  threeStory: 'kay-predio-c',
  wideThreeStory: 'kay-predio-d',
  corner: 'kay-predio-e',
  office: 'kay-predio-f',
  apartments: 'kay-predio-g',
  tower: 'kay-predio-h',
  police: 'kay-viatura',
  sedan: 'kay-sedan',
  hatch: 'kay-hatch',
  wagon: 'kay-perua',
  dumpster: 'kay-cacamba',
  hydrant: 'kay-hidrante',
  lamp: 'kay-poste-rua',
  trafficLight: 'kay-semaforo-duplo',
  manhole: 'kay-lixeira',
  waterTank: 'kay-caixa-dagua',
  bench: 'kay-banco-rua',
  statue: 'pra-estatua-grande',
  cone: 'mod-cone',
  oak: 'nat-carvalho',
  birch: 'nat-betula',
  bush: 'nat-arbusto',
} as const;

/** As duas avenidas, a rua do sul, o estacionamento e a praça. */
const AVENUE_EW: CellRect = { x: 0, z: 28, width: 64, depth: 6 };
const AVENUE_NS: CellRect = { x: 28, z: 0, width: 6, depth: 62 };
const SOUTH_STREET: CellRect = { x: 0, z: 58, width: 64, depth: 4 };
const PARKING: CellRect = { x: 0, z: 8, width: 16, depth: 9 };
const PARK: CellRect = { x: 36, z: 2, width: 26, depth: 14 };

/** Quartos de volta: a frente olha para +z (0) ou para -z (2); um quarto deita o carro. */
const TURN = { south: 0, lying: 1, north: 2 } as const;

/** Uma fileira de prédios lado a lado, todos com a frente para o mesmo lado. */
function buildingRow(
  place: Place,
  row: { z: number; turn: number },
  buildings: readonly (readonly [string, number])[],
): void {
  for (const [piece, x] of buildings) place(piece, { x, z: row.z }, row.turn);
}

/** Os quatro quarteirões: as fachadas da frente olham para a avenida, as dos fundos para a rua. */
function raiseBlocks(place: Place): void {
  buildingRow(place, { z: 19, turn: TURN.south }, [
    [PIECE.corner, 0],
    [PIECE.threeStory, 10],
    [PIECE.brickHouse, 16],
  ]);
  buildingRow(place, { z: 19, turn: TURN.south }, [
    [PIECE.tower, 36],
    [PIECE.wideThreeStory, 46],
    [PIECE.wideHouse, 54],
  ]);
  buildingRow(place, { z: 36, turn: TURN.north }, [
    [PIECE.office, 0],
    [PIECE.apartments, 10],
    [PIECE.brickHouse, 20],
  ]);
  buildingRow(place, { z: 36, turn: TURN.north }, [
    [PIECE.corner, 36],
    [PIECE.threeStory, 46],
    [PIECE.tower, 52],
  ]);
  buildingRow(place, { z: 49, turn: TURN.south }, [
    [PIECE.threeStory, 2],
    [PIECE.wideHouse, 9],
    [PIECE.wideThreeStory, 18],
  ]);
  buildingRow(place, { z: 49, turn: TURN.south }, [
    [PIECE.apartments, 36],
    [PIECE.brickHouse, 47],
    [PIECE.office, 54],
  ]);
}

/** Os becos dos fundos com as caçambas e o estacionamento com a caixa-d'água. */
function backstreets(place: Place): void {
  place(PIECE.dumpster, { x: 22, z: 22 });
  place(PIECE.dumpster, { x: 5, z: 45 });
  place(PIECE.dumpster, { x: 14, z: 46 });
  place(PIECE.dumpster, { x: 42, z: 45 });
  place(PIECE.waterTank, { x: 4, z: 2 });
  for (const x of [1, 5, 9, 13]) place(x === 9 ? PIECE.hatch : PIECE.sedan, { x, z: 10 });
}

/** A praça do nordeste: árvores, bancos, a estátua no meio e os postes. */
function buildPark(place: Place): void {
  place(PIECE.statue, { x: 48, z: 8 });
  for (const [x, z] of [
    [44, 8],
    [52, 8],
    [44, 11],
    [52, 11],
  ] as const) {
    place(PIECE.bench, { x, z });
  }
  const trees: readonly Cell[] = [
    { x: 37, z: 3 },
    { x: 41, z: 4 },
    { x: 56, z: 3 },
    { x: 60, z: 5 },
    { x: 37, z: 13 },
    { x: 41, z: 14 },
    { x: 56, z: 14 },
    { x: 60, z: 12 },
  ];
  trees.forEach((cell, index) => place(index % 2 === 0 ? PIECE.oak : PIECE.birch, cell));
  for (const cell of [
    { x: 47, z: 3 },
    { x: 50, z: 14 },
  ]) {
    place(PIECE.bush, cell);
  }
}

/** Semáforos nas quatro esquinas, postes nas calçadas, hidrantes e bueiros. */
function streetFurniture(place: Place): void {
  for (const cell of [
    { x: 26, z: 26 },
    { x: 34, z: 26 },
    { x: 26, z: 34 },
    { x: 34, z: 35 },
  ]) {
    place(PIECE.trafficLight, cell);
  }
  for (const x of [4, 12, 20, 38, 46, 54]) place(PIECE.lamp, { x, z: 26 });
  for (const x of [4, 12, 20, 40, 48, 56]) place(PIECE.lamp, { x, z: 34 });
  for (const z of [6, 14]) {
    place(PIECE.lamp, { x: 26, z });
    place(PIECE.lamp, { x: 34, z });
  }
  for (const x of [10, 24, 40, 56]) place(PIECE.lamp, { x, z: 56 });
  place(PIECE.hydrant, { x: 24, z: 27 });
  place(PIECE.hydrant, { x: 36, z: 34 });
  place(PIECE.hydrant, { x: 8, z: 57 });
  place(PIECE.manhole, { x: 30, z: 20 });
  place(PIECE.manhole, { x: 20, z: 31 });
  place(PIECE.manhole, { x: 45, z: 60 });
}

/** O trânsito: a perseguição pela avenida, a batida no cruzamento e os carros parados. */
function traffic(place: Place): void {
  place(PIECE.police, { x: 8, z: 29 }, TURN.lying);
  place(PIECE.sedan, { x: 18, z: 29 }, TURN.lying);
  place(PIECE.wagon, { x: 44, z: 31 }, TURN.lying);
  place(PIECE.police, { x: 30, z: 36 });
  place(PIECE.cone, { x: 32, z: 41 });
  place(PIECE.cone, { x: 29, z: 42 });
  place(PIECE.hatch, { x: 28, z: 4 });
  place(PIECE.wagon, { x: 32, z: 10 });
  place(PIECE.sedan, { x: 28, z: 46 });
  place(PIECE.hatch, { x: 52, z: 59 }, TURN.lying);
}

/** O chão: calçada em tudo, a grama da praça e do estacionamento, e o asfalto por cima. */
function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...AURORA_AVENUE_SIZE }, TILE.sidewalk);
  sketch.ground(PARK, TILE.grass);
  sketch.ground(PARKING, TILE.road);
  sketch.ground(AVENUE_EW, TILE.road);
  sketch.ground(AVENUE_NS, TILE.road);
  sketch.ground(SOUTH_STREET, TILE.road);
}

export function buildAuroraAvenueMap(): AssembledMap {
  const sketch = createSketch(AURORA_AVENUE_SIZE, null);
  lay(sketch);
  const place = createPlacer(sketch);
  raiseBlocks(place);
  backstreets(place);
  buildPark(place);
  streetFurniture(place);
  traffic(place);
  return sketch.build(styleHeader(STYLE_KITS.modern));
}
