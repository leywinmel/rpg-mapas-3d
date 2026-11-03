import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoorOpen, Save, Trash2 } from 'lucide-react';
import { Button, Dialog, notify, TextField } from '@/components';
import { FormNotice } from '@/features/auth';
import { readForm } from '@/lib/form-data';
import { validateForm } from '@/lib/validation';
import { useRoomControls, useRoomSession } from '../hooks/room-session-context';
import { LOBBY_PATH } from '../paths';
import { renameRoomSchema, ROOM_NAME_MAX_LENGTH } from '../schemas';
import { reportRoomFailure } from '../services/report-room-failure';
import { getRoomsService } from '../services/rooms-service';
import styles from './rooms.module.css';

type DialogProps = { open: boolean; onClose: () => void };

const RENAME_FORM_ID = 'rename-room-form';

export function RenameRoomDialog({ open, onClose }: DialogProps) {
  const { room } = useRoomSession();
  const { replaceRoom } = useRoomControls();
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleClose() {
    setFieldError(undefined);
    setFailure(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateForm(renameRoomSchema, readForm(event.currentTarget));
    setFailure(null);
    if (!result.ok) {
      setFieldError(result.errors.name);
      return;
    }
    setFieldError(undefined);
    setPending(true);
    try {
      replaceRoom(await getRoomsService().renameRoom(room.id, result.data.name));
      notify.success('Mesa renomeada.');
      handleClose();
    } catch (error) {
      setFailure(reportRoomFailure(error, { action: 'rename' }));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Renomear mesa"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" form={RENAME_FORM_ID} loading={pending} icon={<Save size={16} />}>
            Salvar
          </Button>
        </>
      }
    >
      {/* A chave remonta o formulário a cada abertura, com o nome atual. */}
      <form
        key={`${room.name}-${open}`}
        id={RENAME_FORM_ID}
        className={styles.form}
        onSubmit={handleSubmit}
        noValidate
      >
        <TextField
          label="Nome da mesa"
          name="name"
          defaultValue={room.name}
          maxLength={ROOM_NAME_MAX_LENGTH}
          error={fieldError}
        />
        {failure && <FormNotice tone="error">{failure}</FormNotice>}
      </form>
    </Dialog>
  );
}

export function DeleteRoomDialog({ open, onClose }: DialogProps) {
  const { room } = useRoomSession();
  const navigate = useNavigate();
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleClose() {
    setFailure(null);
    onClose();
  }

  async function handleDelete() {
    setFailure(null);
    setPending(true);
    try {
      await getRoomsService().deleteRoom(room.id);
    } catch (error) {
      setFailure(reportRoomFailure(error, { action: 'delete' }));
      setPending(false);
      return;
    }
    notify.success('Mesa apagada.');
    navigate(LOBBY_PATH, { replace: true });
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Apagar mesa?"
      description="Mapas, tokens, anotações e rolagens desta mesa somem para todos. Não dá para desfazer."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={pending}
            icon={<Trash2 size={16} />}
            onClick={handleDelete}
          >
            Apagar de vez
          </Button>
        </>
      }
    >
      <p>
        Você vai apagar <strong>{room.name}</strong>.
      </p>
      {failure && <FormNotice tone="error">{failure}</FormNotice>}
    </Dialog>
  );
}

export function LeaveRoomDialog({ open, onClose }: DialogProps) {
  const { room, viewer } = useRoomSession();
  const navigate = useNavigate();
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleClose() {
    setFailure(null);
    onClose();
  }

  async function handleLeave() {
    setFailure(null);
    setPending(true);
    try {
      await getRoomsService().leaveRoom(room.id, viewer.userId);
    } catch (error) {
      setFailure(reportRoomFailure(error, { action: 'leave' }));
      setPending(false);
      return;
    }
    notify.info('Você saiu da mesa.', 'Para voltar, use o link de convite de novo.');
    navigate(LOBBY_PATH, { replace: true });
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Sair da mesa?"
      description="A mesa some da sua lista. Com o link de convite, dá para entrar de novo."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Ficar
          </Button>
          <Button loading={pending} icon={<DoorOpen size={16} />} onClick={handleLeave}>
            Sair da mesa
          </Button>
        </>
      }
    >
      {failure && <FormNotice tone="error">{failure}</FormNotice>}
    </Dialog>
  );
}
