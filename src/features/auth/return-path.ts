import { z } from 'zod';
import { AUTH_PATHS, RETURN_PARAM, TAB_PARAM } from './paths';
import type { AuthTab } from './types';

const MAX_RETURN_PATH_LENGTH = 300;

/**
 * Só caminhos internos: começam com "/" mas não com "//" nem "/\", que o navegador
 * entende como outro site. Impede que um link de convite leve para fora do app.
 */
const returnPathSchema = z
  .string()
  .max(MAX_RETURN_PATH_LENGTH)
  .regex(/^\/(?![/\\])/)
  .refine((path) => !/[\s\\]/.test(path) && !path.includes('://'));

/** Lê o `?voltar=`; qualquer coisa suspeita vira a tela inicial. */
export function parseReturnPath(raw: string | null | undefined): string {
  const result = returnPathSchema.safeParse(raw);
  return result.success ? result.data : AUTH_PATHS.home;
}

/** Endereço da tela de entrar que volta para `returnTo` depois do login. */
export function signInPath(returnTo?: string, tab?: AuthTab): string {
  const params = new URLSearchParams();
  if (returnTo && returnTo !== AUTH_PATHS.home) params.set(RETURN_PARAM, parseReturnPath(returnTo));
  if (tab) params.set(TAB_PARAM, tab);
  const query = params.toString();
  return query ? `${AUTH_PATHS.signIn}?${query}` : AUTH_PATHS.signIn;
}

/** Endereço completo (com domínio) de uma tela do app, para links que saem por e-mail ou OAuth. */
export function absoluteAppUrl(path: string): string {
  return new URL(path, window.location.origin).toString();
}
