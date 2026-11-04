import { FOG_SCENE, fogLiftFor } from './fog-scene';

describe('fogLiftFor', () => {
  it('shouldStayCloseToTheFloorWhenTheCameraIsNear', () => {
    expect(fogLiftFor(10)).toBe(FOG_SCENE.lift);
  });

  it('shouldRiseWithTheCameraOnHugeMaps', () => {
    expect(fogLiftFor(700)).toBeGreaterThan(1);
  });
});
