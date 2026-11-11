import { useLayoutEffect, useRef, useState } from 'react';
import { Object3D, type DirectionalLight } from 'three';
import type { GridSize } from '@/domain';
import type { SceneLook } from '../ambience';
import { useQualitySettings } from '../quality/quality-store';

/** Luz principal baixa (fim de tarde / tocha distante): sombras longas dão o ar dramático. */
const KEY_LIGHT_HEIGHT = 0.55;
const KEY_LIGHT_OFFSET = { x: -0.6, z: 0.35 };
const RIM_LIGHT_OFFSET = { x: 0.7, y: 0.4, z: -0.6 };
const SHADOW_MARGIN = 0.75;
const SHADOW_BIAS = -0.0004;
const SHADOW_NORMAL_BIAS = 0.02;
/**
 * O three (r155+) usa luz física: intensidade 1 entrega só 1/π na superfície.
 * Os climas são ajustados na escala "artística" e convertidos aqui.
 */
const PHYSICAL_LIGHT_SCALE = Math.PI;

/**
 * A sombra e a resolução dela vêm do nível de qualidade. Trocar a resolução remonta a luz (o
 * three não refaz o mapa de sombra sozinho); ligar e desligar a sombra recompila os materiais
 * uma vez, o que só acontece quando o nível muda.
 */
export function SceneLights({ look, size }: { look: SceneLook; size: GridSize }) {
  const { shadows, shadowMapSize } = useQualitySettings();
  const preset = look;
  const strength = look.lightScale * PHYSICAL_LIGHT_SCALE;
  const span = Math.max(size.width, size.depth);
  const center = { x: size.width / 2, z: size.depth / 2 };
  // A luz direcional mira um alvo; ele precisa estar na cena para a posição valer.
  const [target] = useState(() => new Object3D());
  const shadowExtent = span * SHADOW_MARGIN + 2;
  const keyLight = useRef<DirectionalLight>(null);

  // O three não recalcula a projeção da câmera de sombra sozinho quando o mapa muda de tamanho.
  useLayoutEffect(() => {
    keyLight.current?.shadow.camera.updateProjectionMatrix();
  }, [shadowExtent, shadowMapSize]);

  return (
    <>
      <primitive object={target} position={[center.x, 0, center.z]} />
      <hemisphereLight
        color={preset.skyColor}
        groundColor={preset.groundColor}
        intensity={preset.fillIntensity * strength}
      />
      <directionalLight
        key={shadowMapSize}
        ref={keyLight}
        castShadow={shadows}
        target={target}
        color={preset.keyColor}
        intensity={preset.keyIntensity * strength}
        position={[
          center.x + span * KEY_LIGHT_OFFSET.x,
          span * KEY_LIGHT_HEIGHT + 4,
          center.z + span * KEY_LIGHT_OFFSET.z,
        ]}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-bias={SHADOW_BIAS}
        shadow-normalBias={SHADOW_NORMAL_BIAS}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-near={0.5}
        shadow-camera-far={span * 4 + 20}
      />
      <directionalLight
        target={target}
        color={preset.rimColor}
        intensity={preset.rimIntensity * strength}
        position={[
          center.x + span * RIM_LIGHT_OFFSET.x,
          span * RIM_LIGHT_OFFSET.y + 2,
          center.z + span * RIM_LIGHT_OFFSET.z,
        ]}
      />
    </>
  );
}
