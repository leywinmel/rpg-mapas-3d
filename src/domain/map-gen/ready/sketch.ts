/**
 * Esboço de um mapa pronto (RPG-63): quem desenha o mapa à mão pinta o chão, levanta as
 * paredes e põe as peças, casa por casa, sem sorteio. No fim sai o mesmo MapModel do gerador,
 * montado pelo mesmo montador de pedaços [#6].
 */
import type { Cell, GridSize } from '../../grid';
import type { CellRect, Footprint, MapHeader, MapWall } from '../../map-v2';
import { createAssembler, createTileKeys, type AssembledMap } from '../assemble';
import { buildBlueprint, rotateBlueprint, type Blueprint, type BuildingUse } from '../blueprint';
import { propFootprint, roofFor, STYLE_KITS, type SettlementStyle } from '../kits';

export type SketchPiece = {
  readonly level?: number;
  readonly rotation?: number;
  /** Sem ele, o da tabela de peças grandes (ou uma casa). */
  readonly footprint?: Footprint;
};

/** Faixa de parede numa aresta: estilo, degrau da base e altura em degraus. */
export type WallBand = { readonly style: string; readonly level: number; readonly height: number };

export type Sketch = {
  readonly size: GridSize;
  /** Chão (e altura) de cada casa do retângulo; null = sem chão. */
  readonly ground: (rect: CellRect, tile: string | null, height?: number) => void;
  readonly wall: (wall: MapWall) => void;
  readonly piece: (key: string, cell: Cell, options?: SketchPiece) => void;
  /** Piso solto (laje, convés) em cada casa da lista, no degrau pedido. */
  readonly deck: (cells: readonly Cell[], tile: string, level: number) => void;
  readonly build: (header: MapHeader) => AssembledMap;
};

export function createSketch(size: GridSize, baseTile: string | null): Sketch {
  const cells = size.width * size.depth;
  const tiles: (string | null)[] = new Array<string | null>(cells).fill(baseTile);
  const heights = new Uint8Array(cells);
  const walls: MapWall[] = [];
  const pieces: { key: string; cell: Cell; options: SketchPiece }[] = [];

  const ground = (rect: CellRect, tile: string | null, height = 0) => {
    for (let z = rect.z; z < rect.z + rect.depth; z += 1) {
      for (let x = rect.x; x < rect.x + rect.width; x += 1) {
        tiles[z * size.width + x] = tile;
        heights[z * size.width + x] = height;
      }
    }
  };
  const piece = (key: string, cell: Cell, options: SketchPiece = {}) => {
    pieces.push({ key, cell, options });
  };
  const deck = (list: readonly Cell[], tile: string, level: number) => {
    for (const cell of list) piece(tile, cell, { level, footprint: { width: 1, depth: 1 } });
  };

  const build = (header: MapHeader): AssembledMap => {
    const assembler = createAssembler(size);
    for (const wall of walls) assembler.addWall(wall);
    for (const { key, cell, options } of pieces) {
      assembler.addPiece({
        asset: { source: 'catalog', key },
        x: cell.x,
        z: cell.z,
        level: options.level ?? 0,
        rotation: options.rotation ?? 0,
        footprint: options.footprint ?? propFootprint(key),
        scale: 1,
      });
    }
    const { keys, index } = createTileKeys();
    const tileIndexes = Uint16Array.from(tiles, (tile) => index(tile));
    return assembler.finish({ keys, tiles: tileIndexes, heights }, header);
  };

  return { size, ground, wall: (wall) => walls.push(wall), piece, deck, build };
}

const cellKey = (cell: Cell) => `${cell.x},${cell.z}`;

/**
 * Contorno de uma área de casas: cada aresta entre uma casa da área e uma de fora ganha as
 * faixas de parede que `bandsAt` der para ela. Serve para o casco, a muralha, o muro.
 */
export function outlineWalls(
  sketch: Sketch,
  area: readonly Cell[],
  bandsAt: (cell: Cell) => readonly WallBand[],
): void {
  const inside = new Set(area.map(cellKey));
  const has = (x: number, z: number) => inside.has(`${x},${z}`);
  const raise = (edge: Pick<MapWall, 'x' | 'z' | 'side'>, cell: Cell) => {
    for (const band of bandsAt(cell)) sketch.wall({ ...edge, ...band });
  };
  for (const cell of area) {
    const { x, z } = cell;
    if (!has(x, z - 1)) raise({ x, z, side: 'north' }, cell);
    if (!has(x, z + 1)) raise({ x, z: z + 1, side: 'north' }, cell);
    if (!has(x - 1, z)) raise({ x, z, side: 'west' }, cell);
    if (!has(x + 1, z)) raise({ x: x + 1, z, side: 'west' }, cell);
  }
}

/** Prédio desenhado à mão: onde fica, o tamanho e o estilo; a planta vem do gerador [#6]. */
export type SketchBuilding = {
  readonly style: SettlementStyle;
  readonly use: BuildingUse;
  /** Canto de menor x e z, já com o prédio girado. */
  readonly x: number;
  readonly z: number;
  /** Largura e fundo antes de girar. */
  readonly width: number;
  readonly depth: number;
  readonly stories: number;
  /** Giro da planta: a porta fica ao norte (0), oeste (1), sul (2) ou leste (3); 1 e 3 trocam largura e fundo. */
  readonly rotation: number;
  /** Degrau do chão do prédio. */
  readonly level: number;
  /** Escolhe a fachada da lista do estilo e a mobília: o mesmo número sai sempre igual. */
  readonly variant: number;
};

function buildingBlueprint(building: SketchBuilding): Blueprint {
  const kit = STYLE_KITS[building.style];
  const sets = kit.walls[building.use];
  const walls = sets[building.variant % sets.length]!;
  const spec = {
    width: building.width,
    depth: building.depth,
    stories: building.stories,
    use: building.use,
    walls,
    floor: kit.tiles.indoor[building.variant % kit.tiles.indoor.length]!,
    // Mesma regra do gerador: telhado de duas águas só onde o kit tem e as medidas são pares.
    roof: roofFor(kit, walls, building),
    seed: building.variant + 1,
  };
  return rotateBlueprint(buildBlueprint(spec, kit), building.rotation);
}

/** O retângulo que o prédio ocupa no mapa, já girado. */
export function buildingRect(building: SketchBuilding): CellRect {
  const turned = building.rotation % 2 !== 0;
  return {
    x: building.x,
    z: building.z,
    width: turned ? building.depth : building.width,
    depth: turned ? building.width : building.depth,
  };
}

/** Põe o prédio no esboço: o piso, as paredes de cada andar, a mobília e o telhado. */
export function stampBuilding(sketch: Sketch, building: SketchBuilding): void {
  const blueprint = buildingBlueprint(building);
  const { x, z, level } = building;
  sketch.ground({ x, z, width: blueprint.width, depth: blueprint.depth }, blueprint.floor, level);
  for (const wall of blueprint.walls) {
    sketch.wall({ ...wall, x: wall.x + x, z: wall.z + z, level: wall.level + level });
  }
  for (const piece of blueprint.pieces) {
    sketch.piece(
      piece.key,
      { x: piece.x + x, z: piece.z + z },
      { level: piece.level + level, rotation: piece.rotation, footprint: piece.footprint },
    );
  }
}

/** Põe cada prédio e devolve as casas de dentro ("x,z"), que não recebem peça de rua. */
export function stampBuildings(sketch: Sketch, buildings: readonly SketchBuilding[]): Set<string> {
  const indoors = new Set<string>();
  for (const building of buildings) {
    stampBuilding(sketch, building);
    const rect = buildingRect(building);
    for (let z = rect.z; z < rect.z + rect.depth; z += 1) {
      for (let x = rect.x; x < rect.x + rect.width; x += 1) indoors.add(cellKey({ x, z }));
    }
  }
  return indoors;
}
