// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useToastStore } from '@/components';
import { setLogSink } from '@/lib/logger';
import { NOTE_BODY_MAX_LENGTH, NOTE_IMAGE_MAX_BYTES } from '../constants';
import { NotesContext, type NotesContextValue } from '../hooks/notes-context';
import { NoteError } from '../services/note-errors';
import {
  ANA_ID,
  BIA_ID,
  GM_ID,
  installDialogPolyfill,
  makeContext,
  makeMember,
  makeNote,
  TABLE_MEMBERS,
} from '../testing/notes-fixtures';
import { NoteFormDialog, type NoteFormTarget } from './NoteFormDialog';

function renderForm(
  value: NotesContextValue,
  target: NoteFormTarget = { mode: 'create' },
  onClose = vi.fn(),
) {
  render(
    <NotesContext.Provider value={value}>
      <NoteFormDialog open target={target} onClose={onClose} />
    </NotesContext.Provider>,
  );
  return { onClose, dialog: screen.getByRole('dialog') };
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const pickImage = (file: File) =>
  fireEvent.change(screen.getByLabelText('Imagem (opcional)'), { target: { files: [file] } });

const submit = () => fireEvent.click(screen.getByRole('button', { name: /^(Enviar|Salvar)$/ }));

function image(type: string, size = 2048, name = 'foto.png'): File {
  return new File([new Uint8Array(size)], name, { type });
}

const toasts = () => useToastStore.getState().toasts;

beforeAll(() => {
  installDialogPolyfill();
  // Falhas esperadas vão para o log; aqui o ruído não ajuda.
  setLogSink(() => undefined);
  // O jsdom não cria URLs temporárias de arquivo.
  URL.createObjectURL = vi.fn(() => 'blob:previa');
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

describe('nova anotação', () => {
  it('shouldFocusTheTitleAndStartWithTheWholeTableChosen', () => {
    renderForm(makeContext());
    expect(screen.getByLabelText('Título')).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Mesa toda' })).toBeChecked();
  });

  it('shouldBlockAnEmptyTitleAndExplainItInline', async () => {
    const context = makeContext();
    renderForm(context);
    submit();
    expect(await screen.findByText('Dê um título para a anotação.')).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveAttribute('aria-invalid', 'true');
    expect(context.sendNote).not.toHaveBeenCalled();
  });

  it('shouldTakeTheFocusToTheInvalidFieldAfterARefusedSend', async () => {
    renderForm(makeContext());
    screen.getByLabelText('Texto').focus();
    submit();
    await screen.findByText('Dê um título para a anotação.');
    expect(screen.getByLabelText('Título')).toHaveFocus();
  });

  it('shouldBringAGroupErrorIntoViewWhenNoFieldIsInvalid', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      renderForm(makeContext());
      type('Título', 'Segredo');
      fireEvent.click(screen.getByRole('radio', { name: 'Jogadores escolhidos' }));
      submit();
      await screen.findByText('Escolha ao menos um jogador.');
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    } finally {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    }
  });

  it('shouldSendToTheWholeTableAndCloseWithANotice', async () => {
    const context = makeContext();
    const { onClose } = renderForm(context);
    type('Título', '  O mapa rasgado  ');
    type('Texto', 'Um pedaço de pergaminho.\n');
    submit();

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(context.sendNote).toHaveBeenCalledWith({
      title: 'O mapa rasgado',
      body: 'Um pedaço de pergaminho.',
      image: null,
      recipients: { mode: 'all' },
    });
    expect(toasts()).toEqual([
      expect.objectContaining({ tone: 'success', title: 'Anotação enviada para a mesa toda.' }),
    ]);
  });

  it('shouldListOnlyPlayersAsPossibleRecipients', () => {
    renderForm(makeContext());
    fireEvent.click(screen.getByRole('radio', { name: 'Jogadores escolhidos' }));
    expect(screen.getByRole('checkbox', { name: 'Ana' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Bia' })).not.toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'Mestre' })).not.toBeInTheDocument();
  });

  it('shouldRequireAtLeastOneChosenPlayer', async () => {
    const context = makeContext();
    renderForm(context);
    type('Título', 'Segredo');
    fireEvent.click(screen.getByRole('radio', { name: 'Jogadores escolhidos' }));
    submit();
    expect(await screen.findByText('Escolha ao menos um jogador.')).toBeInTheDocument();
    expect(context.sendNote).not.toHaveBeenCalled();
  });

  it('shouldSendOnlyToTheChosenPlayers', async () => {
    const context = makeContext();
    const { onClose } = renderForm(context);
    type('Título', 'Segredo');
    fireEvent.click(screen.getByRole('radio', { name: 'Jogadores escolhidos' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ana' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Bia' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Bia' }));
    submit();

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(context.sendNote).toHaveBeenCalledWith(
      expect.objectContaining({ recipients: { mode: 'chosen', userIds: [ANA_ID] } }),
    );
    expect(toasts()[0]).toMatchObject({ title: 'Anotação enviada aos jogadores escolhidos.' });
  });

  it('shouldDropAChosenPlayerWhoLeftTheTableWhileTheWindowWasOpen', async () => {
    const withBia = makeContext({ members: TABLE_MEMBERS });
    const view = render(
      <NotesContext.Provider value={withBia}>
        <NoteFormDialog open target={{ mode: 'create' }} onClose={vi.fn()} />
      </NotesContext.Provider>,
    );
    type('Título', 'Segredo');
    fireEvent.click(screen.getByRole('radio', { name: 'Jogadores escolhidos' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ana' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Bia' }));

    // A Bia sai da mesa: a lista de membros muda por baixo da janela.
    const withoutBia = {
      ...withBia,
      members: TABLE_MEMBERS.filter((member) => member.userId !== BIA_ID),
    };
    view.rerender(
      <NotesContext.Provider value={withoutBia}>
        <NoteFormDialog open target={{ mode: 'create' }} onClose={vi.fn()} />
      </NotesContext.Provider>,
    );
    submit();

    await waitFor(() => expect(withBia.sendNote).toHaveBeenCalled());
    expect(withBia.sendNote).toHaveBeenCalledWith(
      expect.objectContaining({ recipients: { mode: 'chosen', userIds: [ANA_ID] } }),
    );
  });

  it('shouldNotOfferChosenPlayersWhenThereAreNoPlayersYet', () => {
    renderForm(makeContext({ members: [makeMember(GM_ID, 'Mestre', 'gm')] }));
    expect(screen.getByRole('radio', { name: 'Jogadores escolhidos' })).toBeDisabled();
    expect(screen.getByText(/Ainda não há jogadores na mesa/)).toBeInTheDocument();
  });

  it('shouldCountTheCharactersOfTheText', () => {
    renderForm(makeContext());
    expect(screen.getByText(`0/${NOTE_BODY_MAX_LENGTH} caracteres`)).toBeInTheDocument();
    type('Texto', 'abc😀');
    expect(screen.getByText(`4/${NOTE_BODY_MAX_LENGTH} caracteres`)).toBeInTheDocument();
  });

  it('shouldWarnRightAwayWhenTheTextIsTooLongAndBlockTheSend', async () => {
    const context = makeContext();
    renderForm(context);
    type('Título', 'Longa');
    type('Texto', 'x'.repeat(NOTE_BODY_MAX_LENGTH + 1));
    expect(
      screen.getByText(`O texto passa de ${NOTE_BODY_MAX_LENGTH} caracteres.`),
    ).toBeInTheDocument();
    submit();
    expect(context.sendNote).not.toHaveBeenCalled();
  });

  it('shouldShowTheFailureInsideTheWindowAndKeepWhatWasTyped', async () => {
    const sendNote = vi.fn(async () => {
      throw new NoteError('recipient', '42501');
    });
    const { onClose, dialog } = renderForm(makeContext({ sendNote }));
    type('Título', 'Segredo');
    submit();

    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('Um dos jogadores escolhidos saiu da mesa');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Título')).toHaveValue('Segredo');
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
  });

  it('shouldIgnoreAttemptsToCloseWhileSending', async () => {
    let finish: () => void = () => undefined;
    const sendNote = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { onClose, dialog } = renderForm(makeContext({ sendNote }));
    type('Título', 'Segredo');
    submit();

    await waitFor(() => expect(sendNote).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /Enviar/ })).toHaveAttribute('aria-busy', 'true');
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(onClose).not.toHaveBeenCalled();

    finish();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});

describe('imagem', () => {
  it('shouldRejectAnImageOverFiveMegabytesInsideTheWindowWithoutSendingAnything', async () => {
    const context = makeContext();
    renderForm(context);
    type('Título', 'Mapa');
    pickImage(image('image/png', NOTE_IMAGE_MAX_BYTES + 1));

    expect(await screen.findByText('A imagem passa de 5 MB.')).toBeInTheDocument();
    expect(screen.queryByAltText('Prévia da imagem escolhida')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toContainElement(
      screen.getByText('A imagem passa de 5 MB.'),
    );
    expect(context.sendNote).not.toHaveBeenCalled();
  });

  it('shouldSendTheNoteWithoutImageIfThePersonSendsAfterARejectedPick', async () => {
    const context = makeContext();
    renderForm(context);
    type('Título', 'Mapa');
    pickImage(image('image/png', NOTE_IMAGE_MAX_BYTES + 1));
    await screen.findByText('A imagem passa de 5 MB.');
    submit();

    await waitFor(() => expect(context.sendNote).toHaveBeenCalledTimes(1));
    expect(context.sendNote).toHaveBeenCalledWith(expect.objectContaining({ image: null }));
  });

  it('shouldRejectOtherImageTypes', async () => {
    renderForm(makeContext());
    pickImage(image('image/gif', 100, 'bicho.gif'));
    expect(await screen.findByText('Use uma imagem PNG, JPEG ou WebP.')).toBeInTheDocument();
    expect(screen.queryByText('bicho.gif')).not.toBeInTheDocument();
  });

  it('shouldNeverCallTheServerWithARejectedImage', async () => {
    const context = makeContext();
    renderForm(context);
    pickImage(image('application/pdf', 100, 'regras.pdf'));
    await screen.findByText('Use uma imagem PNG, JPEG ou WebP.');
    expect(context.sendNote).not.toHaveBeenCalled();
  });

  it('shouldPreviewAnAcceptedImageAndLetItBeRemoved', async () => {
    renderForm(makeContext());
    pickImage(image('image/png', 2048, 'cripta.png'));

    expect(await screen.findByAltText('Prévia da imagem escolhida')).toHaveAttribute(
      'src',
      'blob:previa',
    );
    expect(screen.getByText('cripta.png')).toBeInTheDocument();
    expect(screen.getByText('2 KB')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remover a imagem' }));
    expect(screen.queryByAltText('Prévia da imagem escolhida')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escolher imagem' })).toBeInTheDocument();
  });

  it('shouldClearTheImageErrorOnceAGoodFileIsChosen', async () => {
    renderForm(makeContext());
    pickImage(image('image/gif'));
    await screen.findByText('Use uma imagem PNG, JPEG ou WebP.');
    pickImage(image('image/webp', 100, 'boa.webp'));
    await screen.findByText('boa.webp');
    expect(screen.queryByText('Use uma imagem PNG, JPEG ou WebP.')).not.toBeInTheDocument();
  });

  it('shouldSendTheChosenImageWithTheNote', async () => {
    const context = makeContext();
    const { onClose } = renderForm(context);
    const file = image('image/jpeg', 4096, 'foto.jpg');
    type('Título', 'Com imagem');
    pickImage(file);
    await screen.findByText('foto.jpg');
    submit();

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(context.sendNote).toHaveBeenCalledWith(expect.objectContaining({ image: file }));
  });
});

describe('editar', () => {
  const note = makeNote({
    title: 'Antigo',
    body: 'Texto antigo',
    toAll: false,
    recipientIds: [ANA_ID],
    imagePath: 'sala/a.png',
  });

  it('shouldOpenWithTheNoteAndOnlyOfferTitleAndText', () => {
    renderForm(makeContext(), { mode: 'edit', note });
    expect(screen.getByRole('dialog', { name: 'Editar anotação' })).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Antigo');
    expect(screen.getByLabelText('Texto')).toHaveValue('Texto antigo');
    expect(screen.queryByText('Para quem?')).not.toBeInTheDocument();
    expect(screen.queryByText('Imagem (opcional)')).not.toBeInTheDocument();
    expect(screen.getByText(/apague a anotação e mande de novo/)).toBeInTheDocument();
  });

  it('shouldSaveOnlyTitleAndTextAndAnnounceIt', async () => {
    const context = makeContext();
    const { onClose } = renderForm(context, { mode: 'edit', note });
    type('Título', ' Novo título ');
    submit();

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(context.updateNote).toHaveBeenCalledWith({
      noteId: note.id,
      title: 'Novo título',
      body: 'Texto antigo',
    });
    expect(context.sendNote).not.toHaveBeenCalled();
    expect(toasts()).toEqual([expect.objectContaining({ title: 'Anotação atualizada.' })]);
  });

  it('shouldRefuseAnEmptyTitleWhenEditing', async () => {
    const context = makeContext();
    renderForm(context, { mode: 'edit', note });
    type('Título', '   ');
    submit();
    expect(await screen.findByText('Dê um título para a anotação.')).toBeInTheDocument();
    expect(context.updateNote).not.toHaveBeenCalled();
  });

  it('shouldShowAnEditFailureInsideTheWindow', async () => {
    const updateNote = vi.fn(async () => {
      throw new NoteError('not-found', null);
    });
    const { dialog } = renderForm(makeContext({ updateNote }), { mode: 'edit', note });
    submit();
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Essa anotação não existe mais.',
    );
  });
});
