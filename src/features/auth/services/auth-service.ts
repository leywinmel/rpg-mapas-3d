import type { User } from '@supabase/supabase-js';
import { z } from 'zod';
import { envResult } from '@/lib/env';
import { getSupabase, type AppSupabaseClient } from '@/lib/supabase';
import type { Credentials, Profile, SessionUser, SignUpInput } from '../types';

export type OAuthProvider = 'google';

export type AuthServiceConfig = {
  supabaseUrl: string;
  anonKey: string;
  /** Injetável para os testes não irem à rede. */
  fetchFn?: typeof fetch;
};

const authSettingsSchema = z.object({ external: z.record(z.string(), z.boolean()) });

const PROFILE_COLUMNS = 'id, display_name';

export function toSessionUser(user: User): SessionUser {
  return { id: user.id, email: user.email ?? null, isAnonymous: user.is_anonymous ?? false };
}

function toProfile(row: { id: string; display_name: string }): Profile {
  return { id: row.id, displayName: row.display_name };
}

/** Tudo o que a feature de contas pede ao Supabase, atrás de uma interface mockável [#20][#45]. */
export function createAuthService(client: AppSupabaseClient, config: AuthServiceConfig) {
  const fetchFn = config.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  return {
    /** Avisa a cada mudança de sessão (inclusive a inicial). Devolve a função de cancelar. */
    onSessionChange(listener: (user: SessionUser | null) => void): () => void {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        listener(session?.user ? toSessionUser(session.user) : null);
      });
      return () => data.subscription.unsubscribe();
    },

    async signIn({ email, password }: Credentials): Promise<void> {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },

    /** Devolve `needsConfirmation` quando o servidor pede confirmação por e-mail antes do login. */
    async signUp(
      input: SignUpInput & { redirectTo: string },
    ): Promise<{ needsConfirmation: boolean }> {
      const { data, error } = await client.auth.signUp({
        email: input.email,
        password: input.password,
        options: { data: { display_name: input.displayName }, emailRedirectTo: input.redirectTo },
      });
      if (error) throw error;
      // Com confirmação ligada, o Supabase não revela que o e-mail já existe: devolve
      // um usuário sem identidades. Tratamos igual ao erro de e-mail em uso.
      if (data.user && data.user.identities?.length === 0) {
        throw Object.assign(new Error('E-mail já cadastrado.'), { code: 'user_already_exists' });
      }
      return { needsConfirmation: data.session === null };
    },

    /** O Supabase local vem sem Google; perguntar antes evita mandar o usuário para uma página de erro. */
    async isProviderEnabled(provider: OAuthProvider): Promise<boolean> {
      const response = await fetchFn(`${config.supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: config.anonKey },
      });
      if (!response.ok)
        throw new Error(`Configurações do Auth indisponíveis (${response.status}).`);
      const settings = authSettingsSchema.parse(await response.json());
      return settings.external[provider] === true;
    },

    async signInWithOAuth(provider: OAuthProvider, redirectTo: string): Promise<void> {
      const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (error) throw error;
    },

    async sendPasswordReset(email: string, redirectTo: string): Promise<void> {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
    },

    async updatePassword(password: string): Promise<void> {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
    },

    /** Convidado: login anônimo; o apelido vira o nome do perfil (gatilho handle_new_user). */
    async signInAsGuest(displayName: string): Promise<SessionUser> {
      const { data, error } = await client.auth.signInAnonymously({
        options: { data: { display_name: displayName } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('O login de convidado não devolveu usuário.');
      return toSessionUser(data.user);
    },

    async signOut(): Promise<void> {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },

    async fetchProfile(userId: string): Promise<Profile | null> {
      const { data, error } = await client
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data ? toProfile(data) : null;
    },

    async updateDisplayName(userId: string, displayName: string): Promise<Profile> {
      const { data, error } = await client
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', userId)
        .select(PROFILE_COLUMNS)
        .single();
      if (error) throw error;
      return toProfile(data);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;

let defaultService: AuthService | null = null;

/** Instância do app, criada só quando alguém pede (os testes nunca chegam aqui). */
export function getAuthService(): AuthService {
  if (defaultService) return defaultService;
  if (!envResult.ok) throw new Error(`Configuração ausente: ${envResult.problems.join(' ')}`);
  defaultService = createAuthService(getSupabase(), {
    supabaseUrl: envResult.env.VITE_SUPABASE_URL,
    anonKey: envResult.env.VITE_SUPABASE_ANON_KEY,
  });
  return defaultService;
}
