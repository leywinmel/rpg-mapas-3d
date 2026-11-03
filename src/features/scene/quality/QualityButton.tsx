import { Gauge } from 'lucide-react';
import { IconButton } from '@/components';
import { nextQualityMode, qualityButtonLabel } from './quality';
import { useQualityLevel, useQualityStore } from './quality-store';

/** Botão discreto da sala: cada clique passa para a próxima opção de qualidade. */
export function QualityButton() {
  const mode = useQualityStore((state) => state.mode);
  const setMode = useQualityStore((state) => state.setMode);
  const level = useQualityLevel();
  return (
    <IconButton
      label={qualityButtonLabel(mode, level)}
      icon={<Gauge size={18} />}
      onClick={() => setMode(nextQualityMode(mode))}
    />
  );
}
