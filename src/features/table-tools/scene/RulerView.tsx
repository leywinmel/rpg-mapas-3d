import { Html, Line } from '@react-three/drei';
import { measureCells } from '@/domain';
import { SCENE_UI_USER_DATA, type HeightMap } from '@/features/scene';
import { formatMeasurement } from '../format';
import type { RulerLine } from '../hooks/table-tools-store';
import { cellTop, RULER_SHAPE } from './table-tools-scene';
import styles from './table-tools-scene.module.css';

/** Rótulos ficam abaixo dos painéis da barra (que usam z-index bem maiores). */
const LABEL_Z_RANGE = [10, 0];
const END_SEGMENTS = 20;

type RulerViewProps = {
  line: RulerLine;
  heights: HeightMap;
  color: string;
  /** De quem é a régua, quando é a de outra pessoa (texto do React, nunca HTML [#53]). */
  owner?: string;
};

/** A régua na cena: linha de centro a centro das casas, as pontas e a distância. */
export function RulerView({ line, heights, color, owner }: RulerViewProps) {
  const from = cellTop(heights, line.from, RULER_SHAPE.lift);
  const to = cellTop(heights, line.to, RULER_SHAPE.lift);
  const text = formatMeasurement(measureCells(line.from, line.to));
  return (
    <group userData={SCENE_UI_USER_DATA}>
      <Line
        points={[
          [from.x, from.y, from.z],
          [to.x, to.y, to.z],
        ]}
        color={color}
        lineWidth={RULER_SHAPE.lineWidth}
        depthTest={false}
        renderOrder={1}
      />
      {[from, to].map((point, index) => (
        <mesh
          key={index}
          position={[point.x, point.y, point.z]}
          rotation-x={-Math.PI / 2}
          renderOrder={1}
        >
          <circleGeometry args={[RULER_SHAPE.endRadius, END_SEGMENTS]} />
          <meshBasicMaterial color={color} depthTest={false} transparent />
        </mesh>
      ))}
      <Html
        position={[to.x, to.y + RULER_SHAPE.labelHeight, to.z]}
        center
        zIndexRange={LABEL_Z_RANGE}
        pointerEvents="none"
      >
        <div className={styles.label} data-scene-label>
          {owner && <span className={styles.owner}>{owner}</span>}
          <span className={styles.distance}>{text}</span>
        </div>
      </Html>
    </group>
  );
}
