import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Raycaster, Vector2 } from 'three';
import type { Cell } from '@/domain';
import { pickCell, type HeightMap } from '@/features/scene';
import { useTableToolsStore } from '../hooks/table-tools-store';

const PRIMARY_BUTTON = 0;
const CROSSHAIR = 'crosshair';

/**
 * Régua e ping pegam o clique antes de todo o resto (câmera, editor, tokens): os ouvintes ficam
 * na janela, na fase de captura, e param o evento ali. Assim Alt+clique marca o mapa até em cima
 * de um token, e arrastar a régua não gira a câmera nem pinta o editor.
 */
export function useTablePointer(heights: HeightMap | null) {
  const get = useThree((state) => state.get);
  const tool = useTableToolsStore((state) => state.tool);

  useEffect(() => {
    if (!heights) return;
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const canvas = get().gl.domElement;
    // O clique que vem depois de um apertar que foi nosso também é nosso (o editor seleciona no clique).
    let swallowClick = false;

    const cellAt = (event: MouseEvent): Cell | null => {
      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, get().camera);
      return pickCell(raycaster.ray, heights)?.cell ?? null;
    };

    const take = (event: Event) => {
      event.stopPropagation();
      event.preventDefault();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.target !== canvas || event.button !== PRIMARY_BUTTON) return;
      const store = useTableToolsStore.getState();
      const pinging = event.altKey || store.tool === 'ping';
      if (!pinging && store.tool !== 'ruler') return;
      take(event);
      swallowClick = true;
      const cell = cellAt(event);
      if (!cell) return;
      if (pinging) store.actions?.ping(cell);
      else store.startRuler(cell);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!useTableToolsStore.getState().measuring) return;
      const cell = cellAt(event);
      if (cell) useTableToolsStore.getState().moveRuler(cell);
    };

    const onPointerUp = () => {
      if (useTableToolsStore.getState().measuring) useTableToolsStore.getState().endRuler();
    };

    const onClick = (event: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      if (event.target === canvas) take(event);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const store = useTableToolsStore.getState();
      if (store.ruler) store.clearRuler();
      else if (store.tool !== 'none') store.setTool('none');
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('blur', onPointerUp);
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('blur', onPointerUp);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [get, heights]);

  // Mira no lugar da seta enquanto uma ferramenta estiver ligada.
  useEffect(() => {
    if (tool === 'none') return;
    const canvas = get().gl.domElement;
    const previous = canvas.style.cursor;
    canvas.style.cursor = CROSSHAIR;
    return () => {
      canvas.style.cursor = previous;
    };
  }, [tool, get]);
}
