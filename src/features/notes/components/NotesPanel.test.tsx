// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useToastStore } from '@/components';
import { setLogSink } from '@/lib/logger';
import { NotesContext, type NotesContextValue } from '../hooks/notes-context';
import { NoteError } from '../services/note-errors';
import {
  ANA_ID,
  BIA_ID,
  installDialogPolyfill,
  installLayoutStub,
  makeContext,
  makeNote,
} from '../testing/notes-fixtures';
import { NotesPanel } from './NotesPanel';

function renderPanel(value: NotesContextValue, onClose = vi.fn()) {
  const view = render(
    <NotesContext.Provider value={value}>
      <NotesPanel onClose={onClose} />
    </NotesContext.Provider>,
  );
  return { ...view, onClose };
}

const ready = (notes: ReturnType<typeof makeNote>[], hasMore = false) =>
  ({ status: 'ready', notes, hasMore }) as const;

beforeAll(() => {
  installDialogPolyfill();
  // Falhas esperadas vão para o log; aqui o ruído não ajuda.
  setLogSink(() => undefined);
});

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

describe('quem vê o quê', () => {
  it('shouldShowNewNoteToTheGameMasterButNotToPlayers', () => {
    const { unmount } = renderPanel(makeContext({ canManage: true }));
    expect(screen.getByRole('button', { name: 'Nova anotação' })).toBeInTheDocument();
    unmount();

    renderPanel(makeContext({ canManage: false }));
    expect(screen.queryByRole('button', { name: 'Nova anotação' })).not.toBeInTheDocument();
  });

  it('shouldGiveEditAndDeleteOnlyToTheGameMaster', () => {
    const note = makeNote({ title: 'Mapa' });
    const { unmount } = renderPanel(makeContext({ canManage: true, feed: ready([note]) }));
    expect(screen.getByRole('button', { name: 'Editar a anotação “Mapa”' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apagar a anotação “Mapa”' })).toBeInTheDocument();
    unmount();

    renderPanel(makeContext({ canManage: false, feed: ready([note]) }));
    expect(screen.queryByRole('button', { name: /Editar a anotação/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Apagar a anotação/ })).not.toBeInTheDocument();
  });

  it('shouldCloseThePanelFromItsHeader', () => {
    const { onClose } = renderPanel(makeContext());
    fireEvent.click(screen.getByRole('button', { name: 'Fechar Anotações' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('estados da lista', () => {
  it('shouldShowLoading', () => {
    renderPanel(makeContext({ feed: { status: 'loading' } }));
    expect(screen.getByRole('status')).toHaveTextContent('Carregando as anotações…');
  });

  it('shouldShowAFriendlyErrorWithRetry', () => {
    const reload = vi.fn();
    renderPanel(
      makeContext({ feed: { status: 'error', error: new NoteError('network', null) }, reload }),
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Não deu para carregar as anotações');
    expect(alert).toHaveTextContent('Sem conexão com o servidor');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('shouldInviteTheGameMasterToWriteTheFirstNote', () => {
    renderPanel(makeContext({ canManage: true }));
    expect(screen.getByText('Nenhuma anotação enviada ainda')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Escrever a primeira' }));
    expect(screen.getByRole('dialog', { name: 'Nova anotação' })).toBeInTheDocument();
  });

  it('shouldTellPlayersTheGameMasterHasNotSentAnythingYet', () => {
    renderPanel(makeContext({ canManage: false }));
    expect(screen.getByText('O mestre ainda não mandou anotações')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Escrever/ })).not.toBeInTheDocument();
  });

  it('shouldAskForOlderNotesOnlyWhenThereAreMore', () => {
    const loadMore = vi.fn();
    const notes = [makeNote()];
    const { unmount } = renderPanel(makeContext({ feed: ready(notes, true), loadMore }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver mais antigas' }));
    expect(loadMore).toHaveBeenCalledTimes(1);
    unmount();

    renderPanel(makeContext({ feed: ready(notes, false) }));
    expect(screen.queryByRole('button', { name: 'Ver mais antigas' })).not.toBeInTheDocument();
  });

  it('shouldBlockTheOlderNotesButtonWhileLoadingThem', () => {
    renderPanel(makeContext({ feed: ready([makeNote()], true), loadingMore: true }));
    expect(screen.getByRole('button', { name: /Ver mais antigas/ })).toBeDisabled();
  });
});

describe('cartões', () => {
  it('shouldShowTitleTimeAndWhoReceivedIt', () => {
    const notes = [
      makeNote({ title: 'Para todos', toAll: true }),
      makeNote({ title: 'Segredo', toAll: false, recipientIds: [ANA_ID] }),
    ];
    renderPanel(makeContext({ canManage: false, feed: ready(notes) }));
    expect(screen.getByRole('heading', { name: 'Para todos' })).toBeInTheDocument();
    expect(screen.getByText('Para a mesa toda')).toBeInTheDocument();
    expect(screen.getByText('Só para você')).toBeInTheDocument();
    expect(document.querySelectorAll('time')).toHaveLength(2);
    expect(document.querySelector('time')).toHaveAttribute('datetime', '2026-11-01T18:10:00+00:00');
  });

  it('shouldShowTheGameMasterTheNicknamesOfTheChosenPlayers', () => {
    const note = makeNote({ toAll: false, recipientIds: [ANA_ID, BIA_ID, 'saiu-da-mesa'] });
    renderPanel(makeContext({ canManage: true, feed: ready([note]) }));
    expect(screen.getByText('Para Ana, Bia e um jogador que saiu da mesa')).toBeInTheDocument();
  });

  it('shouldShowUserTextLiterallyNeverAsHtml', () => {
    const note = makeNote({
      title: '<img src=x onerror=alert(1)>',
      body: '<b>oi</b>\nsegunda linha <i>itálico</i>',
    });
    const { container } = renderPanel(makeContext({ feed: ready([note]) }));

    expect(
      screen.getByRole('heading', { name: '<img src=x onerror=alert(1)>' }),
    ).toBeInTheDocument();
    const body = screen.getByText(/<b>oi<\/b>/);
    expect(body.tagName).toBe('P');
    // As quebras de linha do texto ficam no conteúdo (o CSS as mostra com white-space: pre-wrap).
    expect(body.textContent).toBe('<b>oi</b>\nsegunda linha <i>itálico</i>');
    expect(container.querySelector('b, i, img')).toBeNull();
  });

  it('shouldNotTurnLinksInTheTextIntoAnchors', () => {
    const note = makeNote({ body: 'Veja https://exemplo.com/mapa e www.exemplo.com agora' });
    renderPanel(makeContext({ feed: ready([note]) }));
    expect(screen.getByText(/https:\/\/exemplo\.com\/mapa/)).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('shouldNotRenderABodyForNotesWithOnlyATitle', () => {
    const { container } = renderPanel(makeContext({ feed: ready([makeNote({ body: '' })]) }));
    expect(container.querySelector('article p:not(:first-of-type)')).toBeNull();
  });
});

describe('Ler mais', () => {
  let restoreLayout: () => void = () => undefined;

  afterEach(() => restoreLayout());

  it('shouldOfferReadMoreOnlyWhenTheTextIsActuallyCut', () => {
    restoreLayout = installLayoutStub({ scrollHeight: 240, clientHeight: 80 });
    renderPanel(makeContext({ feed: ready([makeNote({ body: 'texto longo '.repeat(80) })]) }));

    const more = screen.getByRole('button', { name: 'Ler mais' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(more);
    expect(screen.getByRole('button', { name: 'Ler menos' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('shouldHideReadMoreWhenTheTextFits', () => {
    restoreLayout = installLayoutStub({ scrollHeight: 80, clientHeight: 80 });
    renderPanel(makeContext({ feed: ready([makeNote({ body: 'curto' })]) }));
    expect(screen.queryByRole('button', { name: 'Ler mais' })).not.toBeInTheDocument();
  });
});

describe('imagem', () => {
  it('shouldShowALazyThumbnailWithTheTitleAsAltAndOpenItLarge', async () => {
    const note = makeNote({ title: 'Mapa da cripta', imagePath: 'sala/mapa.png' });
    renderPanel(makeContext({ feed: ready([note]) }));

    const thumbnail = await screen.findByAltText('Mapa da cripta');
    expect(thumbnail).toHaveAttribute('loading', 'lazy');
    expect(thumbnail).toHaveAttribute('src', 'https://files.test/sala/mapa.png');

    fireEvent.click(screen.getByRole('button', { name: 'Ampliar a imagem de “Mapa da cripta”' }));
    const dialog = screen.getByRole('dialog', { name: 'Mapa da cripta' });
    expect(within(dialog).getByAltText('Mapa da cripta')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Abrir original' })).toHaveAttribute(
      'href',
      'https://files.test/sala/mapa.png',
    );
  });

  it('shouldShowAWarningInsteadOfBreakingTheCardWhenTheUrlCannotBeSigned', async () => {
    const note = makeNote({ title: 'Mapa', body: 'texto', imagePath: 'sala/mapa.png' });
    const getImageUrl = vi.fn(async () => {
      throw new NoteError('image-url', null);
    });
    renderPanel(makeContext({ feed: ready([note]), getImageUrl }));

    expect(await screen.findByText('Não deu para carregar a imagem.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mapa' })).toBeInTheDocument();
    expect(screen.getByText('texto')).toBeInTheDocument();
  });

  it('shouldShowAWarningWhenTheImageFileFailsToLoad', async () => {
    const note = makeNote({ title: 'Mapa', imagePath: 'sala/mapa.png' });
    renderPanel(makeContext({ feed: ready([note]) }));
    fireEvent.error(await screen.findByAltText('Mapa'));
    expect(await screen.findByText('Não deu para carregar a imagem.')).toBeInTheDocument();
  });
});

describe('apagar', () => {
  const note = makeNote({ title: 'Segredo' });

  it('shouldAskForConfirmationThenDeleteAndCloseTheWindow', async () => {
    const deleteNote = vi.fn(async () => undefined);
    renderPanel(makeContext({ canManage: true, feed: ready([note]), deleteNote }));

    fireEvent.click(screen.getByRole('button', { name: 'Apagar a anotação “Segredo”' }));
    const dialog = screen.getByRole('dialog', { name: 'Apagar anotação?' });
    expect(deleteNote).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Apagar de vez' }));
    await waitFor(() => expect(deleteNote).toHaveBeenCalledWith(note));
    await waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(1));
    expect(screen.queryByRole('dialog', { name: 'Apagar anotação?' })).not.toBeInTheDocument();
  });

  it('shouldKeepTheWindowOpenAndShowTheFailureInsideIt', async () => {
    const deleteNote = vi.fn(async () => {
      throw new NoteError('network', null);
    });
    renderPanel(makeContext({ canManage: true, feed: ready([note]), deleteNote }));

    fireEvent.click(screen.getByRole('button', { name: 'Apagar a anotação “Segredo”' }));
    const dialog = screen.getByRole('dialog', { name: 'Apagar anotação?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apagar de vez' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Sem conexão com o servidor',
    );
    expect(screen.getByRole('dialog', { name: 'Apagar anotação?' })).toBeInTheDocument();
  });

  it('shouldLeaveEverythingAloneWhenCancelling', () => {
    const deleteNote = vi.fn();
    renderPanel(makeContext({ canManage: true, feed: ready([note]), deleteNote }));
    fireEvent.click(screen.getByRole('button', { name: 'Apagar a anotação “Segredo”' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Apagar anotação?' })).getByRole('button', {
        name: 'Cancelar',
      }),
    );
    expect(deleteNote).not.toHaveBeenCalled();
  });
});
