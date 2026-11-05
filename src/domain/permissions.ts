/**
 * Quem pode o quê na mesa. Espelha as regras do banco (RLS e o gatilho
 * guard_token_update) para a interface esconder o que o usuário não pode fazer;
 * a palavra final é sempre do banco.
 */
import { isAreaCovered, type FogState } from './fog';

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
  /** Lado do token em casas (1 = 1×1). */
  readonly size: number;
  readonly hidden: boolean;
};

/** Campos que o jogador dono pode mudar no próprio token. */
export const PLAYER_EDITABLE_TOKEN_FIELDS = [
  'x',
  'z',
  'level',
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

/**
 * Mover o cenário durante o jogo (carros, caixotes): só o mestre. É a mesma regra do banco, que
 * só deixa quem edita o mapa gravar os pedaços (map_chunks).
 */
export function canMoveScenery(viewer: Viewer): boolean {
  return isGameMaster(viewer);
}

export function canEditTokenField(viewer: Viewer, token: TokenAccess, field: string): boolean {
  if (isGameMaster(viewer)) return true;
  if (token.ownerId !== viewer.userId) return false;
  return (PLAYER_EDITABLE_TOKEN_FIELDS as readonly string[]).includes(field);
}

/**
 * O jogador não vê token escondido nem todo sob a névoa, a não ser o próprio; uma casa do token
 * à vista já basta (a mesma regra do banco, em is_area_covered).
 */
export function canSeeToken(viewer: Viewer, token: TokenAccess, fog: FogState | null): boolean {
  if (isGameMaster(viewer) || token.ownerId === viewer.userId) return true;
  if (token.hidden) return false;
  return !(fog && isAreaCovered(fog, token, token.size));
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

/**
 * Valor da iniciativa: o mestre muda qualquer um; o jogador, só o da entrada do próprio token
 * (a mesma regra da política de update e do gatilho guard_initiative_update).
 */
export function canEditInitiativeValue(
  viewer: Viewer,
  entry: { readonly ownerId: string | null },
): boolean {
  return isGameMaster(viewer) || (entry.ownerId !== null && entry.ownerId === viewer.userId);
}
