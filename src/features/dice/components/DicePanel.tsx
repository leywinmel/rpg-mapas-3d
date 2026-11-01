import { lazy, Suspense, useId, useMemo, useState } from 'react';
import { Dices, Trash2 } from 'lucide-react';
import { ErrorBoundary, ErrorState, IconButton, LoadingState, Panel } from '@/components';
import type { DiceExpression } from '@/domain';
import { useRoomSession } from '@/features/rooms';
import type { DiceTable } from '../hooks/useDiceTable';
import { useRapierStatus } from '../hooks/useRapierStatus';
import type { RollDraft } from '../hooks/useRollDraft';
import { ClearHistoryDialog } from './ClearHistoryDialog';
import { DiceBuilder } from './DiceBuilder';
import { RollHistory } from './RollHistory';
import { RollResult } from './RollResult';
import styles from './dice.module.css';

// three.js, a cena e a física só descem quando a bandeja abre pela primeira vez.
const TrayCanvas = lazy(() => import('./TrayCanvas'));

export type DicePanelProps = {
  table: DiceTable;
  draft: RollDraft;
  hidden: boolean;
  onHiddenChange: (hidden: boolean) => void;
  onClose: () => void;
};

/** O painel flutuante "Dados": bandeja 3D, resultado, montagem da rolagem e histórico. */
export function DicePanel({ table, draft, hidden, onHiddenChange, onClose }: DicePanelProps) {
  const { isGameMaster } = useRoomSession();
  const engine = useRapierStatus();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const historyTitleId = useId();

  // Estável entre renderizações: a bandeja reinicia a correção de face se isto mudar de identidade.
  const expectedKey = table.currentRoll?.dice.map((die) => die.value).join(',');
  const expectedValues = useMemo(
    () => (expectedKey === undefined ? null : expectedKey.split(',').filter(Boolean).map(Number)),
    [expectedKey],
  );
  const who = table.currentRoll ? table.nicknameOf(table.currentRoll.rollerId) : 'Alguém';

  function handleRoll(expression: DiceExpression) {
    void table.roll(expression, isGameMaster && hidden);
  }

  return (
    <>
      <Panel
        title="Dados"
        icon={<Dices size={16} />}
        className={styles.panel}
        onClose={onClose}
        actions={
          isGameMaster ? (
            <IconButton
              label="Limpar o histórico de rolagens"
              icon={<Trash2 size={16} />}
              size="sm"
              onClick={() => setConfirmingClear(true)}
            />
          ) : undefined
        }
      >
        <div className={styles.stack}>
          <div className={styles.stage}>
            {engine.status === 'error' ? (
              <ErrorState
                fill
                title="Não deu para preparar os dados"
                description="O motor de física não carregou. Confira sua conexão e tente de novo."
                onRetry={engine.retry}
              />
            ) : (
              <ErrorBoundary area="a bandeja de dados" fill>
                <Suspense fallback={<LoadingState fill label="Preparando a bandeja…" />}>
                  {/* Só enfeite: tudo o que ela mostra também está escrito no resultado e no histórico. */}
                  <div className={styles.canvasHost} aria-hidden="true">
                    <TrayCanvas play={table.current} expectedValues={expectedValues} />
                  </div>
                </Suspense>
              </ErrorBoundary>
            )}
          </div>

          <RollResult play={table.current} roll={table.currentRoll} who={who} />

          <DiceBuilder
            draft={draft}
            canHide={isGameMaster}
            hidden={hidden}
            onHiddenChange={onHiddenChange}
            rolling={table.rolling}
            engine={engine.status}
            onRoll={handleRoll}
          />

          <section className={styles.section} aria-labelledby={historyTitleId}>
            <h3 id={historyTitleId} className={styles.sectionTitle}>
              Histórico
            </h3>
            <RollHistory
              history={table.history}
              onRetry={table.retryHistory}
              nicknameOf={table.nicknameOf}
            />
          </section>
        </div>
      </Panel>

      {isGameMaster && (
        <ClearHistoryDialog
          open={confirmingClear}
          onClose={() => setConfirmingClear(false)}
          onConfirm={table.clearHistory}
        />
      )}
    </>
  );
}
