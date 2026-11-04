import { useState } from 'react';
import { ImageDown } from 'lucide-react';
import { Button, notify } from '@/components';
import type { TableView } from '@/features/tokens';
import { reportError } from '@/lib/report-error';
import { PNG_EXTENSION } from '../constants';
import { useExportStore } from '../hooks/export-store';
import { fileNameFor, type Downloader } from '../services/download';
import styles from './export.module.css';

type PngExportSectionProps = { view: TableView; download: Downloader };

/** A imagem da vista atual, do tamanho e na qualidade da tela. */
export function PngExportSection({ view, download }: PngExportSectionProps) {
  const scene = useExportStore((state) => state.scene);
  const [hideUi, setHideUi] = useState(false);
  const [busy, setBusy] = useState(false);

  const capture = async () => {
    if (!scene) return;
    setBusy(true);
    try {
      const blob = await scene.capturePng({ hideUi });
      download(blob, fileNameFor(view.name, PNG_EXTENSION));
      notify.success('Imagem baixada.');
    } catch (error) {
      reportError(error, {
        userMessage: 'Não conseguimos gerar a imagem.',
        hint: 'Tente de novo em instantes.',
        context: { feature: 'export', action: 'export-png', mapId: view.mapId },
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.stack}>
      <p className={styles.hint}>
        A cena do jeito que está na tela: mesmo enquadramento, tamanho e qualidade.
      </p>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={hideUi}
          onChange={(event) => setHideUi(event.target.checked)}
        />
        Esconder a grade e a interface
      </label>
      <Button
        icon={<ImageDown size={16} />}
        loading={busy}
        disabled={!scene}
        onClick={() => void capture()}
      >
        Baixar a imagem PNG
      </Button>
      {!scene && <p className={styles.hint}>A cena ainda está carregando.</p>}
    </div>
  );
}
