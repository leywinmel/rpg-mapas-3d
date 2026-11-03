import { useId, useState, type FormEvent } from 'react';
import { Button, Dialog, TextField } from '@/components';
import { MAX_MAP_SIZE_V2 } from '@/domain/map-v2';
import { DEFAULT_FLOOR_TILE, pieceCatalog } from '@/features/scene';
import {
  MAX_MAP_NAME_LENGTH,
  mapNameSchema,
  parseNewMap,
  type FieldErrors,
  type NewMapInput,
} from '../editor/map-list';
import styles from './SidePanel.module.css';

/** Tamanho sugerido para um mapa novo: cabe uma sala com corredor sem rolar a câmera. */
const DEFAULT_SIDE = 12;
const FORM_ID = 'map-form';

type Feedback = { errors: FieldErrors; failure: string | null; busy: boolean };

const IDLE: Feedback = { errors: {}, failure: null, busy: false };

function useSubmit<T>(onSubmit: (value: T) => Promise<void>, failureMessage: string) {
  const [feedback, setFeedback] = useState<Feedback>(IDLE);
  const run = async (value: T) => {
    setFeedback({ errors: {}, failure: null, busy: true });
    try {
      await onSubmit(value);
      setFeedback(IDLE);
    } catch {
      setFeedback({ errors: {}, failure: failureMessage, busy: false });
    }
  };
  const invalid = (errors: FieldErrors) => setFeedback({ errors, failure: null, busy: false });
  return { feedback, run, invalid, reset: () => setFeedback(IDLE) };
}

type CreateProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewMapInput) => Promise<void>;
};

/** Novo mapa: nome, tamanho em casas e o chão que já vem pintado. */
export function CreateMapDialog({ open, onClose, onCreate }: CreateProps) {
  const floorId = useId();
  const [values, setValues] = useState({
    name: '',
    width: String(DEFAULT_SIDE),
    depth: String(DEFAULT_SIDE),
    floor: DEFAULT_FLOOR_TILE,
  });
  const { feedback, run, invalid, reset } = useSubmit(
    onCreate,
    'Não conseguimos criar o mapa. Tente de novo.',
  );
  const set = (field: keyof typeof values) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  const close = () => {
    reset();
    onClose();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseNewMap(values);
    if (!parsed.ok) return invalid(parsed.errors);
    void run(parsed.value);
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Novo mapa"
      description={`Até ${MAX_MAP_SIZE_V2} × ${MAX_MAP_SIZE_V2} casas. Dá para mudar o chão depois, casa por casa.`}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={feedback.busy}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={feedback.busy}>
            Criar mapa
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label="Nome"
          value={values.name}
          maxLength={MAX_MAP_NAME_LENGTH}
          error={feedback.errors.name}
          autoFocus
          onChange={(event) => set('name')(event.target.value)}
        />
        <div className={styles.row}>
          <TextField
            label="Largura (casas)"
            type="number"
            min={1}
            max={MAX_MAP_SIZE_V2}
            value={values.width}
            error={feedback.errors.width}
            onChange={(event) => set('width')(event.target.value)}
          />
          <TextField
            label="Profundidade (casas)"
            type="number"
            min={1}
            max={MAX_MAP_SIZE_V2}
            value={values.depth}
            error={feedback.errors.depth}
            onChange={(event) => set('depth')(event.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={floorId} className={styles.label}>
            Chão inicial
          </label>
          <select
            id={floorId}
            className={styles.select}
            value={values.floor}
            onChange={(event) => set('floor')(event.target.value)}
          >
            {pieceCatalog.list('floor').map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        {feedback.failure && (
          <p className={styles.error} role="alert">
            {feedback.failure}
          </p>
        )}
      </form>
    </Dialog>
  );
}

type RenameProps = {
  /** Nome atual; nulo = diálogo fechado. */
  currentName: string | null;
  onClose: () => void;
  onRename: (name: string) => Promise<void>;
};

export function RenameMapDialog({ currentName, onClose, onRename }: RenameProps) {
  const [name, setName] = useState(currentName ?? '');
  const { feedback, run, invalid, reset } = useSubmit(
    onRename,
    'Não conseguimos renomear. Tente de novo.',
  );
  const close = () => {
    reset();
    onClose();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = mapNameSchema.safeParse(name);
    if (!parsed.success) return invalid({ name: parsed.error.issues[0]?.message });
    void run(parsed.data);
  };
  return (
    <Dialog
      open={currentName !== null}
      onClose={close}
      title="Renomear mapa"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={feedback.busy}>
            Cancelar
          </Button>
          <Button type="submit" form={`${FORM_ID}-rename`} loading={feedback.busy}>
            Salvar nome
          </Button>
        </>
      }
    >
      <form id={`${FORM_ID}-rename`} className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label="Nome"
          value={name}
          maxLength={MAX_MAP_NAME_LENGTH}
          error={feedback.errors.name}
          autoFocus
          onChange={(event) => setName(event.target.value)}
        />
        {feedback.failure && (
          <p className={styles.error} role="alert">
            {feedback.failure}
          </p>
        )}
      </form>
    </Dialog>
  );
}

type DeleteProps = {
  /** Nome do mapa a apagar; nulo = diálogo fechado. */
  mapName: string | null;
  onClose: () => void;
  onDelete: () => Promise<void>;
};

/** Confirmação de exclusão: o erro aparece aqui dentro, sem fechar a janela. */
export function DeleteMapDialog({ mapName, onClose, onDelete }: DeleteProps) {
  const { feedback, run, reset } = useSubmit(
    () => onDelete(),
    'Não conseguimos apagar o mapa. Tente de novo.',
  );
  const close = () => {
    reset();
    onClose();
  };
  return (
    <Dialog
      open={mapName !== null}
      onClose={close}
      title="Apagar mapa?"
      description={
        mapName ? `“${mapName}” some para todos na mesa. Não dá para desfazer.` : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={feedback.busy}>
            Cancelar
          </Button>
          <Button variant="danger" loading={feedback.busy} onClick={() => void run(undefined)}>
            Apagar mapa
          </Button>
        </>
      }
    >
      {feedback.failure && (
        <p className={styles.error} role="alert">
          {feedback.failure}
        </p>
      )}
    </Dialog>
  );
}
