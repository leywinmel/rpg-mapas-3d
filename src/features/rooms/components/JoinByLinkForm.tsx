import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button, TextField } from '@/components';
import { readForm } from '@/lib/form-data';
import { validateForm } from '@/lib/validation';
import { roomPath } from '../paths';
import { inviteFormSchema, parseInviteInput } from '../schemas';
import styles from './rooms.module.css';

/** "Entrar com link ou código": aceita o link inteiro ou só o código do fim dele. */
export function JoinByLinkForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateForm(inviteFormSchema, readForm(event.currentTarget));
    if (!result.ok) {
      setError(result.errors.invite);
      return;
    }
    const slug = parseInviteInput(result.data.invite);
    if (!slug) {
      setError('Não reconhecemos esse link. Copie de novo o convite do mestre.');
      return;
    }
    setError(undefined);
    navigate(roomPath(slug));
  }

  return (
    <form className={styles.inlineForm} onSubmit={handleSubmit} noValidate>
      <TextField
        className={styles.inlineField}
        label="Link ou código da mesa"
        name="invite"
        placeholder="https://…/sala/abc123 ou abc123"
        autoComplete="off"
        error={error}
      />
      <Button
        type="submit"
        variant="secondary"
        className={styles.inlineSubmit}
        icon={<ArrowRight size={16} />}
      >
        Entrar
      </Button>
    </form>
  );
}
