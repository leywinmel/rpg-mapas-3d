export type SessionStatus = 'loading' | 'signed-out' | 'signed-in';

/** O que o app guarda do usuário logado. A senha nunca passa por aqui [#54]. */
export type SessionUser = {
  id: string;
  /** Mostrado só na tela de perfil; nunca vai para log [#63]. */
  email: string | null;
  /** Convidado: login anônimo, sem e-mail nem senha. */
  isAnonymous: boolean;
};

export type Profile = {
  id: string;
  displayName: string;
};

export type Session = {
  status: SessionStatus;
  user: SessionUser | null;
  profile: Profile | null;
  isGuest: boolean;
};

export const AUTH_TABS = ['entrar', 'criar'] as const;
export type AuthTab = (typeof AUTH_TABS)[number];

export type Credentials = { email: string; password: string };
export type SignUpInput = Credentials & { displayName: string };
