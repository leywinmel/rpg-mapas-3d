import type { AppSupabaseClient } from '@/lib/supabase';

/** Id de quem está logado, ou null quando a sessão acabou (quem chama diz o que fazer). */
export async function currentUserId(client: AppSupabaseClient): Promise<string | null> {
  const { data } = await client.auth.getSession();
  return data.session?.user.id ?? null;
}
