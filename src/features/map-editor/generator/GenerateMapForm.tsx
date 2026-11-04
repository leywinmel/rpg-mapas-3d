import { useId, type FormEvent } from 'react';
import { Dices } from 'lucide-react';
import { Button, IconButton, SegmentedControl, TextField, type SegmentOption } from '@/components';
import {
  EXAMPLE_MAPS,
  MAX_SEED,
  SETTLEMENT_STYLE_LABELS,
  SETTLEMENT_STYLES,
  SIZE_PRESETS,
  type SettlementStyle,
  type SizePresetId,
} from '@/domain/map-gen';
import { MAX_MAP_NAME_LENGTH } from '../editor/map-list';
import panel from '../components/SidePanel.module.css';
import {
  exampleValues,
  generateMapSchema,
  randomSeed,
  type GenerateFieldErrors,
  type GenerateFormValues,
} from './generate-form';
import { SettlementPreview } from './SettlementPreview';
import type { GenerationState } from './useGenerateMap';
import styles from './GenerateMap.module.css';

const STYLE_OPTIONS: ReadonlyArray<SegmentOption<SettlementStyle>> = SETTLEMENT_STYLES.map(
  (style) => ({ value: style, label: SETTLEMENT_STYLE_LABELS[style] }),
);
/** Tamanhos que pesam no banco gratuito e na cena: a tela avisa antes de gerar. */
const HEAVY_PRESETS: ReadonlySet<SizePresetId> = new Set(['metropolis']);
const PERCENT = 100;

type FieldsProps = {
  formId: string;
  values: GenerateFormValues;
  errors: GenerateFieldErrors;
  disabled: boolean;
  onChange: (values: GenerateFormValues) => void;
  onSubmit: () => void;
};

/** Prévia só com valores válidos: a semente sendo digitada pode estar pela metade. */
function previewInput(values: GenerateFormValues) {
  const parsed = generateMapSchema
    .pick({ style: true, preset: true, seed: true })
    .safeParse(values);
  return parsed.success ? parsed.data : null;
}

/** Estilo, tamanho, semente (com sorteio), exemplos prontos e a prévia do alto. */
export function GenerateMapFields({
  formId,
  values,
  errors,
  disabled,
  onChange,
  onSubmit,
}: FieldsProps) {
  const sizeId = useId();
  const set = (patch: Partial<GenerateFormValues>) => onChange({ ...values, ...patch });
  const preview = previewInput(values);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <form id={formId} className={panel.form} onSubmit={submit} noValidate>
      <fieldset className={styles.fields} disabled={disabled}>
        <div className={panel.field}>
          <span className={panel.label}>Exemplos prontos</span>
          <div className={styles.examples}>
            {EXAMPLE_MAPS.map((example) => (
              <Button
                key={example.id}
                variant="secondary"
                size="sm"
                onClick={() => onChange(exampleValues(example))}
              >
                {example.name}
              </Button>
            ))}
          </div>
        </div>
        <TextField
          label="Nome"
          value={values.name}
          maxLength={MAX_MAP_NAME_LENGTH}
          error={errors.name}
          onChange={(event) => set({ name: event.target.value })}
        />
        <SegmentedControl
          label="Estilo"
          options={STYLE_OPTIONS}
          value={values.style as SettlementStyle}
          onChange={(style) => set({ style })}
        />
        <div className={panel.row}>
          <div className={panel.field}>
            <label htmlFor={sizeId} className={panel.label}>
              Tamanho
            </label>
            <select
              id={sizeId}
              className={panel.select}
              value={values.preset}
              onChange={(event) => set({ preset: event.target.value })}
            >
              {SIZE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label} ({preset.side} × {preset.side})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.seedRow}>
            <TextField
              label="Semente"
              type="number"
              min={0}
              max={MAX_SEED}
              value={values.seed}
              error={errors.seed}
              onChange={(event) => set({ seed: event.target.value })}
            />
            <IconButton
              label="Sortear outra semente"
              icon={<Dices size={18} />}
              onClick={() => set({ seed: String(randomSeed()) })}
            />
          </div>
        </div>
        {preview && <SettlementPreview input={preview} />}
        <p className={panel.muted}>
          A mesma semente gera sempre o mesmo mapa. Depois de gerado, tudo é editável peça por peça.
        </p>
        {HEAVY_PRESETS.has(values.preset as SizePresetId) && (
          <p className={styles.warning}>
            Cidade grande tem centenas de milhares de peças: leva alguns minutos para gravar, ocupa
            uns 85 MB do banco e pode deixar a cena lenta em computadores modestos.
          </p>
        )}
      </fieldset>
    </form>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const known = total > 0;
  const percent = known ? Math.round((done / total) * PERCENT) : 0;
  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-label="Gravando o mapa"
      aria-valuemin={0}
      aria-valuemax={PERCENT}
      aria-valuenow={known ? percent : undefined}
    >
      <div
        className={known ? styles.bar : `${styles.bar} ${styles.indeterminate}`}
        style={known ? { width: `${percent}%` } : undefined}
      />
    </div>
  );
}

/** Andamento e falha dentro da própria janela (os avisos do canto ficariam atrás dela). */
export function GenerationStatus({ state }: { state: GenerationState }) {
  if (state.phase === 'generating') {
    return (
      <div className={styles.progress} aria-live="polite">
        <span className={panel.muted}>Gerando ruas, casas e telhados…</span>
        <ProgressBar done={0} total={0} />
      </div>
    );
  }
  if (state.phase === 'saving') {
    const { done, total } = state.progress;
    return (
      <div className={styles.progress} aria-live="polite">
        <span className={panel.muted}>
          {total > 0 ? `Gravando o mapa: parte ${done} de ${total}…` : 'Criando o mapa…'}
        </span>
        <ProgressBar done={done} total={total} />
      </div>
    );
  }
  if (state.phase === 'failed') {
    return (
      <div className={styles.failure}>
        <p className={panel.error} role="alert">
          {state.message}
        </p>
      </div>
    );
  }
  return null;
}
