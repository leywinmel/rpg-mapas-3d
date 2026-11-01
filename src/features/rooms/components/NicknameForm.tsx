import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, TextField } from '@/components';
import { FormNotice } from '@/features/auth';
import { readForm } from '@/lib/form-data';
import { validateForm } from '@/lib/validation';
import type { JoinResult } from '../hooks/useRoomEntry';
import { NICKNAME_MAX_LENGTH, nicknameFormSchema } from '../schemas';
import styles from './rooms.module.css';

export type NicknameFormProps = {
  submitLabel: string;
  onSubmit: (nickname: string) => Promise<JoinResult>;
  defaultValue?: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary';
};

/** Apelido que a pessoa usa nesta mesa (1 a 40 caracteres). */
export function NicknameForm({
  submitLabel,
  onSubmit,
  defaultValue,
  icon,
  variant,
}: NicknameFormProps) {
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateForm(nicknameFormSchema, readForm(event.currentTarget));
    setFailure(null);
    if (!result.ok) {
      setFieldError(result.errors.nickname);
      return;
    }
    setFieldError(undefined);
    setPending(true);
    const outcome = await onSubmit(result.data.nickname);
    setPending(false);
    if (!outcome.ok) setFailure(outcome.message);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <TextField
        label="Seu apelido na mesa"
        name="nickname"
        defaultValue={defaultValue}
        maxLength={NICKNAME_MAX_LENGTH}
        autoComplete="nickname"
        hint="É o nome que os outros vão ver ao lado do seu avatar."
        error={fieldError}
      />
      {failure && <FormNotice tone="error">{failure}</FormNotice>}
      <Button type="submit" block loading={pending} icon={icon} variant={variant}>
        {submitLabel}
      </Button>
    </form>
  );
}
