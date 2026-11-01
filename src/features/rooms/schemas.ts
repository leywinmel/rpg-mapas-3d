import { z } from 'zod';
import { ROOM_PATH_PREFIX } from './paths';
import { MEMBER_ROLES } from './types';

/** Mesmos limites das colunas rooms.name e room_members.nickname. */
export const ROOM_NAME_MAX_LENGTH = 80;
export const NICKNAME_MAX_LENGTH = 40;
const SLUG_MAX_LENGTH = 64;

/** O banco gera 10 letras/números; a mesa de demonstração usa "demo". */
export const roomSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(new RegExp(`^[a-z0-9-]{1,${SLUG_MAX_LENGTH}}$`));

export const nicknameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Escolha um apelido.' })
  .max(NICKNAME_MAX_LENGTH, { message: `Use no máximo ${NICKNAME_MAX_LENGTH} caracteres.` });

export const roomNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Dê um nome para a mesa.' })
  .max(ROOM_NAME_MAX_LENGTH, { message: `Use no máximo ${ROOM_NAME_MAX_LENGTH} caracteres.` });

export const createRoomSchema = z.object({ name: roomNameSchema, nickname: nicknameSchema });
export const renameRoomSchema = z.object({ name: roomNameSchema });
export const nicknameFormSchema = z.object({ nickname: nicknameSchema });
export const inviteFormSchema = z.object({
  invite: z.string().trim().min(1, { message: 'Cole o link ou o código da mesa.' }),
});

export const memberRoleSchema = z.enum(MEMBER_ROLES);

/** Código vindo da URL (/sala/:slug); inválido vira nulo ("Mesa não encontrada"). */
export function parseRoomSlug(raw: string | undefined): string | null {
  const result = roomSlugSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/**
 * Aceita o link inteiro (de qualquer endereço do app) ou só o código. Devolve o
 * código ou nulo se não der para reconhecer.
 */
export function parseInviteInput(raw: string): string | null {
  const text = raw.trim();
  const markerAt = text.indexOf(ROOM_PATH_PREFIX);
  const candidate = markerAt === -1 ? text : text.slice(markerAt + ROOM_PATH_PREFIX.length);
  const slug = candidate.split(/[/?#]/)[0] ?? '';
  return parseRoomSlug(safeDecode(slug));
}

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
