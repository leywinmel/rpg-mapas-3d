import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineSegments,
  ShaderMaterial,
  Vector2,
  type AmbientLight,
} from 'three';
import type { GridSize, WeatherKind } from '@/domain';
import { useQualityLevel } from '../quality/quality-store';
import { LIGHTNING, RAIN_SETTINGS, rainBox, rainDropCount } from '../weather/weather';

const RAIN_COLOR = '#b9c8e6';
/** Cada gota é um risco: dois vértices, o de cima (1) e o de baixo (0). */
const VERTICES_PER_DROP = 2;

/*
 * As gotas caem no shader: a posição de cada uma vem da semente dela e do tempo, com a volta
 * ao topo por mod(). A CPU só soma o tempo; 30 mil gotas custam um desenho por quadro.
 */
const VERTEX_SHADER = /* glsl */ `
  attribute vec3 seed;
  attribute float top;
  uniform float time;
  uniform float speed;
  uniform float height;
  uniform float dropLength;
  uniform float wind;
  uniform float boxWidth;
  uniform vec2 origin;
  varying float fade;
  void main() {
    float y = mod(seed.y - time * speed, height);
    // O vento empurra a gota de lado enquanto cai; ela dá a volta pela largura da caixa.
    float x = mod(seed.x + (height - y) * wind, boxWidth);
    vec3 position = vec3(origin.x + x - top * dropLength * wind, y + top * dropLength, origin.y + seed.z);
    // Some perto do chão e do teto, para a volta ao topo não piscar.
    fade = smoothstep(0.0, 1.5, y) * (1.0 - smoothstep(height - 2.0, height, y)) * (0.35 + 0.65 * top);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 color;
  uniform float opacity;
  varying float fade;
  void main() {
    gl_FragColor = vec4(color, opacity * fade);
  }
`;

function buildRainGeometry(count: number, width: number, height: number): BufferGeometry {
  const seeds = new Float32Array(count * VERTICES_PER_DROP * 3);
  const tops = new Float32Array(count * VERTICES_PER_DROP);
  for (let drop = 0; drop < count; drop += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const z = Math.random() * width;
    for (let end = 0; end < VERTICES_PER_DROP; end += 1) {
      const vertex = drop * VERTICES_PER_DROP + end;
      seeds.set([x, y, z], vertex * 3);
      tops[vertex] = end;
    }
  }
  const geometry = new BufferGeometry();
  // "position" é obrigatório para o three contar os vértices; o shader usa a semente.
  geometry.setAttribute('position', new Float32BufferAttribute(seeds, 3));
  geometry.setAttribute('seed', new Float32BufferAttribute(seeds, 3));
  geometry.setAttribute('top', new Float32BufferAttribute(tops, 1));
  return geometry;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Clarões da tempestade: uma luz ambiente que acende rápido e apaga, de tempos em tempos. */
function Lightning() {
  const light = useRef<AmbientLight>(null);
  const clock = useRef<{ next: number; since: number }>({ next: LIGHTNING.minGap, since: 0 });
  useFrame((_, delta) => {
    const state = clock.current;
    state.since += delta;
    const sinceStrike = state.since - state.next;
    const cycle = LIGHTNING.flashSeconds + LIGHTNING.flashGapSeconds;
    const flash = sinceStrike >= 0 ? Math.floor(sinceStrike / cycle) : -1;
    const inFlash =
      flash >= 0 && flash < LIGHTNING.flashes && sinceStrike % cycle < LIGHTNING.flashSeconds;
    if (light.current) light.current.intensity = inFlash ? LIGHTNING.intensity : 0;
    if (flash >= LIGHTNING.flashes) {
      state.since = 0;
      state.next = LIGHTNING.minGap + Math.random() * (LIGHTNING.maxGap - LIGHTNING.minGap);
    }
  });
  return <ambientLight ref={light} color={LIGHTNING.color} intensity={0} />;
}

export type RainLayerProps = { kind: Exclude<WeatherKind, 'clear'>; size: GridSize };

/** Chuva sobre o mapa inteiro (RPG-39); na tempestade, mais forte, inclinada e com relâmpagos. */
export function RainLayer({ kind, size }: RainLayerProps) {
  const level = useQualityLevel();
  const span = Math.max(size.width, size.depth);
  const box = rainBox(span);
  const count = rainDropCount(kind, box, level);
  const settings = RAIN_SETTINGS[kind];
  const geometry = useMemo(
    () => buildRainGeometry(count, box.width, box.height),
    [count, box.width, box.height],
  );
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          time: { value: 0 },
          speed: { value: settings.speed },
          height: { value: box.height },
          dropLength: { value: settings.length },
          wind: { value: settings.wind },
          boxWidth: { value: box.width },
          // Canto da caixa (x, z): a caixa fica centrada no mapa.
          origin: {
            value: new Vector2(size.width / 2 - box.width / 2, size.depth / 2 - box.width / 2),
          },
          color: { value: new Color(RAIN_COLOR) },
          opacity: { value: settings.opacity },
        },
      }),
    [settings, box.height, box.width, size.width, size.depth],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  const [reducedMotion] = useState(prefersReducedMotion);
  const lines = useRef<LineSegments>(null);

  // O tempo anda pela referência da cena: o material em si é do useMemo e não muda aqui.
  useFrame((_, delta) => {
    const shown = lines.current?.material;
    if (!(shown instanceof ShaderMaterial)) return;
    const time = shown.uniforms.time;
    if (time) time.value += delta;
  });

  return (
    <>
      {/* O shader move as gotas: o recorte pela caixa original esconderia a chuva. */}
      <lineSegments
        ref={lines}
        geometry={geometry}
        material={material}
        frustumCulled={false}
        renderOrder={2}
      />
      {kind === 'storm' && !reducedMotion && <Lightning />}
    </>
  );
}
