/**
 * Bosque das Sombras (pedido do usuário em 22/11): floresta pensada à mão, para emboscadas e
 * viagens. Uma trilha de terra corta o mapa de oeste a leste e cruza o riacho numa ponte de
 * tábuas; ao norte da trilha, a clareira do círculo de pedras com o altar; ao sul, o
 * acampamento dos salteadores; do outro lado do riacho, a cabana da bruxa no alto de um morrote
 * cercado de lama, e o anel de cogumelos no canto sudeste.
 *
 * O chão ondula em degraus de meio metro (duas ondas fixas, sem sorteio) e cada lugar plano se
 * funde nele aos poucos. A mata fechada vem de uma conta fixa por casa: o mesmo mapa sai sempre
 * igual, e as árvores nunca caem na trilha, na água ou nos lugares.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, rectCells, rotatedFootprint, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { propFootprint } from '../kits';
import {
  buildingRect,
  createSketch,
  stampBuildings,
  type SketchBuilding,
  type SketchPiece,
} from './sketch';

export const FOREST_SIZE = { width: 48, depth: 48 } as const;

const TILE = {
  grass: 'grama',
  dirt: 'terra',
  water: 'agua',
  mud: 'lama',
  puddle: 'poca',
  planks: 'piso-madeira',
  stone: 'piso-pedra',
} as const;
const PIECE = {
  oak: 'nat-carvalho',
  pine: 'nat-pinheiro',
  birch: 'nat-betula',
  tree: 'arvore',
  deadTree: 'nat-arvore-seca',
  bush: 'nat-arbusto',
  grass: 'nat-capim',
  flowers: 'nat-flores',
  leaves: 'nat-folhas',
  mushrooms: 'nat-cogumelos',
  stump: 'nat-toco',
  log: 'nat-tronco',
  boulder: 'nat-pedregulho',
  pebbles: 'nat-seixos',
  rock: 'rocha',
  pillar: 'pilar',
  statue: 'estatua',
  altar: 'mas-altar',
  bones: 'mas-ossos',
  campfire: 'cav-fogueira',
  wagon: 'med-carroca',
  barrel: 'barril',
  crate: 'med-caixote',
  chest: 'bau',
  table: 'mesa',
  torch: 'tocha',
  fence: 'med-cerca-madeira',
} as const;

/** O chão ondulado: altura de base e o quanto cada onda sobe e desce. */
const HILLS = { base: 2, waveX: 0.9, periodX: 6, waveZ: 0.8, periodZ: 8 } as const;
const HILLS_MIN = 1;
const HILLS_MAX = 3;
/** Quantas casas a borda de um lugar plano leva para se fundir no chão em volta. */
const BLEND = 3;

/** O riacho desce de norte a sul ondulando; as margens ficam um degrau acima da água. */
const STREAM = { center: 29, wave: 2.2, period: 6.5, west: 1, east: 1 } as const;
const STREAM_HEIGHT = { water: 0, bank: 1 } as const;
/** Até quantas casas da água o chão desce até a altura da margem. */
const BANK_REACH = 2;

/** A trilha: entra pela borda oeste, ondula e sai pela leste, com duas casas de largura. */
const TRAIL = { center: 24, wave: 2.5, period: 7, width: 2 } as const;
const TRAIL_HEIGHT = 2;

const CIRCLE = { cx: 12.5, cz: 10.5, radius: 6.5, ring: 4.2, stones: 8 } as const;
const CAMP = { cx: 12.5, cz: 37.5, radius: 5.5 } as const;
const GLADE = { cx: 39.5, cz: 39.5, radius: 4.5, ring: 3 } as const;
const PLACE_HEIGHT = 2;

/** A cabana da bruxa: casa medieval de um andar, porta ao sul, num morrote de lama. */
const HUT_LEVEL = 3;
const HUT: SketchBuilding = {
  style: 'medieval',
  use: 'house',
  x: 36,
  z: 6,
  width: 6,
  depth: 6,
  stories: 1,
  rotation: 2,
  level: HUT_LEVEL,
  variant: 3,
};
const HUT_RECT = buildingRect(HUT);
/** O terreiro de lama em volta da cabana. */
const HUT_YARD = 2.5;

/** A conta fixa da mata: de cada 100 casas livres, quantas ganham árvore e quantas mato. */
const WOODS = { trees: 34, undergrowth: 14 } as const;
const TREES = [PIECE.oak, PIECE.pine, PIECE.pine, PIECE.birch, PIECE.tree, PIECE.oak] as const;
const UNDERGROWTH = [
  PIECE.bush,
  PIECE.grass,
  PIECE.flowers,
  PIECE.leaves,
  PIECE.mushrooms,
  PIECE.stump,
  PIECE.pebbles,
  PIECE.bush,
] as const;
/** Casas da trilha, das margens e dos lugares ficam limpas até esta distância. */
const CLEAR_MARGIN = 1;

type Floor = { readonly tile: string; readonly height: number };

const key = (cell: Cell) => `${cell.x},${cell.z}`;

const streamCenter = (z: number) =>
  Math.round(STREAM.center + STREAM.wave * Math.sin(z / STREAM.period));
const trailCenter = (x: number) =>
  Math.round(TRAIL.center + TRAIL.wave * Math.sin(x / TRAIL.period + 1));

function isWater(x: number, z: number): boolean {
  const center = streamCenter(z);
  return x >= center - STREAM.west && x <= center + STREAM.east;
}

function isTrail(x: number, z: number): boolean {
  const top = trailCenter(x);
  return z >= top && z < top + TRAIL.width;
}

/** Distância da casa até a borda de um retângulo (0 dentro dele). */
function rectDistance(rect: CellRect, x: number, z: number): number {
  const dx = Math.max(rect.x - x, 0, x - (rect.x + rect.width - 1));
  const dz = Math.max(rect.z - z, 0, z - (rect.z + rect.depth - 1));
  return Math.hypot(dx, dz);
}

/** Puxa a altura para `target` dentro do lugar e aos poucos na borda dele. */
function blendTo(height: number, target: number, distance: number): number {
  if (distance <= 0) return target;
  if (distance >= BLEND) return height;
  return height + (target - height) * (1 - distance / BLEND);
}

/** Distância até a água na mesma linha: as margens descem até ela. */
function streamDistance(x: number, z: number): number {
  const center = streamCenter(z);
  return Math.max(center - STREAM.west - x, x - (center + STREAM.east), 0);
}

const circleDistance = (place: { cx: number; cz: number }, x: number, z: number) =>
  Math.hypot(x + 0.5 - place.cx, z + 0.5 - place.cz);

/** Chão de cada casa do bosque: o relevo, o riacho, a trilha e os quatro lugares. */
export function forestFloors(): Map<string, Floor> {
  const floors = new Map<string, Floor>();
  for (let z = 0; z < FOREST_SIZE.depth; z += 1) {
    for (let x = 0; x < FOREST_SIZE.width; x += 1) {
      if (isWater(x, z)) {
        // A ponte: a trilha cruza a água em tábuas, na altura da margem.
        const bridge = isTrail(x, z);
        floors.set(
          key({ x, z }),
          bridge
            ? { tile: TILE.planks, height: STREAM_HEIGHT.bank }
            : { tile: TILE.water, height: STREAM_HEIGHT.water },
        );
        continue;
      }
      const wave =
        HILLS.base +
        HILLS.waveX * Math.sin(x / HILLS.periodX + z / 13) +
        HILLS.waveZ * Math.cos(z / HILLS.periodZ - x / 11);
      let height = Math.min(Math.max(wave, HILLS_MIN), HILLS_MAX);
      let tile: string = TILE.grass;

      for (const place of [CIRCLE, CAMP, GLADE]) {
        const distance = circleDistance(place, x, z) - place.radius;
        height = blendTo(height, PLACE_HEIGHT, distance);
      }
      if (circleDistance(CAMP, x, z) <= CAMP.radius) tile = TILE.dirt;
      if (circleDistance(CIRCLE, x, z) <= CIRCLE.ring + 1) tile = TILE.stone;

      const yard = rectDistance(HUT_RECT, x, z);
      height = blendTo(height, HUT_LEVEL, yard);
      if (yard > 0 && yard <= HUT_YARD) tile = (x + z) % 3 === 0 ? TILE.puddle : TILE.mud;

      if (isTrail(x, z)) {
        height = TRAIL_HEIGHT;
        tile = TILE.dirt;
      }
      // A margem por último: a água manda, nenhum passo até ela passa de um degrau.
      const bank = streamDistance(x, z);
      if (bank <= BANK_REACH) height = Math.min(height, STREAM_HEIGHT.bank + (bank - 1));

      floors.set(key({ x, z }), { tile, height: Math.round(height) });
    }
  }
  return floors;
}

type Place = (key: string, cell: Cell, options?: Omit<SketchPiece, 'level'>) => void;

/** O círculo de pedras: pilares em roda, o altar no meio, ossos e uma estátua quebrada. */
function furnishCircle(place: Place): void {
  for (let stone = 0; stone < CIRCLE.stones; stone += 1) {
    const angle = (stone / CIRCLE.stones) * Math.PI * 2;
    const x = Math.floor(CIRCLE.cx + CIRCLE.ring * Math.cos(angle));
    const z = Math.floor(CIRCLE.cz + CIRCLE.ring * Math.sin(angle));
    place(PIECE.pillar, { x, z });
  }
  place(PIECE.altar, { x: 12, z: 10 });
  place(PIECE.statue, { x: 12, z: 8 }, { rotation: 2 });
  place(PIECE.bones, { x: 11, z: 12 });
  place(PIECE.torch, { x: 10, z: 10 });
  place(PIECE.torch, { x: 15, z: 10 });
  place(PIECE.pebbles, { x: 14, z: 12 });
}

/** O acampamento: a fogueira com troncos, a carroça, a carga roubada e o vigia. */
function furnishCamp(place: Place): void {
  place(PIECE.campfire, { x: 12, z: 37 });
  place(PIECE.log, { x: 11, z: 35 });
  place(PIECE.log, { x: 11, z: 39 });
  place(PIECE.wagon, { x: 7, z: 34 });
  for (const [x, z] of [
    [15, 34],
    [16, 34],
    [16, 35],
  ] as const) {
    place(PIECE.barrel, { x, z });
  }
  place(PIECE.crate, { x: 15, z: 40 });
  place(PIECE.crate, { x: 16, z: 40 });
  place(PIECE.chest, { x: 9, z: 40 }, { rotation: 1 });
  place(PIECE.table, { x: 15, z: 37 });
  place(PIECE.torch, { x: 13, z: 33 });
}

/** A cabana: a cerca torta do terreiro, a lenha, a árvore seca e os cogumelos da bruxa. */
function furnishHut(place: Place): void {
  const front = HUT_RECT.z + HUT_RECT.depth + 1;
  for (let x = HUT_RECT.x - 1; x <= HUT_RECT.x + HUT_RECT.width; x += 1) {
    // O portão: duas casas abertas na frente da porta.
    if (Math.abs(x - (HUT_RECT.x + HUT_RECT.width / 2 - 0.5)) < 1) continue;
    place(PIECE.fence, { x, z: front });
  }
  place(PIECE.deadTree, { x: HUT_RECT.x - 2, z: HUT_RECT.z + 1 });
  place(PIECE.deadTree, { x: HUT_RECT.x + HUT_RECT.width + 1, z: HUT_RECT.z + 3 });
  place(PIECE.stump, { x: HUT_RECT.x - 1, z: HUT_RECT.z + 4 });
  place(PIECE.mushrooms, { x: HUT_RECT.x + HUT_RECT.width, z: HUT_RECT.z + 5 });
  place(PIECE.barrel, { x: HUT_RECT.x - 1, z: HUT_RECT.z + HUT_RECT.depth });
  place(PIECE.torch, { x: HUT_RECT.x + 1, z: HUT_RECT.z + HUT_RECT.depth });
}

/** O anel de cogumelos: a roda de fadas no chão plano, com um toco no meio. */
function furnishGlade(place: Place): void {
  const steps = 10;
  for (let step = 0; step < steps; step += 1) {
    const angle = (step / steps) * Math.PI * 2;
    const x = Math.floor(GLADE.cx + GLADE.ring * Math.cos(angle));
    const z = Math.floor(GLADE.cz + GLADE.ring * Math.sin(angle));
    place(PIECE.mushrooms, { x, z });
  }
  place(PIECE.stump, { x: 39, z: 39 });
  place(PIECE.flowers, { x: 40, z: 40 });
}

/** Pedras grandes e troncos caídos à beira da trilha: cobertura para a emboscada. */
function furnishTrail(place: Place): void {
  place(PIECE.boulder, { x: 20, z: 19 });
  place(PIECE.rock, { x: 6, z: 21 });
  place(PIECE.rock, { x: 42, z: 28 });
  place(PIECE.log, { x: 36, z: 21 });
  place(PIECE.torch, { x: 26, z: 20 });
}

/** Conta fixa por casa, de 0 a 99: a mesma casa dá sempre o mesmo número. */
function cellRoll(x: number, z: number, salt: number): number {
  const mixed = Math.sin(x * 12.9898 + z * 78.233 + salt * 37.719) * 43758.5453;
  return Math.floor((mixed - Math.floor(mixed)) * 100);
}

/** Casas que a mata deixa livres: a trilha, a água, as margens e os lugares, com folga. */
function keptClear(x: number, z: number): boolean {
  for (let dz = -CLEAR_MARGIN; dz <= CLEAR_MARGIN; dz += 1) {
    for (let dx = -CLEAR_MARGIN; dx <= CLEAR_MARGIN; dx += 1) {
      if (isTrail(x + dx, z + dz) || isWater(x + dx, z + dz)) return true;
    }
  }
  return (
    circleDistance(CIRCLE, x, z) <= CIRCLE.radius ||
    circleDistance(CAMP, x, z) <= CAMP.radius + CLEAR_MARGIN ||
    circleDistance(GLADE, x, z) <= GLADE.radius ||
    rectDistance(HUT_RECT, x, z) <= HUT_YARD + CLEAR_MARGIN
  );
}

/** A mata fechada: árvores e mato nas casas livres, pela conta fixa. */
function furnishWoods(tryPlace: (key: string, cell: Cell) => void): void {
  for (let z = 0; z < FOREST_SIZE.depth; z += 1) {
    for (let x = 0; x < FOREST_SIZE.width; x += 1) {
      if (keptClear(x, z)) continue;
      const roll = cellRoll(x, z, 1);
      const pick = cellRoll(x, z, 2);
      if (roll < WOODS.trees) tryPlace(TREES[pick % TREES.length]!, { x, z });
      else if (roll < WOODS.trees + WOODS.undergrowth) {
        tryPlace(UNDERGROWTH[pick % UNDERGROWTH.length]!, { x, z });
      }
    }
  }
}

export function buildForestMap(): AssembledMap {
  const sketch = createSketch(FOREST_SIZE, null);
  const floors = forestFloors();
  for (const [text, floor] of floors) {
    const [x, z] = text.split(',').map(Number);
    sketch.ground({ x: x!, z: z!, width: 1, depth: 1 }, floor.tile, floor.height);
  }
  const indoors = stampBuildings(sketch, [HUT]);
  const taken = new Set<string>();
  const cellsOf = (piece: string, cell: Cell, rotation = 0) => {
    const size = rotatedFootprint(propFootprint(piece), rotation);
    return rectCells({ x: cell.x, z: cell.z, width: size.width, depth: size.depth });
  };
  const fits = (cells: readonly Cell[]) =>
    cells.every(
      (cell) => floors.has(key(cell)) && !taken.has(key(cell)) && !indoors.has(key(cell)),
    );
  const put = (piece: string, cell: Cell, options: Omit<SketchPiece, 'level'>, cells: Cell[]) => {
    for (const each of cells) taken.add(key(each));
    sketch.piece(piece, cell, { ...options, level: floors.get(key(cell))!.height });
  };
  const place: Place = (piece, cell, options = {}) => {
    const cells = cellsOf(piece, cell, options.rotation);
    if (!fits(cells)) throw new Error(`Peça ${piece} sem lugar em ${key(cell)}.`);
    put(piece, cell, options, cells);
  };
  furnishCircle(place);
  furnishCamp(place);
  furnishHut(place);
  furnishGlade(place);
  furnishTrail(place);
  furnishWoods((piece, cell) => {
    const cells = cellsOf(piece, cell);
    if (fits(cells)) put(piece, cell, {}, cells);
  });
  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'floresta', backdrop: 'forest' },
  });
}
