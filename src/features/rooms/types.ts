import type { MemberRole, TableWeather } from '@/domain';
import type { Cutaway } from '@/domain/map-v2';

export const MEMBER_ROLES = ['gm', 'player'] as const satisfies readonly MemberRole[];

export const ROLE_LABELS: Record<MemberRole, string> = { gm: 'Mestre', player: 'Jogador' };

export type Room = {
  id: string;
  /** Código do link de convite (/sala/<slug>). */
  slug: string;
  name: string;
  ownerId: string;
  activeMapId: string | null;
  /** Corte de andares que os jogadores veem, escolhido pelo mestre; null = todos os andares. */
  cutawayLock: Cutaway;
  /** Tempo e hora que a mesa vê, escolhidos pelo mestre (rooms.weather, rooms.day_phase). */
  tableWeather: TableWeather;
};

export type Membership = { role: MemberRole; nickname: string };

export type RoomMember = Membership & { userId: string; joinedAt: string };

/** Linha de "Minhas mesas". */
export type RoomSummary = Membership & {
  id: string;
  slug: string;
  name: string;
  /** O mais recente entre a última mudança da mesa e a entrada na mesa. */
  lastActivityAt: string;
  /** Falso só para o admin, que vê todas as mesas antes de entrar nelas. */
  joined: boolean;
};

/** O pouco que dá para saber de uma mesa antes de entrar: o nome. */
export type RoomPreview = { id: string; name: string };

export type PreviewResult =
  | { status: 'found'; preview: RoomPreview }
  | { status: 'not-found' }
  /** O servidor só mostra a prévia para quem já fez login (inclusive convidado). */
  | { status: 'login-required' };

export type RoomEntryState =
  | { status: 'not-found' }
  /** Sem login: escolher entre convidado e a própria conta. Prévia nula = nome escondido. */
  | { status: 'needs-identity'; preview: RoomPreview | null }
  /** Logado, mas ainda não é membro: falta o apelido. */
  | { status: 'needs-nickname'; preview: RoomPreview }
  | { status: 'member'; room: Room; membership: Membership };
