import { validateForm } from '@/lib/validation';
import { NOTE_BODY_MAX_LENGTH, NOTE_IMAGE_MAX_BYTES, NOTE_TITLE_MAX_LENGTH } from './constants';
import { formatFileSize, noteImageExtension } from './note-image';
import { checkNoteImage, countCharacters, noteDraftSchema, noteEditSchema } from './schemas';

const PLAYER_ID = '22222222-2222-4222-8222-222222222222';

function imageOf(type: string, size = 1024): File {
  // O tamanho vem do conteúdo; um arquivo de 5 MB de zeros é barato de criar.
  return new File([new Uint8Array(size)], 'foto', { type });
}

function draft(overrides: Record<string, unknown> = {}) {
  return {
    title: 'O mapa rasgado',
    body: 'Vocês encontram um pedaço de pergaminho.',
    image: null,
    recipients: { mode: 'all' },
    ...overrides,
  };
}

describe('noteDraftSchema', () => {
  it('shouldAcceptTitleAndBodyForTheWholeTableAndTrimThem', () => {
    const result = validateForm(
      noteDraftSchema,
      draft({ title: '  Pergaminho  ', body: ' texto \n' }),
    );
    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({ title: 'Pergaminho', body: 'texto' }),
    });
  });

  it('shouldRequireATitle', () => {
    const result = validateForm(noteDraftSchema, draft({ title: '   ' }));
    expect(result).toEqual({ ok: false, errors: { title: 'Dê um título para a anotação.' } });
  });

  it('shouldCountCharactersTheWayPostgresDoesSoEmojisCountAsOne', () => {
    expect(countCharacters('a😀b')).toBe(3);
    const atLimit = '😀'.repeat(NOTE_TITLE_MAX_LENGTH);
    expect(validateForm(noteDraftSchema, draft({ title: atLimit })).ok).toBe(true);
    const result = validateForm(noteDraftSchema, draft({ title: `${atLimit}😀` }));
    expect(result).toEqual({
      ok: false,
      errors: { title: `Use no máximo ${NOTE_TITLE_MAX_LENGTH} caracteres.` },
    });
  });

  it('shouldAllowAnEmptyBodyButNotOneBeyondTheLimit', () => {
    expect(validateForm(noteDraftSchema, draft({ body: '' })).ok).toBe(true);
    expect(
      validateForm(noteDraftSchema, draft({ body: 'x'.repeat(NOTE_BODY_MAX_LENGTH) })).ok,
    ).toBe(true);
    const result = validateForm(
      noteDraftSchema,
      draft({ body: 'x'.repeat(NOTE_BODY_MAX_LENGTH + 1) }),
    );
    expect(result).toEqual({
      ok: false,
      errors: { body: `O texto passa de ${NOTE_BODY_MAX_LENGTH} caracteres.` },
    });
  });

  it('shouldKeepTheChosenImageFileUntouched', () => {
    const image = imageOf('image/png');
    const result = validateForm(noteDraftSchema, draft({ image }));
    expect(result.ok && result.data.image).toBe(image);
  });

  it.each(['image/png', 'image/jpeg', 'image/webp'])('shouldAccept%sImages', (type) => {
    expect(validateForm(noteDraftSchema, draft({ image: imageOf(type) })).ok).toBe(true);
  });

  it('shouldRejectOtherImageTypes', () => {
    const result = validateForm(noteDraftSchema, draft({ image: imageOf('image/gif') }));
    expect(result).toEqual({ ok: false, errors: { image: 'Use uma imagem PNG, JPEG ou WebP.' } });
  });

  it('shouldRejectImagesOverFiveMegabytesButAcceptExactlyFive', () => {
    expect(
      validateForm(noteDraftSchema, draft({ image: imageOf('image/png', NOTE_IMAGE_MAX_BYTES) }))
        .ok,
    ).toBe(true);
    const result = validateForm(
      noteDraftSchema,
      draft({ image: imageOf('image/png', NOTE_IMAGE_MAX_BYTES + 1) }),
    );
    expect(result).toEqual({ ok: false, errors: { image: 'A imagem passa de 5 MB.' } });
  });

  it('shouldRejectAnEmptyImageFile', () => {
    const result = validateForm(noteDraftSchema, draft({ image: imageOf('image/png', 0) }));
    expect(result).toEqual({ ok: false, errors: { image: 'O arquivo está vazio.' } });
  });

  it('shouldRequireAtLeastOnePlayerWhenPlayersAreChosen', () => {
    const none = validateForm(
      noteDraftSchema,
      draft({ recipients: { mode: 'chosen', userIds: [] } }),
    );
    expect(none).toEqual({ ok: false, errors: { recipients: 'Escolha ao menos um jogador.' } });

    const some = validateForm(
      noteDraftSchema,
      draft({ recipients: { mode: 'chosen', userIds: [PLAYER_ID] } }),
    );
    expect(some.ok).toBe(true);
  });

  it('shouldRejectRecipientsThatAreNotIds', () => {
    const result = validateForm(
      noteDraftSchema,
      draft({ recipients: { mode: 'chosen', userIds: ['qualquer-coisa'] } }),
    );
    expect(result.ok).toBe(false);
  });
});

describe('noteEditSchema', () => {
  it('shouldValidateOnlyTitleAndBody', () => {
    expect(validateForm(noteEditSchema, { title: ' Novo ', body: 'texto' })).toEqual({
      ok: true,
      data: { title: 'Novo', body: 'texto' },
    });
    expect(validateForm(noteEditSchema, { title: '', body: 'texto' })).toEqual({
      ok: false,
      errors: { title: 'Dê um título para a anotação.' },
    });
  });
});

describe('checkNoteImage', () => {
  it('shouldReturnTheReasonOrNull', () => {
    expect(checkNoteImage(imageOf('image/webp'))).toBeNull();
    expect(checkNoteImage(imageOf('application/pdf'))).toBe('Use uma imagem PNG, JPEG ou WebP.');
    expect(checkNoteImage(imageOf('image/png', NOTE_IMAGE_MAX_BYTES + 1))).toBe(
      'A imagem passa de 5 MB.',
    );
  });
});

describe('note image helpers', () => {
  it('shouldPickTheStoredExtensionFromTheTypeNotTheName', () => {
    expect(noteImageExtension('image/jpeg')).toBe('jpg');
    expect(noteImageExtension('image/png')).toBe('png');
    expect(noteImageExtension('image/webp')).toBe('webp');
    expect(noteImageExtension('image/svg+xml')).toBeNull();
  });

  it('shouldFormatFileSizesInPortuguese', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1536)).toBe('1,5 KB');
    expect(formatFileSize(NOTE_IMAGE_MAX_BYTES)).toBe('5 MB');
  });
});
