import type { Measurement } from '@/domain';

const meters = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** "1 casa · 1,5 m", "4 casas · 6 m": o texto da régua. */
export function formatMeasurement({ cells, meters: distance }: Measurement): string {
  const unit = cells === 1 ? 'casa' : 'casas';
  return `${cells} ${unit} · ${meters.format(distance)} m`;
}
