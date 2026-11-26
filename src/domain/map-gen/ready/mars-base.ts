/**
 * Base Ares (pedido do usuário em 26/11: "mais mapas, versões maiores"): colônia num planeta de
 * barro vermelho, 64×64, para a ficção científica de sobrevivência, o sinal que parou de
 * responder ou a criatura no hangar. Duas avenidas de metal se cruzam na praça dos holofotes;
 * ao norte, o módulo de comando, o domo e o hangar, ligados por túneis; ao sul, o laboratório,
 * os alojamentos e a estufa. Em volta, a mineração, o campo de painéis solares, as turbinas,
 * o pátio de carga e as duas plataformas de pouso, uma com a cápsula que acabou de descer.
 *
 * As peças vêm do pacote KayKit Space Base Bits (CC0), em public/assets/spacebase.
 */
import type { Cell } from '../../grid';
import type { CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createPlacer, type Place } from './placer';
import { createSketch, type Sketch } from './sketch';

export const MARS_BASE_SIZE = { width: 64, depth: 64 } as const;

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

/** As duas avenidas de metal e o chão de placas em volta dos módulos. */
const AVENUE_NS: CellRect = { x: 31, z: 4, width: 2, depth: 55 };
const AVENUE_EW: CellRect = { x: 6, z: 31, width: 50, depth: 2 };
const COMPOUND: CellRect = { x: 10, z: 20, width: 44, depth: 23 };
const NORTH_PAD: CellRect = { x: 45, z: 7, width: 9, depth: 9 };
const SOUTH_PAD: CellRect = { x: 45, z: 45, width: 9, depth: 9 };

/** Quartos de volta: a frente olha para +z (0) ou para -z (2). */
const TURN = { south: 0, north: 2 } as const;

/** Fileira de módulos ligados por túneis: módulo, túnel, módulo... da esquerda para a direita. */
function moduleRow(place: Place, z: number, row: readonly (readonly [string, number])[]): void {
  for (const [piece, x] of row) place(piece, { x, z: piece === PIECE.tunnel ? z + 1 : z });
}

/** Os módulos: comando, domo e hangar ao norte; laboratório, alojamentos e estufa ao sul. */
function buildModules(place: Place): void {
  moduleRow(place, 22, [
    [PIECE.module, 12],
    [PIECE.tunnel, 18],
    [PIECE.command, 23],
    [PIECE.dome, 35],
    [PIECE.tunnel, 41],
    [PIECE.hangar, 46],
  ]);
  moduleRow(place, 35, [
    [PIECE.dome, 12],
    [PIECE.tunnel, 18],
    [PIECE.lab, 23],
    [PIECE.quarters, 35],
    [PIECE.tunnel, 42],
    [PIECE.module, 47],
  ]);
}

/** A praça do cruzamento: um holofote em cada canto. */
function lightThePlaza(place: Place): void {
  for (const [x, z] of [
    [28, 28],
    [35, 28],
    [28, 33],
    [35, 33],
  ] as const) {
    place(PIECE.floodlight, { x, z });
  }
  place(PIECE.rover, { x: 30, z: 44 });
  place(PIECE.truck, { x: 33, z: 44 });
}

/** A mineração do noroeste: a perfuratriz, a torre de sondagem e o caminhão da carga. */
function mine(place: Place): void {
  place(PIECE.drill, { x: 8, z: 6 });
  place(PIECE.rig, { x: 16, z: 6 });
  place(PIECE.truck, { x: 22, z: 7 });
  place(PIECE.rock, { x: 8, z: 12 });
  place(PIECE.rock, { x: 14, z: 13 });
  place(PIECE.drums, { x: 22, z: 11 });
  place(PIECE.drums, { x: 23, z: 11 });
}

/** Energia: o campo de painéis solares ao norte e as turbinas na borda leste. */
function power(place: Place): void {
  for (const z of [6, 8, 10, 12]) for (const x of [35, 39]) place(PIECE.solar, { x, z });
  place(PIECE.turbine, { x: 57, z: 19 });
  place(PIECE.turbine, { x: 57, z: 25 });
}

/** O pátio de carga do sudoeste: o depósito, contêineres, carga embalada e tambores. */
function cargoYard(place: Place): void {
  place(PIECE.depot, { x: 12, z: 46 });
  place(PIECE.cargo, { x: 19, z: 46 });
  place(PIECE.cargo, { x: 19, z: 50 });
  place(PIECE.packed, { x: 23, z: 46 });
  place(PIECE.packed, { x: 23, z: 49 });
  for (const x of [23, 24, 25]) place(PIECE.drums, { x, z: 52 });
  place(PIECE.rover, { x: 26, z: 46 }, TURN.north);
}

/** As plataformas de pouso: a do norte vazia, a do sul com a cápsula ao lado. */
function landing(place: Place): void {
  place(PIECE.pad, { x: 46, z: 8 });
  place(PIECE.lander, { x: 55, z: 9 });
  place(PIECE.pad, { x: 46, z: 46 });
  place(PIECE.lander, { x: 55, z: 47 });
  place(PIECE.floodlight, { x: 44, z: 54 });
}

/** Rochas vermelhas espalhadas pelo deserto, longe das avenidas. */
function scatterRocks(place: Place): void {
  const big: readonly Cell[] = [
    { x: 2, z: 20 },
    { x: 2, z: 40 },
    { x: 58, z: 38 },
    { x: 40, z: 58 },
    { x: 4, z: 56 },
    { x: 58, z: 56 },
    { x: 26, z: 0 },
  ];
  for (const cell of big) place(PIECE.rocks, cell);
  const small: readonly Cell[] = [
    { x: 6, z: 28 },
    { x: 58, z: 32 },
    { x: 6, z: 61 },
    { x: 20, z: 60 },
    { x: 50, z: 61 },
    { x: 60, z: 4 },
    { x: 2, z: 2 },
    { x: 40, z: 2 },
  ];
  for (const cell of small) place(PIECE.rock, cell);
}

/** O chão: barro rachado, dunas de areia, o chão de placas, as avenidas e as plataformas. */
function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...MARS_BASE_SIZE }, TILE.ground);
  for (const dune of [
    { x: 0, z: 44, width: 9, depth: 8 },
    { x: 54, z: 0, width: 10, depth: 6 },
    { x: 18, z: 56, width: 14, depth: 8 },
    { x: 56, z: 34, width: 8, depth: 9 },
  ]) {
    sketch.ground(dune, TILE.sand);
  }
  sketch.ground(COMPOUND, TILE.plates);
  sketch.ground(AVENUE_NS, TILE.road);
  sketch.ground(AVENUE_EW, TILE.road);
  sketch.ground(NORTH_PAD, TILE.pad);
  sketch.ground(SOUTH_PAD, TILE.pad);
}

export function buildMarsBaseMap(): AssembledMap {
  const sketch = createSketch(MARS_BASE_SIZE, null);
  lay(sketch);
  const place = createPlacer(sketch);
  buildModules(place);
  lightThePlaza(place);
  mine(place);
  power(place);
  cargoYard(place);
  landing(place);
  scatterRocks(place);
  const header = styleHeader(STYLE_KITS.futurist);
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, fogColor: '#2a1410', light: 0.9, backdrop: 'desert' },
  });
}
