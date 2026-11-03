/**
 * Página só de desenvolvimento (/dev/cena) para MEDIR a cena em pedaços [#99]: gera uma cidade
 * cheia do tamanho escolhido, mostra quadros por segundo, tempo de montagem e chamadas de
 * desenho, e deixa trocar qualidade, corte de andares e câmera. Fica fora do site publicado
 * (a rota só existe com import.meta.env.DEV). Não precisa de conta nem do Supabase.
 */
import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Button, Panel } from '@/components';
import { cutawayShowingUpToStory, NO_CUTAWAY, type Cutaway, type MapModel } from '@/domain/map-v2';
import { MapRenderer } from '../components/MapRenderer';
import type { PerfSample } from '../components/PerfMeter';
import { SceneCanvas } from '../components/SceneCanvas';
import { cameraFrame, type Vec3 } from '../layout';
import { QualityButton } from '../quality/QualityButton';
import { useQualityLevel } from '../quality/quality-store';
import { QUALITY_MODE_LABELS } from '../quality/quality';
import { countCity, generateCity, type CityCounts } from './city-generator';
import styles from './ScenePerfPage.module.css';

const SIZES = [100, 250, 500, 1000] as const;
const LARGEST_SIZE = 1000;
const SEED = 2026;
/** Distância da câmera no modo "perto": a altura de quem joga numa sala da cidade. */
const CLOSE_DISTANCE = 40;
/** Giro da câmera no modo "girando", em radianos por segundo (uma volta em ~40 s). */
const SPIN_SPEED = 0.16;
const MS_DECIMALS = 0;

type CameraPreset = 'overview' | 'close' | 'spin';

const CUTAWAYS: ReadonlyArray<{ label: string; value: Cutaway }> = [
  { label: 'Sem corte', value: NO_CUTAWAY },
  { label: 'Até o térreo', value: cutawayShowingUpToStory(0) },
  { label: 'Até o 1º andar', value: cutawayShowingUpToStory(1) },
];

type Build = {
  model: MapModel;
  counts: CityCounts;
  generateMs: number;
  /** Momento em que o modelo ficou pronto: a montagem conta daqui até o primeiro quadro. */
  readyAt: number;
};

function build(side: number): Build {
  const startedAt = performance.now();
  const model = generateCity({ size: { width: side, depth: side }, seed: SEED });
  const readyAt = performance.now();
  return { model, counts: countCity(model), generateMs: readyAt - startedAt, readyAt };
}

type Controls = { target: Vec3 & { set: (x: number, y: number, z: number) => void } };

function hasTarget(value: unknown): value is Controls {
  return typeof value === 'object' && value !== null && 'target' in value;
}

/** Leva a câmera ao enquadramento escolhido e, no modo "girando", gira em volta do centro. */
function CameraDirector({ preset, side }: { preset: CameraPreset; side: number }) {
  const controls = useThree((state) => state.controls);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    if (!hasTarget(controls)) return;
    const frame = cameraFrame({ width: side, depth: side });
    const center = frame.target;
    if (preset === 'close') {
      const offset = CLOSE_DISTANCE / Math.SQRT2;
      camera.position.set(center.x + offset / 2, offset, center.z + offset);
    } else {
      camera.position.set(frame.position.x, frame.position.y, frame.position.z);
    }
    controls.target.set(center.x, center.y, center.z);
  }, [preset, side, controls, camera]);

  useFrame((state, delta) => {
    if (preset !== 'spin' || !hasTarget(controls)) return;
    const { target } = controls;
    const { position } = state.camera;
    const dx = position.x - target.x;
    const dz = position.z - target.z;
    const angle = SPIN_SPEED * delta;
    position.set(
      target.x + dx * Math.cos(angle) - dz * Math.sin(angle),
      position.y,
      target.z + dx * Math.sin(angle) + dz * Math.cos(angle),
    );
    state.camera.lookAt(target.x, target.y, target.z);
  });
  return null;
}

/** Mede do modelo pronto até o fim do primeiro quadro desenhado (o segundo useFrame). */
function MountProbe({ since, onMounted }: { since: number; onMounted: (ms: number) => void }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 2) onMounted(performance.now() - since);
  });
  return null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

export default function ScenePerfPage() {
  const [side, setSide] = useState<number>(LARGEST_SIZE);
  const [current, setCurrent] = useState<Build>(() => build(side));
  const [mountMs, setMountMs] = useState<number | null>(null);
  const [sample, setSample] = useState<PerfSample | null>(null);
  const [preset, setPreset] = useState<CameraPreset>('overview');
  const [cutaway, setCutaway] = useState<Cutaway>(NO_CUTAWAY);
  const level = useQualityLevel();
  const { counts } = current;

  const regenerate = (next: number) => {
    setSide(next);
    setMountMs(null);
    setCurrent(build(next));
  };

  return (
    <div className={styles.page}>
      <SceneCanvas
        key={current.readyAt}
        size={current.model.size}
        ambience={current.model.header.ambience}
        onPerfSample={setSample}
        label="Cidade de teste"
      >
        <MapRenderer model={current.model} cutaway={cutaway} />
        <CameraDirector preset={preset} side={side} />
        <MountProbe since={current.readyAt} onMounted={setMountMs} />
      </SceneCanvas>
      <Panel title="Medição da cena" className={styles.panel}>
        <div className={styles.row}>
          {SIZES.map((option) => (
            <Button
              key={option}
              size="sm"
              variant={option === side ? 'secondary' : 'ghost'}
              onClick={() => regenerate(option)}
            >
              {option}×{option}
            </Button>
          ))}
        </div>
        <div className={styles.row}>
          {(['overview', 'close', 'spin'] as const).map((option) => (
            <Button
              key={option}
              size="sm"
              variant={option === preset ? 'secondary' : 'ghost'}
              onClick={() => setPreset(option)}
            >
              {{ overview: 'Visão geral', close: 'Perto', spin: 'Girando' }[option]}
            </Button>
          ))}
        </div>
        <div className={styles.row}>
          {CUTAWAYS.map((option) => (
            <Button
              key={option.label}
              size="sm"
              variant={option.value === cutaway ? 'secondary' : 'ghost'}
              onClick={() => setCutaway(option.value)}
            >
              {option.label}
            </Button>
          ))}
          <QualityButton />
        </div>
        <dl className={styles.stats} aria-label="Números da medição">
          <Stat label="Qualidade" value={QUALITY_MODE_LABELS[level]} />
          <Stat label="Pedaços" value={String(counts.chunks)} />
          <Stat label="Paredes" value={counts.walls.toLocaleString('pt-BR')} />
          <Stat label="Peças" value={counts.pieces.toLocaleString('pt-BR')} />
          <Stat label="Gerar" value={`${current.generateMs.toFixed(MS_DECIMALS)} ms`} />
          <Stat
            label="Montar"
            value={mountMs === null ? '…' : `${mountMs.toFixed(MS_DECIMALS)} ms`}
          />
          <Stat label="FPS" value={sample ? sample.fps.toFixed(1) : '…'} />
          <Stat
            label="Quadro"
            value={
              sample
                ? `${sample.frameMs.toFixed(1)} ms (pior ${sample.worstFrameMs.toFixed(1)})`
                : '…'
            }
          />
          <Stat label="Desenhos" value={sample ? String(sample.drawCalls) : '…'} />
          <Stat
            label="Triângulos"
            value={sample ? `${(sample.triangles / 1e6).toFixed(2)} mi` : '…'}
          />
        </dl>
      </Panel>
    </div>
  );
}
