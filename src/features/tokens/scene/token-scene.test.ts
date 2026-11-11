import {
  fitUploadedModel,
  headingOf,
  TOKEN_SHAPE,
  turnToward,
  UPLOADED_MODEL_FOOTPRINT,
} from './token-scene';

describe('fitUploadedModel', () => {
  it('shouldGiveATallModelTheHeightOfAFigure', () => {
    const fit = fitUploadedModel({ min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 10, z: 1 } });
    expect(fit.scale).toBeCloseTo(TOKEN_SHAPE.figureHeight / 10);
  });

  it('shouldKeepAWideBeastInsideItsCell', () => {
    const fit = fitUploadedModel({ min: { x: -2, y: 0, z: -1 }, max: { x: 2, y: 1, z: 1 } });
    expect(fit.scale).toBeCloseTo(UPLOADED_MODEL_FOOTPRINT / 4);
  });

  it('shouldStandTheModelCenteredOnTheBase', () => {
    const fit = fitUploadedModel({ min: { x: 1, y: -0.5, z: 3 }, max: { x: 3, y: 0.5, z: 5 } });
    const [x, y, z] = fit.position;
    expect(x + 2 * fit.scale).toBeCloseTo(0);
    expect(z + 4 * fit.scale).toBeCloseTo(0);
    expect(y - 0.5 * fit.scale).toBeCloseTo(TOKEN_SHAPE.baseHeight);
  });

  it('shouldNotBreakOnAnEmptyModel', () => {
    const fit = fitUploadedModel({ min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } });
    expect(fit.scale).toBe(1);
  });
});

describe('headingOf', () => {
  it('shouldKeepTheRestingFrontWhenWalkingSouth', () => {
    expect(headingOf(0, 1)).toBeCloseTo(0);
  });

  it('shouldTurnToTheSideItWalks', () => {
    expect(headingOf(1, 0)).toBeCloseTo(Math.PI / 2);
    expect(headingOf(-1, 0)).toBeCloseTo(-Math.PI / 2);
    expect(Math.abs(headingOf(0, -1) ?? 0)).toBeCloseTo(Math.PI);
  });

  it('shouldNotPickADirectionForATinyStep', () => {
    expect(headingOf(0.01, 0.01)).toBeNull();
  });
});

describe('turnToward', () => {
  it('shouldArriveWithAFullStep', () => {
    expect(turnToward(0, Math.PI / 2, 1)).toBeCloseTo(Math.PI / 2);
  });

  it('shouldTurnHalfwayWithHalfAStep', () => {
    expect(turnToward(0, Math.PI / 2, 0.5)).toBeCloseTo(Math.PI / 4);
  });

  it('shouldTakeTheShortWayAcrossTheBack', () => {
    // De quase meia-volta para um lado até quase meia-volta para o outro: são só 20 graus.
    const from = Math.PI - 0.17;
    const next = turnToward(from, -Math.PI + 0.17, 0.5);
    expect(next).toBeGreaterThan(from);
    expect(next).toBeCloseTo(Math.PI);
  });
});
