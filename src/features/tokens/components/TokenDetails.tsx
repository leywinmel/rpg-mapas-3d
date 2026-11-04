import { useId, useState } from 'react';
import { Eye, EyeOff, Heart, Swords, Trash2, X } from 'lucide-react';
import { Button, Dialog, IconButton, TextAreaField, TextField } from '@/components';
import { adjustHealth, canEditTokenField, isGameMaster, MAX_TOKEN_NOTES_LENGTH } from '@/domain';
import { useRoomSession } from '@/features/rooms';
import { useTokenActions, useTokensStore } from '../hooks/tokens-store';
import { tokenHpSchema, tokenNotesSchema } from '../schemas';
import { tokenFailures } from '../services/token-errors';
import type { Token, TokenPatch } from '../types';
import styles from './tokens.module.css';

const NO_OWNER = '';

/** Roda uma gravação do token; a falha vira aviso amigável (o painel não é uma janela). */
function useTokenSaver(token: Token) {
  const actions = useTokenActions();
  const [pending, setPending] = useState(false);
  const save = async (patch: TokenPatch, action: string): Promise<boolean> => {
    if (!actions) return false;
    setPending(true);
    try {
      await actions.updateToken(token, patch);
      return true;
    } catch (error) {
      tokenFailures.report(error, { action, toast: true });
      return false;
    } finally {
      setPending(false);
    }
  };
  return { save, pending };
}

function HealthControls({ token, canEdit }: { token: Token; canEdit: boolean }) {
  const { save, pending } = useTokenSaver(token);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | undefined>();
  if (token.hpMax === null || token.hpCurrent === null) {
    return <p className={styles.note}>Este token não tem vida.</p>;
  }
  const max = token.hpMax;
  const current = token.hpCurrent;

  const apply = async (sign: 1 | -1) => {
    const parsed = tokenHpSchema.safeParse(Number(amount));
    if (amount.trim() === '' || !parsed.success) {
      setError(parsed.success ? 'Digite quanto.' : parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    const hpCurrent = adjustHealth({ current, max }, sign * parsed.data);
    if (await save({ hpCurrent }, sign < 0 ? 'damage' : 'heal')) setAmount('');
  };

  return (
    <div className={styles.field}>
      <span className={styles.label}>
        Vida: {current} de {max}
      </span>
      {canEdit && (
        <div className={styles.healthRow}>
          <TextField
            label="Quanto"
            type="number"
            inputMode="numeric"
            min={0}
            value={amount}
            error={error}
            disabled={pending}
            onChange={(event) => setAmount(event.target.value)}
          />
          <Button
            variant="secondary"
            icon={<Swords size={16} />}
            disabled={pending}
            onClick={() => void apply(-1)}
          >
            Dano
          </Button>
          <Button
            variant="secondary"
            icon={<Heart size={16} />}
            disabled={pending}
            onClick={() => void apply(1)}
          >
            Curar
          </Button>
        </div>
      )}
    </div>
  );
}

function NotesEditor({ token, canEdit }: { token: Token; canEdit: boolean }) {
  const { save, pending } = useTokenSaver(token);
  const [notes, setNotes] = useState(token.notes);
  const parsed = tokenNotesSchema.safeParse(notes);
  const error = parsed.success ? undefined : parsed.error.issues[0]?.message;

  if (!canEdit) {
    // Texto puro: quebras de linha ficam, nada vira HTML [#53].
    return token.notes ? <p className={styles.note}>{token.notes}</p> : null;
  }
  return (
    <div className={styles.field}>
      <TextAreaField
        label="Notas curtas"
        value={notes}
        rows={3}
        hint={`${notes.length}/${MAX_TOKEN_NOTES_LENGTH} caracteres`}
        error={error}
        disabled={pending}
        onChange={(event) => setNotes(event.target.value)}
      />
      <div className={styles.actions}>
        <Button
          variant="secondary"
          size="sm"
          loading={pending}
          disabled={notes === token.notes || error !== undefined}
          onClick={() => void save({ notes }, 'notes')}
        >
          Salvar notas
        </Button>
      </div>
    </div>
  );
}

function MasterControls({ token }: { token: Token }) {
  const { members } = useRoomSession();
  const actions = useTokenActions();
  const { save, pending } = useTokenSaver(token);
  const ownerId = useId();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const players = members.filter((member) => member.role === 'player');

  const remove = async () => {
    if (!actions) return;
    setDeleting(true);
    try {
      await actions.deleteToken(token);
      setConfirming(false);
    } catch (error) {
      setFailure(tokenFailures.report(error, { action: 'delete' }));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className={styles.field}>
        <label htmlFor={ownerId} className={styles.label}>
          Quem controla
        </label>
        <select
          id={ownerId}
          className={styles.select}
          value={token.ownerId ?? NO_OWNER}
          disabled={pending}
          onChange={(event) => void save({ ownerId: event.target.value || null }, 'change-owner')}
        >
          <option value={NO_OWNER}>Só o mestre (NPC, monstro)</option>
          {players.map((player) => (
            <option key={player.userId} value={player.userId}>
              {player.nickname}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          size="sm"
          icon={token.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
          disabled={pending}
          onClick={() => void save({ hidden: !token.hidden }, 'toggle-hidden')}
        >
          {token.hidden ? 'Mostrar aos jogadores' : 'Esconder dos jogadores'}
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={<Trash2 size={16} />}
          onClick={() => {
            setFailure(null);
            setConfirming(true);
          }}
        >
          Apagar
        </Button>
      </div>
      <Dialog
        open={confirming}
        onClose={() => !deleting && setConfirming(false)}
        title="Apagar token?"
        description={`"${token.name}" sai do mapa para todos. Não dá para desfazer.`}
        footer={
          <>
            <Button variant="ghost" disabled={deleting} onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={deleting} onClick={() => void remove()}>
              Apagar
            </Button>
          </>
        }
      >
        {failure && (
          <p role="alert" className={styles.error}>
            {failure}
          </p>
        )}
      </Dialog>
    </>
  );
}

/**
 * Detalhes do token escolhido: vida e notas para quem pode mexer, e as opções do mestre. Remonte
 * com key = id do token para as caixas abrirem com os valores dele.
 */
export function TokenDetails({ token }: { token: Token }) {
  const { viewer } = useRoomSession();
  const master = isGameMaster(viewer);
  return (
    <section className={styles.details} aria-label={`Token ${token.name}`}>
      <div className={styles.detailsHeader}>
        <h3 className={styles.detailsTitle}>{token.name}</h3>
        <IconButton
          label="Fechar os detalhes"
          icon={<X size={16} />}
          size="sm"
          onClick={() => useTokensStore.getState().select(null)}
        />
      </div>
      <HealthControls token={token} canEdit={canEditTokenField(viewer, token, 'hp_current')} />
      <NotesEditor
        key={token.notes}
        token={token}
        canEdit={canEditTokenField(viewer, token, 'notes')}
      />
      {master && <MasterControls token={token} />}
    </section>
  );
}
