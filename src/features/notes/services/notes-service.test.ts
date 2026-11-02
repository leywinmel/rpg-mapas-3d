import { setLogSink, type LogEntry } from '@/lib/logger';
import type { AppSupabaseClient } from '@/lib/supabase';
import { NOTE_IMAGE_URL_REUSE_MARGIN_SECONDS, NOTE_IMAGE_URL_TTL_SECONDS } from '../constants';
import { NoteError } from './note-errors';
import { createNotesService } from './notes-service';

type Result = { data: unknown; error: unknown };
type Call = { method: string; args: unknown[] };

type FakeOptions = {
  query?: Result;
  rpc?: Result;
  uploadError?: unknown;
  removeError?: unknown;
  signError?: unknown;
};

const ROOM_ID = '33333333-3333-4333-8333-333333333333';
const ANA_ID = '22222222-2222-4222-8222-222222222222';
const IMAGE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const NOTE_ROW = {
  id: 'note-1',
  room_id: ROOM_ID,
  author_id: 'gm-1',
  title: 'O mapa rasgado',
  body: 'Um pedaço de pergaminho.',
  image_path: null,
  to_all: true,
  created_at: '2026-11-01T18:10:00+00:00',
};

/**
 * Cliente falso do Supabase: registra as chamadas, na ordem, de banco, RPC e Storage,
 * e responde com o que cada teste combinou.
 */
function fakeClient(options: FakeOptions = {}) {
  const calls: Call[] = [];
  const record = (method: string, ...args: unknown[]) => calls.push({ method, args });
  const query = options.query ?? { data: [], error: null };

  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order', 'limit', 'update', 'delete', 'maybeSingle']) {
    builder[method] = (...args: unknown[]) => {
      record(method, ...args);
      return builder;
    };
  }
  builder.then = (resolve: (value: Result) => unknown) => resolve(query);

  let signed = 0;
  const bucket = {
    upload: async (path: string, file: File, uploadOptions: unknown) => {
      record('upload', path, file, uploadOptions);
      return { data: { path }, error: options.uploadError ?? null };
    },
    remove: async (paths: string[]) => {
      record('remove', paths);
      return { data: [], error: options.removeError ?? null };
    },
    createSignedUrl: async (path: string, ttl: number) => {
      record('createSignedUrl', path, ttl);
      signed += 1;
      if (options.signError) return { data: null, error: options.signError };
      return { data: { signedUrl: `https://files.test/${path}?token=${signed}` }, error: null };
    },
  };

  const client = {
    from: (table: string) => {
      record('from', table);
      return builder;
    },
    rpc: async (name: string, params: unknown) => {
      record('rpc', name, params);
      return options.rpc ?? { data: null, error: null };
    },
    storage: {
      from: (name: string) => {
        record('storage', name);
        return bucket;
      },
    },
  };
  return { client: client as unknown as AppSupabaseClient, calls };
}

function methodsOf(calls: Call[]): string[] {
  return calls.map((call) => call.method);
}

function logsOf(): LogEntry[] {
  const entries: LogEntry[] = [];
  setLogSink((entry) => entries.push(entry));
  return entries;
}

function png(): File {
  return new File([new Uint8Array(16)], 'minha foto.PNG', { type: 'image/png' });
}

describe('listNotes', () => {
  it('shouldAskForOneMoreThanTheWindowToKnowIfThereAreOlderNotes', async () => {
    const { client, calls } = fakeClient({
      query: {
        data: [
          { ...NOTE_ROW, id: 'n3', note_recipients: [] },
          { ...NOTE_ROW, id: 'n2', note_recipients: [] },
          { ...NOTE_ROW, id: 'n1', note_recipients: [] },
        ],
        error: null,
      },
    });
    const page = await createNotesService(client).listNotes({ roomId: ROOM_ID, limit: 2 });
    expect(page.notes.map((note) => note.id)).toEqual(['n3', 'n2']);
    expect(page.hasMore).toBe(true);
    expect(calls).toContainEqual({ method: 'eq', args: ['room_id', ROOM_ID] });
    expect(calls).toContainEqual({ method: 'order', args: ['created_at', { ascending: false }] });
    expect(calls).toContainEqual({ method: 'limit', args: [3] });
  });

  it('shouldNotFlagMoreWhenEverythingFitsAndShouldMapTheRecipients', async () => {
    const { client } = fakeClient({
      query: {
        data: [
          {
            ...NOTE_ROW,
            to_all: false,
            image_path: `${ROOM_ID}/foto.png`,
            note_recipients: [{ user_id: ANA_ID }],
          },
        ],
        error: null,
      },
    });
    const page = await createNotesService(client).listNotes({ roomId: ROOM_ID, limit: 20 });
    expect(page.hasMore).toBe(false);
    expect(page.notes).toEqual([
      {
        id: 'note-1',
        roomId: ROOM_ID,
        authorId: 'gm-1',
        title: 'O mapa rasgado',
        body: 'Um pedaço de pergaminho.',
        imagePath: `${ROOM_ID}/foto.png`,
        toAll: false,
        recipientIds: [ANA_ID],
        createdAt: '2026-11-01T18:10:00+00:00',
      },
    ]);
  });

  it('shouldTurnADatabaseFailureIntoANoteError', async () => {
    const { client } = fakeClient({
      query: { data: null, error: { code: '42501', message: 'x' } },
    });
    await expect(
      createNotesService(client).listNotes({ roomId: ROOM_ID, limit: 20 }),
    ).rejects.toMatchObject({ kind: 'forbidden' });
  });
});

describe('sendNote', () => {
  const sentRow = { ...NOTE_ROW };

  it('shouldSendWithoutImageThroughTheAtomicFunction', async () => {
    const { client, calls } = fakeClient({ rpc: { data: sentRow, error: null } });
    const note = await createNotesService(client).sendNote({
      roomId: ROOM_ID,
      title: 'O mapa rasgado',
      body: 'Um pedaço de pergaminho.',
      image: null,
      recipients: { mode: 'all' },
    });
    expect(methodsOf(calls)).toEqual(['rpc']);
    expect(calls[0]?.args).toEqual([
      'send_note',
      {
        p_room_id: ROOM_ID,
        p_title: 'O mapa rasgado',
        p_body: 'Um pedaço de pergaminho.',
        p_to_all: true,
        p_recipient_ids: [],
      },
    ]);
    expect(note).toMatchObject({ id: 'note-1', toAll: true, recipientIds: [] });
  });

  it('shouldUploadTheImageToTheRoomFolderBeforeSending', async () => {
    const { client, calls } = fakeClient({
      rpc: { data: { ...sentRow, to_all: false }, error: null },
    });
    const service = createNotesService(client, { newId: () => IMAGE_ID });
    const file = png();
    const note = await service.sendNote({
      roomId: ROOM_ID,
      title: 'Com imagem',
      body: '',
      image: file,
      recipients: { mode: 'chosen', userIds: [ANA_ID] },
    });
    const path = `${ROOM_ID}/${IMAGE_ID}.png`;
    // A extensão vem do tipo do arquivo, nunca do nome que a pessoa deu.
    expect(calls[1]).toEqual({
      method: 'upload',
      args: [path, file, { contentType: 'image/png', upsert: false }],
    });
    expect(calls.at(-1)?.args[1]).toMatchObject({
      p_image_path: path,
      p_to_all: false,
      p_recipient_ids: [ANA_ID],
    });
    expect(note.recipientIds).toEqual([ANA_ID]);
  });

  it('shouldRemoveTheUploadedImageWhenTheFunctionFails', async () => {
    const { client, calls } = fakeClient({
      rpc: { data: null, error: { code: '42501', message: 'denied' } },
    });
    const service = createNotesService(client, { newId: () => IMAGE_ID });
    const sending = service.sendNote({
      roomId: ROOM_ID,
      title: 'x',
      body: '',
      image: png(),
      recipients: { mode: 'all' },
    });
    await expect(sending).rejects.toMatchObject({ kind: 'forbidden' });
    expect(calls.at(-1)).toEqual({ method: 'remove', args: [[`${ROOM_ID}/${IMAGE_ID}.png`]] });
  });

  it('shouldStillReportTheSendFailureWhenCleaningTheImageFailsToo', async () => {
    const logs = logsOf();
    const { client } = fakeClient({
      rpc: { data: null, error: { code: '23514', message: 'check' } },
      removeError: { message: 'storage down' },
    });
    const sending = createNotesService(client).sendNote({
      roomId: ROOM_ID,
      title: 'x',
      body: '',
      image: png(),
      recipients: { mode: 'all' },
    });
    await expect(sending).rejects.toMatchObject({ kind: 'invalid' });
    expect(logs.some((entry) => entry.level === 'warn')).toBe(true);
  });

  it('shouldNotSendAnythingWhenTheUploadFails', async () => {
    const { client, calls } = fakeClient({
      uploadError: { statusCode: '413', message: 'The object exceeded the maximum allowed size' },
    });
    const sending = createNotesService(client).sendNote({
      roomId: ROOM_ID,
      title: 'x',
      body: '',
      image: png(),
      recipients: { mode: 'all' },
    });
    await expect(sending).rejects.toMatchObject({ kind: 'image-too-large' });
    expect(methodsOf(calls)).not.toContain('rpc');
  });

  it('shouldRefuseAnUnknownImageTypeBeforeTouchingTheServer', async () => {
    const { client, calls } = fakeClient();
    const gif = new File([new Uint8Array(4)], 'a.gif', { type: 'image/gif' });
    const sending = createNotesService(client).sendNote({
      roomId: ROOM_ID,
      title: 'x',
      body: '',
      image: gif,
      recipients: { mode: 'all' },
    });
    await expect(sending).rejects.toBeInstanceOf(NoteError);
    await expect(sending).rejects.toMatchObject({ kind: 'image-type' });
    expect(calls).toEqual([]);
  });
});

describe('updateNote', () => {
  it('shouldChangeOnlyTitleAndBody', async () => {
    const { client, calls } = fakeClient({ query: { data: { id: 'note-1' }, error: null } });
    await createNotesService(client).updateNote({ noteId: 'note-1', title: 'Novo', body: 'Texto' });
    expect(calls).toContainEqual({ method: 'update', args: [{ title: 'Novo', body: 'Texto' }] });
    expect(calls).toContainEqual({ method: 'eq', args: ['id', 'note-1'] });
  });

  it('shouldReportANoteThatIsGone', async () => {
    // O RLS não dá erro quando bloqueia: só não devolve a linha.
    const { client } = fakeClient({ query: { data: null, error: null } });
    await expect(
      createNotesService(client).updateNote({ noteId: 'note-1', title: 'x', body: '' }),
    ).rejects.toMatchObject({ kind: 'not-found' });
  });
});

describe('deleteNote', () => {
  it('shouldDeleteTheRowFirstAndTheImageAfter', async () => {
    const { client, calls } = fakeClient({ query: { data: [{ id: 'note-1' }], error: null } });
    await createNotesService(client).deleteNote({ id: 'note-1', imagePath: `${ROOM_ID}/a.png` });
    const order = methodsOf(calls);
    expect(order.indexOf('delete')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('delete')).toBeLessThan(order.indexOf('remove'));
    expect(calls.at(-1)).toEqual({ method: 'remove', args: [[`${ROOM_ID}/a.png`]] });
  });

  it('shouldNotTouchStorageForANoteWithoutImage', async () => {
    const { client, calls } = fakeClient({ query: { data: [{ id: 'note-1' }], error: null } });
    await createNotesService(client).deleteNote({ id: 'note-1', imagePath: null });
    expect(methodsOf(calls)).not.toContain('remove');
  });

  it('shouldOnlyWarnInTheLogWhenTheImageCannotBeRemoved', async () => {
    const logs = logsOf();
    const { client } = fakeClient({
      query: { data: [{ id: 'note-1' }], error: null },
      removeError: { message: 'storage down' },
    });
    // A anotação já saiu: falhar em apagar o arquivo não pode desfazer nem travar nada.
    await expect(
      createNotesService(client).deleteNote({ id: 'note-1', imagePath: `${ROOM_ID}/a.png` }),
    ).resolves.toBeUndefined();
    expect(logs.filter((entry) => entry.level === 'warn')).toHaveLength(1);
  });

  it('shouldFailWithoutRemovingTheImageWhenNothingWasDeleted', async () => {
    const { client, calls } = fakeClient({ query: { data: [], error: null } });
    await expect(
      createNotesService(client).deleteNote({ id: 'note-1', imagePath: `${ROOM_ID}/a.png` }),
    ).rejects.toMatchObject({ kind: 'not-found' });
    expect(methodsOf(calls)).not.toContain('remove');
  });
});

describe('getImageUrl', () => {
  const path = `${ROOM_ID}/a.png`;
  const validForMs = (NOTE_IMAGE_URL_TTL_SECONDS - NOTE_IMAGE_URL_REUSE_MARGIN_SECONDS) * 1000;

  it('shouldSignForTheConfiguredTimeAndReuseTheUrlWhileItIsValid', async () => {
    let clock = 0;
    const { client, calls } = fakeClient();
    const service = createNotesService(client, { now: () => clock });
    const first = await service.getImageUrl(path);
    clock = validForMs - 1;
    const second = await service.getImageUrl(path);
    expect(second).toBe(first);
    expect(calls.filter((call) => call.method === 'createSignedUrl')).toEqual([
      { method: 'createSignedUrl', args: [path, NOTE_IMAGE_URL_TTL_SECONDS] },
    ]);
  });

  it('shouldSignAgainOnceTheReuseWindowEnds', async () => {
    let clock = 0;
    const { client, calls } = fakeClient();
    const service = createNotesService(client, { now: () => clock });
    const first = await service.getImageUrl(path);
    clock = validForMs;
    const second = await service.getImageUrl(path);
    expect(second).not.toBe(first);
    expect(calls.filter((call) => call.method === 'createSignedUrl')).toHaveLength(2);
  });

  it('shouldShareOneSigningBetweenCallsMadeAtTheSameTime', async () => {
    const { client, calls } = fakeClient();
    const service = createNotesService(client);
    const [a, b] = await Promise.all([service.getImageUrl(path), service.getImageUrl(path)]);
    expect(a).toBe(b);
    expect(calls.filter((call) => call.method === 'createSignedUrl')).toHaveLength(1);
  });

  it('shouldNotKeepAFailureSoTheNextTryAsksAgain', async () => {
    const failing = fakeClient({ signError: { message: 'nope' } });
    const service = createNotesService(failing.client);
    await expect(service.getImageUrl(path)).rejects.toMatchObject({ kind: 'image-url' });
    await expect(service.getImageUrl(path)).rejects.toMatchObject({ kind: 'image-url' });
    expect(failing.calls.filter((call) => call.method === 'createSignedUrl')).toHaveLength(2);
  });
});
