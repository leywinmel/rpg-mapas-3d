import { NOTE_IMAGE_EXTENSIONS, NOTE_IMAGE_MIME_TYPES, type NoteImageType } from './constants';

export function isNoteImageType(type: string): type is NoteImageType {
  return (NOTE_IMAGE_MIME_TYPES as readonly string[]).includes(type);
}

/** Extensão do arquivo guardado, escolhida pelo tipo; nulo se o tipo não é aceito. */
export function noteImageExtension(type: string): string | null {
  return isNoteImageType(type) ? NOTE_IMAGE_EXTENSIONS[type] : null;
}

const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * 1024;
const sizeFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** "320 KB", "4,7 MB": o tamanho do arquivo escolhido, para a pessoa conferir antes de enviar. */
export function formatFileSize(bytes: number): string {
  if (bytes >= BYTES_PER_MEGABYTE) return `${sizeFormat.format(bytes / BYTES_PER_MEGABYTE)} MB`;
  if (bytes >= BYTES_PER_KILOBYTE) return `${sizeFormat.format(bytes / BYTES_PER_KILOBYTE)} KB`;
  return `${bytes} B`;
}
