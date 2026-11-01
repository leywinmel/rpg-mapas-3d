import type { RoomEntryState } from '../types';
import type { RoomsService } from './rooms-service';

export type ResolveEntryInput = {
  slug: string;
  /** Nulo quando ninguém fez login ainda. */
  userId: string | null;
  service: Pick<RoomsService, 'findMembership' | 'getPreview'>;
};

/** Decide o que a tela da sala mostra: a mesa, o pedido de apelido, a escolha de login ou "não encontrada". */
export async function resolveRoomEntry({
  slug,
  userId,
  service,
}: ResolveEntryInput): Promise<RoomEntryState> {
  if (userId) {
    const found = await service.findMembership(slug, userId);
    if (found) return { status: 'member', ...found };
  }
  const preview = await service.getPreview(slug);
  if (preview.status === 'not-found') return { status: 'not-found' };
  if (!userId) {
    return {
      status: 'needs-identity',
      preview: preview.status === 'found' ? preview.preview : null,
    };
  }
  // Logado e a prévia ainda pede login: a sessão caiu no meio do caminho.
  if (preview.status === 'login-required') return { status: 'needs-identity', preview: null };
  return { status: 'needs-nickname', preview: preview.preview };
}
