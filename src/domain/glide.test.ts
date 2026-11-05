import { glideProgress, interpolatePose, lerp, lerpAngleDegrees } from './glide';

describe('glideProgress', () => {
  it('shouldGoFromZeroToOneAndStayInside', () => {
    expect(glideProgress(0, 600)).toBe(0);
    expect(glideProgress(600, 600)).toBe(1);
    expect(glideProgress(-50, 600)).toBe(0);
    expect(glideProgress(9000, 600)).toBe(1);
  });

  it('shouldBeHalfWayAtHalfTheTimeAndEaseAtTheEnds', () => {
    expect(glideProgress(300, 600)).toBeCloseTo(0.5);
    expect(glideProgress(60, 600)).toBeLessThan(0.1);
    expect(glideProgress(540, 600)).toBeGreaterThan(0.9);
  });

  it('shouldArriveAtOnceWithoutDuration', () => {
    expect(glideProgress(0, 0)).toBe(1);
  });
});

describe('lerpAngleDegrees', () => {
  it('shouldTurnTheShortWay', () => {
    expect(lerpAngleDegrees(270, 0, 1)).toBeCloseTo(360);
    expect(lerpAngleDegrees(270, 0, 0.5)).toBeCloseTo(315);
    expect(lerpAngleDegrees(0, 270, 0.5)).toBeCloseTo(-45);
    expect(lerpAngleDegrees(0, 90, 0.5)).toBeCloseTo(45);
  });

  it('shouldStayStillWhenTheAngleDoesNotChange', () => {
    expect(lerpAngleDegrees(180, 180, 0.7)).toBe(180);
  });
});

describe('interpolatePose', () => {
  it('shouldMixPositionAndRotation', () => {
    const from = { x: 0, y: 0, z: 0, rotationY: 0 };
    const to = { x: 10, y: 2, z: -4, rotationY: 90 };
    expect(interpolatePose(from, to, 0)).toEqual(from);
    expect(interpolatePose(from, to, 1)).toEqual(to);
    expect(interpolatePose(from, to, 0.5)).toEqual({ x: 5, y: 1, z: -2, rotationY: 45 });
  });

  it('lerpShouldMixTwoNumbers', () => {
    expect(lerp(2, 4, 0.25)).toBe(2.5);
  });
});
