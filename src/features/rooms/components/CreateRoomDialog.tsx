import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button, Dialog, TextField } from '@/components';
import { FormNotice } from '@/features/auth';
import { readForm } from '@/lib/form-data';
import { validateForm, type FieldErrors } from '@/lib/validation';
import { roomPath } from '../paths';
import { createRoomSchema, NICKNAME_MAX_LENGTH, ROOM_NAME_MAX_LENGTH } from '../schemas';
import { reportRoomFailure } from '../services/report-room-failure';
import { getRoomsService } from '../services/rooms-service';
import styles from './rooms.module.css';

const FORM_ID = 'create-room-form';

type CreateRoomForm = { name: string; nickname: string };

export type CreateRoomDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Sugestão de apelido: o nome de exibição da conta. */
  defaultNickname?: string;
};

export function CreateRoomDialog({ open, onClose, defaultNickname }: CreateRoomDialogProps) {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<FieldErrors<CreateRoomForm>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleClose() {
    setErrors({});
    setFailure(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateForm(createRoomSchema, readForm(event.currentTarget));
    setFailure(null);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const room = await getRoomsService().createRoom(result.data);
      navigate(roomPath(room.slug));
    } catch (error) {
      setFailure(reportRoomFailure(error, { action: 'create' }));
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Criar mesa"
      description="Você entra como mestre e recebe o link para chamar os jogadores."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={pending} icon={<Plus size={16} />}>
            Criar mesa
          </Button>
        </>
      }
    >
      {/* Remonta a cada abertura: o apelido sugerido chega depois do perfil carregar. */}
      <form
        key={String(open)}
        id={FORM_ID}
        className={styles.form}
        onSubmit={handleSubmit}
        noValidate
      >
        <TextField
          label="Nome da mesa"
          name="name"
          maxLength={ROOM_NAME_MAX_LENGTH}
          placeholder="Ex.: A Cripta do Corvo"
          error={errors.name}
        />
        <TextField
          label="Seu apelido como mestre"
          name="nickname"
          defaultValue={defaultNickname}
          maxLength={NICKNAME_MAX_LENGTH}
          error={errors.nickname}
        />
        {failure && <FormNotice tone="error">{failure}</FormNotice>}
      </form>
    </Dialog>
  );
}
