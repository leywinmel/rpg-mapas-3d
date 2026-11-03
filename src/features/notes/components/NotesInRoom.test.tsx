// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RoomHud } from '@/features/rooms/components/RoomHud';
import {
  RoomControlsContext,
  RoomSessionContext,
  type RoomControls,
  type RoomSessionValue,
} from '@/features/rooms/hooks/room-session-context';
import { setLogSink } from '@/lib/logger';
import { ANA_ID, GM_ID, TABLE_MEMBERS } from '../testing/notes-fixtures';

// Só o serviço e o canal são trocados: a barra da sala, o provider, o botão e o painel são os de verdade.
const fakeService = vi.hoisted(() => ({
  listNotes: vi.fn(async () => ({ notes: [], hasMore: false })),
  sendNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  getImageUrl: vi.fn(async (path: string) => path),
}));
vi.mock('../services/notes-service', () => ({ getNotesService: () => fakeService }));
vi.mock('../services/notes-channel', () => ({
  openNotesChannel: () => ({ announce: async () => undefined, close: () => undefined }),
}));

function sessionAs(role: 'gm' | 'player'): RoomSessionValue {
  return {
    room: { id: 'room-1', slug: 'demo', name: 'Mesa', ownerId: GM_ID, activeMapId: null },
    membership: { role, nickname: role === 'gm' ? 'Mestre' : 'Ana' },
    isGameMaster: role === 'gm',
    members: TABLE_MEMBERS,
    onlineUserIds: new Set([GM_ID, ANA_ID]),
    viewer: { userId: role === 'gm' ? GM_ID : ANA_ID, role, isGuest: false },
  };
}

const controls: RoomControls = {
  membersState: { status: 'ready', data: [...TABLE_MEMBERS] },
  reloadMembers: vi.fn(),
  replaceRoom: vi.fn(),
};

function renderHud(role: 'gm' | 'player') {
  render(
    <MemoryRouter>
      <RoomSessionContext.Provider value={sessionAs(role)}>
        <RoomControlsContext.Provider value={controls}>
          <RoomHud />
        </RoomControlsContext.Provider>
      </RoomSessionContext.Provider>
    </MemoryRouter>,
  );
}

const notesPanel = () => screen.queryByRole('region', { name: 'Anotações' });
const presencePanel = () => screen.queryByRole('region', { name: /^Na mesa/ });
const notesButton = () => screen.getByRole('button', { name: 'Anotações' });

beforeAll(() => {
  setLogSink(() => undefined);
});

describe('anotações na barra da sala', () => {
  it('shouldStartWithThePresencePanelOpenAsBefore', () => {
    renderHud('player');
    expect(presencePanel()).toBeInTheDocument();
    expect(notesPanel()).not.toBeInTheDocument();
    expect(notesButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('shouldOpenTheNotesInTheSameCornerAndCloseThePresencePanel', async () => {
    renderHud('player');
    fireEvent.click(notesButton());

    expect(notesPanel()).toBeInTheDocument();
    expect(presencePanel()).not.toBeInTheDocument();
    expect(notesButton()).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('O mestre ainda não mandou anotações')).toBeInTheDocument();
  });

  it('shouldSwapBackToThePresencePanel', () => {
    renderHud('player');
    fireEvent.click(notesButton());
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar quem está na mesa' }));

    expect(presencePanel()).toBeInTheDocument();
    expect(notesPanel()).not.toBeInTheDocument();
  });

  it('shouldCloseThePanelWhenItsButtonIsClickedAgainOrItsCloseButtonIsUsed', () => {
    renderHud('player');
    fireEvent.click(notesButton());
    fireEvent.click(notesButton());
    expect(notesPanel()).not.toBeInTheDocument();
    expect(presencePanel()).not.toBeInTheDocument();

    fireEvent.click(notesButton());
    fireEvent.click(screen.getByRole('button', { name: 'Fechar Anotações' }));
    expect(notesPanel()).not.toBeInTheDocument();
  });

  it('shouldGiveTheGameMasterTheNewNoteButtonAndPlayersOnlyTheList', async () => {
    renderHud('gm');
    fireEvent.click(notesButton());
    expect(await screen.findByText('Nenhuma anotação enviada ainda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nova anotação' })).toBeInTheDocument();
  });

  it('shouldKeepTheOtherMenuButtonsOfTheRole', () => {
    renderHud('gm');
    expect(screen.getByRole('button', { name: 'Renomear mesa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apagar mesa' })).toBeInTheDocument();
    expect(notesButton()).toBeInTheDocument();
  });
});
