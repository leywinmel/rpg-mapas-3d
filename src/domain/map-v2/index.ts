/**
 * Formato v2 do mapa: pedaços de 32×32 casas, altura em degraus, peças de várias casas.
 * TypeScript puro. NÃO é reexportado por src/domain/index.ts, para os nomes não colidirem
 * com os do v1: quem usa importa de '@/domain/map-v2'. As features só migram nas fatias F11 a F13.
 */
export * from './chunks';
export * from './constants';
export * from './convert-v1';
export * from './cutaway';
export * from './document';
export * from './footprint';
export * from './height';
export * from './model';
export * from './operations';
export * from './rect';
export * from './resize';
export * from './rle';
export {
  catalogKeySchema,
  chunkDocumentSchema,
  mapHeaderSchema,
  pieceSchema,
  wallSchema,
  type ChunkDocument,
  type MapHeader,
  type MapPiece,
  type MapWall,
  type PieceAsset,
  type TerrainDocument,
} from './schema';
export * from './stacking';
export * from './storage';
export * from './terrain';
export * from './terrain-height';
export * from './types';
export * from './walls';
