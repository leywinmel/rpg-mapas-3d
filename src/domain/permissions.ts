/**
 * Quem pode o quê na mesa. Espelha as regras do banco (RLS e o gatilho
 * guard_token_update) para a interface esconder o que o usuário não pode fazer;
 * a palavra final é sempre do banco.
 */
import { isCovered, type FogMask } from './fog';

export type MemberRole = 'gm' | 'player';

export type Viewer = {
  readonly userId: string;
  readonly role: MemberRole;
  /** Convidado sem conta (login anônimo). */
  readonly isGuest: boolean;
};

export type TokenAccess = {
  readonly ownerId: string | null;
  readonly x: number;
  readonly z: number;
  readonly hidden: boolean;
};

/** Campos que o jogador dono pode mudar no próprio token. */
export const PLAYER_EDITABLE_TOKEN_FIELDS = [
  'x',
  'z',
  'elevation',
  'rotation',
  'hp_current',
  'notes',
] as const;
export type PlayerEditableTokenField = (typeof PLAYER_EDITABLE_TOKEN_FIELDS)[number];

export function isGameMaster(viewer: Viewer): boolean {
  return viewer.role === 'gm';
}

export function canMoveToken(viewer: Viewer, token: TokenAccess): boolean {
  return isGameMaster(viewer) || token.ownerId === viewer.userId;
}

export function canEditTokenField(viewer: Viewer, token: TokenAccess, field: string): boolean {
  if (isGameMaster(viewer)) return true;
  if (token.ownerId !== viewer.userId) return false;
  return (PLAYER_EDITABLE_TOKEN_FIELDS as readonly string[]).includes(field);
}

/** O jogador não vê token escondido nem sob a névoa, a não ser o próprio. */
export function canSeeToken(viewer: Viewer, token: TokenAccess, fog: FogMask | null): boolean {
  if (isGameMaster(viewer) || token.ownerId === viewer.userId) return true;
  if (token.hidden) return false;
  return !(fog && isCovered(fog, { x: token.x, z: token.z }));
}

/** Criar mesa, salvar mapas e montar biblioteca pede conta; convidado só joga. */
export function canCreateRoom(viewer: Pick<Viewer, 'isGuest'>): boolean {
  return !viewer.isGuest;
}

export function canEditMap(viewer: Viewer): boolean {
  return isGameMaster(viewer);
}

export function canRollHidden(viewer: Viewer): boolean {
  return isGameMaster(viewer);
}

export function canSendNotes(viewer: Viewer): boolean {
  return isGameMaster(viewer);
}

export function canManageInitiative(viewer: Viewer): boolean {
  return isGameMaster(viewer);
}
