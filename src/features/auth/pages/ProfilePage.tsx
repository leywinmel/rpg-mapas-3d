import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Save } from 'lucide-react';
import { Avatar, Button, ButtonLink, LoadingState, notify, TextField } from '@/components';
import { validateForm } from '@/lib/validation';
import { AuthCard } from '../components/AuthCard';
import { FormNotice } from '../components/FormNotice';
import styles from '../components/auth.module.css';
import { useSessionStore } from '../hooks/session-store';
import { useSession } from '../hooks/useSession';
import { useSignOut } from '../hooks/useSignOut';
import { AUTH_PATHS } from '../paths';
import { signInPath } from '../return-path';
import { DISPLAY_NAME_MAX_LENGTH, profileSchema } from '../schemas';
import { getAuthService } from '../services/auth-service';
import { readForm } from '@/lib/form-data';
import { reportAuthFailure } from '../services/report-auth-failure';

/** /perfil — nome de exibição, avatar com iniciais e sair da conta. */
export default function ProfilePage() {
  const session = useSession();
  const { signOut, pending: signingOut } = useSignOut();
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (session.status === 'loading') return <LoadingState fill label="Carregando seu perfil…" />;
  if (!session.user) return <Navigate to={signInPath(AUTH_PATHS.profile)} replace />;

  const { user } = session;
  // Sem perfil (ainda carregando ou falhou), o formulário começa vazio e se refaz quando chegar.
  const displayName = session.profile?.displayName ?? '';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateForm(profileSchema, readForm(event.currentTarget));
    setFailure(null);
    if (!result.ok) {
      setFieldError(result.errors.displayName);
      return;
    }
    setFieldError(undefined);
    setSaving(true);
    try {
      const updated = await getAuthService().updateDisplayName(user.id, result.data.displayName);
      useSessionStore.getState().setProfile(updated);
      notify.success('Nome salvo.');
    } catch (error) {
      setFailure(reportAuthFailure(error, 'update-profile'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthCard title="Seu perfil">
      <div className={styles.profileHead}>
        <Avatar nickname={displayName || '?'} seed={user.id} size="lg" />
        <div>
          <p className={styles.profileName}>{displayName || 'Sem nome'}</p>
          <p className={styles.muted}>{session.isGuest ? 'Convidado (sem conta)' : user.email}</p>
        </div>
      </div>
      <form key={displayName} className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Nome de exibição"
          name="displayName"
          defaultValue={displayName}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          autoComplete="nickname"
          error={fieldError}
        />
        {failure && <FormNotice tone="error">{failure}</FormNotice>}
        <Button type="submit" loading={saving} icon={<Save size={16} />}>
          Salvar nome
        </Button>
      </form>
      {session.isGuest && (
        <FormNotice tone="info">
          Ao sair, o convidado não volta mais: as mesas em que você entrou como convidado ficam sem
          acesso.
        </FormNotice>
      )}
      <div className={styles.actions}>
        <ButtonLink to={AUTH_PATHS.home} variant="ghost" icon={<ArrowLeft size={16} />}>
          Voltar
        </ButtonLink>
        <Button
          variant="secondary"
          loading={signingOut}
          icon={<LogOut size={16} />}
          onClick={signOut}
        >
          Sair da conta
        </Button>
      </div>
    </AuthCard>
  );
}
