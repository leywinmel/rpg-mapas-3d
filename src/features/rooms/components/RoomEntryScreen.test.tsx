// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { JoinByLinkForm } from './JoinByLinkForm';
import { RoomEntryScreen } from './RoomEntryScreen';

function renderEntry(
  onJoinAsGuest = vi.fn().mockResolvedValue({ ok: true }),
  roomName: string | null = 'Cripta do Corvo',
) {
  render(
    <MemoryRouter>
      <RoomEntryScreen
        roomName={roomName}
        signInHref="/entrar?voltar=%2Fsala%2Fdemo"
        onJoinAsGuest={onJoinAsGuest}
      />
    </MemoryRouter>,
  );
  return onJoinAsGuest;
}

function typeNickname(value: string) {
  fireEvent.change(screen.getByLabelText('Seu apelido na mesa'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: /entrar como convidado/i }));
}

describe('RoomEntryScreen', () => {
  it('shouldShowRoomNameAndLinkToSignInWithReturn', () => {
    renderEntry();
    expect(screen.getByRole('heading', { name: 'Cripta do Corvo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /entrar com minha conta/i })).toHaveAttribute(
      'href',
      '/entrar?voltar=%2Fsala%2Fdemo',
    );
  });

  it('shouldUseGenericTitleWhenNameIsHidden', () => {
    renderEntry(undefined, null);
    expect(screen.getByRole('heading', { name: 'Mesa de RPG' })).toBeInTheDocument();
  });

  it('shouldBlockEmptyNicknameWithoutCallingServer', () => {
    const onJoin = renderEntry();
    typeNickname('   ');
    expect(screen.getByText('Escolha um apelido.')).toBeInTheDocument();
    expect(onJoin).not.toHaveBeenCalled();
  });

  it('shouldJoinAsGuestWithTrimmedNickname', async () => {
    const onJoin = renderEntry();
    typeNickname('  Bia  ');
    await waitFor(() => expect(onJoin).toHaveBeenCalledWith('Bia'));
  });

  it('shouldShowFailureInsideTheForm', async () => {
    renderEntry(vi.fn().mockResolvedValue({ ok: false, message: 'Muitas tentativas seguidas.' }));
    typeNickname('Bia');
    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas seguidas.');
  });
});

function CurrentPath() {
  return <p data-testid="path">{useLocation().pathname}</p>;
}

describe('JoinByLinkForm', () => {
  it('shouldOpenRoomFromPastedLink', () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <JoinByLinkForm />
                <CurrentPath />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Link ou código da mesa'), {
      target: { value: 'http://localhost:5173/sala/AbC123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/sala/abc123');
  });

  it('shouldExplainUnrecognizedLink', () => {
    render(
      <MemoryRouter>
        <JoinByLinkForm />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Link ou código da mesa'), {
      target: { value: 'isso não é link' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/não reconhecemos/i);
  });
});
