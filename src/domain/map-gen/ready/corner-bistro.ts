/**
 * Restaurante da Esquina (pedido do usuário em 26/11: "mais mapas"): quarteirão moderno com um
 * restaurante e a casa do vizinho, para o jantar que dá errado, o tiroteio na cozinha ou a
 * investigação na casa ao lado. O restaurante tem o salão com o balcão do bar virado para a rua
 * e a cozinha completa nos fundos; a casa tem a sala com a cozinha americana e dois quartos.
 * Na frente, a calçada, a rua com carros parados e a calçada do outro lado.
 *
 * Os móveis vêm dos pacotes KayKit Furniture e Restaurant Bits (CC0), em public/assets/home e
 * public/assets/kitchen.
 */
import type { Cell } from '../../grid';
import { STORY_HEIGHT_STEPS, type CellRect, type Footprint, type MapWall } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createPlacer, type Place } from './placer';
import { createSketch, type Sketch } from './sketch';

export const CORNER_BISTRO_SIZE = { width: 40, depth: 36 } as const;

const TILE = {
  grass: 'grama',
  road: 'mod-asfalto',
  sidewalk: 'mod-calcada',
  floor: 'mod-piso-interno',
  kitchen: 'med-piso-tijolo-vermelho',
  wood: 'piso-madeira',
} as const;
const WALL = {
  brick: 'mod-parede-tijolo',
  brickWindow: 'mod-tijolo-janela',
  shopWindow: 'mod-vitrine',
  glassDoor: 'mod-porta-vidro',
  plaster: 'mod-reboco-branco',
  plasterWindow: 'mod-reboco-branco-janela',
  plasterDoor: 'mod-reboco-branco-porta',
  inner: 'mod-parede-lisa',
  woodDoor: 'mod-porta-madeira',
} as const;
const PIECE = {
  stove: 'kay-fogao',
  oven: 'kay-forno',
  fridge: 'kay-geladeira',
  sink: 'kay-pia',
  counter: 'kay-bancada',
  plainCounter: 'kay-bancada-lisa',
  cornerCounter: 'kay-bancada-canto',
  cabinet: 'kay-armario-cozinha',
  dishRack: 'kay-escorredor',
  roundTable: 'kay-mesa-redonda',
  smallTable: 'kay-mesa-redonda-pequena',
  prepTable: 'kay-mesa-cozinha',
  chair: 'kay-cadeira-restaurante',
  barStool: 'kay-banqueta-bar',
  carrots: 'kay-caixa-cenouras',
  tomatoes: 'kay-caixa-tomates',
  potatoes: 'kay-caixa-batatas',
  cheese: 'kay-caixa-queijos',
  stew: 'kay-panela-ensopado',
  jar: 'kay-pote',
  keg: 'kay-barril-chope',
  crates: 'kay-caixas',
  barrels: 'kay-barris',
  armchair: 'kay-poltrona',
  sofa: 'kay-sofa',
  doubleBed: 'kay-cama-casal',
  singleBed: 'kay-cama-solteiro',
  dresser: 'kay-comoda',
  nightstand: 'kay-criado-mudo',
  homeChair: 'kay-cadeira-madeira',
  lamp: 'kay-abajur',
  floorLamp: 'kay-luminaria-pe',
  diningTable: 'kay-mesa-jantar',
  coffeeTable: 'kay-mesa-centro',
  sideTable: 'kay-mesa-lateral',
  stripedRug: 'kay-tapete-listrado',
  ovalRug: 'kay-tapete-oval',
  cactus: 'kay-cacto',
  photo: 'kay-porta-retrato',
  books: 'kay-livros',
  tv: 'mod-tv',
  streetLamp: 'mod-poste',
  trash: 'mod-lixeira',
  hydrant: 'mod-hidrante',
  mailbox: 'mod-caixa-correio',
  bench: 'mod-banco-praca',
  grill: 'mod-churrasqueira',
  car: 'mod-carro',
  taxi: 'mod-taxi',
  oak: 'nat-carvalho',
  bush: 'nat-arbusto',
  flowers: 'nat-flores',
} as const;
/** Medida do carro na escala do boneco: a mesma do catálogo. */
const CAR: Footprint = { width: 3, depth: 5 };

/** Os dois prédios, em casas do mapa; a frente de ambos dá para a calçada do sul. */
const BISTRO: CellRect = { x: 2, z: 4, width: 20, depth: 21 };
const HOUSE: CellRect = { x: 24, z: 4, width: 14, depth: 21 };
/** Linha da parede entre a cozinha e o salão, e a passagem de duas casas no meio dela. */
const KITCHEN_WALL_Z = 12;
const PASS = [11, 12] as const;
const BISTRO_DOOR = [11, 12] as const;
/** Na casa: a parede entre a sala e os quartos, as portas dos quartos e a divisória deles. */
const BEDROOM_WALL_Z = 14;
const BEDROOM_DOORS = [28, 34] as const;
const BEDROOMS_WALL_X = 31;
const HOUSE_DOOR_X = 30;
const SIDEWALK: CellRect = { x: 0, z: 25, width: 40, depth: 3 };
const ROAD: CellRect = { x: 0, z: 28, width: 40, depth: 5 };
const FAR_SIDEWALK: CellRect = { x: 0, z: 33, width: 40, depth: 3 };

/** Quartos de volta: a frente olha para +z (0) ou para -z (2); um quarto põe o carro na rua. */
const TURN = { south: 0, quarter: 1, north: 2 } as const;
/** Janela a cada tantas casas nas paredes de fora. */
const WINDOW_EVERY = 3;

function wall(sketch: Sketch, edge: Pick<MapWall, 'x' | 'z' | 'side'>, style: string): void {
  sketch.wall({ ...edge, style, level: 0, height: STORY_HEIGHT_STEPS });
}

/** Contorno de um prédio: fundo e laterais com janela de tanto em tanto, frente à parte. */
function outline(
  sketch: Sketch,
  rect: CellRect,
  plain: string,
  window: string,
  front: (x: number) => string,
): void {
  const { x: x0, z: z0, width, depth } = rect;
  const side = (offset: number) => (offset % WINDOW_EVERY === 1 ? window : plain);
  for (let x = x0; x < x0 + width; x += 1) {
    wall(sketch, { x, z: z0, side: 'north' }, side(x - x0));
    wall(sketch, { x, z: z0 + depth, side: 'north' }, front(x));
  }
  for (let z = z0; z < z0 + depth; z += 1) {
    wall(sketch, { x: x0, z, side: 'west' }, side(z - z0));
    wall(sketch, { x: x0 + width, z, side: 'west' }, side(z - z0));
  }
}

/** O restaurante: tijolo, vitrine e porta de vidro na frente, e a parede da cozinha. */
function raiseBistro(sketch: Sketch): void {
  const front = (x: number) =>
    (BISTRO_DOOR as readonly number[]).includes(x) ? WALL.glassDoor : WALL.shopWindow;
  outline(sketch, BISTRO, WALL.brick, WALL.brickWindow, front);
  for (let x = BISTRO.x; x < BISTRO.x + BISTRO.width; x += 1) {
    if ((PASS as readonly number[]).includes(x)) continue;
    wall(sketch, { x, z: KITCHEN_WALL_Z, side: 'north' }, WALL.inner);
  }
}

/** A casa: reboco branco, a porta da frente, e as paredes dos quartos com porta de madeira. */
function raiseHouse(sketch: Sketch): void {
  const front = (x: number) =>
    x === HOUSE_DOOR_X
      ? WALL.plasterDoor
      : (x - HOUSE.x) % WINDOW_EVERY === 1
        ? WALL.plasterWindow
        : WALL.plaster;
  outline(sketch, HOUSE, WALL.plaster, WALL.plasterWindow, front);
  for (let x = HOUSE.x; x < HOUSE.x + HOUSE.width; x += 1) {
    const door = (BEDROOM_DOORS as readonly number[]).includes(x);
    wall(sketch, { x, z: BEDROOM_WALL_Z, side: 'north' }, door ? WALL.woodDoor : WALL.inner);
  }
  for (let z = HOUSE.z; z < BEDROOM_WALL_Z; z += 1) {
    wall(sketch, { x: BEDROOMS_WALL_X, z, side: 'west' }, WALL.inner);
  }
}

/** A cozinha do restaurante: a linha quente na parede do fundo, preparo no meio, despensa. */
function furnishKitchen(place: Place): void {
  place(PIECE.stove, { x: 3, z: 4 });
  place(PIECE.oven, { x: 5, z: 4 });
  place(PIECE.fridge, { x: 6, z: 4 });
  place(PIECE.fridge, { x: 7, z: 4 });
  place(PIECE.sink, { x: 9, z: 4 });
  place(PIECE.counter, { x: 11, z: 4 });
  place(PIECE.plainCounter, { x: 13, z: 4 });
  place(PIECE.plainCounter, { x: 14, z: 4 });
  place(PIECE.cabinet, { x: 15, z: 4 });
  place(PIECE.dishRack, { x: 16, z: 4 });
  place(PIECE.cornerCounter, { x: 17, z: 4 });
  place(PIECE.prepTable, { x: 6, z: 8 });
  place(PIECE.prepTable, { x: 10, z: 8 });
  place(PIECE.stew, { x: 14, z: 8 });
  place(PIECE.jar, { x: 15, z: 8 });
  for (const [z, crate] of [
    [7, PIECE.carrots],
    [8, PIECE.tomatoes],
    [9, PIECE.potatoes],
    [10, PIECE.cheese],
  ] as const) {
    place(crate, { x: 2, z });
  }
  for (const [x, z] of [
    [19, 5],
    [20, 5],
    [21, 5],
  ] as const) {
    place(PIECE.crates, { x, z });
  }
  place(PIECE.barrels, { x: 21, z: 8 });
  place(PIECE.barrels, { x: 21, z: 9 });
  place(PIECE.trash, { x: 21, z: 11 });
}

/** Mesa redonda de 2×2 com duas cadeiras ao norte e duas ao sul, viradas para ela. */
function roundTableAt(place: Place, table: Cell): void {
  place(PIECE.roundTable, table);
  for (const dx of [0, 1]) {
    place(PIECE.chair, { x: table.x + dx, z: table.z - 1 }, TURN.south);
    place(PIECE.chair, { x: table.x + dx, z: table.z + 2 }, TURN.north);
  }
}

/** O salão: seis mesas redondas, o bar com banquetas, as mesinhas da vitrine e as luminárias. */
function furnishDining(place: Place): void {
  for (const z of [14, 19]) for (const x of [4, 9, 14]) roundTableAt(place, { x, z });
  for (const z of [14, 16, 18, 20]) place(PIECE.plainCounter, { x: 18, z });
  for (const z of [15, 17, 19, 21]) place(PIECE.barStool, { x: 17, z });
  place(PIECE.keg, { x: 19, z: 18 });
  place(PIECE.jar, { x: 20, z: 15 });
  place(PIECE.cabinet, { x: 21, z: 14 });
  for (const x of [3, 7, 15]) {
    place(PIECE.smallTable, { x, z: 23 });
    place(PIECE.barStool, { x: x + 1, z: 23 });
  }
  place(PIECE.floorLamp, { x: 2, z: 13 });
  place(PIECE.floorLamp, { x: 21, z: 24 });
  place(PIECE.cactus, { x: 2, z: 24 });
}

/** Os quartos da casa: o de casal a oeste e o das crianças a leste. */
function furnishBedrooms(place: Place): void {
  place(PIECE.nightstand, { x: 25, z: 4 });
  place(PIECE.doubleBed, { x: 26, z: 4 });
  place(PIECE.nightstand, { x: 28, z: 4 });
  place(PIECE.lamp, { x: 29, z: 4 });
  place(PIECE.ovalRug, { x: 26, z: 8 });
  place(PIECE.dresser, { x: 25, z: 13 }, TURN.north);
  place(PIECE.photo, { x: 30, z: 12 });
  place(PIECE.singleBed, { x: 32, z: 4 });
  place(PIECE.lamp, { x: 34, z: 4 });
  place(PIECE.singleBed, { x: 36, z: 4 });
  place(PIECE.sideTable, { x: 33, z: 10 });
  place(PIECE.homeChair, { x: 33, z: 11 }, TURN.north);
  place(PIECE.books, { x: 37, z: 12 });
  place(PIECE.stripedRug, { x: 34, z: 7 });
}

/** A sala: sofá e TV, mesa de centro, a mesa de jantar e a cozinha americana. */
function furnishLiving(place: Place): void {
  place(PIECE.floorLamp, { x: 24, z: 15 });
  place(PIECE.sofa, { x: 26, z: 16 });
  place(PIECE.coffeeTable, { x: 26, z: 18 });
  place(PIECE.stripedRug, { x: 26, z: 19 });
  place(PIECE.tv, { x: 26, z: 21 }, TURN.north);
  place(PIECE.armchair, { x: 29, z: 17 });
  place(PIECE.sideTable, { x: 24, z: 17 });
  place(PIECE.homeChair, { x: 33, z: 17 });
  place(PIECE.diningTable, { x: 33, z: 18 });
  place(PIECE.homeChair, { x: 33, z: 19 }, TURN.north);
  place(PIECE.sink, { x: 37, z: 15 });
  place(PIECE.fridge, { x: 37, z: 17 });
  place(PIECE.oven, { x: 37, z: 19 });
  place(PIECE.cactus, { x: 37, z: 24 });
  place(PIECE.photo, { x: 24, z: 24 });
}

/** Lá fora: postes, a rua com dois carros parados, o quintal dos fundos e as árvores. */
function furnishOutside(place: Place): void {
  for (const x of [1, 13, 23, 33]) place(PIECE.streetLamp, { x, z: 27 });
  place(PIECE.hydrant, { x: 20, z: 27 });
  place(PIECE.trash, { x: 9, z: 27 });
  place(PIECE.mailbox, { x: 31, z: 26 });
  place(PIECE.bench, { x: 4, z: 26 }, TURN.north);
  place(PIECE.car, { x: 6, z: 28 }, TURN.quarter, CAR);
  place(PIECE.taxi, { x: 26, z: 28 }, TURN.quarter, CAR);
  place(PIECE.grill, { x: 30, z: 1 });
  for (const x of [26, 34]) place(PIECE.bush, { x, z: 2 });
  for (const [x, z] of [
    [0, 1],
    [10, 1],
    [18, 0],
    [38, 1],
    [5, 34],
    [17, 34],
    [29, 34],
  ] as const) {
    place(PIECE.oak, { x, z });
  }
  for (const x of [3, 9, 22, 35]) place(PIECE.flowers, { x, z: 34 });
}

/** O chão: grama, as calçadas, a rua, o piso do restaurante, a cozinha e o assoalho da casa. */
function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...CORNER_BISTRO_SIZE }, TILE.grass);
  sketch.ground(SIDEWALK, TILE.sidewalk);
  sketch.ground(ROAD, TILE.road);
  sketch.ground(FAR_SIDEWALK, TILE.sidewalk);
  sketch.ground(BISTRO, TILE.floor);
  sketch.ground({ ...BISTRO, depth: KITCHEN_WALL_Z - BISTRO.z }, TILE.kitchen);
  sketch.ground(HOUSE, TILE.wood);
}

export function buildCornerBistroMap(): AssembledMap {
  const sketch = createSketch(CORNER_BISTRO_SIZE, null);
  lay(sketch);
  raiseBistro(sketch);
  raiseHouse(sketch);
  const place = createPlacer(sketch);
  furnishKitchen(place);
  furnishDining(place);
  furnishBedrooms(place);
  furnishLiving(place);
  furnishOutside(place);
  return sketch.build({ ...styleHeader(STYLE_KITS.modern) });
}
