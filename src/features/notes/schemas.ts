import { z } from 'zod';
import {
  NOTE_BODY_MAX_LENGTH,
  NOTE_IMAGE_MAX_BYTES,
  NOTE_IMAGE_MAX_MEGABYTES,
  NOTE_TITLE_MAX_LENGTH,
} from './constants';
import { isNoteImageType } from './note-image';

/** O Postgres confere char_length (caracteres), não unidades UTF-16: um emoji conta como 1. */
export function countCharacters(text: string): number {
  return Array.from(text).length;
}

function maxCharacters(limit: number) {
  return (value: string) => countCharacters(value) <= limit;
}

const titleSchema = z
  .string()
  .trim()
  .min(1, 'Dê um título para a anotação.')
  .refine(
    maxCharacters(NOTE_TITLE_MAX_LENGTH),
    `Use no máximo ${NOTE_TITLE_MAX_LENGTH} caracteres.`,
  );

/** O texto é opcional: uma anotação pode ser só o título e a imagem. */
const bodySchema = z
  .string()
  .trim()
  .refine(
    maxCharacters(NOTE_BODY_MAX_LENGTH),
    `O texto passa de ${NOTE_BODY_MAX_LENGTH} caracteres.`,
  );

const imageSchema = z
  .custom<File>((value) => value instanceof Blob, 'Escolha um arquivo de imagem.')
  .refine((file) => isNoteImageType(file.type), 'Use uma imagem PNG, JPEG ou WebP.')
  .refine((file) => file.size > 0, 'O arquivo está vazio.')
  .refine(
    (file) => file.size <= NOTE_IMAGE_MAX_BYTES,
    `A imagem passa de ${NOTE_IMAGE_MAX_MEGABYTES} MB.`,
  );

const recipientsSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('all') }),
  z.object({
    mode: z.literal('chosen'),
    userIds: z.array(z.uuid()).min(1, 'Escolha ao menos um jogador.'),
  }),
]);

/** Tudo o que o mestre preenche numa anotação nova, validado antes de gravar. */
export const noteDraftSchema = z.object({
  title: titleSchema,
  body: bodySchema,
  image: imageSchema.nullable(),
  recipients: recipientsSchema,
});

/** Editar mexe só no título e no texto; destinatários e imagem ficam como foram enviados. */
export const noteEditSchema = z.object({ title: titleSchema, body: bodySchema });

/** Confere uma imagem recém-escolhida; devolve a frase de erro ou nulo se estiver tudo certo. */
export function checkNoteImage(file: File): string | null {
  const result = imageSchema.safeParse(file);
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}
