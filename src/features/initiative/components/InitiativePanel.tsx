import { useState } from 'react';
import { ChevronLeft, ChevronRight, Flag, Swords } from 'lucide-react';
import { Button, EmptyState, ErrorState, IconButton, LoadingState, Panel } from '@/components';
import { isGameMaster, sortInitiative } from '@/domain';
import { useRoomSession } from '@/features/rooms';
import { useInitiativeStore } from '../hooks/initiative-store';
import { toInitiativeError } from '../services/initiative-errors';
import { AddEntryForm } from './AddEntryForm';
import { EndCombatDialog } from './EndCombatDialog';
import { InitiativeRow } from './InitiativeRow';
import styles from './initiative.module.css';

/** Rodada e, para o mestre, os botões de vez: começar, voltar, passar e encerrar. */
function TurnBar({ master }: { master: boolean }) {
  const round = useInitiativeStore((state) => state.board.round);
  const count = useInitiativeStore((state) => state.board.entries.length);
  const actions = useInitiativeStore((state) => state.actions);
  const [busy, setBusy] = useState(false);
  const started = round > 0;
  const run = async (step: (() => Promise<boolean>) | undefined) => {
    if (!step) return;
    setBusy(true);
    await step();
    setBusy(false);
  };

  return (
    <div className={styles.turnBar}>
      <span className={styles.round} aria-live="polite">
        {started ? `Rodada ${round}` : 'Combate parado'}
      </span>
      {master && count > 0 && (
        <span className={styles.turnActions}>
          {started && (
            <IconButton
              size="sm"
              label="Voltar a vez"
              icon={<ChevronLeft size={16} />}
              disabled={busy}
              onClick={() => void run(actions?.previous)}
            />
          )}
          <Button
            size="sm"
            icon={<ChevronRight size={16} />}
            loading={busy}
            onClick={() => void run(actions?.next)}
          >
            {started ? 'Próximo' : 'Começar'}
          </Button>
        </span>
      )}
    </div>
  );
}

function InitiativeList({ master }: { master: boolean }) {
  const { viewer } = useRoomSession();
  const status = useInitiativeStore((state) => state.status);
  const error = useInitiativeStore((state) => state.error);
  const entries = useInitiativeStore((state) => state.board.entries);
  const reload = useInitiativeStore((state) => state.actions?.reload);

  if (status === 'error') {
    return (
      <ErrorState
        title="Não deu para carregar a ordem"
        description={toInitiativeError(error).message}
        onRetry={reload}
      />
    );
  }
  if (status !== 'ready') return <LoadingState label="Carregando a ordem…" />;
  if (entries.length === 0) {
    return master ? (
      <EmptyState
        icon={<Swords size={22} />}
        title="Ninguém na ordem"
        description="Ponha os tokens do mapa e as entradas livres abaixo, com o valor de cada um."
      />
    ) : (
      <EmptyState
        icon={<Swords size={22} />}
        title="Sem combate agora"
        description="Quando o mestre montar a ordem de iniciativa, ela aparece aqui."
      />
    );
  }
  return (
    <ol className={styles.list} aria-label="Ordem de iniciativa">
      {sortInitiative(entries).map((entry) => (
        <InitiativeRow key={entry.id} entry={entry} viewer={viewer} master={master} />
      ))}
    </ol>
  );
}

/**
 * Painel "Iniciativa" da sala. O mestre monta a ordem, desempata, passa a vez e encerra; o jogador
 * acompanha ao vivo e muda só o valor da própria entrada. O que está escondido ou sob a névoa nem
 * chega ao navegador do jogador (RLS).
 */
export function InitiativePanel({ onClose }: { onClose: () => void }) {
  const { viewer } = useRoomSession();
  const master = isGameMaster(viewer);
  const count = useInitiativeStore((state) => state.board.entries.length);
  const [ending, setEnding] = useState(false);
  const ready = useInitiativeStore((state) => state.status === 'ready');

  return (
    <Panel
      title="Iniciativa"
      icon={<Swords size={18} />}
      onClose={onClose}
      className={styles.panel}
      actions={
        master &&
        count > 0 && (
          <IconButton
            size="sm"
            label="Encerrar o combate (limpa a ordem)"
            icon={<Flag size={16} />}
            onClick={() => setEnding(true)}
          />
        )
      }
      footer={master && ready ? <AddEntryForm /> : undefined}
    >
      <div className={styles.stack}>
        <TurnBar master={master} />
        <InitiativeList master={master} />
      </div>
      {master && <EndCombatDialog open={ending} onClose={() => setEnding(false)} />}
    </Panel>
  );
}
