import { z } from 'zod';
import { AUTH_TABS } from './types';

/** Mesmo mínimo do `minimum_password_length` do Supabase (supabase/config.toml). */
export const PASSWORD_MIN_LENGTH = 6;
/** O bcrypt ignora o que passa de 72 bytes; melhor avisar do que cortar calado. */
export const PASSWORD_MAX_LENGTH = 72;
/** Mesmo limite da coluna profiles.display_name. */
export const DISPLAY_NAME_MAX_LENGTH = 40;

export const emailSchema = z
  .string()
  .trim()
  .min(1, { message: 'Informe seu e-mail.' })
  .pipe(z.email({ message: 'Esse e-mail não parece válido.' }));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, {
    message: `A senha precisa de pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  })
  .max(PASSWORD_MAX_LENGTH, {
    message: `A senha pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`,
  });

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Escolha um nome de exibição.' })
  .max(DISPLAY_NAME_MAX_LENGTH, {
    message: `Use no máximo ${DISPLAY_NAME_MAX_LENGTH} caracteres.`,
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'Informe sua senha.' }),
});

export const signUpSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirmation: z.string() })
  .refine((form) => form.password === form.confirmation, {
    message: 'As senhas não são iguais.',
    path: ['confirmation'],
  });

export const profileSchema = z.object({ displayName: displayNameSchema });

const authTabSchema = z.enum(AUTH_TABS);

/** Aba pedida pelo `?aba=`; valor desconhecido abre "Entrar". */
export function parseAuthTab(raw: string | null): (typeof AUTH_TABS)[number] {
  const result = authTabSchema.safeParse(raw);
  return result.success ? result.data : 'entrar';
}
