import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { Button, Spinner } from '@/components';
import type { MapAsset } from '@/features/map-editor/types';
import {
  checkGlbFile,
  GLB_EXTENSION,
  MAX_GLB_BYTES,
} from '@/features/map-editor/upload/glb-validation';
import { useTokenActions } from '../hooks/tokens-store';
import { tokenFailures } from '../services/token-errors';
import styles from './tokens.module.css';

const BYTES_PER_MEGABYTE = 1024 * 1024;
const MAX_GLB_MEGABYTES = MAX_GLB_BYTES / BYTES_PER_MEGABYTE;
/** Valor do seletor enquanto nenhum modelo foi escolhido. */
const NONE = '';

type Library =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; models: MapAsset[] };

export type UploadedModelFieldProps = {
  value: string | null;
  onChange: (assetId: string | null) => void;
  error?: string;
  disabled: boolean;
  /** Avisa a janela que um envio está em andamento (não dá para criar o token no meio). */
  onBusyChange: (busy: boolean) => void;
};

/**
 * Escolha do modelo .glb do token: um da biblioteca do mestre (a mesma do editor de mapas) ou
 * um arquivo novo, que entra na biblioteca na hora.
 */
export function UploadedModelField({
  value,
  onChange,
  error,
  disabled,
  onBusyChange,
}: UploadedModelFieldProps) {
  const actions = useTokenActions();
  const selectId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [library, setLibrary] = useState<Library>({ status: 'loading' });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!actions) return;
    let alive = true;
    actions
      .listModels()
      .then((models) => {
        if (alive) setLibrary({ status: 'ready', models });
      })
      .catch((failure: unknown) => {
        if (!alive) return;
        setLibrary({
          status: 'error',
          message: tokenFailures.report(failure, { action: 'list-models' }),
        });
      });
    return () => {
      alive = false;
    };
  }, [actions, attempt]);

  function retry() {
    setLibrary({ status: 'loading' });
    setAttempt((current) => current + 1);
  }

  async function handlePick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !actions) return;
    setUploadError(null);
    const check = await checkGlbFile(file);
    if (!check.ok) {
      setUploadError(check.message);
      return;
    }
    setUploading(true);
    onBusyChange(true);
    try {
      const model = await actions.uploadModel(file);
      setLibrary((current) => ({
        status: 'ready',
        models: [model, ...(current.status === 'ready' ? current.models : [])],
      }));
      onChange(model.id);
    } catch (failure) {
      setUploadError(tokenFailures.report(failure, { action: 'upload-model' }));
    } finally {
      setUploading(false);
      onBusyChange(false);
    }
  }

  const busy = disabled || uploading;
  const problem = uploadError ?? error;
  return (
    <div className={styles.field}>
      <label htmlFor={selectId} className={styles.label}>
        Modelo
      </label>
      {library.status === 'loading' && (
        <span className={styles.hint}>
          <Spinner size="sm" /> Carregando seus modelos…
        </span>
      )}
      {library.status === 'error' && (
        <div className={styles.imageRow}>
          <p role="alert" className={styles.error}>
            {library.message}
          </p>
          <Button variant="ghost" size="sm" onClick={retry}>
            Tentar de novo
          </Button>
        </div>
      )}
      {library.status === 'ready' && library.models.length > 0 && (
        <select
          id={selectId}
          className={styles.select}
          value={value ?? NONE}
          disabled={busy}
          onChange={(event) => onChange(event.target.value === NONE ? null : event.target.value)}
        >
          <option value={NONE}>Escolha um modelo…</option>
          {library.models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      )}
      {library.status === 'ready' && library.models.length === 0 && (
        <span className={styles.hint}>Você ainda não enviou nenhum modelo. Envie o primeiro.</span>
      )}
      <input
        ref={fileRef}
        type="file"
        accept={GLB_EXTENSION}
        hidden
        aria-label="Arquivo .glb do token"
        onChange={(event) => void handlePick(event)}
      />
      <div className={styles.imageRow}>
        <Button
          variant="secondary"
          icon={<Upload size={16} />}
          loading={uploading}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          Enviar .glb
        </Button>
      </div>
      <span className={styles.hint}>
        Modelo 3D .glb, até {MAX_GLB_MEGABYTES} MB. Fica em pé na base, do tamanho do token, e entra
        na sua biblioteca de modelos.
      </span>
      {problem && (
        <p role="alert" className={styles.error}>
          {problem}
        </p>
      )}
    </div>
  );
}
