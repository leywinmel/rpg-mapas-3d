import { MAX_LEVEL, MAX_WALL_HEIGHT_STEPS } from './constants';
import { createEmptyMap } from './model';
import { placePiece, placeWall } from './operations';
import { makePiece, makeWall, unwrap } from './test-fixtures';
import {
  cutawayShowingUpToStory,
  effectiveCutaway,
  isPieceVisible,
  isValidCutaway,
  MAX_CUTAWAY,
  NO_CUTAWAY,
  stepCutaway,
  storyShownByCutaway,
  topStory,
  visibleWallHeight,
  type Cutaway,
} from './cutaway';

describe('cutaway: what stays hidden', () => {
  it('shouldShowEverythingWithoutACut', () => {
    expect(isPieceVisible({ level: MAX_LEVEL }, NO_CUTAWAY)).toBe(true);
    expect(visibleWallHeight({ level: 100, height: 16 }, NO_CUTAWAY)).toBe(16);
  });

  it('shouldHidePiecesThatStartAtOrAboveTheCut', () => {
    expect(isPieceVisible({ level: 3 }, 4)).toBe(true);
    expect(isPieceVisible({ level: 4 }, 4)).toBe(false);
    expect(isPieceVisible({ level: 9 }, 4)).toBe(false);
  });

  it('shouldKeepATallPieceWhoseBaseIsBelowTheCut', () => {
    // O modelo é uma peça só: não dá para serrar no meio, então a base decide.
    expect(isPieceVisible({ level: 0 }, 1)).toBe(true);
  });

  it('shouldHideEverythingWithACutAtZero', () => {
    expect(isPieceVisible({ level: 0 }, 0)).toBe(false);
    expect(visibleWallHeight({ level: 0, height: 8 }, 0)).toBe(0);
  });

  it('shouldKeepAWholeWallBelowTheCut', () => {
    expect(visibleWallHeight({ level: 0, height: 8 }, 8)).toBe(8);
    expect(visibleWallHeight({ level: 0, height: 8 }, 40)).toBe(8);
  });

  it('shouldShortenAWallThatTheCutPassesThrough', () => {
    expect(visibleWallHeight({ level: 0, height: 8 }, 5)).toBe(5);
    expect(visibleWallHeight({ level: 4, height: 8 }, 6)).toBe(2);
    expect(visibleWallHeight({ level: 4, height: 8 }, 5)).toBe(1);
  });

  it('shouldHideAWallThatStartsAtOrAboveTheCut', () => {
    expect(visibleWallHeight({ level: 8, height: 4 }, 8)).toBe(0);
    expect(visibleWallHeight({ level: 12, height: 4 }, 8)).toBe(0);
  });
});

describe('cutaway: the master lock', () => {
  const effective = (own: Cutaway, locked: Cutaway, isMaster = false) =>
    effectiveCutaway({ own, locked, isMaster });

  it('shouldUseThePlayersOwnCutWhenTheTableIsFree', () => {
    expect(effective(6, null)).toBe(6);
    expect(effective(null, null)).toBeNull();
  });

  it('shouldUseTheLockWhenThePlayerHasNoCutOfTheirOwn', () => {
    expect(effective(null, 8)).toBe(8);
  });

  it('shouldUseTheLowerCutBetweenThePlayerAndTheLock', () => {
    expect(effective(4, 8)).toBe(4);
    expect(effective(12, 8)).toBe(8);
    expect(effective(8, 8)).toBe(8);
    expect(effective(0, 8)).toBe(0);
  });

  it('shouldNotAffectTheMaster', () => {
    expect(effective(null, 4, true)).toBeNull();
    expect(effective(12, 4, true)).toBe(12);
    expect(effective(2, 4, true)).toBe(2);
  });
});

describe('cutaway: values', () => {
  it('shouldAcceptNullOrAWholeNumberInsideTheLimit', () => {
    expect(isValidCutaway(null)).toBe(true);
    expect(isValidCutaway(0)).toBe(true);
    expect(isValidCutaway(MAX_CUTAWAY)).toBe(true);
    expect(MAX_CUTAWAY).toBe(MAX_LEVEL + MAX_WALL_HEIGHT_STEPS);
  });

  it('shouldRejectEverythingElse', () => {
    expect(isValidCutaway(-1)).toBe(false);
    expect(isValidCutaway(MAX_CUTAWAY + 1)).toBe(false);
    expect(isValidCutaway(2.5)).toBe(false);
    expect(isValidCutaway(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isValidCutaway(undefined)).toBe(false);
    expect(isValidCutaway('4')).toBe(false);
  });

  it('shouldCutJustAboveAStoryToShowItAndTheOnesBelow', () => {
    // Mostrar até o andar 1 (o primeiro sobrado): esconde o que começa no degrau 8, o andar 2.
    expect(cutawayShowingUpToStory(0)).toBe(4);
    expect(cutawayShowingUpToStory(1)).toBe(8);
    expect(isPieceVisible({ level: 4 }, cutawayShowingUpToStory(1))).toBe(true);
    expect(isPieceVisible({ level: 8 }, cutawayShowingUpToStory(1))).toBe(false);
  });
});

describe('cutaway: the story-by-story control', () => {
  it('shouldFindTheHighestStoryWhereSomethingStarts', () => {
    const empty = createEmptyMap({ width: 40, depth: 40 });
    expect(topStory(empty)).toBe(0);
    const withWall = unwrap(placeWall(empty, makeWall({ x: 35, z: 3, level: 8, height: 4 })));
    expect(topStory(withWall)).toBe(2);
    const withPiece = unwrap(placePiece(withWall, makePiece({ level: 13 })));
    expect(topStory(withPiece)).toBe(3);
  });

  it('shouldNameTheStoryEachCutShows', () => {
    expect(storyShownByCutaway(NO_CUTAWAY)).toBeNull();
    expect(storyShownByCutaway(4)).toBe(0);
    expect(storyShownByCutaway(8)).toBe(1);
    expect(storyShownByCutaway(6)).toBe(1);
    expect(storyShownByCutaway(0)).toBe(0);
  });

  it('shouldGoDownFromNoCutToTheStoryBelowTheTop', () => {
    expect(stepCutaway(NO_CUTAWAY, 'down', 3)).toBe(12);
    expect(stepCutaway(12, 'down', 3)).toBe(8);
    expect(stepCutaway(4, 'down', 3)).toBe(4);
  });

  it('shouldGoUpUntilTheCutHidesNothing', () => {
    expect(stepCutaway(4, 'up', 3)).toBe(8);
    expect(stepCutaway(12, 'up', 3)).toBeNull();
    expect(stepCutaway(NO_CUTAWAY, 'up', 3)).toBeNull();
  });

  it('shouldStillOfferTheGroundFloorOnAFlatMap', () => {
    expect(stepCutaway(NO_CUTAWAY, 'down', 0)).toBe(4);
    expect(stepCutaway(4, 'up', 0)).toBeNull();
  });
});

describe('cutaway: tall walls count as stories', () => {
  it('shouldOfferACutInsideATwoStoryWallStandingOnTheGround', () => {
    const empty = createEmptyMap({ width: 8, depth: 8 });
    const tall = unwrap(placeWall(empty, makeWall({ level: 0, height: 8 })));
    expect(topStory(tall)).toBe(1);
    expect(stepCutaway(NO_CUTAWAY, 'down', topStory(tall))).toBe(4);
  });
});
