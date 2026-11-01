import type { AppSupabaseClient } from '@/lib/supabase';
import { RoomError } from './room-errors';
import { createRoomsService } from './rooms-service';

type Result = { data: unknown; error: unknown };
type Call = { method: string; args: unknown[] };

/**
 * Cliente falso do Supabase: cada `from()`/`rpc()` devolve um construtor encadeável
 * que registra as chamadas e resolve com o resultado combinado no teste.
 */
function fakeClient(result: Result) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order', 'update', 'delete', 'maybeSingle', 'single']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder.then = (resolve: (value: Result) => unknown) => resolve(result);
  const client = {
    from: (table: string) => {
      calls.push({ method: 'from', args: [table] });
      return builder;
    },
    rpc: (name: string, params: unknown) => {
      calls.push({ method: 'rpc', args: [name, params] });
      return builder;
    },
  };
  return { client: client as unknown as AppSupabaseClient, calls };
}

const ROOM_ROW = {
  id: 'r1',
  slug: 'abc123',
  name: 'Cripta',
  owner_id: 'u1',
  active_map_id: null,
};

describe('createRoomsService', () => {
  it('shouldCreateRoomThroughRpcAndMapColumns', async () => {
    const { client, calls } = fakeClient({
      data: { ...ROOM_ROW, created_at: '', updated_at: '' },
      error: null,
    });
    const room = await createRoomsService(client).createRoom({ name: 'Cripta', nickname: 'Theo' });
    expect(calls[0]).toEqual({
      method: 'rpc',
      args: ['create_room', { p_name: 'Cripta', p_nickname: 'Theo' }],
    });
    expect(room).toEqual({
      id: 'r1',
      slug: 'abc123',
      name: 'Cripta',
      ownerId: 'u1',
      activeMapId: null,
    });
  });

  it('shouldTurnUnknownSlugIntoNotFoundError', async () => {
    const { client } = fakeClient({
      data: null,
      error: { code: 'P0002', message: 'Mesa não encontrada.' },
    });
    const join = createRoomsService(client).joinRoom({ slug: 'nada', nickname: 'Bia' });
    await expect(join).rejects.toBeInstanceOf(RoomError);
    await expect(join).rejects.toMatchObject({ kind: 'not-found', code: 'P0002' });
  });

  it('shouldReportPreviewAsLoginRequiredWhenPermissionDenied', async () => {
    const { client } = fakeClient({ data: null, error: { code: '42501', message: 'denied' } });
    await expect(createRoomsService(client).getPreview('demo')).resolves.toEqual({
      status: 'login-required',
    });
  });

  it('shouldDistinguishFoundAndMissingPreview', async () => {
    const found = fakeClient({ data: [{ id: 'r1', name: 'Cripta' }], error: null });
    const missing = fakeClient({ data: [], error: null });
    await expect(createRoomsService(found.client).getPreview('demo')).resolves.toEqual({
      status: 'found',
      preview: { id: 'r1', name: 'Cripta' },
    });
    await expect(createRoomsService(missing.client).getPreview('x')).resolves.toEqual({
      status: 'not-found',
    });
  });

  it('shouldListMyRoomsNewestFirst', async () => {
    const { client, calls } = fakeClient({
      data: [
        {
          role: 'player',
          nickname: 'Ana',
          joined_at: '2026-10-01T10:00:00Z',
          rooms: { id: 'old', slug: 'old', name: 'Antiga', updated_at: '2026-10-01T09:00:00Z' },
        },
        {
          role: 'gm',
          nickname: 'Theo',
          joined_at: '2026-10-02T10:00:00Z',
          rooms: { id: 'new', slug: 'new', name: 'Nova', updated_at: '2026-10-05T10:00:00Z' },
        },
      ],
      error: null,
    });
    const rooms = await createRoomsService(client).listMyRooms('u1');
    expect(calls).toContainEqual({ method: 'eq', args: ['user_id', 'u1'] });
    expect(rooms.map((room) => [room.id, room.role, room.lastActivityAt])).toEqual([
      ['new', 'gm', '2026-10-05T10:00:00Z'],
      ['old', 'player', '2026-10-01T10:00:00Z'],
    ]);
  });

  it('shouldReturnMembershipOnlyForMembers', async () => {
    const member = fakeClient({
      data: { role: 'gm', nickname: 'Mestre', rooms: ROOM_ROW },
      error: null,
    });
    const stranger = fakeClient({ data: null, error: null });
    await expect(createRoomsService(member.client).findMembership('abc123', 'u1')).resolves.toEqual(
      {
        room: { id: 'r1', slug: 'abc123', name: 'Cripta', ownerId: 'u1', activeMapId: null },
        membership: { role: 'gm', nickname: 'Mestre' },
      },
    );
    expect(member.calls).toContainEqual({ method: 'eq', args: ['rooms.slug', 'abc123'] });
    await expect(
      createRoomsService(stranger.client).findMembership('abc123', 'u2'),
    ).resolves.toBeNull();
  });

  it('shouldTreatRenameBlockedByRlsAsForbidden', async () => {
    const { client } = fakeClient({ data: null, error: null });
    await expect(createRoomsService(client).renameRoom('r1', 'Nova')).rejects.toMatchObject({
      kind: 'forbidden',
    });
  });

  it('shouldTreatDeleteOfNoRowsAsForbidden', async () => {
    const deleted = fakeClient({ data: [{ id: 'r1' }], error: null });
    const blocked = fakeClient({ data: [], error: null });
    await expect(createRoomsService(deleted.client).deleteRoom('r1')).resolves.toBeUndefined();
    await expect(createRoomsService(blocked.client).deleteRoom('r1')).rejects.toMatchObject({
      kind: 'forbidden',
    });
  });

  it('shouldRejectUnknownRoleFromDatabase', async () => {
    const { client } = fakeClient({
      data: [{ user_id: 'u1', nickname: 'X', role: 'admin', joined_at: '2026-10-01T00:00:00Z' }],
      error: null,
    });
    await expect(createRoomsService(client).listMembers('r1')).rejects.toThrow();
  });
});
