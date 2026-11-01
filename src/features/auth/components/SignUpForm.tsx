import { useState, type FormEvent } from 'react';
import { UserPlus } from 'lucide-react';
import { Button, TextField } from '@/components';
import { validateForm, type FieldErrors } from '@/lib/validation';
import { DISPLAY_NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH, signUpSchema } from '../schemas';
import { getAuthService } from '../services/auth-service';
import { readForm } from '@/lib/form-data';
import { reportAuthFailure } from '../services/report-auth-failure';
import type { SignUpInput } from '../types';
import { FormNotice } from './FormNotice';
import styles from './auth.module.css';

/** Cadastro com e-mail, senha e nome de exibição. `redirectTo` é o link do e-mail de confirmação. */
export function SignUpForm({ redirectTo }: { redirectTo: string }) {
  const [errors, setErrors] = useState<FieldErrors<SignUpInput>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateForm(signUpSchema, readForm(event.currentTarget));
    setFailure(null);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const { needsConfirmation } = await getAuthService().signUp({ ...result.data, redirectTo });
      setCheckEmail(needsConfirmation);
    } catch (error) {
      setFailure(reportAuthFailure(error, 'sign-up'));
    } finally {
      setPending(false);
    }
  }

  if (checkEmail) {
    return (
      <FormNotice tone="success">
        Conta criada! Enviamos um link de confirmação para o seu e-mail. Abra o link para entrar.
      </FormNotice>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <TextField
        label="Nome de exibição"
        name="displayName"
        autoComplete="nickname"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        hint="É como a mesa vai te chamar. Dá para mudar depois."
        error={errors.displayName}
      />
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
        autoComplete="new-password"
        hint={`Pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`}
        error={errors.password}
      />
      {failure && <FormNotice tone="error">{failure}</FormNotice>}
      <Button type="submit" block loading={pending} icon={<UserPlus size={16} />}>
        Criar conta
      </Button>
    </form>
  );
}
