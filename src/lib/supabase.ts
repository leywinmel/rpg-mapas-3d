import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { envResult } from './env';

export type AppSupabaseClient = SupabaseClient<Database>;

let client: AppSupabaseClient | null = null;

/** Cliente único do Supabase. Lança erro claro se o .env não estiver configurado. */
export function getSupabase(): AppSupabaseClient {
  if (client) return client;
  if (!envResult.ok) {
    throw new Error(`Configuração ausente: ${envResult.problems.join(' ')}`);
  }
  client = createClient<Database>(envResult.env.VITE_SUPABASE_URL, envResult.env.VITE_SUPABASE_ANON_KEY);
  return client;
}
