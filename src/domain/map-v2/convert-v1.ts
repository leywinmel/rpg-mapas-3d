/**
 * Conversão do mapa v1 para o v2 sem mudar o que aparece na tela. As unidades do v1, conferidas
 * em features/scene/layout.ts, nos componentes da cena e em features/map-editor/editor/document-ops.ts:
 *
 * - `floors.height` é em degraus de 0,5 unidade (FLOOR_STEP_HEIGHT): o v2 usa os mesmos degraus.
 * - `walls.height` é em unidades do mundo (cada unidade é uma instância empilhada): vale 2 degraus.
 *   E a base da parede o v1 calcula na hora de desenhar, como o chão mais alto das duas casas da
 *   aresta (wallBase); o v2 grava essa base no `level` da parede.
 * - `props.elevation` é em unidades do mundo e ABSOLUTA: o editor já grava nela a altura do chão
 *   (placeProp e adjustFloorHeight) e a cena a usa direto como y, sem somar o chão de novo. Por
 *   isso o `level` da peça é só a elevação em degraus, sem somar nada.
 *
 * ÚNICA FONTE DE PERDA, e só em arquivo editado à mão: o editor sempre põe o objeto no centro da
 * casa e o gira de 90 em 90°. Se o arquivo traz o objeto fora do centro (posição livre) ou
 * girado num ângulo quebrado, a peça v2 fica no centro da casa que o contém e o giro vai para o
 * quarto de volta mais próximo. Pelo mesmo motivo (arquivo editado à mão) três casos raros também
 * se acomodam: elevação que não é múltipla de um degrau vai para o degrau mais perto; objeto
 * exatamente na borda leste ou sul (x = largura, que o v1 aceita) vai para a última casa de
 * dentro; e duas paredes na mesma aresta (o editor nunca cria) viram uma só, a última do arquivo.
 */
import { isInside, type Cell, type GridSize } from '../grid';
import {
  parseMapDocument,
  type FloorTile,
  type MapResult,
  type Prop,
  type Wall,
} from '../map-document';
import {
  chunkBounds,
  chunkKey,
  chunkOfCell,
  isValidMapSizeV2,
  listChunks,
  localIndex,
  type ChunkCoord,
} from './chunks';
import { MAP_V2_VERSION, MAX_MAP_SIZE_V2, QUARTER_TURNS } from './constants';
import { worldToSteps } from './height';
import type { CellRect } from './rect';
import type { MapPiece, MapWall } from './schema';
import type { MapChunk, MapModel } from './types';
import { fail, ok } from './validation';
import { wallKey, wallOwnerChunk } from './walls';

/** O v1 gira o objeto em graus; o v2, em quartos de volta. */
const QUARTER_TURN_DEGREES = 90;

/** Pedaço em construção: aqui os arrays podem ser mexidos, porque ainda ninguém os tem. */
type ChunkDraft = {
  readonly coord: ChunkCoord;
  readonly bounds: CellRect;
  readonly palette: string[];
  readonly tiles: Uint16Array;
  readonly heights: Uint8Array;
  readonly walls: Map<string, MapWall>;
  readonly pieces: MapPiece[];
};

type Drafts = ReadonlyMap<string, ChunkDraft>;

function createDrafts(size: GridSize): Drafts {
  const drafts = new Map<string, ChunkDraft>();
  for (const coord of listChunks(size)) {
    const bounds = chunkBounds(size, coord);
    const cells = bounds.width * bounds.depth;
    drafts.set(chunkKey(coord), {
      coord,
      bounds,
      palette: [],
      tiles: new Uint16Array(cells),
      heights: new Uint8Array(cells),
      walls: new Map(),
      pieces: [],
    });
  }
  return drafts;
}

/** O pedaço pelo endereço. Sempre existe, porque o v1 já foi conferido contra o tamanho do mapa. */
function draftAt(drafts: Drafts, coord: ChunkCoord): ChunkDraft {
  const draft = drafts.get(chunkKey(coord));
  if (!draft) throw new RangeError(`Pedaço (${coord.cx}, ${coord.cz}) fora do mapa.`);
  return draft;
}

function draftOf(drafts: Drafts, cell: Cell): ChunkDraft {
  return draftAt(drafts, chunkOfCell(cell));
}

function addFloors(drafts: Drafts, floors: readonly FloorTile[]): void {
  for (const floor of floors) {
    const draft = draftOf(drafts, floor);
    let paletteIndex = draft.palette.indexOf(floor.tile) + 1;
    if (paletteIndex === 0) {
      draft.palette.push(floor.tile);
      paletteIndex = draft.palette.length;
    }
    const index = localIndex(draft.bounds, floor);
    draft.tiles[index] = paletteIndex;
    // Os degraus do chão do v1 e do terreno do v2 têm a mesma altura (0,5 unidade).
    draft.heights[index] = floor.height;
  }
}

/**
 * Degraus do topo do chão da casa. Fora do mapa ou sem chão conta como zero, igual ao
 * surfaceAt da cena v1 (e é por isso que o terreno sem chão tem altura 0).
 */
function surfaceSteps(drafts: Drafts, size: GridSize, cell: Cell): number {
  if (!isInside(size, cell)) return 0;
  const draft = draftOf(drafts, cell);
  return draft.heights[localIndex(draft.bounds, cell)] ?? 0;
}

function addWalls(drafts: Drafts, size: GridSize, walls: readonly Wall[]): void {
  for (const wall of walls) {
    const neighbor =
      wall.side === 'north' ? { x: wall.x, z: wall.z - 1 } : { x: wall.x - 1, z: wall.z };
    const converted: MapWall = {
      x: wall.x,
      z: wall.z,
      side: wall.side,
      style: wall.style,
      height: worldToSteps(wall.height),
      level: Math.max(surfaceSteps(drafts, size, wall), surfaceSteps(drafts, size, neighbor)),
    };
    draftAt(drafts, wallOwnerChunk(size, wall)).walls.set(wallKey(converted), converted);
  }
}

function convertProp(prop: Prop, size: GridSize): MapPiece {
  return {
    id: prop.id,
    asset: { ...prop.asset },
    // O v1 aceita x = largura (a borda leste); a casa de dentro mais perto é a última.
    x: Math.min(Math.floor(prop.x), size.width - 1),
    z: Math.min(Math.floor(prop.z), size.depth - 1),
    level: worldToSteps(prop.elevation),
    rotation: Math.round(prop.rotation / QUARTER_TURN_DEGREES) % QUARTER_TURNS,
    footprint: { width: 1, depth: 1 },
    scale: prop.scale,
  };
}

function addProps(drafts: Drafts, size: GridSize, props: readonly Prop[]): void {
  for (const prop of props) {
    const piece = convertProp(prop, size);
    draftOf(drafts, piece).pieces.push(piece);
  }
}

function finishChunk(draft: ChunkDraft): MapChunk {
  const { coord, bounds, palette, tiles, heights } = draft;
  return {
    coord,
    bounds,
    terrain: { palette, tiles, heights },
    walls: [...draft.walls.values()],
    pieces: draft.pieces,
  };
}

/**
 * Abre um mapa salvo no formato v1 como mapa v2. Recebe o documento como veio do banco (a
 * conferência é a do v1, com as mesmas mensagens) e o tamanho das colunas width e depth.
 * Nunca falha por causa do conteúdo: o que o v1 aceita, o v2 recebe.
 */
export function convertMapV1ToV2(document: unknown, size: GridSize): MapResult<MapModel> {
  if (!isValidMapSizeV2(size)) {
    return fail([
      `Tamanho ${size.width}×${size.depth} inválido: use de 1 a ${MAX_MAP_SIZE_V2} casas por lado.`,
    ]);
  }
  const parsed = parseMapDocument(document, size);
  if (!parsed.ok) return parsed;
  const legacy = parsed.value;

  const drafts = createDrafts(size);
  // O chão vai primeiro: a base de cada parede sai da altura dele.
  addFloors(drafts, legacy.floors);
  addWalls(drafts, size, legacy.walls);
  addProps(drafts, size, legacy.props);

  const chunks = new Map<string, MapChunk>();
  for (const [key, draft] of drafts) chunks.set(key, finishChunk(draft));
  return ok({
    size: { width: size.width, depth: size.depth },
    header: { version: MAP_V2_VERSION, ambience: { ...legacy.ambience } },
    chunks,
  });
}
