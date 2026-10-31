import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.url({ message: 'VITE_SUPABASE_URL precisa ser um endereço válido.' }),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(1, { message: 'VITE_SUPABASE_ANON_KEY está vazia. Rode `npm run db:status`.' }),
});

export type AppEnv = z.infer<typeof envSchema>;

export type EnvResult = { ok: true; env: AppEnv } | { ok: false; problems: string[] };

/** Valida as variáveis de ambiente uma vez, sem derrubar o app: a tela mostra o que falta. */
export function parseEnv(source: Record<string, unknown>): EnvResult {
  const result = envSchema.safeParse(source);
  if (result.success) return { ok: true, env: result.data };
  return { ok: false, problems: result.error.issues.map((issue) => issue.message) };
}

export const envResult = parseEnv(import.meta.env);
