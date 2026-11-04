import { useEffect, useId } from 'react';
import { Brush, CloudFog, Eye, EyeOff } from 'lucide-react';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  SegmentedControl,
  type SegmentOption,
} from '@/components';
import { useTokensStore } from '@/features/tokens';
import {
  FOG_BRUSH_MAX_RADIUS,
  FOG_BRUSH_MIN_RADIUS,
  type FogMode,
  type FogShape,
} from '../constants';
import { useFogStore, type FogSaveStatus } from '../hooks/fog-store';
import { toFogError } from '../services/fog-errors';
import styles from './fog.module.css';

const SHAPE_OPTIONS: ReadonlyArray<SegmentOption<FogShape>> = [
  { value: 'brush', label: 'Pincel' },
  { value: 'rect', label: 'Retângulo' },
];

const MODE_OPTIONS: ReadonlyArray<SegmentOption<FogMode>> = [
  { value: 'cover', label: 'Cobrir' },
  { value: 'reveal', label: 'Revelar' },
];

const SAVE_LABELS: Record<FogSaveStatus, string> = {
  saved: 'Névoa salva para a mesa.',
  pending: 'Mudanças esperando para salvar…',
  saving: 'Salvando…',
  error: 'A névoa não foi salva.',
};

/** Diâmetro do pincel em casas, para o rótulo (raio 1 = 3×3). */
const brushWidth = (radius: number) => radius * 2 + 1;

function SaveStatus() {
  const saveStatus = useFogStore((state) => state.saveStatus);
  const saveError = useFogStore((state) => state.saveError);
  if (saveStatus !== 'error') {
    return (
      <p className={styles.status} role="status">
        {SAVE_LABELS[saveStatus]}
      </p>
    );
  }
  return (
    <div className={styles.field}>
      <p role="alert" className={styles.error}>
        {toFogError(saveError).message}
      </p>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => useFogStore.getState().setSaveStatus('pending')}
      >
        Tentar salvar de novo
      </Button>
    </div>
  );
}

function FogTools() {
  const ids = { radius: useId() };
  const enabled = useFogStore((state) => state.fog?.enabled ?? false);
  const tool = useFogStore((state) => state.tool);
  const { setTool, setEnabled, fill } = useFogStore.getState();

  return (
    <div className={styles.stack}>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Névoa ligada neste mapa
      </label>
      <p className={styles.hint}>
        Os jogadores não veem o que está coberto, nem os tokens embaixo. Você vê a névoa
        translúcida.
      </p>
      <Button
        variant={tool.painting ? 'primary' : 'secondary'}
        icon={<Brush size={16} />}
        aria-pressed={tool.painting}
        disabled={!enabled}
        onClick={() => setTool({ painting: !tool.painting })}
      >
        {tool.painting ? 'Parar de pintar' : 'Pintar no mapa'}
      </Button>
      <div className={styles.field}>
        <SegmentedControl
          label="Forma do pincel"
          options={SHAPE_OPTIONS}
          value={tool.shape}
          onChange={(shape) => setTool({ shape })}
        />
        <SegmentedControl
          label="O que o pincel faz"
          options={MODE_OPTIONS}
          value={tool.mode}
          onChange={(mode) => setTool({ mode })}
        />
      </div>
      {tool.shape === 'brush' && (
        <div className={styles.field}>
          <label htmlFor={ids.radius} className={styles.label}>
            Tamanho: {brushWidth(tool.radius)}×{brushWidth(tool.radius)} casas
          </label>
          <input
            id={ids.radius}
            type="range"
            className={styles.range}
            min={FOG_BRUSH_MIN_RADIUS}
            max={FOG_BRUSH_MAX_RADIUS}
            value={tool.radius}
            onChange={(event) => setTool({ radius: Number(event.target.value) })}
          />
        </div>
      )}
      <div className={styles.row}>
        <Button
          size="sm"
          variant="secondary"
          icon={<EyeOff size={14} />}
          disabled={!enabled}
          onClick={() => fill(true)}
        >
          Cobrir tudo
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={<Eye size={14} />}
          disabled={!enabled}
          onClick={() => fill(false)}
        >
          Revelar tudo
        </Button>
      </div>
      <SaveStatus />
    </div>
  );
}

function FogBody() {
  const hasMap = useTokensStore((state) => state.view !== null);
  const status = useFogStore((state) => state.status);
  const error = useFogStore((state) => state.error);

  if (!hasMap) {
    return (
      <EmptyState
        icon={<CloudFog size={22} />}
        title="Nenhum mapa aberto"
        description="A névoa é pintada sobre o mapa que está na tela."
      />
    );
  }
  if (status === 'error') {
    return (
      <ErrorState
        title="Não deu para carregar a névoa"
        description={toFogError(error).message}
        onRetry={() => useFogStore.getState().retryLoad()}
      />
    );
  }
  if (status !== 'ready') return <LoadingState label="Carregando a névoa…" />;
  return <FogTools />;
}

/** Painel "Névoa" do mestre: liga a névoa, escolhe o pincel e cobre ou revela. */
export function FogPanel({ onClose }: { onClose: () => void }) {
  // Fechar o painel larga o pincel: o clique no mapa volta a girar a câmera.
  useEffect(() => () => useFogStore.getState().setTool({ painting: false }), []);
  return (
    <Panel title="Névoa" icon={<CloudFog size={18} />} onClose={onClose} className={styles.panel}>
      <FogBody />
    </Panel>
  );
}
