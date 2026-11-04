/**
 * Baixar um arquivo gerado no navegador e dar nome a ele. Fica atrás deste módulo para os
 * componentes não mexerem direto no DOM e os testes trocarem por um falso [#20][#45].
 */
import { FALLBACK_FILE_NAME, MAX_FILE_NAME_LENGTH } from '../constants';

/** Some com a URL temporária depois que o navegador começou o download. */
const REVOKE_DELAY_MS = 1000;

export type Downloader = (blob: Blob, fileName: string) => void;

export const downloadBlob: Downloader = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
};

/**
 * Nome de arquivo a partir do nome do mapa: sem acento nem símbolo (todo sistema aceita),
 * minúsculo e com hífen no lugar dos espaços.
 */
export function fileNameFor(mapName: string | undefined, extension: string): string {
  const base = (mapName ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_FILE_NAME_LENGTH);
  return `${base || FALLBACK_FILE_NAME}${extension}`;
}

const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE;

/** "820 KB", "12,4 MB": o tamanho como a tela mostra. */
export function formatBytes(bytes: number): string {
  if (bytes < BYTES_PER_MEGABYTE) {
    return `${Math.max(1, Math.round(bytes / BYTES_PER_KILOBYTE))} KB`;
  }
  return `${(bytes / BYTES_PER_MEGABYTE).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

const MS_PER_SECOND = 1000;

/** "0,8 s", "12 s". */
export function formatSeconds(ms: number): string {
  const seconds = ms / MS_PER_SECOND;
  return `${seconds.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`;
}
