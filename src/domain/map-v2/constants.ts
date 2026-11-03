/**
 * Constantes do formato v2 do mapa. Ficam juntas para o schema, as operações e os
 * testes partirem dos mesmos limites [#3]. O formato v1 continua em grid.ts e
 * map-document.ts; as features só migram para o v2 nas fatias F11 a F13.
 */

/** Versão gravada no cabeçalho e em cada pedaço (o v1 é MAP_DOCUMENT_VERSION = 1). */
export const MAP_V2_VERSION = 2;

/** Lado máximo do mapa, em casas. Decisão do usuário em 01/11: cabe uma cidade grande inteira. */
export const MAX_MAP_SIZE_V2 = 1000;

/**
 * Lado de um pedaço, em casas. Com 32 o maior mapa tem 32×32 = 1024 pedaços: poucas
 * linhas no banco, e uma pincelada regrava um pedaço (quatro, numa quina) em vez do mapa todo.
 */
export const CHUNK_SIZE = 32;
export const CHUNK_CELLS = CHUNK_SIZE * CHUNK_SIZE;

/** Cada corrida do RLE ocupa dois números no documento: o valor e quantas vezes ele se repete. */
export const RUN_STRIDE = 2;

/**
 * Altura de um degrau, em unidades do mundo (uma casa = 1 unidade). Vale o mesmo que o
 * FLOOR_STEP_HEIGHT da cena v1: por isso o chão elevado do v1 converte sem mudar de altura.
 */
export const HEIGHT_STEP = 0.5;

/** Um andar tem 4 degraus: 2 unidades, uns 3 m numa casa de 1,5 m (o pé-direito de uma casa). */
export const STORY_HEIGHT_STEPS = 4;

/** Altura máxima do terreno: 40 degraus = 20 unidades = 10 andares. Cabe num byte por casa. */
export const MAX_TERRAIN_HEIGHT = 40;

/** Degrau máximo da base de uma parede ou peça: 255 cabe num byte e dá uns 63 andares. */
export const MAX_LEVEL = 255;

/** Paredes: de meio metro de mundo (1 degrau) até 4 andares (16 degraus, ~12 m). */
export const MIN_WALL_HEIGHT_STEPS = 1;
export const MAX_WALL_HEIGHT_STEPS = 16;

/**
 * Lado máximo do retângulo de uma peça, em casas (RPG-26: carros 2×4, carroças, fontes e
 * árvores grandes). Também limita até onde, a oeste e ao norte, uma peça de outro pedaço
 * pode chegar a uma casa: a busca olha no máximo 7 casas para trás.
 */
export const MAX_FOOTPRINT = 8;

/** Giros em quartos de volta de 90°: 0, 1, 2 ou 3. */
export const QUARTER_TURNS = 4;

/** Escala da peça: os mesmos limites do objeto do v1. */
export const MIN_PIECE_SCALE = 0.25;
export const MAX_PIECE_SCALE = 4;

/** Tamanho do id da peça: o mesmo limite do objeto do v1. */
export const MAX_PIECE_ID_LENGTH = 40;

/**
 * Limites por pedaço, para um documento não crescer sem fim no banco. Peças: duas por casa
 * (mobília e enfeites de uma cidade densa). Paredes: as arestas de um pedaço são ~2.100, e
 * 4.096 deixa cerca de duas paredes empilhadas por aresta. No pior caso o JSON de um pedaço
 * fica abaixo de 1 MB.
 */
export const MAX_PIECES_PER_CHUNK = 2048;
export const MAX_WALLS_PER_CHUNK = 4096;

/** Com uma peça de chão diferente por casa, a paleta de um pedaço chega a CHUNK_CELLS entradas. */
export const MAX_PALETTE_ENTRIES = CHUNK_CELLS;

/** Chão do mapa novo: a mesma peça que o mapa novo do v1 usa. */
export const DEFAULT_FLOOR_TILE = 'piso-pedra';

/** Quantas mensagens de erro uma leitura devolve (o resto só atrapalha quem está lendo). */
export const MAX_REPORTED_ERRORS = 5;
