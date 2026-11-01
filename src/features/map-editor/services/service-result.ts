/**
 * O Supabase devolve o erro no retorno em vez de lançar. Estes ajudantes viram
 * o erro em exceção (com mensagem legível no log), para cada chamada não
 * precisar repetir o mesmo `if (error)`.
 */
import { z } from 'zod';

const errorLike = z.object({ message: z.string(), code: z.string().optional() });

export function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  const parsed = errorLike.safeParse(error);
  if (!parsed.success) return new Error(String(error));
  const { code, message } = parsed.data;
  return new Error(code ? `${code}: ${message}` : message);
}

export function check(result: { error: unknown }): void {
  if (result.error) throw toError(result.error);
}

/** Aceita a resposta do Supabase (união "dados ou erro") e devolve só os dados. */
export function unwrap<R extends { data: unknown; error: unknown }>(
  result: R,
): NonNullable<R['data']> {
  check(result);
  const { data } = result;
  if (data === null || data === undefined) throw new Error('O servidor respondeu sem dados.');
  return data as NonNullable<R['data']>;
}
