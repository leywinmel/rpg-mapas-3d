import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button, notify } from '@/components';
import type { FogState } from '@/domain';
import { MAP_FILE_EXTENSION } from '@/domain/map-export';
import { useTokensStore, type TableView } from '@/features/tokens';
import { reportError } from '@/lib/report-error';
import { fileNameFor, type Downloader } from '../services/download';
import { createMapFileBlob } from '../services/map-file';
import styles from './export.module.css';

type JsonExportSectionProps = {
  view: TableView;
  fog: FogState | null;
  download: Downloader;
};

/** O arquivo próprio do mapa (.rpgmap.json), para guardar ou levar a outra mesa. Só o mestre. */
export function JsonExportSection({ view, fog, download }: JsonExportSectionProps) {
  const tokens = useTokensStore((state) => state.tokens);
  const [includeTokens, setIncludeTokens] = useState(true);
  const [includeFog, setIncludeFog] = useState(true);

  const save = () => {
    try {
      const blob = createMapFileBlob({
        name: view.name ?? '',
        model: view.model,
        tokens: includeTokens ? tokens : null,
        fog: includeFog ? fog : null,
      });
      download(blob, fileNameFor(view.name, MAP_FILE_EXTENSION));
      notify.success('Arquivo do mapa baixado.', 'Use "Importar mapa" para abrir em outra mesa.');
    } catch (error) {
      reportError(error, {
        userMessage: 'Não conseguimos gerar o arquivo do mapa.',
        hint: 'Tente de novo em instantes.',
        context: { feature: 'export', action: 'export-json', mapId: view.mapId },
      });
    }
  };

  return (
    <div className={styles.stack}>
      <p className={styles.hint}>
        O mapa inteiro num arquivo que o rpgmaps abre de novo: chão, paredes e objetos, como está na
        tela agora.
      </p>
      <div className={styles.field}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={includeTokens && tokens.length > 0}
            disabled={tokens.length === 0}
            onChange={(event) => setIncludeTokens(event.target.checked)}
          />
          Levar os tokens ({tokens.length})
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={includeFog && fog !== null}
            disabled={fog === null}
            onChange={(event) => setIncludeFog(event.target.checked)}
          />
          Levar a névoa
        </label>
      </div>
      <Button icon={<FileDown size={16} />} onClick={save}>
        Baixar o arquivo do mapa
      </Button>
    </div>
  );
}
