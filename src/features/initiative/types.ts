import type { InitiativeEntry } from '@/domain';

/** Entrada da ordem como o app usa (o banco guarda em snake_case, ver services/initiative-service.ts). */
export type InitiativeItem = InitiativeEntry & {
  /** Token da entrada; nulo = entrada livre (armadilha, reforços, um evento). */
  readonly tokenId: string | null;
  /** Dono do token (quem pode mudar o valor); nulo para token do mestre e entrada livre. */
  readonly ownerId: string | null;
  /** Escondida dos jogadores pelo mestre. */
  readonly hidden: boolean;
};

/** A ordem da mesa: as entradas que esta pessoa vê e a rodada (0 = combate parado). */
export type InitiativeBoard = {
  readonly entries: readonly InitiativeItem[];
  readonly round: number;
};

export type NewInitiativeEntry = {
  tokenId: string | null;
  label: string;
  value: number;
  hidden: boolean;
};

export type InitiativePatch = Partial<
  Pick<InitiativeItem, 'label' | 'value' | 'hidden' | 'position'>
>;
