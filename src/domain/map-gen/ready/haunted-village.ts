/**
 * Vila Assombrada de Corvalha (pedido do usuário em 26/11: "mais mapas, versões maiores"): uma
 * aldeia abandonada inteira num mapa 96×88, para a campanha de terror. Ao norte, o cemitério murado
 * de grades de ferro com mausoléus, o santuário e cinco fileiras de túmulos; a oeste dele, a igreja
 * e a torre de pedra; a leste, a casa em ruínas no meio dos pinheiros secos. No meio, a vila
 * cortada por duas estradas de lama, com o poço, a taverna e as casas, metade delas em ruínas. Ao
 * sul, o pântano com a cabana da bruxa, o campo de abóboras da última fazenda, o moinho parado e a
 * mata morta.
 *
 * As peças vêm dos pacotes KayKit Halloween Bits (cemitério) e Medieval Hexagon (vila), ambos CC0.
 */
import type { Cell } from '../../grid';
import type { CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { STYLE_KITS, styleHeader } from '../kits';
import { createPlacer, type Place } from './placer';
import { createSketch, type Sketch } from './sketch';

export const HAUNTED_VILLAGE_SIZE = { width: 96, depth: 88 } as const;

const TILE = {
  grass: 'grama',
  dirt: 'terra',
  mud: 'lama',
  water: 'agua',
} as const;
const PIECE = {
  fence: 'kay-grade-ferro',
  brokenFence: 'kay-grade-quebrada',
  gate: 'kay-portao-cemiterio',
  mausoleum: 'kay-mausoleu',
  shrine: 'kay-santuario',
  headstone: 'kay-lapide',
  cross: 'kay-cruz-tumulo',
  tomb: 'kay-tumulo',
  grave: 'kay-cova',
  openGrave: 'kay-cova-aberta',
  coffin: 'kay-caixao',
  ornateCoffin: 'kay-caixao-ornado',
  skullCandle: 'kay-caveira-vela',
  skullStake: 'kay-estaca-caveira',
  lamp: 'kay-poste-lanterna',
  jackOLantern: 'kay-abobora-lanterna',
  pumpkin: 'kay-abobora',
  deadTree: 'kay-arvore-morta',
  bareTree: 'kay-arvore-seca',
  autumnPine: 'kay-pinheiro-outono',
  bones: 'kay-ossos',
  church: 'kay-igreja',
  stoneTower: 'kay-torre-pedra',
  house: 'kay-casa-a',
  tallHouse: 'kay-casa-b',
  ruin: 'kay-ruina',
  tavern: 'kay-taverna',
  well: 'kay-poco',
  windmill: 'kay-moinho-vento',
  stumps: 'kay-clareira-tocos',
  grove: 'kay-bosque',
  lily: 'kay-vitoria-regia',
  reed: 'kay-junco',
} as const;

/** O cemitério murado, as duas estradas de lama, o pântano e o campo de abóboras. */
const GRAVEYARD: CellRect = { x: 24, z: 4, width: 48, depth: 28 };
const EAST_WEST_ROAD: CellRect = { x: 0, z: 50, width: 96, depth: 3 };
const NORTH_SOUTH_ROAD: CellRect = { x: 46, z: 32, width: 3, depth: 56 };
const SWAMP: CellRect = { x: 4, z: 68, width: 24, depth: 14 };
const PUMPKIN_FIELD: CellRect = { x: 54, z: 68, width: 16, depth: 10 };

/** Quartos de volta: a frente olha para +z (0) ou para -z (2); um quarto deita a grade. */
const TURN = { south: 0, side: 1, north: 2 } as const;
/** Cada lance de grade ocupa duas casas. */
const FENCE_SPAN = 2;
/** O portão do cemitério, no meio da grade do sul, de frente para a estrada. */
const GATE_X = 46;
/** Os túmulos se repetem nesta ordem para as fileiras não ficarem iguais. */
const GRAVE_CYCLE = [
  PIECE.headstone,
  PIECE.cross,
  PIECE.tomb,
  PIECE.grave,
  PIECE.headstone,
  PIECE.openGrave,
] as const;

/** A grade de ferro em volta do cemitério, com lances quebrados e o portão ao sul. */
function fenceGraveyard(place: Place): void {
  const right = GRAVEYARD.x + GRAVEYARD.width - 1;
  const bottom = GRAVEYARD.z + GRAVEYARD.depth - 1;
  let count = 0;
  const nextFence = (): string => ((count += 1) % 7 === 0 ? PIECE.brokenFence : PIECE.fence);
  for (let x = GRAVEYARD.x; x < right; x += FENCE_SPAN) {
    place(nextFence(), { x, z: GRAVEYARD.z });
    place(x === GATE_X ? PIECE.gate : nextFence(), { x, z: bottom });
  }
  for (let z = GRAVEYARD.z + 1; z < bottom - 1; z += FENCE_SPAN) {
    place(nextFence(), { x: GRAVEYARD.x, z }, TURN.side);
    place(nextFence(), { x: right, z }, TURN.side);
  }
}

/** Dentro da grade: os mausoléus, o santuário, as fileiras de túmulos e as árvores mortas. */
function fillGraveyard(place: Place): void {
  for (const x of [28, 40, 52, 65]) place(PIECE.mausoleum, { x, z: 7 });
  place(PIECE.shrine, { x: 47, z: 18 });
  place(PIECE.skullCandle, { x: 46, z: 20 });
  place(PIECE.skullCandle, { x: 48, z: 20 });
  const columns = [28, 31, 34, 37, 40, 43, 51, 54, 57, 60, 63, 66];
  let count = 0;
  for (const z of [14, 17, 20, 23, 26]) {
    for (const x of columns) place(GRAVE_CYCLE[(count += 1) % GRAVE_CYCLE.length]!, { x, z });
  }
  place(PIECE.ornateCoffin, { x: 26, z: 12 });
  place(PIECE.coffin, { x: 69, z: 12 });
  for (const cell of [
    { x: 26, z: 20 },
    { x: 26, z: 28 },
    { x: 69, z: 20 },
    { x: 69, z: 28 },
  ]) {
    place(PIECE.deadTree, cell);
  }
  place(PIECE.lamp, { x: 45, z: 29 });
  place(PIECE.lamp, { x: 49, z: 29 });
}

/** A igreja e a torre a oeste do cemitério; a casa em ruínas e os pinheiros secos a leste. */
function aroundTheGraveyard(place: Place): void {
  place(PIECE.church, { x: 12, z: 10 });
  place(PIECE.stoneTower, { x: 4, z: 20 });
  place(PIECE.openGrave, { x: 18, z: 18 });
  place(PIECE.ruin, { x: 78, z: 8 });
  for (const cell of [
    { x: 88, z: 4 },
    { x: 76, z: 20 },
    { x: 90, z: 24 },
  ]) {
    place(PIECE.autumnPine, cell);
  }
  for (const cell of [
    { x: 2, z: 4 },
    { x: 16, z: 2 },
    { x: 8, z: 32 },
    { x: 82, z: 28 },
  ]) {
    place(PIECE.bareTree, cell);
  }
}

/** A vila dos dois lados da estrada: o poço, a taverna e as casas, metade delas em ruínas. */
function buildVillage(place: Place): void {
  place(PIECE.well, { x: 51, z: 44 });
  place(PIECE.ruin, { x: 8, z: 42 });
  place(PIECE.tallHouse, { x: 20, z: 43 });
  place(PIECE.house, { x: 30, z: 44 });
  place(PIECE.tallHouse, { x: 36, z: 43 });
  place(PIECE.ruin, { x: 56, z: 42 });
  place(PIECE.tavern, { x: 66, z: 42 });
  place(PIECE.house, { x: 74, z: 44 });
  place(PIECE.tallHouse, { x: 80, z: 43 });
  place(PIECE.house, { x: 88, z: 44 });
  place(PIECE.tallHouse, { x: 22, z: 55 }, TURN.north);
  place(PIECE.house, { x: 30, z: 55 }, TURN.north);
  place(PIECE.house, { x: 36, z: 55 }, TURN.north);
  place(PIECE.ruin, { x: 52, z: 55 }, TURN.north);
  place(PIECE.house, { x: 62, z: 55 }, TURN.north);
  place(PIECE.tallHouse, { x: 68, z: 55 }, TURN.north);
  place(PIECE.house, { x: 76, z: 55 }, TURN.north);
  for (const x of [10, 28, 42, 52, 64, 78, 92]) place(PIECE.lamp, { x, z: 49 });
  place(PIECE.jackOLantern, { x: 32, z: 48 });
  place(PIECE.jackOLantern, { x: 70, z: 49 });
  place(PIECE.bones, { x: 44, z: 53 });
}

/** O pântano com a cabana da bruxa, a fazenda das abóboras, o moinho parado e a mata morta. */
function theOutskirts(place: Place): void {
  for (const cell of [
    { x: 5, z: 68 },
    { x: 27, z: 72 },
    { x: 12, z: 81 },
  ]) {
    place(PIECE.reed, cell);
  }
  for (const cell of [
    { x: 10, z: 72 },
    { x: 18, z: 76 },
    { x: 22, z: 70 },
  ]) {
    place(PIECE.lily, cell);
  }
  place(PIECE.house, { x: 30, z: 72 });
  place(PIECE.skullStake, { x: 29, z: 77 });
  place(PIECE.skullCandle, { x: 34, z: 77 });
  let count = 0;
  for (let z = 69; z <= 75; z += 3) {
    for (let x = 55; x <= 67; x += 3)
      place((count += 1) % 4 === 0 ? PIECE.jackOLantern : PIECE.pumpkin, { x, z });
  }
  place(PIECE.tallHouse, { x: 72, z: 68 });
  place(PIECE.windmill, { x: 80, z: 70 });
  place(PIECE.stumps, { x: 86, z: 78 });
  place(PIECE.grove, { x: 36, z: 78 });
  place(PIECE.skullStake, { x: 45, z: 87 });
  place(PIECE.skullStake, { x: 49, z: 87 });
  const deadTrees: readonly Cell[] = [
    { x: 2, z: 58 },
    { x: 12, z: 62 },
    { x: 40, z: 66 },
    { x: 88, z: 58 },
    { x: 92, z: 64 },
    { x: 60, z: 84 },
    { x: 70, z: 84 },
    { x: 78, z: 82 },
    { x: 30, z: 86 },
  ];
  deadTrees.forEach((cell, index) =>
    place(index % 2 === 0 ? PIECE.deadTree : PIECE.bareTree, cell),
  );
}

/** O chão: grama, a terra do cemitério e do campo, a lama das estradas e a água do pântano. */
function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...HAUNTED_VILLAGE_SIZE }, TILE.grass);
  sketch.ground(GRAVEYARD, TILE.dirt);
  sketch.ground(PUMPKIN_FIELD, TILE.dirt);
  sketch.ground(EAST_WEST_ROAD, TILE.mud);
  sketch.ground(NORTH_SOUTH_ROAD, TILE.mud);
  sketch.ground(SWAMP, TILE.water);
}

export function buildHauntedVillageMap(): AssembledMap {
  const sketch = createSketch(HAUNTED_VILLAGE_SIZE, null);
  lay(sketch);
  const place = createPlacer(sketch);
  fenceGraveyard(place);
  fillGraveyard(place);
  aroundTheGraveyard(place);
  buildVillage(place);
  theOutskirts(place);
  const header = styleHeader(STYLE_KITS.medieval);
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'floresta', light: 0.55, backdrop: 'forest' },
  });
}
