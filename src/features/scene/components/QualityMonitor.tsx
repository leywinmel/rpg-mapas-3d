import { PerformanceMonitor } from '@react-three/drei';
import { useQualityStore } from '../quality/quality-store';

/**
 * Quantas trocas de nível o monitor aceita antes de desistir de ajustar: sem isso, uma máquina
 * no limite ficaria alternando entre dois níveis (e a cena mudando de cara) sem parar.
 */
const MAX_FLIPFLOPS = 3;

/**
 * Mede os quadros por segundo e desce (ou sobe) um nível de qualidade no modo automático. Com a
 * escolha manual ele nem monta: a pessoa decidiu, a medição não manda.
 */
export function QualityMonitor() {
  const mode = useQualityStore((state) => state.mode);
  const decline = useQualityStore((state) => state.decline);
  const incline = useQualityStore((state) => state.incline);
  if (mode !== 'auto') return null;
  return <PerformanceMonitor onDecline={decline} onIncline={incline} flipflops={MAX_FLIPFLOPS} />;
}
