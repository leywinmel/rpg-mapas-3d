import { createFog, paintRect } from './fog';
import {
  canCreateRoom,
  canEditTokenField,
  canMoveToken,
  canRollHidden,
  canSeeToken,
  type Viewer,
} from './permissions';

const gm: Viewer = { userId: 'mestre', role: 'gm', isGuest: false };
const ana: Viewer = { userId: 'ana', role: 'player', isGuest: false };
const guest: Viewer = { userId: 'bia', role: 'player', isGuest: true };

const anaToken = { ownerId: 'ana', x: 1, z: 1, hidden: false };
const monster = { ownerId: null, x: 5, z: 5, hidden: false };

describe('permissions', () => {
  it('shouldLetPlayersMoveOnlyTheirOwnTokens', () => {
    expect(canMoveToken(ana, anaToken)).toBe(true);
    expect(canMoveToken(guest, anaToken)).toBe(false);
    expect(canMoveToken(gm, monster)).toBe(true);
  });

  it('shouldMirrorTheDatabaseFieldGuard', () => {
    expect(canEditTokenField(ana, anaToken, 'hp_current')).toBe(true);
    expect(canEditTokenField(ana, anaToken, 'hp_max')).toBe(false);
    expect(canEditTokenField(ana, anaToken, 'hidden')).toBe(false);
    expect(canEditTokenField(gm, anaToken, 'hidden')).toBe(true);
  });

  it('shouldHideTokensUnderFogOrHiddenFromPlayers', () => {
    const fog = paintRect(
      createFog({ width: 10, depth: 10 }, false),
      { x: 5, z: 5 },
      { x: 5, z: 5 },
      true,
    );
    expect(canSeeToken(ana, monster, fog)).toBe(false);
    expect(canSeeToken(ana, monster, null)).toBe(true);
    expect(canSeeToken(ana, { ...monster, x: 0, hidden: true }, null)).toBe(false);
    expect(canSeeToken(gm, monster, fog)).toBe(true);
  });

  it('shouldAlwaysShowPlayersTheirOwnToken', () => {
    const fog = createFog({ width: 10, depth: 10 }, true);
    expect(canSeeToken(ana, anaToken, fog)).toBe(true);
  });

  it('shouldKeepRoomCreationAndHiddenRollsForTheRightPeople', () => {
    expect(canCreateRoom(guest)).toBe(false);
    expect(canCreateRoom(ana)).toBe(true);
    expect(canRollHidden(ana)).toBe(false);
    expect(canRollHidden(gm)).toBe(true);
  });
});
