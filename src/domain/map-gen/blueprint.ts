/**
 * Planta de um prédio: chão, paredes e peças em coordenadas LOCAIS (a casa (0, 0) é o canto de
 * menor x e z, e a porta da frente fica sempre na face norte). Alturas são relativas ao chão do
 * prédio. O gerador e as casas prontas usam a mesma planta: girar e carimbar no mapa é igual
 * para os dois [#6].
 *
 * Escala: uma casa ~1,5 m (um boneco 1×1) e um andar = 4 degraus = 2 casas de altura.
 */
import type { Cell, GridEdge } from '../grid';
import { QUARTER_TURNS, STORY_HEIGHT_STEPS, type Footprint } from '../map-v2';
import { createRandom } from './random';
import { SINGLE_CELL, type RoofKind, type SizedPiece, type StyleKit, type WallSet } from './kits';

export type BlueprintWall = GridEdge & {
  readonly style: string;
  readonly height: number;
  /** Degrau da base, contado do chão do prédio. */
  readonly level: number;
};

export type BlueprintPiece = {
  readonly key: string;
  /** Âncora local (canto de menor x e z do retângulo já girado). */
  readonly x: number;
  readonly z: number;
  readonly level: number;
  readonly rotation: number;
  readonly footprint: Footprint;
  readonly scale: number;
};

export type Blueprint = {
  readonly width: number;
  readonly depth: number;
  /** Piso interno: pinta o retângulo inteiro. */
  readonly floor: string;
  readonly walls: readonly BlueprintWall[];
  readonly pieces: readonly BlueprintPiece[];
  /** Casa de dentro, colada na porta: fica livre para o boneco entrar. */
  readonly door: Cell;
  readonly stories: number;
};

/** Para que serve o prédio: muda a fachada do térreo e a mobília. */
export type BuildingUse = 'house' | 'shop' | 'tower';

export type BuildingSpec = {
  readonly width: number;
  readonly depth: number;
  readonly stories: number;
  readonly use: BuildingUse;
  readonly walls: WallSet;
  readonly floor: string;
  readonly roof: RoofKind;
  /** Semente da mobília: a mesma planta sai sempre igual. */
  readonly seed: number;
};

/** Escada de um andar: 1×3 casas. Prédio mais estreito que isto não tem andar de cima. */
export const MIN_SIDE_FOR_STAIRS = 4;
/** Uma peça de mobília para cada tantas casas do andar. */
const CELLS_PER_FURNITURE = 9;
const MAX_FURNITURE_PER_STORY = 6;
/** Tentativas de achar casa livre para cada móvel antes de desistir. */
const PLACEMENT_TRIES = 6;
const ROOFTOP_PROPS_MAX = 2;
/** Lajes quadradas de 4, 2 e 1 casas: menos peças que uma laje por casa. */
const SLAB_SIDES = [4, 2, 1] as const;
/** Janelas a cada tantas arestas da fachada (as outras são paredes lisas). */
const WINDOW_EVERY = 2;

/** Retângulo a tapar com peças, sem passar das casas proibidas. */
type Tiling = {
  readonly width: number;
  readonly depth: number;
  readonly blocked: (x: number, z: number) => boolean;
};

type TileShape = { readonly width: number; readonly depth: number; readonly make: TileMaker };
type TileMaker = (x: number, z: number) => BlueprintPiece;

/** Tapa o retângulo com as formas na ordem dada (a primeira que couber em cada casa livre). */
function tileRect(area: Tiling, shapes: readonly TileShape[]): BlueprintPiece[] {
  const covered = new Uint8Array(area.width * area.depth);
  const free = (x: number, z: number) =>
    x < area.width && z < area.depth && covered[z * area.width + x] === 0 && !area.blocked(x, z);
  const fits = (x: number, z: number, shape: TileShape) => {
    for (let dz = 0; dz < shape.depth; dz += 1) {
      for (let dx = 0; dx < shape.width; dx += 1) if (!free(x + dx, z + dz)) return false;
    }
    return true;
  };
  const pieces: BlueprintPiece[] = [];
  for (let z = 0; z < area.depth; z += 1) {
    for (let x = 0; x < area.width; x += 1) {
      if (!free(x, z)) continue;
      const shape = shapes.find((candidate) => fits(x, z, candidate));
      if (!shape) continue;
      for (let dz = 0; dz < shape.depth; dz += 1) {
        covered.fill(1, (z + dz) * area.width + x, (z + dz) * area.width + x + shape.width);
      }
      pieces.push(shape.make(x, z));
    }
  }
  return pieces;
}

/**
 * Laje (chão de um andar de cima ou teto plano): peças de chão do catálogo esticadas em
 * quadrados de 4, 2 ou 1 casa. A escala estica a placa fina por igual, e 4×4 vira uma peça só.
 */
function slab(area: Tiling, floor: string, level: number): BlueprintPiece[] {
  const shapes = SLAB_SIDES.map((side) => ({
    width: side,
    depth: side,
    make: (x: number, z: number) => ({
      key: floor,
      x,
      z,
      level,
      rotation: 0,
      footprint: { width: side, depth: side },
      scale: side,
    }),
  }));
  return tileRect(area, shapes);
}

/** Telhados de duas águas: cada modelo também deitado (girado), do maior para o menor. */
function gableRoof(spec: BuildingSpec, roofs: readonly SizedPiece[]): BlueprintPiece[] {
  const level = spec.stories * STORY_HEIGHT_STEPS;
  const shapes: TileShape[] = roofs.flatMap((roof) => {
    const { width, depth } = roof.footprint;
    const make = (rotation: number) => (x: number, z: number) => ({
      key: roof.key,
      x,
      z,
      level,
      rotation,
      footprint: roof.footprint,
      scale: 1,
    });
    const upright = { width, depth, make: make(0) };
    return width === depth ? [upright] : [upright, { width: depth, depth: width, make: make(1) }];
  });
  return tileRect({ width: spec.width, depth: spec.depth, blocked: () => false }, shapes);
}

/** Arestas do contorno, cada uma com a posição ao longo da face (para o ritmo das janelas). */
type PerimeterEdge = GridEdge & {
  readonly face: 'north' | 'south' | 'west' | 'east';
  index: number;
};

function perimeter(width: number, depth: number): PerimeterEdge[] {
  const edges: PerimeterEdge[] = [];
  for (let x = 0; x < width; x += 1) {
    edges.push({ x, z: 0, side: 'north', face: 'north', index: x });
    edges.push({ x, z: depth, side: 'north', face: 'south', index: x });
  }
  for (let z = 0; z < depth; z += 1) {
    edges.push({ x: 0, z, side: 'west', face: 'west', index: z });
    edges.push({ x: width, z, side: 'west', face: 'east', index: z });
  }
  return edges;
}

function faceLength(edge: PerimeterEdge, spec: BuildingSpec): number {
  return edge.face === 'north' || edge.face === 'south' ? spec.width : spec.depth;
}

/** Porta no meio da face norte. */
export function doorColumn(width: number): number {
  return Math.floor(width / 2);
}

function wallStyleAt(edge: PerimeterEdge, story: number, spec: BuildingSpec): string {
  const { walls } = spec;
  const front = edge.face === 'north';
  if (story === 0 && front && edge.index === doorColumn(spec.width)) return walls.door;
  if (story === 0 && front && spec.use === 'shop' && walls.shopfront) return walls.shopfront;
  const corner = edge.index === 0 || edge.index === faceLength(edge, spec) - 1;
  if (corner) return walls.plain;
  const rhythm = spec.use === 'tower' ? 1 : WINDOW_EVERY;
  return edge.index % rhythm === (spec.use === 'tower' ? 0 : 1) ? walls.window : walls.plain;
}

/** As casas da escada que sai do andar (a escada fica encostada na parede leste, ao fundo). */
function stairCells(spec: BuildingSpec, stairs: SizedPiece): Cell[] {
  const x = spec.width - 1;
  const z0 = spec.depth - stairs.footprint.depth;
  return Array.from({ length: stairs.footprint.depth }, (_, dz) => ({ x, z: z0 + dz }));
}

function hasStairs(spec: BuildingSpec): boolean {
  return (
    spec.stories > 1 && spec.width >= MIN_SIDE_FOR_STAIRS && spec.depth >= MIN_SIDE_FOR_STAIRS + 1
  );
}

type StoryContext = {
  readonly spec: BuildingSpec;
  readonly kit: StyleKit;
  readonly random: ReturnType<typeof createRandom>;
  readonly stairs: readonly Cell[];
};

/** Mobília solta num andar, longe da porta e da escada, sem duas peças na mesma casa. */
function furnish(context: StoryContext, story: number): BlueprintPiece[] {
  const { spec, kit, random } = context;
  const taken = new Set(context.stairs.map((cell) => `${cell.x},${cell.z}`));
  const door = doorColumn(spec.width);
  // A casa da porta e a da frente dela ficam livres: o boneco entra sem tropeçar.
  taken.add(`${door},0`).add(`${door},1`);
  const count = Math.min(
    MAX_FURNITURE_PER_STORY,
    Math.max(1, Math.floor((spec.width * spec.depth) / CELLS_PER_FURNITURE)),
  );
  const pieces: BlueprintPiece[] = [];
  for (let item = 0; item < count; item += 1) {
    for (let attempt = 0; attempt < PLACEMENT_TRIES; attempt += 1) {
      const x = random.between(0, spec.width - 1);
      const z = random.between(0, spec.depth - 1);
      if (taken.has(`${x},${z}`)) continue;
      taken.add(`${x},${z}`);
      pieces.push({
        key: random.pick(kit.indoorProps),
        x,
        z,
        level: story * STORY_HEIGHT_STEPS,
        rotation: random.between(0, QUARTER_TURNS - 1),
        footprint: SINGLE_CELL,
        scale: 1,
      });
      break;
    }
  }
  return pieces;
}

function storyWalls(spec: BuildingSpec, story: number): BlueprintWall[] {
  return perimeter(spec.width, spec.depth).map((edge) => ({
    x: edge.x,
    z: edge.z,
    side: edge.side,
    style: wallStyleAt(edge, story, spec),
    height: STORY_HEIGHT_STEPS,
    level: story * STORY_HEIGHT_STEPS,
  }));
}

function flatRoof(context: StoryContext): BlueprintPiece[] {
  const { spec, kit, random } = context;
  const level = spec.stories * STORY_HEIGHT_STEPS;
  const area = { width: spec.width, depth: spec.depth, blocked: () => false };
  const roof = slab(area, spec.floor, level);
  if (kit.rooftopProps.length === 0) return roof;
  const extras = random.between(0, ROOFTOP_PROPS_MAX);
  for (let item = 0; item < extras; item += 1) {
    roof.push({
      key: random.pick(kit.rooftopProps),
      // Longe da borda: a peça do teto não fica pendurada para fora.
      x: random.between(1, Math.max(1, spec.width - 2)),
      z: random.between(1, Math.max(1, spec.depth - 2)),
      level,
      rotation: random.between(0, QUARTER_TURNS - 1),
      footprint: SINGLE_CELL,
      scale: 1,
    });
  }
  return roof;
}

/**
 * Monta a planta: paredes por andar (porta no térreo, janelas no ritmo da fachada), laje em
 * cada andar de cima com o vão da escada, escada encostada no fundo, mobília e o telhado.
 */
export function buildBlueprint(spec: BuildingSpec, kit: StyleKit): Blueprint {
  const random = createRandom(spec.seed);
  const stairs = hasStairs(spec) ? stairCells(spec, kit.stairs) : [];
  const stories = stairs.length > 0 ? spec.stories : 1;
  const built = { ...spec, stories };
  const context: StoryContext = { spec: built, kit, random, stairs };
  const stairKeys = new Set(stairs.map((cell) => `${cell.x},${cell.z}`));
  const walls: BlueprintWall[] = [];
  const pieces: BlueprintPiece[] = [];
  for (let story = 0; story < stories; story += 1) {
    walls.push(...storyWalls(built, story));
    if (story > 0) {
      const area = {
        width: spec.width,
        depth: spec.depth,
        blocked: (x: number, z: number) => stairKeys.has(`${x},${z}`),
      };
      pieces.push(...slab(area, spec.floor, story * STORY_HEIGHT_STEPS));
    }
    if (story < stories - 1 && stairs[0]) {
      pieces.push({
        key: kit.stairs.key,
        x: stairs[0].x,
        z: stairs[0].z,
        level: story * STORY_HEIGHT_STEPS,
        rotation: 0,
        footprint: kit.stairs.footprint,
        scale: 1,
      });
    }
    pieces.push(...furnish(context, story));
  }
  const roof =
    spec.roof === 'gable' && kit.gableRoofs.length > 0
      ? gableRoof(built, kit.gableRoofs)
      : flatRoof(context);
  pieces.push(...roof);
  return {
    width: spec.width,
    depth: spec.depth,
    floor: spec.floor,
    walls,
    pieces,
    door: { x: doorColumn(spec.width), z: 0 },
    stories,
  };
}

// ---------------------------------------------------------------------------
// Giro
// ---------------------------------------------------------------------------

/**
 * Um quarto de volta, no mesmo sentido em que a cena gira uma peça (rotation.y de +90°): a
 * casa (x, z) de uma planta W×D vai para (z, W-1-x), e a face norte vira a face oeste.
 */
function turnOnce(blueprint: Blueprint): Blueprint {
  const { width } = blueprint;
  const walls = blueprint.walls.map((wall) =>
    wall.side === 'north'
      ? { ...wall, x: wall.z, z: width - wall.x - 1, side: 'west' as const }
      : { ...wall, x: wall.z, z: width - wall.x, side: 'north' as const },
  );
  const pieces = blueprint.pieces.map((piece) => {
    const turned = piece.rotation % 2 !== 0;
    const pieceWidth = turned ? piece.footprint.depth : piece.footprint.width;
    return {
      ...piece,
      x: piece.z,
      z: width - piece.x - pieceWidth,
      rotation: (piece.rotation + 1) % QUARTER_TURNS,
    };
  });
  return {
    ...blueprint,
    width: blueprint.depth,
    depth: blueprint.width,
    walls,
    pieces,
    door: { x: blueprint.door.z, z: width - 1 - blueprint.door.x },
  };
}

/** A planta girada em quartos de volta (0 a 3). */
export function rotateBlueprint(blueprint: Blueprint, rotation: number): Blueprint {
  const turns = ((rotation % QUARTER_TURNS) + QUARTER_TURNS) % QUARTER_TURNS;
  let turned = blueprint;
  for (let turn = 0; turn < turns; turn += 1) turned = turnOnce(turned);
  return turned;
}

/** A casa de fora colada na porta (na rua ou na calçada), já girada. */
export function doorOutside(blueprint: Blueprint, rotation: number): Cell {
  const turns = ((rotation % QUARTER_TURNS) + QUARTER_TURNS) % QUARTER_TURNS;
  const { x, z } = rotateBlueprint(blueprint, turns).door;
  const offsets: readonly Cell[] = [
    { x: 0, z: -1 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
    { x: 1, z: 0 },
  ];
  const offset = offsets[turns]!;
  return { x: x + offset.x, z: z + offset.z };
}
