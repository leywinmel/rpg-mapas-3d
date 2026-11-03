/**
 * Acesso à lista de mapas da mesa (nome, ordem, mapa ativo). O conteúdo do mapa (criar,
 * abrir e gravar) é do MapsV2Service. O editor só conhece as interfaces; a implementação com
 * Supabase fica aqui e os testes passam uma versão falsa.
 */
import { z } from 'zod';
import type { AppSupabaseClient } from '@/lib/supabase';
import type { MapSummary, RoomChange, RoomMaps } from '../types';
import { check, unwrap } from './service-result';

export type MapsService = {
  loadRoomMaps: (roomId: string) => Promise<RoomMaps>;
  renameMap: (mapId: string, name: string) => Promise<void>;
  deleteMap: (mapId: string) => Promise<void>;
  setActiveMap: (roomId: string, mapId: string | null) => Promise<void>;
  reorderMaps: (order: ReadonlyArray<{ id: string; sortOrder: number }>) => Promise<void>;
  /** Assina as mudanças da mesa; devolve a função que cancela a assinatura. */
  subscribeRoom: (roomId: string, onChange: (change: RoomChange) => void) => () => void;
};

/** Colunas do resumo do mapa (sem o documento); o serviço do v2 usa as mesmas. */
export const SUMMARY_COLUMNS = 'id, name, width, depth, sort_order, updated_at';

type SummaryRow = {
  id: string;
  name: string;
  width: number;
  depth: number;
  sort_order: number;
  updated_at: string;
};

export function toSummary(row: SummaryRow): MapSummary {
  return {
    id: row.id,
    name: row.name,
    width: row.width,
    depth: row.depth,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  };
}

const rowWithId = z.object({ id: z.string() });

function changedId(payload: { new: unknown; old: unknown }): string | null {
  const fromNew = rowWithId.safeParse(payload.new);
  if (fromNew.success) return fromNew.data.id;
  const fromOld = rowWithId.safeParse(payload.old);
  return fromOld.success ? fromOld.data.id : null;
}

export function createSupabaseMapsService(client: AppSupabaseClient): MapsService {
  return {
    async loadRoomMaps(roomId) {
      const [room, maps] = await Promise.all([
        client.from('rooms').select('active_map_id').eq('id', roomId).single(),
        client
          .from('maps')
          .select(SUMMARY_COLUMNS)
          .eq('room_id', roomId)
          .order('sort_order')
          .order('created_at'),
      ]);
      return {
        activeMapId: unwrap(room).active_map_id,
        maps: unwrap(maps).map(toSummary),
      };
    },

    async renameMap(mapId, name) {
      check(await client.from('maps').update({ name }).eq('id', mapId));
    },

    async deleteMap(mapId) {
      check(await client.from('maps').delete().eq('id', mapId));
    },

    async setActiveMap(roomId, mapId) {
      check(await client.from('rooms').update({ active_map_id: mapId }).eq('id', roomId));
    },

    async reorderMaps(order) {
      const results = await Promise.all(
        order.map((item) =>
          client.from('maps').update({ sort_order: item.sortOrder }).eq('id', item.id),
        ),
      );
      results.forEach(check);
    },

    subscribeRoom(roomId, onChange) {
      const channel = client
        .channel(`room-maps:${roomId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
          () => onChange({ type: 'room' }),
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'maps', filter: `room_id=eq.${roomId}` },
          (payload) => {
            const mapId = changedId(payload);
            if (mapId) onChange({ type: 'map', event: 'INSERT', mapId });
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'maps', filter: `room_id=eq.${roomId}` },
          (payload) => {
            const mapId = changedId(payload);
            if (mapId) onChange({ type: 'map', event: 'UPDATE', mapId });
          },
        )
        // O Realtime não filtra exclusões; quem escuta confere se o mapa é desta mesa.
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'maps' }, (payload) => {
          const mapId = changedId(payload);
          if (mapId) onChange({ type: 'map', event: 'DELETE', mapId });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') onChange({ type: 'resync' });
        });
      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}
