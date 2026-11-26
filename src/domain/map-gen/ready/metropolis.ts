/**
 * Metrópole (pedido do usuário em 26/11: "mais mapas, versões maiores"): o centro inteiro de uma
 * cidade grande num mapa 120×96, para a campanha urbana. Duas avenidas de leste a oeste e duas de
 * norte a sul dividem a cidade em nove quarteirões; o do meio é o parque central com o chafariz, as
 * estátuas e os bancos. Os outros oito têm prédios de frente para as avenidas, becos com caçambas
 * nos fundos, dois estacionamentos e o pátio da delegacia com as viaturas. Nas avenidas, o trânsito
 * de sempre, uma perseguição e a batida no cruzamento do sudoeste.
 *
 * Os prédios, carros e a mobília de rua vêm do pacote KayKit City Builder Bits (CC0), em
 * public/assets/citybits.
 */
import type { CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createPlacer, type Place } from './placer';
import { createSketch, type Sketch } from './sketch';

export const METROPOLIS_SIZE = { width: 120, depth: 96 } as const;

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
  fountain: 'pra-fonte',
  cone: 'mod-cone',
  oak: 'nat-carvalho',
  birch: 'nat-betula',
  bush: 'nat-arbusto',
} as const;

/** As quatro avenidas, o parque central e os dois estacionamentos. */
const AVENUES: readonly CellRect[] = [
  { x: 0, z: 30, width: 120, depth: 6 },
  { x: 0, z: 62, width: 120, depth: 6 },
  { x: 38, z: 0, width: 6, depth: 96 },
  { x: 78, z: 0, width: 6, depth: 96 },
];
const PARK: CellRect = { x: 44, z: 36, width: 34, depth: 26 };
const NORTH_PARKING: CellRect = { x: 0, z: 2, width: 24, depth: 9 };
const SOUTH_PARKING: CellRect = { x: 2, z: 80, width: 34, depth: 12 };

/** Quartos de volta: a frente olha para +z (0) ou para -z (2); um quarto deita o carro. */
const TURN = { south: 0, lying: 1, north: 2 } as const;

type Row = { readonly z: number; readonly turn: number };
type Building = readonly [piece: string, x: number];

/** Uma fileira de prédios lado a lado, todos com a frente para o mesmo lado. */
function buildingRow(place: Place, row: Row, buildings: readonly Building[]): void {
  for (const [piece, x] of buildings) place(piece, { x, z: row.z }, row.turn);
}

/** Os três quarteirões do norte: frentes para a primeira avenida, estacionamento e caixa-d'água. */
function northBlocks(place: Place): void {
  const front: Row = { z: 22, turn: TURN.south };
  buildingRow(place, front, [
    [PIECE.corner, 0],
    [PIECE.tower, 10],
    [PIECE.threeStory, 20],
    [PIECE.wideHouse, 26],
  ]);
  buildingRow(place, front, [
    [PIECE.wideHouse, 44],
    [PIECE.tower, 54],
    [PIECE.threeStory, 66],
    [PIECE.brickHouse, 72],
  ]);
  buildingRow(place, front, [
    [PIECE.office, 84],
    [PIECE.apartments, 94],
    [PIECE.wideThreeStory, 104],
    [PIECE.brickHouse, 112],
  ]);
  const back: Row = { z: 2, turn: TURN.north };
  buildingRow(place, back, [
    [PIECE.apartments, 46],
    [PIECE.wideThreeStory, 58],
    [PIECE.office, 68],
  ]);
  buildingRow(place, back, [
    [PIECE.tower, 86],
    [PIECE.corner, 98],
    [PIECE.threeStory, 110],
  ]);
  for (const x of [1, 5, 9, 13, 17]) place(x === 9 ? PIECE.hatch : PIECE.sedan, { x, z: 3 });
  place(PIECE.waterTank, { x: 28, z: 4 });
  place(PIECE.dumpster, { x: 60, z: 14 });
  place(PIECE.dumpster, { x: 90, z: 14 });
  place(PIECE.dumpster, { x: 104, z: 14 });
}

/** Os dois quarteirões do meio, de cada lado do parque, com o beco entre as fileiras. */
function middleBlocks(place: Place): void {
  const front: Row = { z: 37, turn: TURN.north };
  buildingRow(place, front, [
    [PIECE.apartments, 0],
    [PIECE.brickHouse, 12],
    [PIECE.wideThreeStory, 20],
    [PIECE.wideHouse, 28],
  ]);
  buildingRow(place, front, [
    [PIECE.tower, 84],
    [PIECE.wideHouse, 96],
    [PIECE.office, 106],
  ]);
  const back: Row = { z: 54, turn: TURN.south };
  buildingRow(place, back, [
    [PIECE.threeStory, 2],
    [PIECE.office, 10],
    [PIECE.corner, 22],
    [PIECE.brickHouse, 32],
  ]);
  buildingRow(place, back, [
    [PIECE.wideThreeStory, 84],
    [PIECE.apartments, 94],
    [PIECE.threeStory, 106],
    [PIECE.brickHouse, 112],
  ]);
  place(PIECE.dumpster, { x: 6, z: 47 });
  place(PIECE.dumpster, { x: 26, z: 47 });
  place(PIECE.dumpster, { x: 100, z: 47 });
}

/** Os três quarteirões do sul: o estacionamento grande e o pátio da delegacia com as viaturas. */
function southBlocks(place: Place): void {
  const front: Row = { z: 69, turn: TURN.north };
  buildingRow(place, front, [
    [PIECE.corner, 0],
    [PIECE.threeStory, 12],
    [PIECE.tower, 20],
    [PIECE.brickHouse, 30],
  ]);
  buildingRow(place, front, [
    [PIECE.office, 44],
    [PIECE.brickHouse, 56],
    [PIECE.apartments, 64],
  ]);
  buildingRow(place, front, [
    [PIECE.wideThreeStory, 84],
    [PIECE.tower, 94],
    [PIECE.corner, 106],
  ]);
  const back: Row = { z: 86, turn: TURN.south };
  buildingRow(place, back, [
    [PIECE.corner, 44],
    [PIECE.threeStory, 56],
    [PIECE.wideHouse, 64],
  ]);
  buildingRow(place, back, [
    [PIECE.brickHouse, 86],
    [PIECE.office, 94],
    [PIECE.apartments, 106],
  ]);
  [3, 7, 11, 15, 19, 23, 27, 31].forEach((x, index) => {
    if (index === 5) return;
    place(index % 3 === 0 ? PIECE.wagon : index % 3 === 1 ? PIECE.hatch : PIECE.sedan, {
      x,
      z: 82,
    });
  });
  place(PIECE.police, { x: 56, z: 78 });
  place(PIECE.police, { x: 60, z: 78 });
  place(PIECE.dumpster, { x: 96, z: 79 });
}

/** O parque central: o chafariz no meio, duas estátuas, os bancos e o anel de árvores. */
function centralPark(place: Place): void {
  place(PIECE.fountain, { x: 59, z: 47 });
  place(PIECE.statue, { x: 52, z: 42 });
  place(PIECE.statue, { x: 68, z: 42 });
  for (const [x, z] of [
    [55, 45],
    [64, 45],
    [55, 52],
    [64, 52],
  ] as const) {
    place(PIECE.bench, { x, z });
  }
  let count = 0;
  for (let x = 46; x <= 76; x += 4) {
    for (const z of [38, 59]) place((count += 1) % 2 === 0 ? PIECE.oak : PIECE.birch, { x, z });
  }
  for (let z = 42; z <= 56; z += 4) {
    for (const x of [46, 75]) place((count += 1) % 2 === 0 ? PIECE.oak : PIECE.birch, { x, z });
  }
  place(PIECE.bush, { x: 58, z: 40 });
  place(PIECE.bush, { x: 62, z: 55 });
}

/** Postes nas calçadas das avenidas, semáforos nos cruzamentos, hidrantes e bueiros. */
function streetFurniture(place: Place): void {
  const sides = [4, 16, 28, 88, 100, 112];
  for (const x of [...sides, 48, 60, 72]) {
    place(PIECE.lamp, { x, z: 29 });
    place(PIECE.lamp, { x, z: 68 });
  }
  for (const x of [...sides, 48, 60, 72]) place(PIECE.lamp, { x, z: 36 });
  for (const x of [...sides, 48, 72]) place(PIECE.lamp, { x, z: 61 });
  for (const cell of [
    { x: 36, z: 29 },
    { x: 44, z: 36 },
    { x: 76, z: 29 },
    { x: 84, z: 36 },
    { x: 36, z: 61 },
    { x: 44, z: 68 },
    { x: 76, z: 61 },
    { x: 84, z: 68 },
  ]) {
    place(PIECE.trafficLight, cell);
  }
  place(PIECE.hydrant, { x: 37, z: 24 });
  place(PIECE.hydrant, { x: 84, z: 50 });
  place(PIECE.hydrant, { x: 62, z: 80 });
  place(PIECE.manhole, { x: 20, z: 33 });
  place(PIECE.manhole, { x: 40, z: 50 });
  place(PIECE.manhole, { x: 80, z: 90 });
}

/** O trânsito: a perseguição na primeira avenida, a batida no sudoeste e os carros de passagem. */
function traffic(place: Place): void {
  place(PIECE.sedan, { x: 10, z: 31 }, TURN.lying);
  place(PIECE.police, { x: 20, z: 31 }, TURN.lying);
  place(PIECE.wagon, { x: 50, z: 33 }, TURN.lying);
  place(PIECE.hatch, { x: 90, z: 33 }, TURN.lying);
  place(PIECE.sedan, { x: 60, z: 63 }, TURN.lying);
  place(PIECE.hatch, { x: 100, z: 65 }, TURN.lying);
  place(PIECE.sedan, { x: 39, z: 10 });
  place(PIECE.wagon, { x: 41, z: 45 });
  place(PIECE.hatch, { x: 81, z: 20 });
  place(PIECE.sedan, { x: 79, z: 75 });
  place(PIECE.police, { x: 40, z: 70 });
  place(PIECE.cone, { x: 42, z: 76 });
  place(PIECE.cone, { x: 39, z: 78 });
}

/** O chão: calçada em tudo, a grama do parque e o asfalto das avenidas e dos estacionamentos. */
function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...METROPOLIS_SIZE }, TILE.sidewalk);
  sketch.ground(PARK, TILE.grass);
  sketch.ground(NORTH_PARKING, TILE.road);
  sketch.ground(SOUTH_PARKING, TILE.road);
  for (const avenue of AVENUES) sketch.ground(avenue, TILE.road);
}

export function buildMetropolisMap(): AssembledMap {
  const sketch = createSketch(METROPOLIS_SIZE, null);
  lay(sketch);
  const place = createPlacer(sketch);
  northBlocks(place);
  middleBlocks(place);
  southBlocks(place);
  centralPark(place);
  streetFurniture(place);
  traffic(place);
  return sketch.build(styleHeader(STYLE_KITS.modern));
}
