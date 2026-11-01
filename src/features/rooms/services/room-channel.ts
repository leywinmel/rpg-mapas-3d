import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { getSupabase, type AppSupabaseClient } from '@/lib/supabase';
import type { Room } from '../types';
import { toRoom } from './rooms-service';

type RoomRow = Database['public']['Tables']['rooms']['Row'];
type MemberRow = Database['public']['Tables']['room_members']['Row'];

/**
 * Avisos entre quem está na mesa. Existem porque o Realtime não entrega DELETE
 * filtrado por mesa: quem sai ou apaga avisa os outros antes.
 */
export const ROOM_ANNOUNCEMENTS = {
  membersChanged: 'members-changed',
  roomDeleted: 'room-deleted',
} as const;
export type RoomAnnouncement = (typeof ROOM_ANNOUNCEMENTS)[keyof typeof ROOM_ANNOUNCEMENTS];

export type RoomChannelHandlers = {
  onOnlineChange: (userIds: ReadonlySet<string>) => void;
  /** Alguém entrou, saiu ou trocou de apelido: hora de recarregar a lista de membros. */
  onMembersChanged: () => void;
  onRoomUpdated: (room: Room) => void;
  onRoomDeleted: () => void;
  onConnectionProblem: (error: unknown) => void;
};

export type RoomChannelOptions = {
  roomId: string;
  userId: string;
  nickname: string;
  handlers: RoomChannelHandlers;
};

export type RoomChannel = {
  announce: (event: RoomAnnouncement) => Promise<void>;
  close: () => void;
};

export function roomChannelName(roomId: string): string {
  return `room:${roomId}`;
}

type OpenChannel = {
  channel: RealtimeChannel;
  client: AppSupabaseClient;
  /** Trocável: quem reabre o canal passa a receber os eventos sem assinar de novo. */
  handlers: RoomChannelHandlers;
  closeTimer: ReturnType<typeof setTimeout> | null;
};

/**
 * O Supabase devolve o MESMO canal para o mesmo nome e só o desmonta depois de uma
 * ida ao servidor. Fechar e reabrir em seguida (o modo estrito do React faz isso)
 * pegaria um canal morrendo. Por isso o fechamento espera um instante e é
 * cancelado se a mesa for reaberta.
 */
const openChannels = new Map<string, OpenChannel>();

function listenToDatabase(entry: OpenChannel, roomId: string): void {
  entry.channel
    .on<MemberRow>(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
      () => entry.handlers.onMembersChanged(),
    )
    .on<MemberRow>(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
      () => entry.handlers.onMembersChanged(),
    )
    .on<RoomRow>(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (payload) => entry.handlers.onRoomUpdated(toRoom(payload.new)),
    );
}

function listenToPeers(entry: OpenChannel): void {
  const { channel } = entry;
  channel
    .on('presence', { event: 'sync' }, () => {
      entry.handlers.onOnlineChange(new Set(Object.keys(channel.presenceState())));
    })
    .on('broadcast', { event: ROOM_ANNOUNCEMENTS.membersChanged }, () =>
      entry.handlers.onMembersChanged(),
    )
    .on('broadcast', { event: ROOM_ANNOUNCEMENTS.roomDeleted }, () =>
      entry.handlers.onRoomDeleted(),
    );
}

function createEntry(options: RoomChannelOptions, client: AppSupabaseClient): OpenChannel {
  const { roomId, userId, nickname } = options;
  const channel = client.channel(roomChannelName(roomId), {
    // Privado: o Realtime só deixa entrar e enviar quem o banco reconhece como membro
    // (regras em realtime.messages); saber o id da mesa não basta.
    config: { private: true, presence: { key: userId } },
  });
  const entry: OpenChannel = { channel, client, handlers: options.handlers, closeTimer: null };
  listenToPeers(entry);
  listenToDatabase(entry, roomId);
  channel.subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      channel.track({ userId, nickname }).catch((cause: unknown) => {
        entry.handlers.onConnectionProblem(cause);
      });
      return;
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      entry.handlers.onConnectionProblem(error ?? new Error(`Canal da mesa: ${status}`));
    }
  });
  return entry;
}

/**
 * Canal privado `room:<id>`, só para membros: presença (quem está online), mudanças
 * de membros e da mesa vindas do banco (o Realtime respeita o RLS) e avisos entre
 * os participantes.
 */
export function openRoomChannel(
  options: RoomChannelOptions,
  client: AppSupabaseClient = getSupabase(),
): RoomChannel {
  const name = roomChannelName(options.roomId);
  const reused = openChannels.get(name);
  if (reused?.closeTimer) clearTimeout(reused.closeTimer);
  const entry = reused ?? createEntry(options, client);
  entry.handlers = options.handlers;
  entry.closeTimer = null;
  openChannels.set(name, entry);

  return {
    async announce(event) {
      await entry.channel.send({ type: 'broadcast', event, payload: {} });
    },
    close() {
      entry.closeTimer = setTimeout(() => {
        openChannels.delete(name);
        void entry.client.removeChannel(entry.channel);
      }, 0);
    },
  };
}
