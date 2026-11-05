import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEmptyMap,
  findPiece,
  movePiece,
  placePiece,
  spotOf,
  type MapModel,
  type MapPiece,
  type PieceMovedMessage,
} from '@/domain/map-v2';
import { makePiece, unwrap } from '@/domain/map-v2/test-fixtures';
import { GLIDE_DURATION_MS, MAX_GLIDES_PER_CHANGE, PENDING_MOVE_TTL_MS } from '../constants';
import { useSceneryStore } from '../hooks/scenery-store';
import type { SceneryGlide } from '../types';
import {
  applyGlides,
  createGlide,
  glideForMessage,
  handleGameMasterChange,
  poseAt,
  poseOf,
  sceneryMoves,
  startGlide,
  visibleToPlayers,
} from './scenery-runtime';

const MAP_ID = '6f1c1a3e-6c3b-4f8e-9c55-2b1f0e1a7d01';
const OTHER_MAP_ID = '6f1c1a3e-6c3b-4f8e-9c55-2b1f0e1a7d02';
const size = { width: 64, depth: 64 };

const car = makePiece({
  id: 'carro-1',
  asset: { source: 'catalog', key: 'mod-caminhonete' },
  x: 2,
  z: 2,
  footprint: { width: 2, depth: 2 },
});
const pillar = makePiece({
  id: 'pilar-1',
  asset: { source: 'catalog', key: 'pilar' },
  x: 20,
  z: 20,
});
const base = unwrap(placePiece(unwrap(placePiece(createEmptyMap(size), car)), pillar));
const movedCar: MapPiece = { ...car, x: 10, z: 4, rotation: 1 };
const afterMove = unwrap(movePiece(base, car, spotOf(movedCar)));

function message(overrides: Partial<PieceMovedMessage> = {}): PieceMovedMessage {
  return { mapId: MAP_ID, pieceId: car.id, from: spotOf(car), to: spotOf(movedCar), ...overrides };
}

function glideOf(before: MapPiece, after: MapPiece, mapId = MAP_ID): SceneryGlide {
  return createGlide({ mapId, before, after, now: 0 });
}

beforeEach(() => {
  vi.useFakeTimers();
  useSceneryStore.getState().reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('sceneryMoves', () => {
  it('shouldFindTheMovedCarButNotTheFixedPieces', () => {
    expect(sceneryMoves(base, afterMove).map((move) => move.after.id)).toEqual([car.id]);
    const movedPillar = unwrap(movePiece(base, pillar, { ...spotOf(pillar), x: 30 }));
    expect(sceneryMoves(base, movedPillar)).toEqual([]);
  });

  it('shouldNotGlideAMassChange', () => {
    const barrels = Array.from({ length: MAX_GLIDES_PER_CHANGE + 1 }, (_, index) =>
      makePiece({ id: `barril-${index}`, x: index * 2, z: 0 }),
    );
    const before = barrels.reduce(
      (model, barrel) => unwrap(placePiece(model, barrel)),
      createEmptyMap(size),
    );
    const after = barrels.reduce(
      (model, barrel) => unwrap(movePiece(model, barrel, { ...spotOf(barrel), z: 10 })),
      before,
    );
    expect(sceneryMoves(before, after)).toEqual([]);
  });
});

describe('visibleToPlayers', () => {
  it('shouldSeeThePieceWhenAnyOfItsCellsIsOutOfTheFog', () => {
    expect(visibleToPlayers(car, null)).toBe(true);
    expect(visibleToPlayers(car, () => true)).toBe(false);
    expect(visibleToPlayers(car, (cell) => cell.x !== 3)).toBe(true);
  });
});

describe('poseAt', () => {
  it('shouldGoFromTheOldSpotToTheNewOneInTheGlideTime', () => {
    const glide = glideOf(car, movedCar);
    expect(poseAt(glide, 0)).toEqual(poseOf(car));
    expect(poseAt(glide, GLIDE_DURATION_MS)).toEqual(poseOf(movedCar));
    const middle = poseAt(glide, GLIDE_DURATION_MS / 2);
    expect(middle.x).toBeGreaterThan(poseOf(car).x);
    expect(middle.x).toBeLessThan(poseOf(movedCar).x);
  });

  it('shouldStartAChainedGlideWhereThePieceIsNow', () => {
    const first = glideOf(car, movedCar);
    const halfway = GLIDE_DURATION_MS / 2;
    const second = createGlide({
      mapId: MAP_ID,
      before: movedCar,
      after: { ...movedCar, x: 20 },
      now: halfway,
      previous: first,
    });
    expect(second.from).toEqual(poseAt(first, halfway));
    expect(second.origin).toEqual(spotOf(car));
    expect(second.serial).toBeGreaterThan(first.serial);
  });
});

describe('applyGlides', () => {
  it('shouldTakeTheGlidingPieceOutOfItsChunk', () => {
    const shown = applyGlides(base, MAP_ID, { [car.id]: glideOf(car, movedCar) });
    expect(findPiece(shown, car)).toBeUndefined();
    expect(findPiece(shown, movedCar)).toBeUndefined();
    expect(findPiece(shown, pillar)).toBeDefined();
  });

  it('shouldKeepTheArrivedPieceAtItsNewSpotBeforeTheDatabaseConfirms', () => {
    const settled = { ...glideOf(car, movedCar), gliding: false };
    expect(findPiece(applyGlides(base, MAP_ID, { [car.id]: settled }), movedCar)).toEqual(movedCar);
    // O banco confirmou: nada a ajustar, o mesmo modelo volta.
    expect(applyGlides(afterMove, MAP_ID, { [car.id]: settled })).toBe(afterMove);
  });

  it('shouldIgnoreGlidesOfAnotherMap', () => {
    expect(applyGlides(base, MAP_ID, { [car.id]: glideOf(car, movedCar, OTHER_MAP_ID) })).toBe(
      base,
    );
  });
});

describe('startGlide', () => {
  it('shouldSettleAfterTheGlideAndDropAfterTheWaitingTime', () => {
    startGlide(glideOf(car, movedCar), PENDING_MOVE_TTL_MS);
    expect(useSceneryStore.getState().glides[car.id]?.gliding).toBe(true);
    vi.advanceTimersByTime(GLIDE_DURATION_MS);
    expect(useSceneryStore.getState().glides[car.id]?.gliding).toBe(false);
    vi.advanceTimersByTime(PENDING_MOVE_TTL_MS);
    expect(useSceneryStore.getState().glides[car.id]).toBeUndefined();
  });

  it('shouldLetANewerGlideOutliveTheTimersOfTheOlderOne', () => {
    startGlide(glideOf(car, movedCar), 0);
    vi.advanceTimersByTime(GLIDE_DURATION_MS / 2);
    const newer = glideOf(movedCar, car);
    startGlide(newer, PENDING_MOVE_TTL_MS);
    vi.advanceTimersByTime(GLIDE_DURATION_MS / 2);
    expect(useSceneryStore.getState().glides[car.id]?.serial).toBe(newer.serial);
    expect(useSceneryStore.getState().glides[car.id]?.gliding).toBe(true);
  });
});

type GameMasterChange = Parameters<typeof handleGameMasterChange>[0];

describe('handleGameMasterChange', () => {
  function change(overrides: Partial<GameMasterChange> = {}) {
    const announce = vi.fn();
    handleGameMasterChange({
      mapId: MAP_ID,
      before: base,
      after: afterMove,
      shared: true,
      covers: null,
      announce,
      now: 0,
      ...overrides,
    });
    return announce;
  }

  it('shouldGlideLocallyAndTellTheTable', () => {
    const announce = change();
    expect(useSceneryStore.getState().glides[car.id]?.gliding).toBe(true);
    expect(announce).toHaveBeenCalledWith(message());
  });

  it('shouldNotTellTheTableAboutAMapItIsNotSeeing', () => {
    expect(change({ shared: false })).not.toHaveBeenCalled();
    expect(useSceneryStore.getState().glides[car.id]).toBeDefined();
  });

  it('shouldNotTellWhereAFoggedPieceIs', () => {
    // A caminhonete entra ou sai da névoa: o jogador só a vê aparecer ou sumir ao reler o mapa.
    expect(change({ covers: (cell) => cell.x < 5 })).not.toHaveBeenCalled();
    expect(change({ covers: (cell) => cell.x >= 5 })).not.toHaveBeenCalled();
  });

  it('shouldIgnoreAModelWithNoSceneryMove', () => {
    expect(change({ after: base })).not.toHaveBeenCalled();
    expect(useSceneryStore.getState().glides).toEqual({});
  });
});

describe('glideForMessage', () => {
  const received = (sent: PieceMovedMessage, model: MapModel = base) =>
    glideForMessage({ message: sent, mapId: MAP_ID, model, now: 0 });

  it('shouldGlideAValidMove', () => {
    const glide = received(message());
    expect(glide?.piece).toEqual(movedCar);
    expect(glide?.from).toEqual(poseOf(car));
  });

  it('shouldRefuseAnotherMapAPieceItDoesNotHaveOrAWrongOrigin', () => {
    expect(received(message({ mapId: OTHER_MAP_ID }))).toBeNull();
    expect(received(message({ pieceId: 'sob-a-nevoa' }))).toBeNull();
    expect(received(message({ from: { ...spotOf(car), rotation: 2 } }))).toBeNull();
  });

  it('shouldRefuseAFixedPieceOrASpotOutsideTheMap', () => {
    expect(received(message({ pieceId: pillar.id, from: spotOf(pillar) }))).toBeNull();
    expect(received(message({ to: { ...spotOf(movedCar), x: size.width - 1 } }))).toBeNull();
  });

  it('shouldChainFromThePieceStillGlidingOnScreen', () => {
    const first = received(message());
    if (!first) throw new Error('o primeiro aviso devia valer');
    useSceneryStore.getState().start(first);
    const further = { ...spotOf(movedCar), x: 30 };
    const glide = received(message({ from: spotOf(movedCar), to: further }));
    expect(glide?.piece).toEqual({ ...movedCar, ...further });
    expect(glide?.origin).toEqual(spotOf(car));
  });
});
