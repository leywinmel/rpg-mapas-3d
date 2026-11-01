import { useShallow } from 'zustand/react/shallow';
import type { Session } from '../types';
import { useSessionStore } from './session-store';

/** Sessão atual: carregando, sem login ou logado (com conta ou como convidado). */
export function useSession(): Session {
  const { status, user, profile } = useSessionStore(
    useShallow((state) => ({ status: state.status, user: state.user, profile: state.profile })),
  );
  return { status, user, profile, isGuest: user?.isAnonymous ?? false };
}
