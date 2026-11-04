import { useId, useMemo, useState } from 'react';
import { Box, Crosshair } from 'lucide-react';
import {
  Button,
  IconButton,
  notify,
  SegmentedControl,
  TextField,
  type SegmentOption,
} from '@/components';
import { isCellCovered, type Cell, type FogState } from '@/domain';
import { cropMapChunks } from '@/domain/map-export';
import { intersectRects, mapRect, type CellRect, type MapChunk } from '@/domain/map-v2';
import type { TableView } from '@/features/tokens';
import { logger } from '@/lib/logger';
import { reportError } from '@/lib/report-error';
import { DEFAULT_RECT_SIDE, GLB_EXTENSION, GLB_WARNING_BYTES } from '../constants';
import { estimateGlbBytes } from '../glb/map-instances';
import { useExportStore } from '../hooks/export-store';
import { fileNameFor, formatBytes, formatSeconds, type Downloader } from '../services/download';
import styles from './export.module.css';

type Area = 'visible' | 'rect' | 'full';

const AREA_OPTIONS: ReadonlyArray<SegmentOption<Area>> = [
  { value: 'visible', label: 'Vista' },
  { value: 'rect', label: 'Retângulo' },
  { value: 'full', label: 'Mapa inteiro' },
];
/** O mapa inteiro tem o que a névoa cobre: o jogador escolhe só a vista ou um retângulo. */
const PLAYER_AREAS = AREA_OPTIONS.filter((option) => option.value !== 'full');

type RectField = keyof CellRect;
const RECT_FIELDS: ReadonlyArray<{ key: RectField; label: string }> = [
  { key: 'x', label: 'Começa na coluna' },
  { key: 'z', label: 'Começa na linha' },
  { key: 'width', label: 'Largura (casas)' },
  { key: 'depth', label: 'Profundidade (casas)' },
];

function centeredRect(view: TableView): CellRect {
  const { width, depth } = view.model.size;
  const side = {
    width: Math.min(width, DEFAULT_RECT_SIDE),
    depth: Math.min(depth, DEFAULT_RECT_SIDE),
  };
  return {
    x: Math.floor((width - side.width) / 2),
    z: Math.floor((depth - side.depth) / 2),
    ...side,
  };
}

const describeRect = (rect: CellRect) =>
  `${rect.width} × ${rect.depth} casas, a partir da casa (${rect.x}, ${rect.z})`;

type GlbExportSectionProps = {
  view: TableView;
  /** Névoa de quem exporta, se ela esconde algo dele (jogador); null para o mestre. */
  hiddenBy: FogState | null;
  isGameMaster: boolean;
  download: Downloader;
};

type ExportState =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'done'; bytes: number; milliseconds: number; chunks: readonly MapChunk[] };

/** O mapa (ou um pedaço dele) como modelo 3D .glb, para abrir no Blender ou imprimir. */
export function GlbExportSection({
  view,
  hiddenBy,
  isGameMaster,
  download,
}: GlbExportSectionProps) {
  const scene = useExportStore((state) => state.scene);
  const [area, setArea] = useState<Area>('visible');
  const [draft, setDraft] = useState<CellRect>(() => centeredRect(view));
  const [state, setState] = useState<ExportState>({ kind: 'idle' });
  const fieldId = useId();
  const { model } = view;

  // A câmera muda a cada quadro: a vista é medida ao abrir e quando a pessoa pede.
  const [visible, setVisible] = useState(
    () => useExportStore.getState().scene?.visibleRect() ?? null,
  );
  const target = useMemo((): CellRect | null => {
    if (area === 'full' && isGameMaster) return mapRect(model.size);
    if (area === 'rect') return intersectRects(mapRect(model.size), draft);
    return visible;
  }, [area, isGameMaster, model.size, draft, visible]);
  const chunks = useMemo(() => {
    if (!target) return [];
    const isHidden =
      hiddenBy?.enabled === true ? (cell: Cell) => isCellCovered(hiddenBy, cell) : undefined;
    return cropMapChunks(model, { rect: target, isHidden });
  }, [model, target, hiddenBy]);
  const estimate = useMemo(() => estimateGlbBytes(chunks), [chunks]);

  const setRectField = (key: RectField, value: string) => {
    const number = Math.trunc(Number(value));
    if (Number.isFinite(number)) setDraft((current) => ({ ...current, [key]: number }));
  };

  const run = async () => {
    if (!target || chunks.length === 0) return;
    setState({ kind: 'busy' });
    try {
      // O exportador do three só baixa agora [#68].
      const { exportMapGlb } = await import('../glb/glb-export');
      const result = await exportMapGlb({
        chunks,
        cutaway: view.cutaway,
        modelUrls: view.modelUrls,
      });
      download(result.blob, fileNameFor(view.name, GLB_EXTENSION));
      logger.info('Modelo 3D exportado.', {
        feature: 'export',
        cells: target.width * target.depth,
        chunks: chunks.length,
        bytes: result.bytes,
        estimate,
        milliseconds: Math.round(result.milliseconds),
      });
      // O resultado vale para esta área: mudou a área, ele some.
      setState({ kind: 'done', bytes: result.bytes, milliseconds: result.milliseconds, chunks });
      if (result.missingModels > 0) {
        notify.warning(
          'Alguns modelos 3D não carregaram.',
          'Eles saíram no arquivo como caixas marcadas.',
        );
      }
    } catch (error) {
      setState({ kind: 'idle' });
      reportError(error, {
        userMessage: 'Não conseguimos gerar o modelo 3D.',
        hint: 'Tente uma área menor.',
        context: { feature: 'export', action: 'export-glb', mapId: view.mapId },
      });
    }
  };

  const options = isGameMaster ? AREA_OPTIONS : PLAYER_AREAS;
  return (
    <div className={styles.stack}>
      <p className={styles.hint}>
        Chão, paredes e objetos como estão na tela (com o corte de andares). Os tokens ficam de
        fora.
        {!isGameMaster && ' Só sai o que a névoa deixa você ver.'}
      </p>
      <SegmentedControl label="Área do modelo" options={options} value={area} onChange={setArea} />

      {area === 'visible' && (
        <p className={styles.areaLine}>
          <span>{visible ? describeRect(visible) : 'Não deu para medir a vista.'}</span>
          <IconButton
            label="Medir a vista de novo"
            icon={<Crosshair size={14} />}
            size="sm"
            disabled={!scene}
            onClick={() => setVisible(scene?.visibleRect() ?? null)}
          />
        </p>
      )}
      {area === 'rect' && (
        <div className={styles.rectGrid}>
          {RECT_FIELDS.map((field) => (
            <TextField
              key={field.key}
              id={`${fieldId}-${field.key}`}
              label={field.label}
              type="number"
              inputMode="numeric"
              min={field.key === 'x' || field.key === 'z' ? 0 : 1}
              value={draft[field.key]}
              onChange={(event) => setRectField(field.key, event.target.value)}
            />
          ))}
        </div>
      )}
      {area === 'rect' && !target && (
        <p className={styles.error} role="alert">
          O retângulo está fora do mapa ({model.size.width} × {model.size.depth} casas).
        </p>
      )}
      {area === 'full' && <p className={styles.areaLine}>{describeRect(mapRect(model.size))}</p>}

      {target && chunks.length === 0 && (
        <p className={styles.hint}>Não há nada à vista nessa área para exportar.</p>
      )}
      {chunks.length > 0 && (
        <p className={estimate > GLB_WARNING_BYTES ? styles.warning : styles.hint}>
          Tamanho estimado: {formatBytes(estimate)}.
          {estimate > GLB_WARNING_BYTES &&
            ' É um arquivo grande e pode levar um tempo para gerar; uma área menor sai mais rápido.'}
        </p>
      )}
      <Button
        icon={<Box size={16} />}
        loading={state.kind === 'busy'}
        disabled={chunks.length === 0}
        onClick={() => void run()}
      >
        Baixar o modelo 3D (.glb)
      </Button>
      {state.kind === 'done' && state.chunks === chunks && (
        <p className={styles.result} role="status">
          Arquivo de {formatBytes(state.bytes)} gerado em {formatSeconds(state.milliseconds)}.
        </p>
      )}
    </div>
  );
}
