import type { DieSides } from '@/domain';

/** Um dado de uma rolagem gravada. `kept` é falso nos descartados por kh/kl. */
export type RollDie = {
  sides: DieSides;
  value: number;
  kept: boolean;
};

/** Uma linha do histórico da mesa (tabela dice_rolls). */
export type DiceRoll = {
  id: string;
  roomId: string;
  /** Nulo quando a conta de quem rolou foi apagada. */
  rollerId: string | null;
  /** Notação padronizada, ex: "2d20kh1 + 3". */
  notation: string;
  dice: RollDie[];
  modifier: number;
  total: number;
  /** Rolagem escondida: só o mestre e quem rolou recebem. */
  hidden: boolean;
  createdAt: string;
};
