import { z } from 'zod';
import {
  MAX_TOKEN_HP,
  MAX_TOKEN_NAME_LENGTH,
  MAX_TOKEN_NOTES_LENGTH,
  MAX_TOKEN_SIZE,
  MIN_TOKEN_SIZE,
} from '@/domain';
import { MAX_LEVEL, MAX_MAP_SIZE_V2 } from '@/domain/map-v2';
import {
  TOKEN_IMAGE_MAX_BYTES,
  TOKEN_IMAGE_MAX_MEGABYTES,
  TOKEN_IMAGE_MIME_TYPES,
  TOKEN_KINDS,
  TOKEN_MODEL_KEYS,
} from './constants';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const cellCoordinate = z
  .number()
  .int()
  .min(0)
  .max(MAX_MAP_SIZE_V2 - 1);

/** Linha da tabela tokens: confere o que chega do banco antes de virar Token [#51]. */
export const tokenRowSchema = z.object({
  id: z.uuid(),
  map_id: z.uuid(),
  owner_id: z.uuid().nullable(),
  kind: z.enum(TOKEN_KINDS),
  name: z.string(),
  image_path: z.string().nullable(),
  model_key: z.enum(TOKEN_MODEL_KEYS).nullable(),
  color_primary: z.string().regex(HEX_COLOR).nullable(),
  color_secondary: z.string().regex(HEX_COLOR).nullable(),
  x: cellCoordinate,
  z: cellCoordinate,
  size: z.number().int().min(MIN_TOKEN_SIZE).max(MAX_TOKEN_SIZE),
  level: z.number().int().min(0).max(MAX_LEVEL),
  hp_current: z.number().int().nullable(),
  hp_max: z.number().int().nullable(),
  notes: z.string(),
  hidden: z.boolean(),
});
export type TokenRow = z.infer<typeof tokenRowSchema>;

export const tokenNameSchema = z
  .string()
  .trim()
  .min(1, 'Dê um nome ao token.')
  .max(MAX_TOKEN_NAME_LENGTH, `O nome passa de ${MAX_TOKEN_NAME_LENGTH} caracteres.`);

export const tokenNotesSchema = z
  .string()
  .max(MAX_TOKEN_NOTES_LENGTH, `As notas passam de ${MAX_TOKEN_NOTES_LENGTH} caracteres.`);

const hpMessage = `A vida precisa ser um número inteiro de 0 a ${MAX_TOKEN_HP}.`;
export const tokenHpSchema = z
  .number({ error: hpMessage })
  .int(hpMessage)
  .min(0, hpMessage)
  .max(MAX_TOKEN_HP, hpMessage);

export const tokenSizeSchema = z.number().int().min(MIN_TOKEN_SIZE).max(MAX_TOKEN_SIZE);
export const tokenColorSchema = z.string().regex(HEX_COLOR, 'Escolha uma cor válida.');

/** Campos de texto e número do formulário de token (a imagem é conferida à parte). */
export const tokenFormSchema = z.object({
  name: tokenNameSchema,
  size: tokenSizeSchema,
  hpMax: tokenHpSchema.nullable(),
  ownerId: z.uuid().nullable(),
  hidden: z.boolean(),
});

/** Arraste ao vivo. Vem de qualquer membro da mesa, então é conferido ao chegar. */
export const dragMessageSchema = z.object({
  tokenId: z.uuid(),
  x: cellCoordinate,
  z: cellCoordinate,
});
export type DragMessage = z.infer<typeof dragMessageSchema>;

export const tokenIdMessageSchema = z.object({ tokenId: z.uuid() });

/** Frase do problema da imagem escolhida, ou null quando ela serve. */
export function checkTokenImage(file: Pick<File, 'type' | 'size'>): string | null {
  if (!(TOKEN_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'Use uma imagem PNG, JPEG ou WebP.';
  }
  if (file.size > TOKEN_IMAGE_MAX_BYTES) {
    return `A imagem passa de ${TOKEN_IMAGE_MAX_MEGABYTES} MB. Escolha uma menor.`;
  }
  return null;
}
