import { EyeOff } from 'lucide-react';
import { cx } from '@/lib/cx';
import styles from './dice.module.css';

export type HiddenSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** "Rolar escondido": só o mestre vê o resultado e nada vai para os outros. */
export function HiddenSwitch({ checked, onChange }: HiddenSwitchProps) {
  return (
    <label className={styles.switch}>
      <input
        type="checkbox"
        role="switch"
        className={cx(styles.switchInput, 'visually-hidden')}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      <EyeOff size={14} aria-hidden="true" />
      Rolar escondido
    </label>
  );
}
