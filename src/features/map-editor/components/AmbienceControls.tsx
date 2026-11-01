import { useId, type Dispatch } from 'react';
import type { Ambience } from '@/domain';
import { AMBIENCE_PRESETS, resolvePreset } from '@/features/scene';
import type { EditorAction } from '../editor/editor-reducer';
import styles from './SidePanel.module.css';

/** Mesmos limites do documento (ambience.light de 0 a 2). */
const LIGHT_RANGE = { min: 0, max: 2, step: 0.05 };
const PERCENT = 100;
/** Arrastar o controle de luz ou a cor vira um passo só no "desfazer". */
const LIGHT_COALESCE_KEY = 'ambience-light';
const FOG_COALESCE_KEY = 'ambience-fog';

type Props = { ambience: Ambience; dispatch: Dispatch<EditorAction> };

/** Clima do mapa: escolher um clima também sugere a cor da neblina dele. */
export function AmbienceControls({ ambience, dispatch }: Props) {
  const ids = { preset: useId(), fog: useId(), light: useId() };
  const preset = resolvePreset(ambience.preset);
  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label htmlFor={ids.preset} className={styles.label}>
          Clima
        </label>
        <select
          id={ids.preset}
          className={styles.select}
          value={preset.key}
          onChange={(event) => {
            const next = resolvePreset(event.target.value);
            dispatch({
              type: 'set-ambience',
              patch: { preset: next.key, fogColor: next.fogColor },
            });
          }}
        >
          {AMBIENCE_PRESETS.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor={ids.fog} className={styles.label}>
          Cor da neblina
        </label>
        <div className={styles.colorRow}>
          <input
            id={ids.fog}
            type="color"
            className={styles.color}
            value={ambience.fogColor}
            onChange={(event) =>
              dispatch({
                type: 'set-ambience',
                patch: { fogColor: event.target.value },
                coalesceKey: FOG_COALESCE_KEY,
              })
            }
          />
          <code className={styles.colorCode}>{ambience.fogColor}</code>
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor={ids.light} className={styles.label}>
          Luz: {Math.round(ambience.light * PERCENT)}%
        </label>
        <input
          id={ids.light}
          type="range"
          className={styles.range}
          min={LIGHT_RANGE.min}
          max={LIGHT_RANGE.max}
          step={LIGHT_RANGE.step}
          value={ambience.light}
          onChange={(event) =>
            dispatch({
              type: 'set-ambience',
              patch: { light: Number(event.target.value) },
              coalesceKey: LIGHT_COALESCE_KEY,
            })
          }
        />
      </div>
    </div>
  );
}
