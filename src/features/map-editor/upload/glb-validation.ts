/**
 * Conferência do .glb no navegador, antes de gastar banda enviando. O bucket
 * também limita tamanho e tipo; aqui é para o mestre receber uma mensagem clara
 * na hora, e não um erro genérico do servidor.
 */
import { z } from 'zod';

/** Mesmo limite do bucket map-models e da coluna map_assets.size_bytes (10 MB). */
export const MAX_GLB_BYTES = 10 * 1024 * 1024;
export const GLB_EXTENSION = '.glb';
/** Todo glTF binário começa com os bytes ASCII "glTF" (especificação glTF 2.0, cabeçalho). */
export const GLB_MAGIC = [0x67, 0x6c, 0x54, 0x46] as const;
export const MAX_ASSET_NAME_LENGTH = 80;
const FALLBACK_ASSET_NAME = 'Modelo';

export type GlbCheck = { ok: true } | { ok: false; message: string };

export type FileMeta = { name: string; size: number };

export function hasGlbSignature(header: Uint8Array): boolean {
  return GLB_MAGIC.every((byte, index) => header[index] === byte);
}

/** Regras na ordem em que o mestre consegue corrigir: tipo, vazio, tamanho, conteúdo. */
export function validateGlb(meta: FileMeta, header: Uint8Array): GlbCheck {
  if (!meta.name.toLowerCase().endsWith(GLB_EXTENSION)) {
    return { ok: false, message: 'Escolha um arquivo .glb (modelo 3D binário).' };
  }
  if (meta.size === 0) return { ok: false, message: 'O arquivo está vazio.' };
  if (meta.size > MAX_GLB_BYTES) {
    return { ok: false, message: 'O modelo passa de 10 MB. Reduza o arquivo e tente de novo.' };
  }
  if (!hasGlbSignature(header)) {
    return {
      ok: false,
      message: 'Este arquivo não é um .glb válido (o conteúdo não é de um modelo glTF).',
    };
  }
  return { ok: true };
}

/** Lê só os 4 primeiros bytes: não carrega 10 MB na memória para conferir a assinatura. */
export async function checkGlbFile(file: Blob & { name: string }): Promise<GlbCheck> {
  const header = new Uint8Array(await file.slice(0, GLB_MAGIC.length).arrayBuffer());
  return validateGlb({ name: file.name, size: file.size }, header);
}

const assetNameSchema = z.string().trim().min(1).max(MAX_ASSET_NAME_LENGTH);

/** Nome amigável do modelo a partir do arquivo ("Altar_Velho.glb" → "Altar Velho"). */
export function assetNameFromFile(fileName: string): string {
  const base = fileName
    .replace(/\.glb$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_ASSET_NAME_LENGTH);
  const parsed = assetNameSchema.safeParse(base);
  return parsed.success ? parsed.data : FALLBACK_ASSET_NAME;
}
