/**
 * Limites das anotações. Os valores são os mesmos da tabela `notes` e do bucket
 * `note-images` (ver supabase/migrations): mudar um lado pede mudar o outro.
 */
export const NOTE_TITLE_MAX_LENGTH = 120;
export const NOTE_BODY_MAX_LENGTH = 5000;

const BYTES_PER_MEGABYTE = 1024 * 1024;
export const NOTE_IMAGE_MAX_MEGABYTES = 5;
export const NOTE_IMAGE_MAX_BYTES = NOTE_IMAGE_MAX_MEGABYTES * BYTES_PER_MEGABYTE;

export const NOTE_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type NoteImageType = (typeof NOTE_IMAGE_MIME_TYPES)[number];

/** O arquivo guardado leva a extensão do tipo, nunca a do nome que a pessoa deu. */
export const NOTE_IMAGE_EXTENSIONS: Readonly<Record<NoteImageType, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export const NOTE_IMAGES_BUCKET = 'note-images';

/** Quantas anotações vêm de uma vez; "Ver mais antigas" soma outra página. */
export const NOTES_PAGE_SIZE = 20;

/** Sinais em sequência (banco + aviso do mestre) viram uma recarga só dentro deste intervalo. */
export const NOTES_RELOAD_DELAY_MS = 300;

/** URL assinada da imagem: vale por uma hora e é reaproveitada até faltar a margem. */
export const NOTE_IMAGE_URL_TTL_SECONDS = 60 * 60;
export const NOTE_IMAGE_URL_REUSE_MARGIN_SECONDS = 60;
export const MS_PER_SECOND = 1000;

/** Aviso que o mestre manda depois de enviar, editar ou apagar (o Realtime não filtra DELETE por mesa). */
export const NOTES_ANNOUNCEMENT = 'notes-changed';

/** Chave da "última vista" no localStorage: uma por pessoa e por mesa. */
export const LAST_SEEN_STORAGE_PREFIX = 'rpgmaps:notes-last-seen';
