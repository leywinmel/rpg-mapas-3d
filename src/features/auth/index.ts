// Contas: sessão, login (e-mail, Google, convidado) e perfil. Importe daqui, não dos arquivos internos.
export { AccountMenu } from './components/AccountMenu';
export { AuthProvider } from './components/AuthProvider';
export { FormNotice, type NoticeTone } from './components/FormNotice';
export { useSession } from './hooks/useSession';
export { AUTH_PATHS } from './paths';
export { absoluteAppUrl, parseReturnPath, signInPath } from './return-path';
export { translateAuthError } from './services/auth-errors';
export { getAuthService, type AuthService } from './services/auth-service';
export type { Profile, Session, SessionStatus, SessionUser } from './types';
