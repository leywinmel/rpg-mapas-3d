import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferGeometry,
  CircleGeometry,
  Color,
  Float32BufferAttribute,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  type IUniform,
  type Material,
  type Mesh,
  type Points,
} from 'three';
import type { Backdrop, GridSize } from '@/domain';
import {
  BACKDROP_DENSITY,
  BACKDROP_SPECS,
  BACKDROP_WATER_Y,
  backdropGroundY,
  backdropRing,
  groundRadius,
  ringPoint,
  scatterBackdrop,
  type BackdropSpec,
} from '../backdrop/backdrop';
import { getBackdropLayers } from '../backdrop/backdrop-geometry';
import { useQualityLevel } from '../quality/quality-store';
import { InstancedLayer } from './PieceInstances';

const GROUND_SEGMENTS = 64;
const QUARTER_TURN = -Math.PI / 2;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Chão em volta do mapa: um disco liso que some na neblina. */
type GroundProps = { radius: number; color: string; center: Center; y: number };

function Ground({ radius, color, center, y }: GroundProps) {
  const geometry = useMemo(() => new CircleGeometry(radius, GROUND_SEGMENTS), [radius]);
  const material = useMemo(
    () => new MeshStandardMaterial({ color, roughness: 1, flatShading: true }),
    [color],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[center.x, y, center.z]}
      rotation={[QUARTER_TURN, 0, 0]}
      receiveShadow
    />
  );
}

type Center = { x: number; z: number };

const WATER = {
  color: '#3f86a8',
  opacity: 0.86,
  /** Lado de cada quadrado da malha da água: menor deixa a onda mais redonda e custa mais. */
  cellSize: 2,
  maxSegments: 160,
  /** Brilho próprio fraco: no escuro, o mar ainda se separa da cor da neblina. */
  glow: '#0b2734',
};

/** As ondas sobem e descem no shader: a CPU só soma o tempo. */
const WAVE_VERTEX = /* glsl */ `
  #include <begin_vertex>
  transformed.z += sin(position.x * 0.6 + waveTime) * 0.1
    + cos(position.y * 0.5 + waveTime * 0.8) * 0.08;
`;

/** Relógio das ondas de cada material de água (o shader lê daqui a cada quadro). */
const waveClocks = new WeakMap<Material, IUniform<number>>();

function Water({ radius, center }: { radius: number; center: Center }) {
  const [still] = useState(prefersReducedMotion);
  const mesh = useRef<Mesh>(null);
  const segments = Math.min(Math.ceil((radius * 2) / WATER.cellSize), WATER.maxSegments);
  const geometry = useMemo(
    () => new PlaneGeometry(radius * 2, radius * 2, segments, segments),
    [radius, segments],
  );
  const material = useMemo(() => {
    const waveTime: IUniform<number> = { value: 0 };
    const water = new MeshStandardMaterial({
      color: WATER.color,
      // Sem mapa de ambiente, metal e brilho alto deixavam a água preta como o fundo.
      roughness: 0.55,
      metalness: 0,
      emissive: WATER.glow,
      transparent: true,
      opacity: WATER.opacity,
      flatShading: true,
    });
    water.onBeforeCompile = (shader) => {
      shader.uniforms.waveTime = waveTime;
      shader.vertexShader = `uniform float waveTime;\n${shader.vertexShader.replace(
        '#include <begin_vertex>',
        WAVE_VERTEX,
      )}`;
    };
    waveClocks.set(water, waveTime);
    return water;
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  // O tempo anda pela referência da cena: o material em si é do useMemo e não muda aqui.
  useFrame((_, delta) => {
    const shown = mesh.current?.material;
    if (still || !shown || Array.isArray(shown)) return;
    const clock = waveClocks.get(shown);
    if (clock) clock.value += delta;
  });
  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      position={[center.x, BACKDROP_WATER_Y, center.z]}
      rotation={[QUARTER_TURN, 0, 0]}
    />
  );
}

const LEAVES = {
  count: 700,
  /** Até onde, para fora do mapa, as folhas caem: só na beira, onde a câmera vê. */
  bandFactor: 0.35,
  bandPadding: 6,
  height: 9,
  speed: 0.55,
  /** Lado da folha em unidades do mundo (a casa do mapa mede 1). */
  size: 0.35,
  colors: ['#c27a2e', '#8f9a3c'],
};

const LEAF_VERTEX = /* glsl */ `
  attribute vec3 seed;
  uniform float time;
  uniform float height;
  uniform float speed;
  uniform float leafSize;
  uniform float pointScale;
  varying float tint;
  #include <fog_pars_vertex>
  void main() {
    float y = mod(seed.y - time * speed, height);
    // A folha balança de lado enquanto cai, cada uma no seu ritmo.
    vec3 drift = vec3(sin(time * 1.3 + seed.y * 4.0) * 0.6, 0.0, cos(time * 0.9 + seed.x) * 0.4);
    vec4 mvPosition = modelViewMatrix * vec4(vec3(seed.x, y, seed.z) + drift, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = leafSize * pointScale / -mvPosition.z;
    tint = fract(seed.x * 7.13 + seed.z * 3.71);
    #include <fog_vertex>
  }
`;

const LEAF_FRAGMENT = /* glsl */ `
  uniform vec3 colorA;
  uniform vec3 colorB;
  varying float tint;
  #include <fog_pars_fragment>
  void main() {
    // Losango: a folha não é um quadrado.
    vec2 p = abs(gl_PointCoord - 0.5);
    if (p.x + p.y > 0.5) discard;
    gl_FragColor = vec4(mix(colorA, colorB, tint), 1.0);
    #include <fog_fragment>
  }
`;

function buildLeafGeometry(size: GridSize, count: number): BufferGeometry {
  const ring = backdropRing(size);
  const band = {
    ...ring,
    depth: Math.max(size.width, size.depth) * LEAVES.bandFactor + LEAVES.bandPadding,
  };
  const seeds = new Float32Array(count * 3);
  for (let leaf = 0; leaf < count; leaf += 1) {
    const point = ringPoint(band, Math.random);
    seeds.set([point.x, Math.random() * LEAVES.height, point.z], leaf * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(seeds, 3));
  geometry.setAttribute('seed', new Float32BufferAttribute(seeds, 3));
  return geometry;
}

function FallingLeaves({ size }: { size: GridSize }) {
  const level = useQualityLevel();
  const count = Math.round(LEAVES.count * BACKDROP_DENSITY[level]);
  const geometry = useMemo(() => buildLeafGeometry(size, count), [size, count]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: LEAF_VERTEX,
        fragmentShader: LEAF_FRAGMENT,
        fog: true,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          {
            time: { value: 0 },
            height: { value: LEAVES.height },
            speed: { value: LEAVES.speed },
            leafSize: { value: LEAVES.size },
            // Pixels por unidade a 1 de distância; a cena acerta a cada quadro (muda com a janela).
            pointScale: { value: 1 },
            colorA: { value: new Color(LEAVES.colors[0]) },
            colorB: { value: new Color(LEAVES.colors[1]) },
          },
        ]),
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  const points = useRef<Points>(null);
  useFrame((state, delta) => {
    const shown = points.current?.material;
    if (!(shown instanceof ShaderMaterial)) return;
    const { time, pointScale } = shown.uniforms;
    if (time) time.value += delta;
    if (pointScale) pointScale.value = (state.size.height * state.viewport.dpr) / 2;
  });
  // O shader move as folhas: o recorte pela posição de partida esconderia as que caem.
  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}

function Scatter({ backdrop, size }: { backdrop: keyof typeof BACKDROP_SPECS; size: GridSize }) {
  const level = useQualityLevel();
  const groups = useMemo(() => scatterBackdrop(backdrop, size, { level }), [backdrop, size, level]);
  return (
    <>
      {groups.map(({ piece, transforms }) =>
        getBackdropLayers(piece).map((layer, index) => (
          <InstancedLayer
            key={`${piece}-${index}`}
            geometry={layer.geometry}
            material={layer.material}
            transforms={transforms}
            // Sombra da paisagem redesenharia centenas de peças fora do mapa a cada quadro.
            shadows={false}
          />
        )),
      )}
    </>
  );
}

export type BackdropLayerProps = { backdrop: Backdrop; size: GridSize };

/** Paisagem em volta do mapa (RPG-40): chão, peças espalhadas, água ou folhas, conforme o fundo. */
export function BackdropLayer({ backdrop, size }: BackdropLayerProps) {
  const stableSize = useMemo(
    () => ({ width: size.width, depth: size.depth }),
    [size.width, size.depth],
  );
  if (backdrop === 'none') return null;
  const spec: BackdropSpec = BACKDROP_SPECS[backdrop];
  const ring = backdropRing(stableSize);
  const radius = groundRadius(ring);
  return (
    <group>
      <Ground
        radius={radius}
        color={spec.groundColor}
        center={ring.center}
        y={backdropGroundY(spec)}
      />
      {spec.water && <Water radius={radius} center={ring.center} />}
      {spec.leaves && !prefersReducedMotion() && <FallingLeaves size={stableSize} />}
      <Scatter backdrop={backdrop} size={stableSize} />
    </group>
  );
}
