import { useState, type Dispatch, type FormEvent } from 'react';
import { Button, TextField } from '@/components';
import type { GridSize } from '@/domain';
import { MAX_MAP_SIZE_V2 } from '@/domain/map-v2';
import type { EditorAction } from '../editor/editor-reducer';
import { parseMapSize, type MapSizeInput } from '../editor/map-list';
import styles from './SidePanel.module.css';

type Props = { size: GridSize; dispatch: Dispatch<EditorAction> };

type SizeErrors = Partial<Record<keyof MapSizeInput, string>>;

/**
 * Mudar o tamanho do mapa. O canto de cima à esquerda fica no lugar; crescer abre chão novo e
 * encolher apaga o que sair do mapa. É um passo do histórico como qualquer outro: dá para desfazer.
 * Monte com key = tamanho atual, para os campos voltarem ao valor certo depois de desfazer.
 */
export function MapSizeControls({ size, dispatch }: Props) {
  const [values, setValues] = useState({ width: String(size.width), depth: String(size.depth) });
  const [errors, setErrors] = useState<SizeErrors>({});
  const parsed = parseMapSize(values);
  const unchanged =
    parsed.ok && parsed.value.width === size.width && parsed.value.depth === size.depth;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!parsed.ok) return setErrors(parsed.errors);
    setErrors({});
    dispatch({ type: 'resize', size: parsed.value });
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate aria-label="Tamanho do mapa">
      <div className={styles.row}>
        <TextField
          label="Largura (casas)"
          type="number"
          min={1}
          max={MAX_MAP_SIZE_V2}
          value={values.width}
          error={errors.width}
          onChange={(event) => setValues((current) => ({ ...current, width: event.target.value }))}
        />
        <TextField
          label="Profundidade (casas)"
          type="number"
          min={1}
          max={MAX_MAP_SIZE_V2}
          value={values.depth}
          error={errors.depth}
          onChange={(event) => setValues((current) => ({ ...current, depth: event.target.value }))}
        />
      </div>
      <p className={styles.muted}>
        O canto do começo do mapa fica no lugar. Encolher apaga o que ficar de fora (dá para
        desfazer).
      </p>
      <Button type="submit" variant="ghost" disabled={unchanged}>
        Mudar tamanho
      </Button>
    </form>
  );
}
