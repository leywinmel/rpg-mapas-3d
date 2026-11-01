import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Link2Off } from 'lucide-react';
import { Button, ButtonLink, EmptyState, LoadingState, notify, TextField } from '@/components';
import { validateForm, type FieldErrors } from '@/lib/validation';
import { AuthCard } from '../components/AuthCard';
import { FormNotice } from '../components/FormNotice';
import styles from '../components/auth.module.css';
import { useSession } from '../hooks/useSession';
import { AUTH_PATHS } from '../paths';
import { newPasswordSchema, PASSWORD_MIN_LENGTH } from '../schemas';
import { getAuthService } from '../services/auth-service';
import { readForm } from '@/lib/form-data';
import { reportAuthFailure } from '../services/report-auth-failure';

type NewPasswordForm = { password: string; confirmation: string };

/**
 * /redefinir-senha — o link do e-mail abre esta tela já com uma sessão de recuperação
 * (o Supabase lê o token do endereço). Sem sessão, o link expirou ou já foi usado.
 */
export default function ResetPasswordPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<FieldErrors<NewPasswordForm>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (session.status === 'loading') return <LoadingState fill label="Conferindo o link…" />;

  if (session.status === 'signed-out' || session.isGuest) {
    return (
      <AuthCard title="Redefinir a senha">
        <EmptyState
          icon={<Link2Off size={22} />}
          title="Link inválido ou expirado"
          description="Peça um novo link em “Esqueci a senha”, na tela de entrar."
          action={<ButtonLink to={AUTH_PATHS.signIn}>Ir para Entrar</ButtonLink>}
        />
      </AuthCard>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateForm(newPasswordSchema, readForm(event.currentTarget));
    setFailure(null);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await getAuthService().updatePassword(result.data.password);
      notify.success('Senha nova salva.', 'Use-a da próxima vez que entrar.');
      navigate(AUTH_PATHS.home, { replace: true });
    } catch (error) {
      setFailure(reportAuthFailure(error, 'password-update'));
      setPending(false);
    }
  }

  return (
    <AuthCard title="Escolha uma senha nova">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Nova senha"
          name="password"
          type="password"
          autoComplete="new-password"
          hint={`Pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`}
          error={errors.password}
        />
        <TextField
          label="Repita a nova senha"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          error={errors.confirmation}
        />
        {failure && <FormNotice tone="error">{failure}</FormNotice>}
        <Button type="submit" block loading={pending} icon={<KeyRound size={16} />}>
          Salvar senha
        </Button>
      </form>
    </AuthCard>
  );
}
