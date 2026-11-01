import type { RoomMember } from '@/features/rooms';
import type { Note } from './types';

const timeFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const listFormat = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' });

/** Data e hora curtas em português: "01/11/2026 15:30". `timeZone` só muda nos testes. */
export function formatNoteTime(iso: string, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return timeZone
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone }).format(
        date,
      )
    : timeFormat.format(date);
}

/** Nome do botão da barra: o contador de não lidas também vai para o leitor de tela. */
export function notesButtonLabel(unreadCount: number): string {
  if (unreadCount <= 0) return 'Anotações';
  return `Anotações, ${unreadCount} ${unreadCount === 1 ? 'nova' : 'novas'}`;
}

export type AudienceViewer = {
  /** O mestre vê quem recebeu; o jogador só sabe que a anotação é dele. */
  canManage: boolean;
  members: readonly RoomMember[];
};

function describeLeavers(count: number): string {
  return count === 1 ? 'um jogador que saiu da mesa' : `${count} jogadores que saíram da mesa`;
}

/**
 * Para quem a anotação foi. O banco só entrega ao jogador a própria linha de destinatário,
 * então ele nunca vê a lista dos outros; o mestre vê os apelidos de quem ainda está na mesa
 * e uma contagem de quem já saiu (o apelido some junto com a pessoa da mesa).
 */
export function describeAudience(note: Note, viewer: AudienceViewer): string {
  if (note.toAll) return 'Para a mesa toda';
  if (!viewer.canManage) return 'Só para você';

  const nicknames = new Map(viewer.members.map((member) => [member.userId, member.nickname]));
  const names: string[] = [];
  let leavers = 0;
  for (const userId of note.recipientIds) {
    const nickname = nicknames.get(userId);
    if (nickname === undefined) leavers += 1;
    else names.push(nickname);
  }
  const parts = leavers > 0 ? [...names, describeLeavers(leavers)] : names;
  if (parts.length === 0) return 'Sem destinatários';
  return `Para ${listFormat.format(parts)}`;
}
