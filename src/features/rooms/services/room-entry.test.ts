import type { PreviewResult } from '../types';
import { resolveRoomEntry, type ResolveEntryInput } from './room-entry';

const ROOM = { id: 'r1', slug: 'demo', name: 'Cripta', ownerId: 'u1', activeMapId: null };
const PREVIEW: PreviewResult = { status: 'found', preview: { id: 'r1', name: 'Cripta' } };

function service(options: {
  membership?: Awaited<ReturnType<ResolveEntryInput['service']['findMembership']>>;
  preview?: PreviewResult;
}): ResolveEntryInput['service'] {
  return {
    findMembership: vi.fn().mockResolvedValue(options.membership ?? null),
    getPreview: vi.fn().mockResolvedValue(options.preview ?? { status: 'not-found' }),
  };
}

describe('resolveRoomEntry', () => {
  it('shouldOpenRoomForMembersWithoutAskingPreview', async () => {
    const deps = service({ membership: { room: ROOM, membership: { role: 'gm', nickname: 'M' } } });
    const state = await resolveRoomEntry({ slug: 'demo', userId: 'u1', service: deps });
    expect(state).toMatchObject({ status: 'member', room: ROOM });
    expect(deps.getPreview).not.toHaveBeenCalled();
  });

  it('shouldAskNicknameForSignedInStranger', async () => {
    const state = await resolveRoomEntry({
      slug: 'demo',
      userId: 'u2',
      service: service({ preview: PREVIEW }),
    });
    expect(state).toEqual({ status: 'needs-nickname', preview: { id: 'r1', name: 'Cripta' } });
  });

  it('shouldOfferGuestOrAccountToVisitorEvenWithoutName', async () => {
    const hidden = await resolveRoomEntry({
      slug: 'demo',
      userId: null,
      service: service({ preview: { status: 'login-required' } }),
    });
    expect(hidden).toEqual({ status: 'needs-identity', preview: null });
  });

  it('shouldReportMissingRoom', async () => {
    const state = await resolveRoomEntry({ slug: 'nada', userId: 'u2', service: service({}) });
    expect(state).toEqual({ status: 'not-found' });
  });
});
