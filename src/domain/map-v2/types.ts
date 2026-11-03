/** Tipos do mapa v2 em memória. A forma gravada (o JSON) está em schema.ts. */
import type { GridSize } from '../grid';
import type { ChunkCoord } from './chunks';
import type { CellRect } from './rect';
import type { MapHeader, MapPiece, MapWall } from './schema';
import type { ChunkTerrain } from './terrain';

/**
 * Um pedaço em memória. É imutável por convenção: cada operação devolve um pedaço novo
 * quando mexe nele e deixa os outros como estavam. Referência igual quer dizer "não mudou",
 * e é com isso que o autosave grava e a cena redesenha só o que mudou.
 */
export type MapChunk = {
  readonly coord: ChunkCoord;
  /** Casas que o pedaço cobre, cortado na borda do mapa; quem indexa o terreno precisa disto. */
  readonly bounds: CellRect;
  readonly terrain: ChunkTerrain;
  /** Paredes cuja aresta é deste pedaço (a regra está em wallOwnerCell). */
  readonly walls: readonly MapWall[];
  /** Peças cuja âncora está neste pedaço, mesmo que avancem para o vizinho. */
  readonly pieces: readonly MapPiece[];
};

/**
 * O mapa v2 em memória: tamanho (que mora nas colunas width e depth da tabela maps),
 * cabeçalho e TODOS os pedaços do mapa. Um mapa sempre tem os 32×32 pedaços do seu tamanho,
 * por isso um pedaço que falta ao carregar é erro, e não um buraco silencioso.
 */
export type MapModel = {
  readonly size: GridSize;
  readonly header: MapHeader;
  /** Pedaços pela chave de chunkKey(). */
  readonly chunks: ReadonlyMap<string, MapChunk>;
};
