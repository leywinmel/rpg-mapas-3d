import { createContext, useContext } from 'react';
import type { RoomMember } from '@/features/rooms';
import type { EditNoteInput, Note, NoteDraft } from '../types';

export type NotesFeed =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; notes: readonly Note[]; hasMore: boolean };

/** O que o botão, o painel e os cartões das anotações leem da mesa aberta. */
export type NotesContextValue = {
  viewerId: string;
  /** Só o mestre envia, edita e apaga anotações (o banco confere no fim). */
  canManage: boolean;
  /** Quem está na mesa agora: os destinatários possíveis e os apelidos que o mestre vê nos cartões. */
  members: readonly RoomMember[];
  feed: NotesFeed;
  loadingMore: boolean;
  /** Anotações de outras pessoas que chegaram depois da última vez que o painel foi aberto. */
  unreadCount: number;
  reload: () => void;
  /** "Ver mais antigas": aumenta a janela da lista. */
  loadMore: () => void;
  sendNote: (draft: NoteDraft) => Promise<void>;
  updateNote: (input: EditNoteInput) => Promise<void>;
  deleteNote: (note: Note) => Promise<void>;
  getImageUrl: (path: string) => Promise<string>;
};

export const NotesContext = createContext<NotesContextValue | null>(null);

/** Dados das anotações da mesa aberta. Só funciona dentro de NotesProvider. */
export function useNotes(): NotesContextValue {
  const value = useContext(NotesContext);
  if (!value) throw new Error('useNotes precisa estar dentro de NotesProvider.');
  return value;
}
