import { createFogState, fogChunkToText, paintFogRect, planFogSave } from '@/domain';
import { chunkKey } from '@/domain/map-v2';
import type { AppSupabaseClient } from '@/lib/supabase';
import { createFogService } from './fog-service';

type Result = { data: unknown; error: unknown };

const MAP_ID = '11111111-1111-4111-8111-111111111111';
const SIZE = { width: 64, depth: 64 };

/** Cliente falso: cada consulta responde com a próxima da fila; o RPC fica registrado. */
function fakeClient(queries: Result[], rpcResult: Result = { data: null, error: null }) {
  const pending = [...queries];
  const rpc = vi.fn(async () => rpcResult);
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order', 'range', 'maybeSingle']) {
    builder[method] = () => builder;
  }
  builder.then = (resolve: (value: Result) => unknown) =>
    resolve(pending.shift() ?? { data: null, error: null });
  const client = { from: () => builder, rpc };
  return { client: client as unknown as AppSupabaseClient, rpc };
}

describe('fogService', () => {
  it('shouldStartClearAndOffWithoutARow', async () => {
    const { client } = fakeClient([{ data: null, error: null }]);
    const fog = await createFogService(client).loadFog(MAP_ID, SIZE);
    expect(fog).toMatchObject({ enabled: false, defaultCovered: false });
    expect(fog.chunks.size).toBe(0);
  });

  it('shouldRebuildTheChunksFromTheBits', async () => {
    const rect = { x: 33, z: 0, width: 1, depth: 1 };
    const painted = paintFogRect(createFogState(SIZE, true), rect, true);
    const chunk = painted.chunks.get(chunkKey({ cx: 1, cz: 0 }));
    if (!chunk) throw new Error('sem pedaço');
    const { client } = fakeClient([
      { data: { enabled: true, default_covered: false }, error: null },
      { data: [{ cx: 1, cz: 0, covered: fogChunkToText(chunk) }], error: null },
    ]);
    const fog = await createFogService(client).loadFog(MAP_ID, SIZE);
    expect(fog.enabled).toBe(true);
    expect(fog.chunks.get(chunkKey({ cx: 1, cz: 0 }))).toEqual(chunk);
  });

  it('shouldSendThePlanToTheRpc', async () => {
    const { client, rpc } = fakeClient([]);
    const rect = { x: 0, z: 0, width: 1, depth: 1 };
    const fog = paintFogRect(createFogState(SIZE, true), rect, true);
    await createFogService(client).saveFog(MAP_ID, planFogSave(null, fog));
    expect(rpc).toHaveBeenCalledWith(
      'save_map_fog',
      expect.objectContaining({ p_map_id: MAP_ID, p_enabled: true, p_deletes: [] }),
    );
  });

  it('shouldMapTheNeedsSaveError', async () => {
    const { client } = fakeClient([], { data: null, error: { code: '22023', message: 'v1' } });
    const save = createFogService(client).saveFog(MAP_ID, planFogSave(null, createFogState(SIZE)));
    await expect(save).rejects.toMatchObject({ kind: 'needs-save' });
  });
});
