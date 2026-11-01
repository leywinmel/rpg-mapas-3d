import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { canRollHidden, diceToThrow, evaluateDice, type DiceExpression } from '@/domain';
import { useRoomSession } from '@/features/rooms';
import { logger } from '@/lib/logger';
import { reportError } from '@/lib/report-error';
import { RESULT_WAIT_MS } from '../constants';
import { planCorrections } from '../physics/correction';
import { loadRapier } from '../physics/rapier';
import { simulateThrow } from '../physics/simulate';
import { throwDice } from '../physics/throw-dice';
import type { ThrowMessage } from '../schemas';
import { openDiceChannel, type DiceChannel } from '../services/dice-channel';
import { reportDiceFailure } from '../services/dice-errors';
import { getDiceService } from '../services/dice-service';
import type { DiceRoll } from '../types';
import { useRollHistory, type RollHistory } from './useRollHistory';
import { useTrayPlayer, type TrayPlayer } from './useTrayPlayer';

export type DiceTableOptions = {
  /** Chamado quando outra pessoa rola em público, para abrir a bandeja e todos verem. */
  onRemoteThrow: () => void;
};

export type DiceTable = {
  history: RollHistory['state'];
  retryHistory: () => void;
  /** Rolagem sendo gravada: o botão fica ocupado até o banco responder. */
  rolling: boolean;
  /** Joga os dados e grava. Devolve falso se algo falhou (o aviso já foi dado). */
  roll: (expression: DiceExpression, hidden: boolean) => Promise<boolean>;
  /** Apaga o histórico da mesa. Lança erro para a janela de confirmação mostrar. */
  clearHistory: () => Promise<void>;
  current: TrayPlayer['current'];
  /** A linha do banco da rolagem que está na bandeja, quando já chegou. */
  currentRoll: DiceRoll | null;
  nicknameOf: (userId: string | null) => string;
};

const UNKNOWN_ROLLER = 'Alguém';

/**
 * Tudo o que a bandeja de dados precisa da mesa: histórico ao vivo, canal em tempo real,
 * fila de animações e as ações de rolar e limpar. A tela só desenha o que isto devolve.
 */
export function useDiceTable({ onRemoteThrow }: DiceTableOptions): DiceTable {
  const { room, viewer, members } = useRoomSession();
  const service = useMemo(() => getDiceService(), []);
  const history = useRollHistory(room.id, service);
  const player = useTrayPlayer();
  const channelRef = useRef<DiceChannel | null>(null);
  const [rolling, setRolling] = useState(false);

  // O canal é aberto uma vez por mesa; ele chama sempre a versão mais nova destas funções.
  const latest = useRef({ onRemoteThrow, insert: history.insert, reload: history.reload });
  const clearLocal = history.clearLocal;
  const enqueue = player.enqueue;
  useEffect(() => {
    latest.current = { onRemoteThrow, insert: history.insert, reload: history.reload };
  });

  useEffect(() => {
    let warned = false;

    async function playRemoteThrow(message: ThrowMessage): Promise<void> {
      latest.current.onRemoteThrow();
      try {
        const rapier = await loadRapier();
        // A mesma simulação de quem rolou: mesma entrada, mesmos quadros.
        const sim = simulateThrow(rapier, message.spec);
        enqueue({ id: message.rollId, notation: message.notation, sim });
      } catch (error) {
        reportDiceFailure(error, {
          action: 'play-throw',
          hint: 'O resultado aparece no histórico.',
        });
      }
    }

    const channel = openDiceChannel({
      roomId: room.id,
      handlers: {
        onThrow: (message) => void playRemoteThrow(message),
        onRollInserted: (roll) => latest.current.insert(roll),
        onHistoryCleared: () => {
          clearLocal();
          void latest.current.reload();
        },
        onConnected: () => void latest.current.reload(),
        onConnectionProblem: (error) => {
          // O cliente do Supabase reconecta sozinho; um aviso por visita basta.
          if (warned) return;
          warned = true;
          reportError(error, {
            userMessage: 'A conexão em tempo real dos dados falhou.',
            hint: 'Tentando reconectar. O histórico pode demorar a atualizar.',
            context: { feature: 'dice', action: 'realtime' },
            severity: 'warn',
          });
        },
      },
    });
    channelRef.current = channel;
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [room.id, clearLocal, enqueue]);

  const { insert } = history;

  // A rolagem já está gravada; se o aviso falhar, os outros a veem só no histórico.
  const announceThrow = useCallback(async (message: ThrowMessage): Promise<void> => {
    try {
      const channel = channelRef.current;
      if (!channel) throw new Error('O canal dos dados está fechado.');
      await channel.sendThrow(message);
    } catch (error) {
      reportDiceFailure(error, {
        action: 'send-throw',
        hint: 'A rolagem foi gravada, mas os outros podem vê-la só no histórico.',
      });
    }
  }, []);

  const roll = useCallback(
    async (expression: DiceExpression, hidden: boolean): Promise<boolean> => {
      setRolling(true);
      try {
        const rapier = await loadRapier();
        const { spec, sim } = throwDice({ rapier, dice: diceToThrow(expression) });
        const outcome = evaluateDice(expression, sim.values);
        // O banco só aceita rolagem escondida do mestre; a tela já não oferece aos outros.
        const secret = hidden && canRollHidden(viewer);
        const saved = await service.insertRoll({
          roomId: room.id,
          rollerId: viewer.userId,
          notation: expression.notation,
          outcome,
          hidden: secret,
        });
        insert(saved);
        enqueue({ id: saved.id, notation: saved.notation, sim });

        if (!secret) await announceThrow({ rollId: saved.id, notation: saved.notation, spec });
        return true;
      } catch (error) {
        reportDiceFailure(error, { action: 'roll' });
        return false;
      } finally {
        setRolling(false);
      }
    },
    [announceThrow, enqueue, insert, room.id, service, viewer],
  );

  const clearHistory = useCallback(async (): Promise<void> => {
    await service.clearHistory(room.id);
    clearLocal();
    try {
      await channelRef.current?.announceCleared();
    } catch (error) {
      reportDiceFailure(error, {
        action: 'announce-cleared',
        hint: 'Quem está na mesa pode precisar reabrir os dados para ver o histórico vazio.',
      });
    }
  }, [clearLocal, room.id, service]);

  const nicknames = useMemo(
    () => new Map(members.map((member) => [member.userId, member.nickname])),
    [members],
  );
  const nicknameOf = useCallback(
    (userId: string | null) =>
      userId ? (nicknames.get(userId) ?? UNKNOWN_ROLLER) : UNKNOWN_ROLLER,
    [nicknames],
  );

  const { current } = player;
  const currentRoll = useMemo(
    () => (current ? (history.state.rolls.find((item) => item.id === current.id) ?? null) : null),
    [current, history.state.rolls],
  );

  // O banco manda no resultado. Se a simulação local terminou em outra face, a bandeja gira o
  // dado até a face certa; aqui só fica o rastro para descobrir por que as máquinas divergiram.
  const checkedRoll = useRef<string | null>(null);
  useEffect(() => {
    if (!current || !currentRoll || checkedRoll.current === current.id) return;
    checkedRoll.current = current.id;
    const corrections = planCorrections(
      current.sim,
      currentRoll.dice.map((die) => die.value),
    );
    if (corrections.length === 0) return;
    logger.warn('A simulação local divergiu do resultado gravado.', {
      feature: 'dice',
      rollId: current.id,
      correctedDice: corrections.length,
    });
  }, [current, currentRoll]);

  // Terminou a animação e a linha do banco não chegou: busca direto em vez de esperar o Realtime.
  const waitingFor = current?.phase === 'done' && !currentRoll ? current.id : null;
  useEffect(() => {
    if (!waitingFor) return;
    const timer = setTimeout(() => {
      service.getRoll(waitingFor).then(
        (found) => {
          if (found) return insert(found);
          reportError(new Error(`Rolagem ${waitingFor} não encontrada.`), {
            userMessage: 'Não deu para confirmar o resultado de uma rolagem.',
            hint: 'Confira o histórico.',
            context: { feature: 'dice', action: 'confirm-result' },
            severity: 'warn',
          });
        },
        (error: unknown) =>
          reportDiceFailure(error, { action: 'confirm-result', hint: 'Confira o histórico.' }),
      );
    }, RESULT_WAIT_MS);
    return () => clearTimeout(timer);
  }, [waitingFor, service, insert]);

  return {
    history: history.state,
    retryHistory: history.retry,
    rolling,
    roll,
    clearHistory,
    current,
    currentRoll,
    nicknameOf,
  };
}
