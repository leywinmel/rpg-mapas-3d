import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Layers, Lock, LockOpen } from 'lucide-react';
import { IconButton, Toolbar, ToolbarSeparator } from '@/components';
import { NO_CUTAWAY, type Cutaway, type CutawayDirection } from '@/domain/map-v2';
import { reportError } from '@/lib/report-error';
import { isSceneKey } from '../editor/shortcuts';
import { cutawayPhrase, shortCutawayLabel } from './cutaway-labels';
import { steppedOwnCutaway, visibleCutaway, type CutawayBinding } from './cutaway-binding';
import styles from './CutawayControl.module.css';

const ICON_SIZE = 18;
const BADGE_ICON_SIZE = 14;

/** Teclas do corte: Page Up mostra um andar, Page Down esconde, Home mostra todos. */
const CUTAWAY_KEYS: Readonly<Record<string, CutawayDirection | 'all'>> = {
  PageUp: 'up',
  PageDown: 'down',
  Home: 'all',
};

export type CutawayControlProps = {
  binding: CutawayBinding;
  /** Andar mais alto do mapa (topStory): até onde o controle vai. */
  top: number;
};

type LockButtonProps = { binding: CutawayBinding; changeLock: (lock: Cutaway) => Promise<void> };

/** Mestre: trava os jogadores no corte que ele está vendo, ou libera a mesa. */
function LockButton({ binding, changeLock }: LockButtonProps) {
  const [pending, setPending] = useState(false);
  const { lock, own } = binding;
  const locked = lock !== NO_CUTAWAY;
  const label = locked
    ? `Liberar o corte dos jogadores (travado ${cutawayPhrase(lock)})`
    : own === NO_CUTAWAY
      ? 'Escolha um andar para travar o corte dos jogadores'
      : `Travar os jogadores ${cutawayPhrase(own)}`;

  const toggle = async () => {
    setPending(true);
    try {
      await changeLock(locked ? NO_CUTAWAY : own);
    } catch (error) {
      reportError(error, {
        userMessage: locked
          ? 'Não deu para liberar o corte dos jogadores.'
          : 'Não deu para travar o corte dos jogadores.',
        context: { feature: 'map-editor', action: 'cutaway-lock' },
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <IconButton
      label={label}
      icon={locked ? <Lock size={ICON_SIZE} /> : <LockOpen size={ICON_SIZE} />}
      active={locked}
      disabled={pending || (!locked && own === NO_CUTAWAY)}
      onClick={() => void toggle()}
    />
  );
}

/** Jogador: mostra que o mestre travou o corte (ele ainda pode esconder mais andares). */
function LockedNotice({ lock }: { lock: Cutaway }) {
  const text = `O mestre travou o corte ${cutawayPhrase(lock)}`;
  return (
    <span className={styles.lockedNotice} role="status" title={text}>
      <Lock size={BADGE_ICON_SIZE} aria-hidden="true" />
      <span className="visually-hidden">{text}</span>
    </span>
  );
}

/**
 * Controle discreto do corte de andares, na borda direita da cena: subir e descer um andar
 * por vez (também por Page Up, Page Down e Home). Cada pessoa tem o seu; o mestre trava os
 * jogadores num corte quando o andar de cima é segredo.
 */
export function CutawayControl({ binding, top }: CutawayControlProps) {
  const visible = visibleCutaway(binding);
  const up = steppedOwnCutaway(binding, 'up', top);
  const down = steppedOwnCutaway(binding, 'down', top);
  const canGoUp = visibleCutaway({ ...binding, own: up }) !== visible;
  const canGoDown = visibleCutaway({ ...binding, own: down }) !== visible;
  const { setOwn, changeLock, isMaster, lock } = binding;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = CUTAWAY_KEYS[event.key];
      if (!command || event.ctrlKey || event.metaKey || event.altKey || !isSceneKey(event)) return;
      event.preventDefault();
      if (command === 'all') setOwn(NO_CUTAWAY);
      else if (command === 'up' && canGoUp) setOwn(up);
      else if (command === 'down' && canGoDown) setOwn(down);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setOwn, up, down, canGoUp, canGoDown]);

  return (
    <div className={styles.anchor}>
      <Toolbar label="Corte de andares" orientation="vertical">
        <IconButton
          label="Mostrar o andar de cima (Page Up)"
          icon={<ChevronUp size={ICON_SIZE} />}
          size="sm"
          disabled={!canGoUp}
          onClick={() => setOwn(up)}
        />
        <span
          className={styles.badge}
          aria-live="polite"
          title={`Mostrando ${cutawayPhrase(visible)}`}
        >
          <Layers size={BADGE_ICON_SIZE} aria-hidden="true" />
          <span aria-hidden="true">{shortCutawayLabel(visible)}</span>
          <span className="visually-hidden">{`Mostrando ${cutawayPhrase(visible)}`}</span>
        </span>
        <IconButton
          label="Esconder o andar de cima (Page Down)"
          icon={<ChevronDown size={ICON_SIZE} />}
          size="sm"
          disabled={!canGoDown}
          onClick={() => setOwn(down)}
        />
        {isMaster && changeLock && (
          <>
            <ToolbarSeparator />
            <LockButton binding={binding} changeLock={changeLock} />
          </>
        )}
        {!isMaster && lock !== NO_CUTAWAY && (
          <>
            <ToolbarSeparator />
            <LockedNotice lock={lock} />
          </>
        )}
      </Toolbar>
    </div>
  );
}
