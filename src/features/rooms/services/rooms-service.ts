import {
  isDayPhase,
  isWeatherKind,
  toTableWeather,
  type MemberRole,
  type TableWeather,
} from '@/domain';
import { isValidCutaway, type Cutaway } from '@/domain/map-v2';
import { getSupabase, type AppSupabaseClient } from '@/lib/supabase';
import { memberRoleSchema } from '../schemas';
import type { Membership, PreviewResult, Room, RoomMember, RoomSummary } from '../types';
import { RoomError, toRoomError } from './room-errors';

const ROOM_COLUMNS = 'id, slug, name, owner_id, active_map_id, cutaway_lock, weather, day_phase';
const MEMBER_COLUMNS = 'user_id, nickname, role, joined_at';
const PERMISSION_DENIED = '42501';

type RoomRow = {
  id: string;
  slug: string;
  name: string;
  owner_id: string;
  active_map_id: string | null;
  cutaway_lock: number | null;
  weather: string;
  day_phase: string;
};

export function toRoom(row: RoomRow): Room {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    ownerId: row.owner_id,
    activeMapId: row.active_map_id,
    // Valor fora do intervalo não passa do check do banco; se passar, a mesa fica livre.
    cutawayLock: isValidCutaway(row.cutaway_lock) ? row.cutaway_lock : null,
    // Código desconhecido (versão futura do banco) vira céu limpo com a luz do mapa.
    tableWeather: toTableWeather(row.weather, row.day_phase),
  };
}

/** O banco guarda o papel como texto; aqui ele vira o tipo do domínio (ou falha alto). */
function toRole(raw: string): MemberRole {
  return memberRoleSchema.parse(raw);
}

function toMember(row: { user_id: string; nickname: string; role: string; joined_at: string }) {
  const member: RoomMember = {
    userId: row.user_id,
    nickname: row.nickname,
    role: toRole(row.role),
    joinedAt: row.joined_at,
  };
  return member;
}

function latest(a: string, b: string): string {
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

/** Mesas e membros no Supabase, atrás de uma interface mockável [#20][#45]. */
export function createRoomsService(client: AppSupabaseClient) {
  return {
    /**
     * Mesas em que a pessoa é membro, mais recentes primeiro. O RLS decide quais mesas vêm: para o
     * admin, todas; as que ele ainda não entrou chegam sem a linha de membro.
     */
    async listMyRooms(userId: string): Promise<RoomSummary[]> {
      const { data, error } = await client
        .from('rooms')
        .select('id, slug, name, updated_at, room_members(role, nickname, joined_at)')
        .eq('room_members.user_id', userId);
      if (error) throw toRoomError(error);
      return data
        .map((row): RoomSummary => {
          const member = row.room_members[0];
          return {
            id: row.id,
            slug: row.slug,
            name: row.name,
            role: member ? toRole(member.role) : 'gm',
            nickname: member?.nickname ?? '',
            lastActivityAt: member ? latest(row.updated_at, member.joined_at) : row.updated_at,
            joined: member !== undefined,
          };
        })
        .sort((a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt));
    },

    async getPreview(slug: string): Promise<PreviewResult> {
      const { data, error } = await client.rpc('get_room_preview', { p_slug: slug });
      if (error?.code === PERMISSION_DENIED) return { status: 'login-required' };
      if (error) throw toRoomError(error);
      const preview = data[0];
      return preview ? { status: 'found', preview } : { status: 'not-found' };
    },

    /** A mesa e o papel da pessoa nela; nulo se ela não for membro (ou a mesa não existir). */
    async findMembership(
      slug: string,
      userId: string,
    ): Promise<{ room: Room; membership: Membership } | null> {
      const { data, error } = await client
        .from('room_members')
        .select(`role, nickname, rooms!inner(${ROOM_COLUMNS})`)
        .eq('user_id', userId)
        .eq('rooms.slug', slug)
        .maybeSingle();
      if (error) throw toRoomError(error);
      if (!data) return null;
      return {
        room: toRoom(data.rooms),
        membership: { role: toRole(data.role), nickname: data.nickname },
      };
    },

    async listMembers(roomId: string): Promise<RoomMember[]> {
      const { data, error } = await client
        .from('room_members')
        .select(MEMBER_COLUMNS)
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true });
      if (error) throw toRoomError(error);
      return data.map(toMember);
    },

    /** Cria a mesa com a pessoa como mestre (função create_room, tudo ou nada). */
    async createRoom(input: { name: string; nickname: string }): Promise<Room> {
      const { data, error } = await client.rpc('create_room', {
        p_name: input.name,
        p_nickname: input.nickname,
      });
      if (error) throw toRoomError(error);
      return toRoom(data);
    },

    /** Entra como jogador; quem já é membro continua com o papel que tinha. */
    async joinRoom(input: { slug: string; nickname: string }): Promise<string> {
      const { data, error } = await client.rpc('join_room', {
        p_slug: input.slug,
        p_nickname: input.nickname,
      });
      if (error) throw toRoomError(error);
      return data;
    },

    async renameRoom(roomId: string, name: string): Promise<Room> {
      const { data, error } = await client
        .from('rooms')
        .update({ name })
        .eq('id', roomId)
        .select(ROOM_COLUMNS)
        .maybeSingle();
      if (error) throw toRoomError(error);
      // O RLS não dá erro quando bloqueia: só não devolve a linha.
      if (!data) throw new RoomError('forbidden', null);
      return toRoom(data);
    },

    /** O mestre trava o corte de andares dos jogadores (ou libera, com null). */
    async setCutawayLock(roomId: string, lock: Cutaway): Promise<Room> {
      if (!isValidCutaway(lock)) throw new RoomError('invalid', null);
      const { data, error } = await client
        .from('rooms')
        .update({ cutaway_lock: lock })
        .eq('id', roomId)
        .select(ROOM_COLUMNS)
        .maybeSingle();
      if (error) throw toRoomError(error);
      if (!data) throw new RoomError('forbidden', null);
      return toRoom(data);
    },

    /** O mestre troca o tempo ou a hora da mesa (RPG-38, RPG-39). */
    async setTableWeather(roomId: string, patch: Partial<TableWeather>): Promise<Room> {
      const update: { weather?: string; day_phase?: string } = {};
      if (patch.weather !== undefined) {
        if (!isWeatherKind(patch.weather)) throw new RoomError('invalid', null);
        update.weather = patch.weather;
      }
      if (patch.dayPhase !== undefined) {
        if (!isDayPhase(patch.dayPhase)) throw new RoomError('invalid', null);
        update.day_phase = patch.dayPhase;
      }
      const { data, error } = await client
        .from('rooms')
        .update(update)
        .eq('id', roomId)
        .select(ROOM_COLUMNS)
        .maybeSingle();
      if (error) throw toRoomError(error);
      if (!data) throw new RoomError('forbidden', null);
      return toRoom(data);
    },

    async deleteRoom(roomId: string): Promise<void> {
      const { data, error } = await client.from('rooms').delete().eq('id', roomId).select('id');
      if (error) throw toRoomError(error);
      if (data.length === 0) throw new RoomError('forbidden', null);
    },

    async leaveRoom(roomId: string, userId: string): Promise<void> {
      const { data, error } = await client
        .from('room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .select('user_id');
      if (error) throw toRoomError(error);
      if (data.length === 0) throw new RoomError('forbidden', null);
    },
  };
}

export type RoomsService = ReturnType<typeof createRoomsService>;

let defaultService: RoomsService | null = null;

export function getRoomsService(): RoomsService {
  defaultService ??= createRoomsService(getSupabase());
  return defaultService;
}
