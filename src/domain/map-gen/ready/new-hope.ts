/**
 * Colônia Nova Esperança (pedido do usuário em 26/11: "mais mapas, versões maiores"): uma colônia
 * inteira em Marte num mapa 112×96, para a campanha de ficção científica. No meio, o núcleo da
 * colônia: o módulo de comando cercado pelos domos, o laboratório e o alojamento, com o túnel que
 * leva aos módulos do oeste. Ao norte, as turbinas e a torre de antena; a noroeste, o campo de
 * painéis solares; a nordeste, o campo de pouso com as plataformas, as naves e o hangar. Ao sul da
 * estrada de metal, as estufas, o depósito de carga cheio de caixas e caminhões e o garimpo com as
 * perfuratrizes, a antena e a boca do túnel da mina.
 *
 * As peças vêm do pacote KayKit Space Base Bits (CC0), em public/assets/spacebase.
 */
import type { Cell } from '../../grid';
import type { CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createPlacer, type Place } from './placer';
import { createSketch, type Sketch } from './sketch';

export const NEW_HOPE_SIZE = { width: 112, depth: 96 } as const;

const TILE = {
  ground: 'chao-rachado',
  sand: 'areia',
  plates: 'fut-placas-escuras',
  road: 'fut-piso-metal',
  pad: 'fut-piso-quadriculado',
} as const;
const PIECE = {
  module: 'kay-modulo-base',
  dome: 'kay-modulo-domo',
  lab: 'kay-modulo-laboratorio',
  quarters: 'kay-modulo-alojamento',
  command: 'kay-modulo-comando',
  hangar: 'kay-hangar',
  tunnel: 'kay-tunel',
  cargo: 'kay-carga',
  packed: 'kay-carga-embalada',
  depot: 'kay-deposito-carga',
  drums: 'kay-conteineres',
  drill: 'kay-perfuratriz',
  lander: 'kay-modulo-pouso',
  pad: 'kay-plataforma-pouso',
  solar: 'kay-painel-solar',
  turbine: 'kay-turbina-eolica',
  rover: 'kay-jipe-espacial',
  truck: 'kay-caminhao-espacial',
  rig: 'kay-torre-antena',
  floodlight: 'kay-holofotes',
  rock: 'kay-rocha-marte',
  rocks: 'kay-rochas-marte',
} as const;

/** O núcleo, o campo de pouso, o depósito, o garimpo, o campo solar e as duas estradas. */
const HUB: CellRect = { x: 40, z: 32, width: 32, depth: 32 };
const LANDING_FIELD: CellRect = { x: 80, z: 4, width: 30, depth: 26 };
const DEPOT: CellRect = { x: 80, z: 72, width: 30, depth: 20 };
const MINE: CellRect = { x: 4, z: 72, width: 30, depth: 20 };
const SOLAR_FARM: CellRect = { x: 2, z: 4, width: 30, depth: 24 };
const EAST_WEST_ROAD: CellRect = { x: 0, z: 66, width: 112, depth: 4 };
const NORTH_SOUTH_ROAD: CellRect = { x: 74, z: 0, width: 4, depth: 96 };

/** O núcleo: o comando no meio, quatro domos nos cantos, o laboratório e o alojamento. */
function buildHub(place: Place): void {
  place(PIECE.command, { x: 53, z: 45 });
  for (const cell of [
    { x: 44, z: 36 },
    { x: 62, z: 36 },
    { x: 44, z: 54 },
    { x: 62, z: 54 },
  ]) {
    place(PIECE.dome, cell);
  }
  place(PIECE.lab, { x: 53, z: 36 });
  place(PIECE.quarters, { x: 52, z: 54 });
  place(PIECE.floodlight, { x: 42, z: 46 });
  place(PIECE.floodlight, { x: 68, z: 46 });
  place(PIECE.tunnel, { x: 32, z: 44 });
  place(PIECE.module, { x: 24, z: 40 });
  place(PIECE.module, { x: 24, z: 50 });
}

/** O norte: os painéis solares em fileiras, as turbinas e a torre de antena. */
function buildPower(place: Place): void {
  for (let z = 6; z <= 21; z += 3) {
    for (let x = 4; x <= 24; x += 4) place(PIECE.solar, { x, z });
  }
  for (const x of [36, 44, 52, 60]) place(PIECE.turbine, { x, z: 4 });
  place(PIECE.rig, { x: 36, z: 14 });
}

/** O campo de pouso: três plataformas, duas naves pousadas, o hangar e os caminhões. */
function buildLandingField(place: Place): void {
  for (const x of [82, 92, 102]) place(PIECE.pad, { x, z: 6 });
  place(PIECE.lander, { x: 84, z: 18 });
  place(PIECE.lander, { x: 94, z: 18 });
  place(PIECE.hangar, { x: 102, z: 18 });
  place(PIECE.truck, { x: 90, z: 24 });
}

/** O sul: as estufas, o depósito de carga e o garimpo com as perfuratrizes. */
function buildSouth(place: Place): void {
  place(PIECE.dome, { x: 44, z: 76 });
  place(PIECE.dome, { x: 54, z: 76 });
  place(PIECE.rover, { x: 66, z: 84 });
  place(PIECE.depot, { x: 82, z: 74 });
  place(PIECE.depot, { x: 90, z: 74 });
  place(PIECE.cargo, { x: 98, z: 74 });
  place(PIECE.cargo, { x: 98, z: 78 });
  for (const cell of [
    { x: 102, z: 74 },
    { x: 104, z: 74 },
    { x: 102, z: 77 },
    { x: 104, z: 77 },
  ]) {
    place(PIECE.packed, cell);
  }
  for (const z of [74, 76, 78]) place(PIECE.drums, { x: 108, z });
  place(PIECE.truck, { x: 82, z: 84 });
  place(PIECE.truck, { x: 86, z: 84 });
  place(PIECE.rover, { x: 92, z: 84 });
  place(PIECE.rover, { x: 94, z: 84 });
  place(PIECE.drill, { x: 8, z: 76 });
  place(PIECE.drill, { x: 20, z: 76 });
  place(PIECE.rover, { x: 26, z: 74 });
  place(PIECE.rig, { x: 28, z: 84 });
  place(PIECE.rocks, { x: 6, z: 86 });
  place(PIECE.rocks, { x: 14, z: 86 });
  place(PIECE.tunnel, { x: 8, z: 92 });
}

/** Pedras soltas pelo chão rachado. */
function scatterRocks(place: Place): void {
  const rocks: readonly Cell[] = [
    { x: 36, z: 26 },
    { x: 72, z: 40 },
    { x: 10, z: 40 },
    { x: 20, z: 50 },
    { x: 30, z: 60 },
    { x: 84, z: 40 },
    { x: 96, z: 50 },
    { x: 106, z: 60 },
    { x: 60, z: 88 },
    { x: 66, z: 80 },
  ];
  for (const cell of rocks) place(PIECE.rock, cell);
  for (const cell of [
    { x: 4, z: 40 },
    { x: 90, z: 44 },
    { x: 100, z: 32 },
  ]) {
    place(PIECE.rocks, cell);
  }
}

/** O chão: terra rachada, areia no garimpo, placas no núcleo e no depósito, as estradas e o pouso. */
function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...NEW_HOPE_SIZE }, TILE.ground);
  sketch.ground(MINE, TILE.sand);
  sketch.ground(SOLAR_FARM, TILE.sand);
  sketch.ground(HUB, TILE.plates);
  sketch.ground(DEPOT, TILE.plates);
  sketch.ground(LANDING_FIELD, TILE.pad);
  sketch.ground(EAST_WEST_ROAD, TILE.road);
  sketch.ground(NORTH_SOUTH_ROAD, TILE.road);
}

export function buildNewHopeMap(): AssembledMap {
  const sketch = createSketch(NEW_HOPE_SIZE, null);
  lay(sketch);
  const place = createPlacer(sketch);
  buildHub(place);
  buildPower(place);
  buildLandingField(place);
  buildSouth(place);
  scatterRocks(place);
  const header = styleHeader(STYLE_KITS.futurist);
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, fogColor: '#2a1410', light: 0.9, backdrop: 'desert' },
  });
}
