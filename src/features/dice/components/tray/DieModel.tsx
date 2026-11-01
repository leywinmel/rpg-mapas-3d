import { useMemo } from 'react';
import { LineBasicMaterial, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import type { DieKind } from '../../physics/shapes';
import { getDieGeometries } from './die-geometry';
import { getLabelAtlas } from './label-atlas';
import { DIE_COLORS, DIE_EDGE_COLOR } from './palette';

const BODY_ROUGHNESS = 0.42;
const BODY_METALNESS = 0.12;
const LABEL_RENDER_ORDER = 2;
const LABEL_OFFSET_FACTOR = -2;
const LABEL_OFFSET_UNITS = -2;

export type DieModelProps = {
  kind: DieKind;
  /** Pede um novo quadro quando a textura dos números é repintada. */
  onTextureChange?: () => void;
};

/** Um dado low-poly facetado, com os números impressos nas faces. */
export function DieModel({ kind, onTextureChange }: DieModelProps) {
  const geometries = getDieGeometries(kind);

  const bodyMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: DIE_COLORS[kind],
        roughness: BODY_ROUGHNESS,
        metalness: BODY_METALNESS,
      }),
    [kind],
  );
  const edgeMaterial = useMemo(() => new LineBasicMaterial({ color: DIE_EDGE_COLOR }), []);
  const labelMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        map: getLabelAtlas(onTextureChange),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: LABEL_OFFSET_FACTOR,
        polygonOffsetUnits: LABEL_OFFSET_UNITS,
      }),
    [onTextureChange],
  );

  return (
    <>
      <mesh geometry={geometries.body} material={bodyMaterial} castShadow receiveShadow />
      <lineSegments geometry={geometries.edges} material={edgeMaterial} />
      <mesh
        geometry={geometries.labels}
        material={labelMaterial}
        renderOrder={LABEL_RENDER_ORDER}
      />
    </>
  );
}
