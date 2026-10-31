import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { envResult } from './env';

let client: SupabaseClient | null = null;

/** Cliente único do Supabase. Lança erro claro se o .env não estiver configurado. */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  if (!envResult.ok) {
    throw new Error(`Configuração ausente: ${envResult.problems.join(' ')}`);
  }
  client = createClient(envResult.env.VITE_SUPABASE_URL, envResult.env.VITE_SUPABASE_ANON_KEY);
  return client;
}
