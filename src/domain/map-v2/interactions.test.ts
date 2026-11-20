import { describe, expect, it } from 'vitest';
import { assetAction, isInteractive, toggleOpen, withOpen } from './interactions';
import { createEmptyMap, getChunk } from './model';
import { placePiece } from './operations';
import { pieceSchema } from './schema';
import { makePiece, unwrap } from './test-fixtures';
import type { MapModel } from './types';

const size = { width: 40, depth: 40 };
const VAN = makePiece({
  id: 'van-1',
  asset: { source: 'catalog', key: 'mod-van' },
  footprint: { width: 3, depth: 6 },
});

function withPiece(piece = VAN): MapModel {
  return unwrap(placePiece(createEmptyMap(size), piece));
}

const pieceIn = (model: MapModel) => getChunk(model, { cx: 0, cz: 0 }).pieces[0]!;

describe('peças com interação (RPG-44)', () => {
  it('shouldKnowWhichPiecesHaveSomethingToOperate', () => {
    expect(isInteractive(VAN)).toBe(true);
    expect(assetAction({ source: 'catalog', key: 'mod-trator-pa' })?.open).toBe('Levantar a pá');
    expect(isInteractive(makePiece())).toBe(false);
    expect(isInteractive(makePiece({ asset: { source: 'upload', assetId: 'mod-van' } }))).toBe(
      false,
    );
  });

  it('shouldOpenAndCloseAndSaveNothingWhenClosed', () => {
    const opened = unwrap(toggleOpen(withPiece(), VAN));
    expect(pieceIn(opened).open).toBe(true);
    const closed = unwrap(toggleOpen(opened, VAN));
    expect('open' in pieceIn(closed)).toBe(false);
  });

  it('shouldReturnTheSameModelForAPieceWithoutInteraction', () => {
    const barrel = makePiece({ x: 1, z: 1 });
    const model = withPiece(barrel);
    expect(unwrap(toggleOpen(model, barrel))).toBe(model);
  });

  it('shouldAcceptOnlyTrueAsTheOpenMark', () => {
    expect(pieceSchema.safeParse(withOpen(VAN, true)).success).toBe(true);
    expect(pieceSchema.safeParse({ ...VAN, open: false }).success).toBe(false);
    expect(withOpen(withOpen(VAN, true), false)).toEqual(VAN);
  });
});
