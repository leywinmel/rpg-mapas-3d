import { useId, useRef, useState, type ChangeEvent } from 'react';
import { FileUp } from 'lucide-react';
import { Button, Dialog, notify, TextField } from '@/components';
import {
  MAP_FILE_EXTENSION,
  MAX_MAP_NAME_LENGTH,
  mapFileSizeProblem,
  parseMapFile,
  type ImportedMap,
} from '@/domain/map-export';
import { reportError } from '@/lib/report-error';
import {
  createImportJob,
  type ImportJob,
  type ImportProgress,
  type MapImportTarget,
  type TableImportTarget,
} from '../services/map-importer';
import { createTableImportTarget } from '../services/table-target';
import styles from './export.module.css';

const ACCEPTED_FILES = `${MAP_FILE_EXTENSION},.json,application/json`;

type Phase =
  | { kind: 'pick'; reading: boolean; errors: readonly string[] }
  | { kind: 'review'; imported: ImportedMap; fileName: string }
  | { kind: 'running'; progress: ImportProgress }
  | { kind: 'failed'; progress: ImportProgress }
  | { kind: 'discarding' };

const START: Phase = { kind: 'pick', reading: false, errors: [] };

const STAGE_LABELS: Record<ImportProgress['stage'], string> = {
  map: 'Gravando o mapa',
  fog: 'Gravando a névoa',
  tokens: 'Criando os tokens',
  done: 'Terminando',
};

function progressText({ stage, done, total }: ImportProgress): string {
  if (total === 0 || stage === 'fog' || stage === 'done') return `${STAGE_LABELS[stage]}…`;
  const unit = stage === 'map' ? 'lote' : 'token';
  return `${STAGE_LABELS[stage]}: ${unit} ${Math.min(done + 1, total)} de ${total}`;
}

function ProgressBar({ progress }: { progress: ImportProgress }) {
  const text = progressText(progress);
  return (
    <div className={styles.field}>
      <progress
        className={styles.progress}
        value={progress.total > 0 ? progress.done : undefined}
        max={progress.total > 0 ? progress.total : undefined}
        aria-label={text}
      />
      <p className={styles.hint} role="status">
        {text}
      </p>
    </div>
  );
}

export type ImportMapDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Uma gravação de mapa nova por importação (ela guarda até onde chegou). */
  createMapTarget: () => MapImportTarget;
  onImported: (mapId: string) => void;
  /** Troca a gravação da névoa e dos tokens (nos testes). */
  table?: TableImportTarget;
};

/** Abre um arquivo .rpgmap.json (ou um mapa v1) e cria com ele um mapa novo na mesa. */
export function ImportMapDialog({
  open,
  onClose,
  createMapTarget,
  onImported,
  table,
}: ImportMapDialogProps) {
  const [phase, setPhase] = useState<Phase>(START);
  const [name, setName] = useState('');
  const [includeTokens, setIncludeTokens] = useState(true);
  const [includeFog, setIncludeFog] = useState(true);
  const job = useRef<ImportJob | null>(null);
  const fileId = useId();

  const reset = () => {
    job.current = null;
    setPhase(START);
  };
  const close = () => {
    // Durante a gravação e depois de uma falha, a janela só fecha pelos botões: sair dela no
    // meio deixaria um mapa incompleto sem ninguém decidir o que fazer com ele.
    if (phase.kind !== 'pick' && phase.kind !== 'review') return;
    reset();
    onClose();
  };

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const tooBig = mapFileSizeProblem(file.size);
    if (tooBig) {
      setPhase({ kind: 'pick', reading: false, errors: [tooBig] });
      return;
    }
    setPhase({ kind: 'pick', reading: true, errors: [] });
    try {
      const result = parseMapFile(await file.text());
      if (!result.ok) {
        setPhase({ kind: 'pick', reading: false, errors: result.errors });
        return;
      }
      const imported = result.value;
      setName(imported.name.slice(0, MAX_MAP_NAME_LENGTH));
      setIncludeTokens(imported.tokens.length > 0);
      setIncludeFog(imported.fog !== null);
      setPhase({ kind: 'review', imported, fileName: file.name });
    } catch (error) {
      reportError(error, {
        userMessage: 'Não conseguimos ler o arquivo.',
        context: { feature: 'export', action: 'read-map-file' },
        toast: false,
      });
      setPhase({ kind: 'pick', reading: false, errors: ['Não conseguimos ler o arquivo.'] });
    }
  };

  const run = async (current: ImportJob) => {
    let last: ImportProgress = { stage: 'map', done: 0, total: 0 };
    const onProgress = (progress: ImportProgress) => {
      last = progress;
      setPhase({ kind: 'running', progress });
    };
    onProgress(last);
    try {
      const outcome = await current.run(onProgress);
      reset();
      onImported(outcome.mapId);
      onClose();
      if (outcome.fallbackTokens > 0) {
        notify.warning(
          'Mapa importado, mas algumas imagens de token não vieram.',
          `${outcome.fallbackTokens} token(s) viraram boneco 3D.`,
        );
      } else {
        notify.success('Mapa importado.', 'Ele já está na lista de mapas da mesa.');
      }
    } catch (error) {
      // O erro aparece na própria janela: o aviso do canto ficaria atrás dela.
      reportError(error, {
        userMessage: 'A importação parou no meio.',
        context: { feature: 'export', action: 'import-map', stage: last.stage },
        toast: false,
      });
      setPhase({ kind: 'failed', progress: last });
    }
  };

  const start = () => {
    if (phase.kind !== 'review') return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const created = createImportJob({
      imported: phase.imported,
      choice: { name: trimmed, includeTokens, includeFog },
      map: createMapTarget(),
      table: table ?? createTableImportTarget(),
    });
    job.current = created;
    void run(created);
  };

  async function discard() {
    const current = job.current;
    setPhase({ kind: 'discarding' });
    try {
      await current?.discard();
      reset();
      onClose();
    } catch (error) {
      reportError(error, {
        userMessage: 'Não conseguimos apagar o mapa incompleto.',
        hint: 'Apague o mapa pela lista de mapas.',
        context: { feature: 'export', action: 'discard-import' },
      });
      reset();
      onClose();
    }
  }

  const footer = (() => {
    if (phase.kind === 'review') {
      return (
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button icon={<FileUp size={16} />} disabled={!name.trim()} onClick={start}>
            Importar
          </Button>
        </>
      );
    }
    if (phase.kind === 'failed' || phase.kind === 'discarding') {
      const discarding = phase.kind === 'discarding';
      return (
        <>
          <Button variant="secondary" loading={discarding} onClick={() => void discard()}>
            Cancelar e apagar o mapa incompleto
          </Button>
          <Button disabled={discarding} onClick={() => job.current && void run(job.current)}>
            Tentar de novo
          </Button>
        </>
      );
    }
    if (phase.kind === 'pick') {
      return (
        <Button variant="secondary" onClick={close}>
          Fechar
        </Button>
      );
    }
    return null;
  })();

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Importar mapa"
      description="Cria um mapa novo na mesa a partir de um arquivo exportado pelo rpgmaps."
      footer={footer}
    >
      {phase.kind === 'pick' && (
        <div className={styles.stack}>
          <div className={styles.field}>
            <label htmlFor={fileId} className={styles.label}>
              Arquivo do mapa ({MAP_FILE_EXTENSION})
            </label>
            <input
              id={fileId}
              type="file"
              accept={ACCEPTED_FILES}
              className={styles.fileInput}
              disabled={phase.reading}
              onChange={(event) => void readFile(event)}
            />
          </div>
          {phase.reading && <p className={styles.hint}>Lendo o arquivo…</p>}
          {phase.errors.length > 0 && (
            <div role="alert" className={styles.field}>
              <p className={styles.error}>Este arquivo não pode ser importado:</p>
              <ul className={styles.errorList}>
                {phase.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {phase.kind === 'review' && (
        <div className={styles.stack}>
          <dl className={styles.summary}>
            <dt>Arquivo</dt>
            <dd>{phase.fileName}</dd>
            <dt>Tamanho do mapa</dt>
            <dd>
              {phase.imported.model.size.width} × {phase.imported.model.size.depth} casas
            </dd>
          </dl>
          {phase.imported.legacy && (
            <p className={styles.hint}>
              Mapa no formato antigo: ele será convertido para o formato atual.
            </p>
          )}
          <TextField
            label="Nome do mapa novo"
            value={name}
            maxLength={MAX_MAP_NAME_LENGTH}
            onChange={(event) => setName(event.target.value)}
            error={name.trim() ? undefined : 'Dê um nome ao mapa.'}
          />
          <div className={styles.field}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={includeTokens}
                disabled={phase.imported.tokens.length === 0}
                onChange={(event) => setIncludeTokens(event.target.checked)}
              />
              Trazer os tokens ({phase.imported.tokens.length})
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={includeFog}
                disabled={phase.imported.fog === null}
                onChange={(event) => setIncludeFog(event.target.checked)}
              />
              Trazer a névoa
            </label>
          </div>
        </div>
      )}
      {phase.kind === 'running' && <ProgressBar progress={phase.progress} />}
      {(phase.kind === 'failed' || phase.kind === 'discarding') && (
        <div className={styles.stack}>
          {phase.kind === 'failed' && <ProgressBar progress={phase.progress} />}
          <p className={styles.error} role="alert">
            A importação parou no meio. O que já foi gravado continua lá: tente de novo para
            continuar de onde parou, ou cancele para apagar o mapa incompleto.
          </p>
        </div>
      )}
    </Dialog>
  );
}
