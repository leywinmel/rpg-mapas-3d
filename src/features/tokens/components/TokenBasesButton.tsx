import { CircleDashed, CircleDot } from 'lucide-react';
import { IconButton } from '@/components';
import { useTokenViewStore } from '../hooks/token-view-store';

const ICON_SIZE = 18;

/** Botão da barra da sala: tira ou põe de volta a base redonda dos tokens, só na vista de quem clica. */
export function TokenBasesButton() {
  const showBases = useTokenViewStore((state) => state.showBases);
  const toggleBases = useTokenViewStore((state) => state.toggleBases);
  return (
    <IconButton
      label={showBases ? 'Esconder a base dos tokens' : 'Mostrar a base dos tokens'}
      icon={showBases ? <CircleDot size={ICON_SIZE} /> : <CircleDashed size={ICON_SIZE} />}
      onClick={toggleBases}
    />
  );
}
