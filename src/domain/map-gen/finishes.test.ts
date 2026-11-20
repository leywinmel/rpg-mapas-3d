import { describe, expect, it } from 'vitest';
import { findFinish, FINISHES, finishStyle } from './finishes';
import { STYLE_KITS } from './kits';

describe('acabamentos', () => {
  it('shouldOfferBrickWoodPlasterAndStone', () => {
    expect(FINISHES.map((finish) => finish.id)).toEqual(['tijolo', 'madeira', 'reboco', 'pedra']);
  });

  it('shouldKeepTheRoleOfEachWallWhenTheFinishChanges', () => {
    const stone = findFinish('pedra')!;
    const brick = STYLE_KITS.modern.walls.house[0]!;
    expect(finishStyle(brick.plain, stone)).toBe(stone.walls.plain);
    expect(finishStyle(brick.door, stone)).toBe(stone.walls.door);
    expect(finishStyle(brick.window, stone)).toBe(stone.walls.window);
  });

  it('shouldTurnEveryHouseWallOfEveryStyleIntoTheFinish', () => {
    const wood = findFinish('madeira')!;
    const options = new Set<string>([wood.walls.plain, wood.walls.door, wood.walls.window]);
    for (const kit of Object.values(STYLE_KITS)) {
      for (const set of Object.values(kit.walls).flat()) {
        expect(options.has(finishStyle(set.plain, wood))).toBe(true);
        expect(options.has(finishStyle(set.door, wood))).toBe(true);
      }
    }
  });

  it('shouldLeaveFencesAndUnknownWallsAlone', () => {
    const brick = findFinish('tijolo')!;
    expect(finishStyle('grade', brick)).toBe('grade');
    expect(finishStyle('estilo-que-nao-existe', brick)).toBe('estilo-que-nao-existe');
  });
});
