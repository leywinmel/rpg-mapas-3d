import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Quaternion, type Group } from 'three';
import { CORRECTION_MS } from '../../constants';
import { STEPS_PER_SECOND, scaleForDiceCount } from '../../physics/constants';
import { planCorrections } from '../../physics/correction';
import { positionAt, rotationAt } from '../../physics/simulate';
import type { CurrentPlay } from '../../hooks/tray-player';
import { playDurationMs } from '../../hooks/tray-player';
import { DieModel } from './DieModel';

const MS_PER_SECOND = 1000;

export type PlaybackDiceProps = {
  play: CurrentPlay;
  /** Valores gravados no banco, quando já chegaram. A simulação gira até eles se divergir. */
  expectedValues: readonly number[] | null;
  /** Quem pediu menos movimento vê os dados já parados. */
  reducedMotion: boolean;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** 0 = ainda na pose da simulação, 1 = já na face gravada. Sem movimento, vai direto ao fim. */
function correctionProgressAt(start: number | null, elapsed: number, reducedMotion: boolean) {
  if (start === null) return 0;
  if (reducedMotion) return 1;
  return easeOutCubic(clamp01((elapsed - start) / CORRECTION_MS));
}

/**
 * Toca a simulação: a cada quadro do navegador calcula em que passo da física a jogada
 * está (pelo relógio, então reabrir o painel no meio continua de onde estava) e
 * interpola posição e rotação entre os dois passos vizinhos.
 */
export function PlaybackDice({ play, expectedValues, reducedMotion }: PlaybackDiceProps) {
  const { sim } = play;
  const invalidate = useThree((state) => state.invalidate);
  const groups = useRef<Array<Group | null>>([]);
  const correctionStartedAt = useRef<number | null>(null);
  const scratch = useMemo(() => ({ from: new Quaternion(), to: new Quaternion() }), []);

  const corrections = useMemo(
    () => (expectedValues ? planCorrections(sim, expectedValues) : []),
    [sim, expectedValues],
  );
  const dieScale = scaleForDiceCount(sim.sides.length);
  const durationMs = playDurationMs(sim);

  // Apresenta o quadro correspondente a `now` e diz se ainda há movimento pela frente.
  const present = useCallback(
    (now: number): boolean => {
      const elapsed = reducedMotion ? durationMs : now - play.startedAt;
      const clamped = Math.min(Math.max(elapsed, 0), durationMs);
      const step = (clamped / MS_PER_SECOND) * STEPS_PER_SECOND;
      const first = Math.min(Math.floor(step), sim.frameCount - 1);
      const second = Math.min(first + 1, sim.frameCount - 1);
      const blend = step - first;

      // A correção começa quando a física termina ou quando o resultado do banco chega, o que vier por último.
      if (elapsed >= durationMs && corrections.length > 0 && correctionStartedAt.current === null) {
        correctionStartedAt.current = elapsed;
      }
      const correctionStart = correctionStartedAt.current;
      const correctionProgress = correctionProgressAt(correctionStart, elapsed, reducedMotion);

      sim.bodies.forEach((_, index) => {
        const group = groups.current[index];
        if (!group) return;
        const a = positionAt(sim, first, index);
        const b = positionAt(sim, second, index);
        group.position.set(
          a[0] + (b[0] - a[0]) * blend,
          a[1] + (b[1] - a[1]) * blend,
          a[2] + (b[2] - a[2]) * blend,
        );
        scratch.from.set(...rotationAt(sim, first, index));
        scratch.to.set(...rotationAt(sim, second, index));
        group.quaternion.copy(scratch.from.slerp(scratch.to, blend));

        const fix = corrections.find((candidate) => candidate.body === index);
        if (!fix || correctionProgress === 0) return;
        scratch.from.set(...fix.from);
        scratch.to.set(...fix.to);
        group.quaternion.copy(scratch.from.slerp(scratch.to, correctionProgress));
      });

      const correctionEnds = corrections.length > 0 ? CORRECTION_MS : 0;
      return elapsed < durationMs + correctionEnds;
    },
    [corrections, durationMs, play.startedAt, reducedMotion, scratch, sim],
  );

  useFrame(() => {
    if (present(performance.now())) invalidate();
  });

  // A bandeja só desenha quando algo muda: este efeito acorda o primeiro quadro.
  useLayoutEffect(() => {
    correctionStartedAt.current = null;
    present(performance.now());
    invalidate();
  }, [present, invalidate]);

  return (
    <>
      {sim.bodies.map((kind, index) => (
        <group
          key={`${play.id}-${index}`}
          ref={(node) => {
            groups.current[index] = node;
          }}
          scale={dieScale}
        >
          <DieModel kind={kind} onTextureChange={invalidate} />
        </group>
      ))}
    </>
  );
}
