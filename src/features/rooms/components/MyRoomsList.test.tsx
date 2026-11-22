// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { RoomSummary } from '../types';
import { MyRoomsList } from './MyRoomsList';

const service = vi.hoisted(() => ({
  listMyRooms: vi.fn(),
  deleteRoom: vi.fn(),
}));

vi.mock('../services/rooms-service', () => ({ getRoomsService: () => service }));

function summary(overrides: Partial<RoomSummary>): RoomSummary {
  return {
    id: 'r1',
    slug: 'r1',
    name: 'Cripta do Corvo',
    role: 'gm',
    nickname: 'Mestre',
    lastActivityAt: '2026-10-01T10:00:00Z',
    joined: true,
    ownedByMe: true,
    ...overrides,
  };
}

function renderList() {
  render(
    <MemoryRouter>
      <MyRoomsList userId="u1" emptyHint="Crie a primeira." />
    </MemoryRouter>,
  );
}

// jsdom ainda não sabe abrir <dialog> como janela modal.
beforeAll(() => {
  const proto = HTMLDialogElement.prototype;
  proto.showModal ??= function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close ??= function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

describe('MyRoomsList', () => {
  beforeEach(() => {
    service.listMyRooms.mockReset();
    service.deleteRoom.mockReset();
  });

  it('shouldOfferDeleteOnlyForRoomsICreated', async () => {
    service.listMyRooms.mockResolvedValue([
      summary({ id: 'mine', name: 'Minha' }),
      summary({ id: 'other', name: 'Alheia', role: 'player', ownedByMe: false }),
    ]);
    renderList();
    expect(await screen.findByRole('button', { name: 'Apagar a mesa Minha' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apagar a mesa Alheia' })).toBeNull();
  });

  it('shouldDeleteAfterConfirmingAndRefreshTheList', async () => {
    service.listMyRooms
      .mockResolvedValueOnce([summary({ id: 'mine', name: 'Minha' })])
      .mockResolvedValue([]);
    service.deleteRoom.mockResolvedValue(undefined);
    renderList();
    fireEvent.click(await screen.findByRole('button', { name: 'Apagar a mesa Minha' }));
    fireEvent.click(await screen.findByRole('button', { name: /apagar de vez/i }));
    await waitFor(() => expect(service.deleteRoom).toHaveBeenCalledWith('mine'));
    expect(await screen.findByText('Nenhuma mesa por aqui ainda')).toBeInTheDocument();
  });

  it('shouldKeepTheRoomWhenCancelled', async () => {
    service.listMyRooms.mockResolvedValue([summary({ id: 'mine', name: 'Minha' })]);
    renderList();
    fireEvent.click(await screen.findByRole('button', { name: 'Apagar a mesa Minha' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(service.deleteRoom).not.toHaveBeenCalled();
    expect(screen.getByText('Minha')).toBeInTheDocument();
  });

  it('shouldShowTheFailureInsideTheDialog', async () => {
    service.listMyRooms.mockResolvedValue([summary({ id: 'mine', name: 'Minha' })]);
    service.deleteRoom.mockRejectedValue(new Error('rede caiu'));
    renderList();
    fireEvent.click(await screen.findByRole('button', { name: 'Apagar a mesa Minha' }));
    fireEvent.click(await screen.findByRole('button', { name: /apagar de vez/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
