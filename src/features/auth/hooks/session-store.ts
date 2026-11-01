import { create } from 'zustand';
import { reportError } from '@/lib/report-error';
import type { AuthService } from '../services/auth-service';
import type { Profile, SessionStatus, SessionUser } from '../types';

type SessionStore = {
  status: SessionStatus;
  user: SessionUser | null;
  profile: Profile | null;
  setUser: (user: SessionUser | null) => void;
  setProfile: (profile: Profile | null) => void;
};

export const useSessionStore = create<SessionStore>((set) => ({
  status: 'loading',
  user: null,
  profile: null,
  setUser: (user) =>
    set((state) => ({
      status: user ? 'signed-in' : 'signed-out',
      user,
      // Troca de usuário (sair, entrar com outra conta) não pode mostrar o perfil anterior.
      profile: user && state.profile?.id === user.id ? state.profile : null,
    })),
  setProfile: (profile) => set({ profile }),
}));

async function loadProfile(service: AuthService, userId: string): Promise<void> {
  try {
    const profile = await service.fetchProfile(userId);
    // Se a pessoa saiu enquanto carregava, o perfil antigo não volta para a tela.
    if (useSessionStore.getState().user?.id !== userId) return;
    useSessionStore.getState().setProfile(profile);
  } catch (error) {
    reportError(error, {
      userMessage: 'Não conseguimos carregar seu perfil.',
      hint: 'Recarregue a página em instantes.',
      context: { feature: 'auth', action: 'load-profile' },
      severity: 'warn',
    });
  }
}

/** Liga o store às mudanças de sessão do Supabase. Devolve a função que desliga. */
export function startSessionSync(service: AuthService): () => void {
  return service.onSessionChange((user) => {
    const previousId = useSessionStore.getState().user?.id;
    useSessionStore.getState().setUser(user);
    if (!user || user.id === previousId) return;
    // O Supabase pede para não chamar o cliente dentro do aviso de sessão (trava a fila
    // interna dele); por isso a busca do perfil sai para a próxima volta do loop.
    setTimeout(() => void loadProfile(service, user.id), 0);
  });
}
