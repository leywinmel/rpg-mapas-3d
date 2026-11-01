import { useState } from 'react';
import { Dices } from 'lucide-react';
import { IconButton, Toolbar } from '@/components';
import { useDiceTable } from '../hooks/useDiceTable';
import { useRollDraft } from '../hooks/useRollDraft';
import { DicePanel } from './DicePanel';
import styles from './dice.module.css';

/**
 * Os dados da mesa: um botão no canto da sala que abre o painel "Dados". Fica montado o
 * tempo todo para ouvir as rolagens dos outros; quando alguém rola em público, o painel
 * abre sozinho para a mesa inteira ver a mesma jogada.
 */
export function DiceTray() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  // O rascunho mora aqui, e não no painel, para sobreviver a fechar e abrir.
  const draft = useRollDraft();
  const table = useDiceTable({ onRemoteThrow: () => setOpen(true) });

  return (
    <div className={styles.dock}>
      {open && (
        <DicePanel
          table={table}
          draft={draft}
          hidden={hidden}
          onHiddenChange={setHidden}
          onClose={() => setOpen(false)}
        />
      )}
      <Toolbar label="Dados">
        <IconButton
          label={open ? 'Fechar os dados' : 'Abrir os dados'}
          icon={<Dices size={18} />}
          active={open}
          onClick={() => setOpen((value) => !value)}
        />
      </Toolbar>
    </div>
  );
}
