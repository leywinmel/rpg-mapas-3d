import { HEIGHT_STEP, MAX_LEVEL, STORY_HEIGHT_STEPS } from './constants';
import {
  isValidLevel,
  stepsToStory,
  stepsToWorld,
  storyToSteps,
  wallTopLevel,
  worldToSteps,
} from './height';

describe('height', () => {
  it('shouldKeepTheStepEqualToTheV1FloorStep', () => {
    // 0,5 é o degrau de chão do v1: é isso que faz o chão elevado converter sem mudar.
    expect(HEIGHT_STEP).toBe(0.5);
    expect(STORY_HEIGHT_STEPS * HEIGHT_STEP).toBe(2);
  });

  it('shouldConvertStepsToWorldUnits', () => {
    expect(stepsToWorld(0)).toBe(0);
    expect(stepsToWorld(1)).toBe(0.5);
    expect(stepsToWorld(4)).toBe(2);
    expect(stepsToWorld(MAX_LEVEL)).toBe(127.5);
  });

  it('shouldConvertWorldUnitsToTheNearestStep', () => {
    expect(worldToSteps(0)).toBe(0);
    expect(worldToSteps(1.5)).toBe(3);
    expect(worldToSteps(2)).toBe(4);
    // Altura quebrada (arquivo editado à mão) vai para o degrau mais perto.
    expect(worldToSteps(0.7)).toBe(1);
    expect(worldToSteps(0.8)).toBe(2);
  });

  it('shouldRoundTripEveryStep', () => {
    for (let steps = 0; steps <= MAX_LEVEL; steps += 1) {
      expect(worldToSteps(stepsToWorld(steps))).toBe(steps);
    }
  });

  it('shouldConvertStoriesToTheirFirstStep', () => {
    expect(storyToSteps(0)).toBe(0);
    expect(storyToSteps(1)).toBe(STORY_HEIGHT_STEPS);
    expect(storyToSteps(3)).toBe(12);
  });

  it('shouldFindTheStoryThatContainsAStep', () => {
    expect([0, 1, 2, 3].map(stepsToStory)).toEqual([0, 0, 0, 0]);
    expect([4, 5, 7].map(stepsToStory)).toEqual([1, 1, 1]);
    expect(stepsToStory(8)).toBe(2);
    expect(stepsToStory(storyToSteps(7))).toBe(7);
  });

  it('shouldAcceptOnlyWholeLevelsInsideTheLimit', () => {
    expect(isValidLevel(0)).toBe(true);
    expect(isValidLevel(MAX_LEVEL)).toBe(true);
    expect(isValidLevel(MAX_LEVEL + 1)).toBe(false);
    expect(isValidLevel(-1)).toBe(false);
    expect(isValidLevel(1.5)).toBe(false);
    expect(isValidLevel(Number.NaN)).toBe(false);
  });

  it('shouldAddBaseAndHeightToFindTheTopOfAWall', () => {
    expect(wallTopLevel({ level: 0, height: 8 })).toBe(8);
    expect(wallTopLevel({ level: 8, height: 4 })).toBe(12);
  });
});
