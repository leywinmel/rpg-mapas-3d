import { describe, expect, it } from 'vitest';
import { worldToSteps } from '@/domain/map-v2';
import { pieceCatalog } from '@/features/scene';
import { DEFAULT_PIECE_HEIGHT_STEPS, pieceHeightSteps } from './piece-heights';

describe('piece heights', () => {
  it('shouldUseTheHeightTheCatalogKnows', () => {
    const measured = pieceCatalog.list('prop').find((entry) => entry.height !== undefined);
    expect(measured).toBeDefined();
    const asset = { source: 'catalog', key: measured!.key } as const;
    expect(pieceHeightSteps(asset)).toBe(worldToSteps(measured!.height!));
  });

  it('shouldFallBackToTheTypeTableAndThenToTheDefault', () => {
    expect(pieceHeightSteps({ source: 'catalog', key: 'mesa' })).toBe(2);
    const upload = { source: 'upload', assetId: '11111111-1111-4111-8111-111111111111' } as const;
    expect(pieceHeightSteps(upload)).toBe(DEFAULT_PIECE_HEIGHT_STEPS);
  });
});
