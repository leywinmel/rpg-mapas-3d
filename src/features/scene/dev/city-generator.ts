/**
 * Gerador de uma cidade cheia para MEDIR a cena [#99]: terreno com morros, ruas, água, prédios
 * de vários andares (paredes empilhadas), peças dentro e fora, algumas de várias casas. Não é o
 * gerador de vilas do produto (F15): só existe para a página de medição e os testes, e monta os
 * pedaços direto, sem passar pelas operações, para gerar 1000×1000 em segundos.
 */
import type { GridSize } from '@/domain';
import {
  chunkBounds,
  chunkKey,
  createEmptyMap,
  listChunks,
  STORY_HEIGHT_STEPS,
  type CellRect,
  type ChunkCoord,
  type MapChunk,
  type MapModel,
  type MapPiece,
  type MapWall,
} from '@/domain/map-v2';

/** Gerador pseudoaleatório pequeno e determinístico (mulberry32): mesma semente, mesma cidade. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Quarteirão entre ruas: as ruas passam a cada 16 casas, dois quarteirões por lado de pedaço. */
const BLOCK_SIZE = 16;
const MIN_BUILDING_SIDE = 5;
const MAX_BUILDING_SIDE = 11;
const MAX_STORIES = 3;
/** Morros: alturas de 0 a 12 degraus (três andares), suaves o bastante para ruas passarem. */
const MAX_HILL_STEPS = 12;
const WATER_BELOW_STEPS = 2;
const TREES_PER_BLOCK = 10;
const ROCKS_PER_BLOCK = 3;
const PIECES_PER_STORY = 5;
const TORCH_SPACING = 8;
const TILES = {
  street: 'piso-pedra',
  grass: 'grama',
  dirt: 'terra',
  water: 'agua',
  indoor: 'piso-madeira',
} as const;
const WALL_STYLES = ['parede-pedra', 'parede-madeira'] as const;
const INDOOR_PIECES = ['mesa', 'cadeira', 'bau', 'barril', 'caixa'] as const;

function hillSteps(x: number, z: number): number {
  const wave = Math.sin(x / 23) * 3 + Math.cos(z / 31) * 3 + Math.sin((x + z) / 17) * 2;
  return Math.min(Math.max(Math.round(wave + MAX_HILL_STEPS / 2), 0), MAX_HILL_STEPS);
}

function isStreet(x: number, z: number): boolean {
  return x % BLOCK_SIZE === 0 || z % BLOCK_SIZE === 0;
}

/** Pedaço em construção: aqui os arrays ainda podem ser mexidos, ninguém mais os tem. */
type Draft = {
  coord: ChunkCoord;
  bounds: CellRect;
  palette: string[];
  tiles: Uint16Array;
  heights: Uint8Array;
  walls: MapWall[];
  pieces: MapPiece[];
  random: () => number;
};

function setCell(draft: Draft, x: number, z: number, tile: string, height: number): void {
  const index = (z - draft.bounds.z) * draft.bounds.width + (x - draft.bounds.x);
  let paletteIndex = draft.palette.indexOf(tile) + 1;
  if (paletteIndex === 0) paletteIndex = draft.palette.push(tile);
  draft.tiles[index] = paletteIndex;
  draft.heights[index] = height;
}

function heightAt(draft: Draft, x: number, z: number): number {
  return draft.heights[(z - draft.bounds.z) * draft.bounds.width + (x - draft.bounds.x)] ?? 0;
}

function fillTerrain(draft: Draft): void {
  const { x: x0, z: z0, width, depth } = draft.bounds;
  for (let z = z0; z < z0 + depth; z += 1) {
    for (let x = x0; x < x0 + width; x += 1) {
      const hill = hillSteps(x, z);
      if (isStreet(x, z)) setCell(draft, x, z, TILES.street, hill);
      else if (hill < WATER_BELOW_STEPS) setCell(draft, x, z, TILES.water, hill);
      else setCell(draft, x, z, (x * 7 + z * 13) % 11 === 0 ? TILES.dirt : TILES.grass, hill);
    }
  }
}

function addPiece(draft: Draft, piece: Omit<MapPiece, 'id' | 'scale'>, scale = 1): void {
  const id = `${draft.coord.cx}-${draft.coord.cz}-${draft.pieces.length}`;
  draft.pieces.push({ id, scale, ...piece });
}

function between(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

/** As arestas do contorno do retângulo: norte e sul viram "north", oeste e leste viram "west". */
function perimeterEdges(rect: CellRect): Array<Pick<MapWall, 'x' | 'z' | 'side'>> {
  const edges: Array<Pick<MapWall, 'x' | 'z' | 'side'>> = [];
  for (let x = rect.x; x < rect.x + rect.width; x += 1) {
    edges.push({ x, z: rect.z, side: 'north' }, { x, z: rect.z + rect.depth, side: 'north' });
  }
  for (let z = rect.z; z < rect.z + rect.depth; z += 1) {
    edges.push({ x: rect.x, z, side: 'west' }, { x: rect.x + rect.width, z, side: 'west' });
  }
  return edges;
}

/** Prédio de 1 a 3 andares: chão de madeira nivelado, paredes por andar e mobília em cada um. */
function addBuilding(draft: Draft, rect: CellRect): void {
  const { random } = draft;
  const base = heightAt(draft, rect.x, rect.z);
  for (let z = rect.z; z < rect.z + rect.depth; z += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) setCell(draft, x, z, TILES.indoor, base);
  }
  const stories = between(random, 1, MAX_STORIES);
  const style = WALL_STYLES[between(random, 0, WALL_STYLES.length - 1)]!;
  const door = { x: rect.x + Math.floor(rect.width / 2), z: rect.z };
  for (let story = 0; story < stories; story += 1) {
    const level = base + story * STORY_HEIGHT_STEPS;
    for (const edge of perimeterEdges(rect)) {
      const isDoor = story === 0 && edge.side === 'north' && edge.x === door.x && edge.z === door.z;
      if (!isDoor) draft.walls.push({ ...edge, style, height: STORY_HEIGHT_STEPS, level });
    }
    // Uma mesa comprida (2×1, girada ao acaso) e mobília solta em cada andar.
    addPiece(draft, {
      asset: { source: 'catalog', key: 'mesa' },
      x: rect.x + 1,
      z: rect.z + 1,
      level,
      rotation: between(random, 0, 1),
      footprint: { width: 2, depth: 1 },
    });
    for (let index = 0; index < PIECES_PER_STORY; index += 1) {
      addPiece(draft, {
        asset: { source: 'catalog', key: INDOOR_PIECES[index % INDOOR_PIECES.length]! },
        x: between(random, rect.x, rect.x + rect.width - 1),
        z: between(random, rect.z + 2, rect.z + rect.depth - 1),
        level,
        rotation: between(random, 0, 3),
        footprint: { width: 1, depth: 1 },
      });
    }
  }
}

function isFree(x: number, z: number, building: CellRect | null): boolean {
  if (isStreet(x, z)) return false;
  if (!building) return true;
  return (
    x < building.x - 1 ||
    z < building.z - 1 ||
    x > building.x + building.width ||
    z > building.z + building.depth
  );
}

/** Quarteirão de 16×16 a partir de (bx, bz): um prédio, árvores e rochas em volta. */
function fillBlock(draft: Draft, bx: number, bz: number): void {
  const { random, bounds } = draft;
  const right = Math.min(bx + BLOCK_SIZE, bounds.x + bounds.width) - 1;
  const bottom = Math.min(bz + BLOCK_SIZE, bounds.z + bounds.depth) - 1;
  const width = between(random, MIN_BUILDING_SIDE, MAX_BUILDING_SIDE);
  const depth = between(random, MIN_BUILDING_SIDE, MAX_BUILDING_SIDE);
  const x = bx + between(random, 2, BLOCK_SIZE - width - 2);
  const z = bz + between(random, 2, BLOCK_SIZE - depth - 2);
  // A aresta leste/sul do prédio precisa ser deste pedaço: ele fica longe da borda dele.
  const fits = x + width < right && z + depth < bottom;
  const building = fits ? { x, z, width, depth } : null;
  if (building) addBuilding(draft, building);

  const scatter = (key: string, count: number, scale: () => number) => {
    for (let index = 0; index < count; index += 1) {
      const px = between(random, bx + 1, right);
      const pz = between(random, bz + 1, bottom);
      if (!isFree(px, pz, building)) continue;
      addPiece(
        draft,
        {
          asset: { source: 'catalog', key },
          x: px,
          z: pz,
          level: heightAt(draft, px, pz),
          rotation: between(random, 0, 3),
          footprint: { width: 1, depth: 1 },
        },
        scale(),
      );
    }
  };
  scatter('arvore', TREES_PER_BLOCK, () => 0.8 + random() * 0.6);
  scatter('rocha', ROCKS_PER_BLOCK, () => 1);
}

/** Tochas ao longo das ruas, de TORCH_SPACING em TORCH_SPACING casas. */
function addTorches(draft: Draft): void {
  const { x: x0, z: z0, width, depth } = draft.bounds;
  for (let z = z0; z < z0 + depth; z += 1) {
    for (let x = x0; x < x0 + width; x += 1) {
      if (x % BLOCK_SIZE !== 1 || z % TORCH_SPACING !== TORCH_SPACING / 2) continue;
      addPiece(draft, {
        asset: { source: 'catalog', key: 'tocha' },
        x,
        z,
        level: heightAt(draft, x, z),
        rotation: 0,
        footprint: { width: 1, depth: 1 },
      });
    }
  }
}

function buildChunk(size: GridSize, coord: ChunkCoord, seed: number): MapChunk {
  const bounds = chunkBounds(size, coord);
  const cells = bounds.width * bounds.depth;
  const draft: Draft = {
    coord,
    bounds,
    palette: [],
    tiles: new Uint16Array(cells),
    heights: new Uint8Array(cells),
    walls: [],
    pieces: [],
    // Uma semente por pedaço: o mesmo pedaço sai igual qualquer que seja o tamanho do mapa.
    random: createRandom(seed ^ (coord.cx * 73856093) ^ (coord.cz * 19349663)),
  };
  fillTerrain(draft);
  for (let bz = bounds.z; bz < bounds.z + bounds.depth; bz += BLOCK_SIZE) {
    for (let bx = bounds.x; bx < bounds.x + bounds.width; bx += BLOCK_SIZE)
      fillBlock(draft, bx, bz);
  }
  addTorches(draft);
  return {
    coord,
    bounds,
    terrain: { palette: draft.palette, tiles: draft.tiles, heights: draft.heights },
    walls: draft.walls,
    pieces: draft.pieces,
  };
}

export type CityOptions = { readonly size: GridSize; readonly seed: number };

/** Uma cidade do tamanho pedido. Mesma semente e tamanho, mesma cidade. */
export function generateCity({ size, seed }: CityOptions): MapModel {
  const empty = createEmptyMap(size);
  const chunks = new Map<string, MapChunk>();
  for (const coord of listChunks(size)) chunks.set(chunkKey(coord), buildChunk(size, coord, seed));
  return { ...empty, chunks };
}

export type CityCounts = { cells: number; walls: number; pieces: number; chunks: number };

/** O tamanho da cidade gerada, para a medição registrar o que estava na tela. */
export function countCity(model: MapModel): CityCounts {
  let walls = 0;
  let pieces = 0;
  for (const chunk of model.chunks.values()) {
    walls += chunk.walls.length;
    pieces += chunk.pieces.length;
  }
  return {
    cells: model.size.width * model.size.depth,
    walls,
    pieces,
    chunks: model.chunks.size,
  };
}
