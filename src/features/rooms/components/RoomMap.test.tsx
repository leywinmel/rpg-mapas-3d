// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import type { MapWorkspaceProps } from '@/features/map-editor';
import {
  RoomControlsContext,
  RoomSessionContext,
  type RoomControls,
  type RoomSessionValue,
} from '../hooks/room-session-context';
import { RoomMap } from './RoomMap';

// O editor tem testes próprios; aqui só importa o que a sala entrega a ele.
vi.mock('@/features/map-editor', () => ({
  MapWorkspace: ({ roomId, isGameMaster, cutawayLock, onCutawayLockChange }: MapWorkspaceProps) => (
    <p>
      {`mapas de ${roomId} como ${isGameMaster ? 'mestre' : 'jogador'}, `}
      {`trava ${String(cutawayLock)}, ${onCutawayLockChange ? 'pode travar' : 'não trava'}`}
    </p>
  ),
}));

vi.mock('@/features/fog', () => ({
  FogSync: () => null,
  FogSceneLayer: () => null,
  useFogStore: (select: (state: { revision: number }) => unknown) => select({ revision: 0 }),
}));

vi.mock('@/features/tokens', () => ({
  TokensSync: () => null,
  TokensSceneLayer: () => null,
  useTokensStore: { getState: () => ({ setView: () => undefined }) },
}));

const CONTROLS: RoomControls = {
  membersState: { status: 'loading' },
  reloadMembers: () => undefined,
  replaceRoom: () => undefined,
};

function sessionAs(role: 'gm' | 'player'): RoomSessionValue {
  return {
    room: {
      id: 'room-1',
      slug: 'demo',
      name: 'Mesa',
      ownerId: 'gm-1',
      activeMapId: null,
      cutawayLock: 8,
    },
    membership: { role, nickname: 'Ana' },
    isGameMaster: role === 'gm',
    members: [],
    onlineUserIds: new Set(),
    viewer: { userId: 'user-1', role, isGuest: false },
  };
}

function renderAs(role: 'gm' | 'player') {
  render(
    <RoomSessionContext.Provider value={sessionAs(role)}>
      <RoomControlsContext.Provider value={CONTROLS}>
        <RoomMap />
      </RoomControlsContext.Provider>
    </RoomSessionContext.Provider>,
  );
}

describe('RoomMap', () => {
  it('shouldOpenTheEditorForTheGameMasterOfTheRoom', () => {
    renderAs('gm');
    expect(
      screen.getByText('mapas de room-1 como mestre, trava 8, pode travar'),
    ).toBeInTheDocument();
  });

  it('shouldOpenThePlayerViewForAPlayerWithTheLockButNoWayToChangeIt', () => {
    renderAs('player');
    expect(
      screen.getByText('mapas de room-1 como jogador, trava 8, não trava'),
    ).toBeInTheDocument();
  });
});
