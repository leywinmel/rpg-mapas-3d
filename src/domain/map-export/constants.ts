/**
 * Limites do arquivo próprio do mapa (.rpgmap.json). Ficam juntos para o schema, a leitura e a
 * importação partirem dos mesmos números [#3].
 */
import { EXPORT_FORMAT } from '../map-document';

/** O mesmo nome de formato do v1: um arquivo antigo continua sendo "um mapa do rpgmaps". */
export const MAP_FILE_FORMAT = EXPORT_FORMAT;

/** Versão do envelope. O v1 não tinha o campo: é assim que a leitura distingue os dois. */
export const MAP_FILE_VERSION = 2;

/** Extensão sugerida ao baixar. */
export const MAP_FILE_EXTENSION = '.rpgmap.json';

const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * Teto do arquivo importado. Uma cidade de 1000×1000 bem cheia fica na casa dos 20–40 MB; o
 * teto deixa folga sem deixar o navegador engasgar lendo um arquivo absurdo.
 */
export const MAX_MAP_FILE_MEGABYTES = 100;
export const MAX_MAP_FILE_BYTES = MAX_MAP_FILE_MEGABYTES * BYTES_PER_MEGABYTE;

/** Tokens no arquivo: bem acima de qualquer mesa real, só para o arquivo não crescer sem fim. */
export const MAX_FILE_TOKENS = 2000;

/** Nome do mapa: o mesmo limite de maps.name. */
export const MAX_MAP_NAME_LENGTH = 80;
