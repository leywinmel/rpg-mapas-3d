import { Radio, X } from 'lucide-react';
import { IconButton } from '@/components';
import { measureCells } from '@/domain';
import { formatMeasurement } from '../format';
import { useTableToolsStore } from '../hooks/table-tools-store';
import styles from './table-tools.module.css';

function RulerHint() {
  const ruler = useTableToolsStore((state) => state.ruler);
  const share = useTableToolsStore((state) => state.shareRuler);
  const setShare = useTableToolsStore((state) => state.setShareRuler);
  return (
    <>
      <span className={styles.hintText}>
        {ruler ? (
          <strong className={styles.readout}>
            {formatMeasurement(measureCells(ruler.from, ruler.to))}
          </strong>
        ) : (
          'Arraste no mapa para medir.'
        )}
      </span>
      <IconButton
        size="sm"
        label={share ? 'Parar de mostrar a régua à mesa' : 'Mostrar a régua à mesa, ao vivo'}
        icon={<Radio size={16} />}
        active={share}
        onClick={() => setShare(!share)}
      />
    </>
  );
}

/**
 * Faixa curta sob a barra da sala enquanto uma ferramenta está ligada: o que fazer, a medida da
 * régua e o botão de compartilhar. Esc apaga a régua; de novo, desliga a ferramenta.
 */
export function ToolHint() {
  const tool = useTableToolsStore((state) => state.tool);
  const setTool = useTableToolsStore((state) => state.setTool);
  if (tool === 'none') return null;
  return (
    <div className={styles.hint}>
      {tool === 'ruler' ? (
        <RulerHint />
      ) : (
        <span className={styles.hintText}>Clique no mapa para marcar um ponto para a mesa.</span>
      )}
      <IconButton
        size="sm"
        label={tool === 'ruler' ? 'Guardar a régua' : 'Parar de marcar'}
        icon={<X size={16} />}
        onClick={() => setTool('none')}
      />
    </div>
  );
}
