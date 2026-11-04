import { useState } from 'react';
import { Download, Map as MapIcon } from 'lucide-react';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  SegmentedControl,
  type SegmentOption,
} from '@/components';
import { useFogStore } from '@/features/fog';
import { useTokensStore } from '@/features/tokens';
import { downloadBlob, type Downloader } from '../services/download';
import { GlbExportSection } from './GlbExportSection';
import { JsonExportSection } from './JsonExportSection';
import { PngExportSection } from './PngExportSection';
import styles from './export.module.css';

type ExportFormat = 'json' | 'png' | 'glb';

const FORMAT_OPTIONS: ReadonlyArray<SegmentOption<ExportFormat>> = [
  { value: 'json', label: 'Arquivo' },
  { value: 'png', label: 'Imagem' },
  { value: 'glb', label: 'Modelo 3D' },
];

/** O arquivo próprio leva o mapa inteiro, com o que a névoa cobre: só o mestre baixa. */
const PLAYER_FORMATS = FORMAT_OPTIONS.filter((option) => option.value !== 'json');

export type ExportPanelProps = {
  isGameMaster: boolean;
  onClose: () => void;
  /** Troca o download do navegador (nos testes). */
  download?: Downloader;
};

function ExportBody({ isGameMaster, download = downloadBlob }: Omit<ExportPanelProps, 'onClose'>) {
  const view = useTokensStore((state) => state.view);
  const fogStatus = useFogStore((state) => state.status);
  const fog = useFogStore((state) => state.fog);
  const [format, setFormat] = useState<ExportFormat>('png');

  if (!view) {
    return (
      <EmptyState
        icon={<MapIcon size={22} />}
        title="Nenhum mapa aberto"
        description="A exportação usa o mapa que está na tela."
      />
    );
  }
  // O jogador só exporta com a névoa na mão: é ela que diz o que fica de fora do arquivo.
  if (!isGameMaster && fogStatus === 'error') {
    return (
      <ErrorState
        title="Não deu para carregar a névoa"
        description="Sem ela não sabemos o que pode sair no arquivo."
        onRetry={() => useFogStore.getState().retryLoad()}
      />
    );
  }
  if (!isGameMaster && (fogStatus !== 'ready' || !fog)) {
    return <LoadingState label="Carregando a névoa…" />;
  }

  const options = isGameMaster ? FORMAT_OPTIONS : PLAYER_FORMATS;
  return (
    <div className={styles.stack}>
      <SegmentedControl
        label="O que exportar"
        options={options}
        value={format}
        onChange={setFormat}
      />
      {format === 'json' && isGameMaster && (
        <JsonExportSection view={view} fog={fog} download={download} />
      )}
      {format === 'png' && <PngExportSection view={view} download={download} />}
      {format === 'glb' && (
        <GlbExportSection
          view={view}
          hiddenBy={isGameMaster ? null : fog}
          isGameMaster={isGameMaster}
          download={download}
        />
      )}
    </div>
  );
}

/** Painel "Exportar" da barra da mesa: arquivo do mapa (mestre), imagem PNG e modelo 3D .glb. */
export function ExportPanel({ onClose, ...body }: ExportPanelProps) {
  return (
    <Panel
      title="Exportar"
      icon={<Download size={18} />}
      onClose={onClose}
      className={styles.panel}
    >
      <ExportBody {...body} />
    </Panel>
  );
}
