// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import type { MapWorkspaceProps } from '@/features/map-editor';
import { RoomSessionContext, type RoomSessionValue } from '../hooks/room-session-context';
import { RoomMap } from './RoomMap';

// O editor tem testes próprios; aqui só importa o que a sala entrega a ele.
vi.mock('@/features/map-editor', () => ({
  MapWorkspace: ({ roomId, isGameMaster }: MapWorkspaceProps) => (
    <p>{`mapas de ${roomId} como ${isGameMaster ? 'mestre' : 'jogador'}`}</p>
  ),
}));

function sessionAs(role: 'gm' | 'player'): RoomSessionValue {
  return {
    room: { id: 'room-1', slug: 'demo', name: 'Mesa', ownerId: 'gm-1', activeMapId: null },
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
      <RoomMap />
    </RoomSessionContext.Provider>,
  );
}

describe('RoomMap', () => {
  it('shouldOpenTheEditorForTheGameMasterOfTheRoom', () => {
    renderAs('gm');
    expect(screen.getByText('mapas de room-1 como mestre')).toBeInTheDocument();
  });

  it('shouldOpenThePlayerViewForAPlayer', () => {
    renderAs('player');
    expect(screen.getByText('mapas de room-1 como jogador')).toBeInTheDocument();
  });
});
