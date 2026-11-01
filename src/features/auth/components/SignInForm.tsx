import { useState, type FormEvent } from 'react';
import { LogIn } from 'lucide-react';
import { Button, TextField } from '@/components';
import { validateForm, type FieldErrors } from '@/lib/validation';
import { signInSchema } from '../schemas';
import { getAuthService } from '../services/auth-service';
import { readForm } from '@/lib/form-data';
import { reportAuthFailure } from '../services/report-auth-failure';
import type { Credentials } from '../types';
import { FormNotice } from './FormNotice';
import styles from './auth.module.css';

/** Login com e-mail e senha. Quem navega depois é a página, ao ver a sessão nova. */
export function SignInForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const [errors, setErrors] = useState<FieldErrors<Credentials>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateForm(signInSchema, readForm(event.currentTarget));
    setFailure(null);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await getAuthService().signIn(result.data);
    } catch (error) {
      setFailure(reportAuthFailure(error, 'sign-in'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <TextField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        error={errors.email}
      />
      <TextField
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
        error={errors.password}
      />
      <button type="button" className={styles.linkButton} onClick={onForgotPassword}>
        Esqueci a senha
      </button>
      {failure && <FormNotice tone="error">{failure}</FormNotice>}
      <Button type="submit" block loading={pending} icon={<LogIn size={16} />}>
        Entrar
      </Button>
    </form>
  );
}
