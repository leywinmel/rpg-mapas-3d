import { useState, type FormEvent } from 'react';
import { Mail } from 'lucide-react';
import { Button, Dialog, TextField } from '@/components';
import { validateForm } from '@/lib/validation';
import { forgotPasswordSchema } from '../schemas';
import { getAuthService } from '../services/auth-service';
import { readForm } from '@/lib/form-data';
import { reportAuthFailure } from '../services/report-auth-failure';
import { FormNotice } from './FormNotice';
import styles from './auth.module.css';

const FORM_ID = 'forgot-password-form';

export type ForgotPasswordDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Endereço completo da tela /redefinir-senha, para onde o link do e-mail leva. */
  redirectTo: string;
};

export function ForgotPasswordDialog({ open, onClose, redirectTo }: ForgotPasswordDialogProps) {
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  function handleClose() {
    setFieldError(undefined);
    setFailure(null);
    setSent(false);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateForm(forgotPasswordSchema, readForm(event.currentTarget));
    setFailure(null);
    if (!result.ok) {
      setFieldError(result.errors.email);
      return;
    }
    setFieldError(undefined);
    setPending(true);
    try {
      await getAuthService().sendPasswordReset(result.data.email, redirectTo);
      setSent(true);
    } catch (error) {
      setFailure(reportAuthFailure(error, 'password-reset-request'));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Recuperar a senha"
      description="Mandamos um link para você criar uma senha nova."
      footer={
        sent ? (
          <Button onClick={handleClose}>Fechar</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" form={FORM_ID} loading={pending} icon={<Mail size={16} />}>
              Enviar link
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <FormNotice tone="success">
          Se houver uma conta com esse e-mail, o link já está a caminho. Confira também a caixa de
          spam.
        </FormNotice>
      ) : (
        <form id={FORM_ID} className={styles.form} onSubmit={handleSubmit} noValidate>
          <TextField
            label="E-mail da conta"
            name="email"
            type="email"
            autoComplete="email"
            error={fieldError}
          />
          {failure && <FormNotice tone="error">{failure}</FormNotice>}
        </form>
      )}
    </Dialog>
  );
}
