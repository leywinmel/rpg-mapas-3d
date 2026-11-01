import type { z } from 'zod';

/** Erros de formulário por campo: só a primeira mensagem de cada um, como a tela mostra. */
export type FieldErrors<T> = Partial<Record<keyof T & string, string>>;

export type FormResult<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors<T> };

/** Valida um formulário com zod e devolve dados limpos ou as mensagens por campo. */
export function validateForm<S extends z.ZodType>(
  schema: S,
  input: unknown,
): FormResult<z.output<S>> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? '');
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors: errors as FieldErrors<z.output<S>> };
}
