import { useId, useState, type FormEvent } from 'react';
import { Button, Dialog, SegmentedControl, TextField, type SegmentOption } from '@/components';
import { EXAMPLE_MAPS } from '@/domain/map-gen';
import { MAX_MAP_SIZE_V2 } from '@/domain/map-v2';
import { DEFAULT_FLOOR_TILE, pieceCatalog } from '@/features/scene';
import {
  MAX_MAP_NAME_LENGTH,
  mapNameSchema,
  parseNewMap,
  type FieldErrors,
  type NewMapInput,
} from '../editor/map-list';
import {
  exampleValues,
  parseGenerateMap,
  type GenerateFieldErrors,
} from '../generator/generate-form';
import { GenerateMapFields, GenerationStatus } from '../generator/GenerateMapForm';
import { useGenerateMap } from '../generator/useGenerateMap';
import type { MapActions } from '../hooks/useMapActions';
import type { MapSummary } from '../types';
import styles from './SidePanel.module.css';

/** Tamanho sugerido para um mapa novo: cabe uma sala com corredor sem rolar a câmera. */
const DEFAULT_SIDE = 12;
const FORM_ID = 'map-form';
const GENERATE_FORM_ID = 'map-generate-form';

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

type CreateMode = 'blank' | 'generate';

const MODE_OPTIONS: ReadonlyArray<SegmentOption<CreateMode>> = [
  { value: 'blank', label: 'Mapa vazio' },
  { value: 'generate', label: 'Mapa pronto' },
];

const MODE_DESCRIPTIONS: Readonly<Record<CreateMode, string>> = {
  blank: `Até ${MAX_MAP_SIZE_V2} × ${MAX_MAP_SIZE_V2} casas. Dá para mudar o chão depois, casa por casa.`,
  generate: 'Ruas, casas com móveis e telhados, praças e veículos, prontos para editar.',
};

export type MapGeneratorBinding = {
  actions: Pick<MapActions, 'createFromModel' | 'resumeSave' | 'remove'>;
  onGenerated: (summary: MapSummary) => void;
};

type CreateProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewMapInput) => Promise<void>;
  generator: MapGeneratorBinding;
};

type BlankFormProps = {
  values: Record<keyof NewMapInput, string>;
  errors: FieldErrors;
  failure: string | null;
  onChange: (field: keyof NewMapInput, value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

function BlankMapFields({ values, errors, failure, onChange, onSubmit }: BlankFormProps) {
  const floorId = useId();
  return (
    <form id={FORM_ID} className={styles.form} onSubmit={onSubmit} noValidate>
      <TextField
        label="Nome"
        value={values.name}
        maxLength={MAX_MAP_NAME_LENGTH}
        error={errors.name}
        autoFocus
        onChange={(event) => onChange('name', event.target.value)}
      />
      <div className={styles.row}>
        <TextField
          label="Largura (casas)"
          type="number"
          min={1}
          max={MAX_MAP_SIZE_V2}
          value={values.width}
          error={errors.width}
          onChange={(event) => onChange('width', event.target.value)}
        />
        <TextField
          label="Profundidade (casas)"
          type="number"
          min={1}
          max={MAX_MAP_SIZE_V2}
          value={values.depth}
          error={errors.depth}
          onChange={(event) => onChange('depth', event.target.value)}
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
          onChange={(event) => onChange('floor', event.target.value)}
        >
          {pieceCatalog.list('floor').map((entry) => (
            <option key={entry.key} value={entry.key}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>
      {failure && (
        <p className={styles.error} role="alert">
          {failure}
        </p>
      )}
    </form>
  );
}

type GenerateFooterProps = {
  generation: ReturnType<typeof useGenerateMap>;
  onClose: () => void;
};

/** Botões da geração: depois de uma falha no meio, completar o mapa ou desistir dele. */
function GenerateFooter({ generation, onClose }: GenerateFooterProps) {
  const { state, busy } = generation;
  if (state.phase === 'failed' && state.pending) {
    return (
      <>
        <Button variant="ghost" onClick={() => void generation.discard()}>
          Apagar o mapa incompleto
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Deixar assim
        </Button>
        <Button onClick={() => void generation.retry()}>Tentar de novo</Button>
      </>
    );
  }
  return (
    <>
      <Button variant="ghost" onClick={onClose} disabled={busy}>
        Cancelar
      </Button>
      <Button type="submit" form={GENERATE_FORM_ID} loading={busy}>
        {state.phase === 'failed' ? 'Tentar de novo' : 'Gerar mapa'}
      </Button>
    </>
  );
}

/** Novo mapa: vazio (nome, tamanho e chão) ou gerado (vila, cidade, masmorra, caverna, deserto). */
export function CreateMapDialog({ open, onClose, onCreate, generator }: CreateProps) {
  const [mode, setMode] = useState<CreateMode>('blank');
  const [values, setValues] = useState({
    name: '',
    width: String(DEFAULT_SIDE),
    depth: String(DEFAULT_SIDE),
    floor: DEFAULT_FLOOR_TILE,
  });
  const [generateValues, setGenerateValues] = useState(() => exampleValues(EXAMPLE_MAPS[0]!));
  const [generateErrors, setGenerateErrors] = useState<GenerateFieldErrors>({});
  const generation = useGenerateMap(generator.actions, generator.onGenerated);
  const { feedback, run, invalid, reset } = useSubmit(
    onCreate,
    'Não conseguimos criar o mapa. Tente de novo.',
  );
  const busy = feedback.busy || generation.busy;
  const close = () => {
    // Fechar no meio da gravação deixaria o mestre sem saber se o mapa ficou inteiro.
    if (busy) return;
    reset();
    onClose();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseNewMap(values);
    if (!parsed.ok) return invalid(parsed.errors);
    void run(parsed.value);
  };

  const failed = generation.state.phase === 'failed';
  const generate = () => {
    if (failed) return void generation.retry();
    const parsed = parseGenerateMap(generateValues);
    if (!parsed.ok) return setGenerateErrors(parsed.errors);
    setGenerateErrors({});
    void generation.start(parsed.value);
  };

  const footer =
    mode === 'generate' ? (
      <GenerateFooter generation={generation} onClose={close} />
    ) : (
      <>
        <Button variant="ghost" onClick={close} disabled={feedback.busy}>
          Cancelar
        </Button>
        <Button type="submit" form={FORM_ID} loading={feedback.busy}>
          Criar mapa
        </Button>
      </>
    );

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Novo mapa"
      description={MODE_DESCRIPTIONS[mode]}
      footer={footer}
    >
      <div className={styles.form}>
        <SegmentedControl
          label="Tipo de mapa"
          options={MODE_OPTIONS}
          value={mode}
          onChange={(next) => {
            if (!busy) setMode(next);
          }}
        />
        {mode === 'blank' ? (
          <BlankMapFields
            values={values}
            errors={feedback.errors}
            failure={feedback.failure}
            onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
            onSubmit={submit}
          />
        ) : (
          <>
            <GenerateMapFields
              formId={GENERATE_FORM_ID}
              values={generateValues}
              errors={generateErrors}
              disabled={generation.busy || failed}
              onChange={setGenerateValues}
              onSubmit={generate}
            />
            <GenerationStatus state={generation.state} />
          </>
        )}
      </div>
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
