import { useEffect, type ReactNode } from 'react';
import { reportError } from '@/lib/report-error';
import { useSessionStore, startSessionSync } from '../hooks/session-store';
import { getAuthService } from '../services/auth-service';

/** Mantém a sessão do Supabase em dia no store enquanto o app estiver aberto. */
export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      return startSessionSync(getAuthService());
    } catch (error) {
      // Sem .env válido não há login; a tela inicial já explica o que falta.
      reportError(error, {
        userMessage: 'Não deu para conectar ao servidor de contas.',
        context: { feature: 'auth', action: 'start-session' },
        toast: false,
      });
      useSessionStore.getState().setUser(null);
      return undefined;
    }
  }, []);

  return children;
}
