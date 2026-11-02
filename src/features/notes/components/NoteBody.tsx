import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components';
import { cx } from '@/lib/cx';
import styles from './notes.module.css';

/** Folga para o arredondamento do navegador não inventar um "Ler mais". */
const OVERFLOW_TOLERANCE_PX = 1;

/**
 * O texto da anotação como texto puro, cortado em poucas linhas, com "Ler mais" só quando
 * de fato passa do corte. Sem ResizeObserver não dá para saber, então nada é cortado: ler
 * tudo é melhor do que esconder um pedaço sem saída.
 */
export function NoteBody({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const canMeasure = typeof ResizeObserver !== 'undefined';

  useEffect(() => {
    const element = ref.current;
    if (!element || !canMeasure || expanded) return;
    // Mede ao entrar e a cada mudança de largura (a janela do navegador pode mudar).
    const observer = new ResizeObserver(() => {
      setOverflowing(element.scrollHeight > element.clientHeight + OVERFLOW_TOLERANCE_PX);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, expanded, canMeasure]);

  if (text === '') return null;

  return (
    <div className={styles.bodyBox}>
      <p ref={ref} className={cx(styles.body, canMeasure && !expanded && styles.bodyClamped)}>
        {text}
      </p>
      {(overflowing || expanded) && (
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Ler menos' : 'Ler mais'}
        </Button>
      )}
    </div>
  );
}
