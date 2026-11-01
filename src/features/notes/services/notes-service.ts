import type { Database } from '@/lib/database.types';
import { getSupabase, type AppSupabaseClient } from '@/lib/supabase';
import {
  MS_PER_SECOND,
  NOTE_IMAGE_URL_REUSE_MARGIN_SECONDS,
  NOTE_IMAGE_URL_TTL_SECONDS,
  NOTE_IMAGES_BUCKET,
} from '../constants';
import { noteImageExtension } from '../note-image';
import type { EditNoteInput, Note, NotesPage, SendNoteInput } from '../types';
import { NoteError, toNoteError } from './note-errors';
import { reportNoteSideEffectFailure } from './report-note-failure';

type NoteRow = Database['public']['Tables']['notes']['Row'];
type NoteListRow = NoteRow & { note_recipients: ReadonlyArray<{ user_id: string }> };

const NOTE_COLUMNS = 'id, room_id, author_id, title, body, image_path, to_all, created_at';
const NOTE_WITH_RECIPIENTS = `${NOTE_COLUMNS}, note_recipients(user_id)`;

function toNote(row: NoteRow, recipientIds: readonly string[]): Note {
  return {
    id: row.id,
    roomId: row.room_id,
    authorId: row.author_id,
    title: row.title,
    body: row.body,
    imagePath: row.image_path,
    toAll: row.to_all,
    recipientIds,
    createdAt: row.created_at,
  };
}

function toListedNote(row: NoteListRow): Note {
  return toNote(
    row,
    row.note_recipients.map((recipient) => recipient.user_id),
  );
}

export type NotesServiceOptions = {
  /** Relógio e gerador de id: trocáveis nos testes. */
  now?: () => number;
  newId?: () => string;
};

type CachedImageUrl = { url: Promise<string>; reusableUntil: number };

/** Anotações da mesa no Supabase (banco e Storage), atrás de uma interface mockável [#20][#45]. */
export function createNotesService(client: AppSupabaseClient, options: NotesServiceOptions = {}) {
  const now = options.now ?? Date.now;
  const newId = options.newId ?? (() => crypto.randomUUID());
  const imageUrls = new Map<string, CachedImageUrl>();
  const images = () => client.storage.from(NOTE_IMAGES_BUCKET);

  async function uploadImage(roomId: string, file: File): Promise<string> {
    const extension = noteImageExtension(file.type);
    if (!extension) throw new NoteError('image-type', null);
    // Pasta = id da mesa: é o que a regra do banco e as políticas do Storage esperam.
    const path = `${roomId}/${newId()}.${extension}`;
    const { error } = await images().upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw toNoteError(error, 'image-upload');
    return path;
  }

  /** A anotação (ou o envio dela) já foi resolvida; sobrar um arquivo é só sujeira, não erro. */
  async function removeImageQuietly(path: string, action: string): Promise<void> {
    imageUrls.delete(path);
    try {
      const { error } = await images().remove([path]);
      if (error) throw error;
    } catch (error) {
      reportNoteSideEffectFailure(error, 'Não deu para apagar a imagem da anotação.', action);
    }
  }

  async function signImageUrl(path: string): Promise<string> {
    const { data, error } = await images().createSignedUrl(path, NOTE_IMAGE_URL_TTL_SECONDS);
    if (error) throw toNoteError(error, 'image-url');
    return data.signedUrl;
  }

  return {
    /**
     * As anotações mais novas primeiro, com os destinatários. O RLS decide o que cada um vê:
     * o mestre recebe todas as linhas de destinatários; o jogador, só a própria.
     */
    async listNotes({ roomId, limit }: { roomId: string; limit: number }): Promise<NotesPage> {
      const { data, error } = await client
        .from('notes')
        .select(NOTE_WITH_RECIPIENTS)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        // Uma a mais só para saber se existem anotações além da janela.
        .limit(limit + 1);
      if (error) throw toNoteError(error);
      return { notes: data.slice(0, limit).map(toListedNote), hasMore: data.length > limit };
    },

    /** Sobe a imagem (se houver) e manda a anotação; se o envio falhar, a imagem não fica órfã. */
    async sendNote(input: SendNoteInput): Promise<Note> {
      const imagePath = input.image ? await uploadImage(input.roomId, input.image) : null;
      const chosen = input.recipients.mode === 'chosen' ? input.recipients.userIds : [];
      const { data, error } = await client.rpc('send_note', {
        p_room_id: input.roomId,
        p_title: input.title,
        p_body: input.body,
        p_image_path: imagePath ?? undefined,
        p_to_all: input.recipients.mode === 'all',
        p_recipient_ids: chosen,
      });
      if (error) {
        if (imagePath) await removeImageQuietly(imagePath, 'remove-unsent-image');
        throw toNoteError(error);
      }
      return toNote(data, chosen);
    },

    /** Só título e texto: destinatários e imagem ficam como foram enviados. */
    async updateNote({ noteId, title, body }: EditNoteInput): Promise<void> {
      const { data, error } = await client
        .from('notes')
        .update({ title, body })
        .eq('id', noteId)
        .select('id')
        .maybeSingle();
      if (error) throw toNoteError(error);
      // O RLS não dá erro quando bloqueia: só não devolve a linha. Para o mestre, é anotação já apagada.
      if (!data) throw new NoteError('not-found', null);
    },

    /** Apaga a linha primeiro; a imagem vai depois e, se falhar, só vira aviso no log. */
    async deleteNote(note: Pick<Note, 'id' | 'imagePath'>): Promise<void> {
      const { data, error } = await client.from('notes').delete().eq('id', note.id).select('id');
      if (error) throw toNoteError(error);
      if (data.length === 0) throw new NoteError('not-found', null);
      if (note.imagePath) await removeImageQuietly(note.imagePath, 'remove-deleted-image');
    },

    /** URL assinada da imagem (bucket privado). Vale por uma hora e é reaproveitada enquanto vale. */
    getImageUrl(path: string): Promise<string> {
      const cached = imageUrls.get(path);
      if (cached && cached.reusableUntil > now()) return cached.url;

      const validForMs =
        (NOTE_IMAGE_URL_TTL_SECONDS - NOTE_IMAGE_URL_REUSE_MARGIN_SECONDS) * MS_PER_SECOND;
      const entry: CachedImageUrl = { url: signImageUrl(path), reusableUntil: now() + validForMs };
      imageUrls.set(path, entry);
      // Falha não fica guardada: a próxima tentativa assina de novo.
      void entry.url.catch(() => {
        if (imageUrls.get(path) === entry) imageUrls.delete(path);
      });
      return entry.url;
    },
  };
}

export type NotesService = ReturnType<typeof createNotesService>;

let defaultService: NotesService | null = null;

export function getNotesService(): NotesService {
  defaultService ??= createNotesService(getSupabase());
  return defaultService;
}
