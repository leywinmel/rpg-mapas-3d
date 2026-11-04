import { z } from 'zod';
import {
  createFogState,
  fogChunkFromText,
  type FogSavePlan,
  type FogState,
  type GridSize,
} from '@/domain';
import { chunkKey } from '@/domain/map-v2';
import { getSupabase, type AppSupabaseClient } from '@/lib/supabase';
import { FOG_CHUNK_PAGE_SIZE, FOG_MAX_CHUNK_PAGES } from '../constants';
import { FogError, toFogError } from './fog-errors';

const fogRowSchema = z.object({ enabled: z.boolean(), default_covered: z.boolean() });
const fogChunkRowSchema = z.object({
  cx: z.number().int().min(0),
  cz: z.number().int().min(0),
  covered: z.string(),
});

/** Névoa de um mapa no Supabase, atrás de uma interface mockável [#20][#45]. */
export function createFogService(client: AppSupabaseClient) {
  async function chunkRows(mapId: string) {
    const rows: Array<z.infer<typeof fogChunkRowSchema>> = [];
    for (let page = 0; page < FOG_MAX_CHUNK_PAGES; page += 1) {
      const from = page * FOG_CHUNK_PAGE_SIZE;
      const { data, error } = await client
        .from('map_fog_chunks')
        .select('cx, cz, covered')
        .eq('map_id', mapId)
        .order('cz')
        .order('cx')
        .range(from, from + FOG_CHUNK_PAGE_SIZE - 1);
      if (error) throw toFogError(error);
      rows.push(...z.array(fogChunkRowSchema).parse(data));
      if (data.length < FOG_CHUNK_PAGE_SIZE) return rows;
    }
    throw new FogError('unknown', null, { cause: new Error('Pedaços de névoa demais.') });
  }

  return {
    /** A névoa gravada; sem linha no banco, desligada e à vista. */
    async loadFog(mapId: string, size: GridSize): Promise<FogState> {
      const id = z.uuid().parse(mapId);
      const { data, error } = await client
        .from('map_fog')
        .select('enabled, default_covered')
        .eq('map_id', id)
        .maybeSingle();
      if (error) throw toFogError(error);
      if (!data) return createFogState(size);
      const row = fogRowSchema.parse(data);
      const chunks = new Map<string, Uint8Array>();
      for (const chunk of await chunkRows(id)) {
        const bits = fogChunkFromText(chunk.covered);
        if (bits) chunks.set(chunkKey(chunk), bits);
      }
      return { size, enabled: row.enabled, defaultCovered: row.default_covered, chunks };
    },

    /** Grava o plano numa transação só (RPC save_map_fog, que confere se é o mestre). */
    async saveFog(mapId: string, plan: FogSavePlan): Promise<void> {
      const { error } = await client.rpc('save_map_fog', {
        p_map_id: z.uuid().parse(mapId),
        p_enabled: plan.enabled,
        p_default_covered: plan.defaultCovered,
        p_reset: plan.reset,
        p_upserts: plan.upserts.map(({ coord, covered }) => ({ ...coord, covered })),
        p_deletes: plan.deletes.map(({ cx, cz }) => ({ cx, cz })),
      });
      if (error) throw toFogError(error);
    },
  };
}

export type FogService = ReturnType<typeof createFogService>;

let defaultService: FogService | null = null;

export function getFogService(): FogService {
  defaultService ??= createFogService(getSupabase());
  return defaultService;
}
