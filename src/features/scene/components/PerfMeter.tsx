import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export type PerfSample = {
  fps: number;
  /** Tempo médio entre quadros, em milissegundos. */
  frameMs: number;
  /** Pior quadro da janela: é ele que o olho percebe como engasgo. */
  worstFrameMs: number;
  drawCalls: number;
  triangles: number;
};

const SAMPLE_WINDOW_S = 1;
const MS_PER_S = 1000;

/** Medidor de desempenho da cena (fps, tempo de quadro, chamadas de desenho). */
export function PerfMeter({ onSample }: { onSample: (sample: PerfSample) => void }) {
  const stats = useRef({ elapsed: 0, frames: 0, worst: 0 });

  useFrame((state, delta) => {
    const current = stats.current;
    current.elapsed += delta;
    current.frames += 1;
    current.worst = Math.max(current.worst, delta);
    if (current.elapsed < SAMPLE_WINDOW_S) return;
    // O renderer zera as estatísticas a cada quadro; aqui ainda valem as do quadro anterior.
    const { calls, triangles } = state.gl.info.render;
    onSample({
      fps: current.frames / current.elapsed,
      frameMs: (current.elapsed / current.frames) * MS_PER_S,
      worstFrameMs: current.worst * MS_PER_S,
      drawCalls: calls,
      triangles,
    });
    stats.current = { elapsed: 0, frames: 0, worst: 0 };
  });

  return null;
}
