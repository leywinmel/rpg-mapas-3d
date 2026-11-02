export type Note = {
  id: string;
  roomId: string;
  /** Nulo quando a conta de quem escreveu foi apagada. */
  authorId: string | null;
  title: string;
  /** Texto puro, com quebras de linha. Nunca é renderizado como HTML. */
  body: string;
  /** Caminho no bucket note-images (`<id da mesa>/<arquivo>`). */
  imagePath: string | null;
  toAll: boolean;
  /**
   * Quem recebeu, quando não é para a mesa toda. O mestre vê todos; cada jogador só enxerga
   * a própria linha (regra do banco), então a lista dele nunca revela os outros destinatários.
   */
  recipientIds: readonly string[];
  /** ISO 8601, no relógio do servidor. */
  createdAt: string;
};

/** Para quem a anotação vai: a mesa toda ou só estes jogadores. */
export type NoteRecipients = { mode: 'all' } | { mode: 'chosen'; userIds: string[] };

/** O que o mestre preenche ao escrever uma anotação nova. */
export type NoteDraft = {
  title: string;
  body: string;
  image: File | null;
  recipients: NoteRecipients;
};

export type SendNoteInput = NoteDraft & { roomId: string };

export type EditNoteInput = { noteId: string; title: string; body: string };

/** Uma janela da lista: das mais novas para as mais antigas. */
export type NotesPage = {
  notes: Note[];
  /** Há anotações mais antigas além da janela pedida. */
  hasMore: boolean;
};
