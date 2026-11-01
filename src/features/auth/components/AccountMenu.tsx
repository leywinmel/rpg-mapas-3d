import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Avatar, IconButton } from '@/components';
import { useSession } from '../hooks/useSession';
import { useSignOut } from '../hooks/useSignOut';
import { AUTH_PATHS } from '../paths';
import styles from './auth.module.css';

/** Avatar e nome de quem está logado (leva ao perfil) e o botão de sair. */
export function AccountMenu() {
  const { user, profile, isGuest } = useSession();
  const { signOut, pending } = useSignOut();
  if (!user) return null;
  const name = profile?.displayName ?? (isGuest ? 'Convidado' : 'Minha conta');
  return (
    <div className={styles.account}>
      <Link to={AUTH_PATHS.profile} className={styles.accountLink} title="Abrir meu perfil">
        <Avatar nickname={name} seed={user.id} size="sm" />
        <span>{name}</span>
      </Link>
      <IconButton
        label="Sair da conta"
        icon={<LogOut size={18} />}
        onClick={signOut}
        disabled={pending}
      />
    </div>
  );
}
