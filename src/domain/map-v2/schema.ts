/**
 * Schemas do formato v2: o cabeçalho do mapa e o documento de cada pedaço. Aqui só entram
 * forma e limites de cada campo; o que depende do mapa (paredes e peças no pedaço certo,
 * soma das corridas do terreno) é conferido na leitura, em document.ts e terrain.ts.
 */
import { z } from 'zod';
import { mapDocumentSchema } from '../map-document';
import {
  CHUNK_CELLS,
  MAP_V2_VERSION,
  MAX_FOOTPRINT,
  MAX_LEVEL,
  MAX_MAP_SIZE_V2,
  MAX_PALETTE_ENTRIES,
  MAX_PIECE_ID_LENGTH,
  MAX_PIECE_SCALE,
  MAX_PIECES_PER_CHUNK,
  MAX_WALL_HEIGHT_STEPS,
  MAX_WALLS_PER_CHUNK,
  MIN_PIECE_SCALE,
  MIN_WALL_HEIGHT_STEPS,
  QUARTER_TURNS,
} from './constants';

// Chave do catálogo, modelo da peça e clima da cena vêm do schema do v1: assim o v2 aceita
// exatamente os mesmos valores, sem copiar a regra (DRY [#6]).
const legacy = mapDocumentSchema.shape;
/** Chave de uma peça do catálogo (ex: "piso-pedra"): sem caminhos nem caracteres soltos. */
export const catalogKeySchema = legacy.floors.element.shape.tile;
/** Modelo de uma peça: do catálogo embutido ou um `.glb` enviado pelo mestre. */
export const pieceAssetSchema = legacy.props.element.shape.asset;
export const ambienceSchema = legacy.ambience;

function boundedInt(what: string, min: number, max: number) {
  const message = `${what} precisa ser um número inteiro de ${min} a ${max}.`;
  return z.number({ error: message }).int(message).min(min, message).max(max, message);
}

const levelSchema = boundedInt('O degrau da base', 0, MAX_LEVEL);
/** Cantos de aresta vão até MAX_MAP_SIZE_V2 (a borda leste e sul do mapa). */
const edgeCoordinate = (what: string) => boundedInt(what, 0, MAX_MAP_SIZE_V2);
const cellCoordinate = (what: string) => boundedInt(what, 0, MAX_MAP_SIZE_V2 - 1);
const footprintSide = (what: string) => boundedInt(what, 1, MAX_FOOTPRINT);

export const mapHeaderSchema = z.object({
  version: z.literal(MAP_V2_VERSION),
  ambience: ambienceSchema,
});

/** Corridas [valor, quantidade, ...]: no máximo uma corrida por casa do pedaço. */
const runsSchema = z.array(z.number().int().min(0)).max(2 * CHUNK_CELLS);

const terrainDocumentSchema = z.object({
  /** Peças de chão usadas no pedaço. O índice 0 do RLE é "sem chão"; o índice i vale palette[i - 1]. */
  palette: z.array(catalogKeySchema).max(MAX_PALETTE_ENTRIES),
  /** Corridas do índice da paleta, linha a linha (z, depois x). */
  tiles: runsSchema,
  /** Corridas da altura do terreno em degraus, na mesma ordem. */
  heights: runsSchema,
});

export const wallSchema = z.object({
  x: edgeCoordinate('A coluna da parede'),
  z: edgeCoordinate('A linha da parede'),
  /** "north" = aresta no lado de z menor da casa; "west" = lado de x menor. */
  side: z.enum(['north', 'west'], { error: 'O lado da parede precisa ser "north" ou "west".' }),
  style: catalogKeySchema,
  /** Altura em degraus. */
  height: boundedInt('A altura da parede', MIN_WALL_HEIGHT_STEPS, MAX_WALL_HEIGHT_STEPS),
  /** Degrau absoluto da base: 0 no térreo, mais para as paredes dos andares de cima. */
  level: levelSchema,
});

export const pieceSchema = z.object({
  id: z
    .string({ error: 'O id da peça precisa ser um texto.' })
    .min(1, 'O id da peça não pode ser vazio.')
    .max(MAX_PIECE_ID_LENGTH, `O id da peça passa de ${MAX_PIECE_ID_LENGTH} caracteres.`),
  asset: pieceAssetSchema,
  /** Âncora: a casa de menor x e menor z do retângulo que a peça ocupa. */
  x: cellCoordinate('A coluna da peça'),
  z: cellCoordinate('A linha da peça'),
  /** Degrau absoluto da base da peça; empilhar é pôr peças na mesma casa em degraus diferentes. */
  level: levelSchema,
  /** Quartos de volta de 90°, de 0 a 3. */
  rotation: boundedInt('O giro da peça', 0, QUARTER_TURNS - 1),
  /** Tamanho em casas antes de girar; girar 1 ou 3 quartos troca largura e profundidade. */
  footprint: z.object({
    width: footprintSide('A largura da peça'),
    depth: footprintSide('A profundidade da peça'),
  }),
  scale: z
    .number({ error: 'A escala da peça precisa ser um número.' })
    .min(
      MIN_PIECE_SCALE,
      `A escala da peça precisa ficar entre ${MIN_PIECE_SCALE} e ${MAX_PIECE_SCALE}.`,
    )
    .max(
      MAX_PIECE_SCALE,
      `A escala da peça precisa ficar entre ${MIN_PIECE_SCALE} e ${MAX_PIECE_SCALE}.`,
    ),
});

export const chunkDocumentSchema = z.object({
  version: z.literal(MAP_V2_VERSION),
  terrain: terrainDocumentSchema,
  walls: z.array(wallSchema).max(MAX_WALLS_PER_CHUNK),
  pieces: z.array(pieceSchema).max(MAX_PIECES_PER_CHUNK),
});

export type MapHeader = z.infer<typeof mapHeaderSchema>;
export type TerrainDocument = z.infer<typeof terrainDocumentSchema>;
export type ChunkDocument = z.infer<typeof chunkDocumentSchema>;
export type MapWall = z.infer<typeof wallSchema>;
export type MapPiece = z.infer<typeof pieceSchema>;
export type PieceAsset = z.infer<typeof pieceAssetSchema>;
