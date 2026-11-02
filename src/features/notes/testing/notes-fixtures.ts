// Apoio dos testes das anotações (não entra no build do site: só os testes o importam).
import type { RoomMember } from '@/features/rooms';
import type { NotesContextValue } from '../hooks/notes-context';
import type { Note } from '../types';

export const GM_ID = '11111111-1111-4111-8111-111111111111';
export const ANA_ID = '22222222-2222-4222-8222-222222222222';
export const BIA_ID = '44444444-4444-4444-8444-444444444444';

export function makeMember(
  userId: string,
  nickname: string,
  role: RoomMember['role'] = 'player',
): RoomMember {
  return { userId, nickname, role, joinedAt: '2026-11-01T10:00:00Z' };
}

export const TABLE_MEMBERS: readonly RoomMember[] = [
  makeMember(GM_ID, 'Mestre', 'gm'),
  makeMember(ANA_ID, 'Ana'),
  makeMember(BIA_ID, 'Bia'),
];

let noteCounter = 0;

export function makeNote(overrides: Partial<Note> = {}): Note {
  noteCounter += 1;
  return {
    id: `note-${noteCounter}`,
    roomId: '33333333-3333-4333-8333-333333333333',
    authorId: GM_ID,
    title: `Anotação ${noteCounter}`,
    body: '',
    imagePath: null,
    toAll: true,
    recipientIds: [],
    createdAt: '2026-11-01T18:10:00+00:00',
    ...overrides,
  };
}

/** Um valor de contexto completo, com funções espiãs; cada teste muda só o que importa. */
export function makeContext(overrides: Partial<NotesContextValue> = {}): NotesContextValue {
  return {
    viewerId: ANA_ID,
    canManage: false,
    members: TABLE_MEMBERS,
    feed: { status: 'ready', notes: [], hasMore: false },
    loadingMore: false,
    unreadCount: 0,
    reload: vi.fn(),
    loadMore: vi.fn(),
    sendNote: vi.fn(async () => undefined),
    updateNote: vi.fn(async () => undefined),
    deleteNote: vi.fn(async () => undefined),
    getImageUrl: vi.fn(async (path: string) => `https://files.test/${path}`),
    ...overrides,
  };
}

/** O jsdom não implementa <dialog>: aqui showModal e close só ligam e desligam o atributo `open`. */
export function installDialogPolyfill(): void {
  const prototype = HTMLDialogElement.prototype;
  if (!('open' in prototype)) {
    Object.defineProperty(prototype, 'open', {
      configurable: true,
      get(this: HTMLDialogElement) {
        return this.hasAttribute('open');
      },
    });
  }
  prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

/**
 * O jsdom não faz layout: este ResizeObserver avisa na hora que observa, e as alturas medidas
 * vêm do que o teste combinar. Devolve a função que desfaz tudo.
 */
export function installLayoutStub(heights: { scrollHeight: number; clientHeight: number }) {
  class ImmediateResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe() {
      this.callback([], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ImmediateResizeObserver);
  for (const [name, value] of Object.entries(heights)) {
    Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get: () => value });
  }
  return () => {
    vi.unstubAllGlobals();
    for (const name of Object.keys(heights)) Reflect.deleteProperty(HTMLElement.prototype, name);
  };
}
