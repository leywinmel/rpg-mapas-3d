import { MapPin, Ruler } from 'lucide-react';
import { IconButton } from '@/components';
import { useTableToolsStore } from '../hooks/table-tools-store';

/** Botões da régua e do ping na barra da sala (um liga, o outro desliga). */
export function TableToolButtons() {
  const tool = useTableToolsStore((state) => state.tool);
  const toggleTool = useTableToolsStore((state) => state.toggleTool);
  return (
    <>
      <IconButton
        label={tool === 'ruler' ? 'Guardar a régua' : 'Régua: medir distâncias'}
        icon={<Ruler size={18} />}
        active={tool === 'ruler'}
        onClick={() => toggleTool('ruler')}
      />
      <IconButton
        label={tool === 'ping' ? 'Parar de marcar' : 'Marcar um ponto no mapa (Alt+clique)'}
        icon={<MapPin size={18} />}
        active={tool === 'ping'}
        onClick={() => toggleTool('ping')}
      />
    </>
  );
}
