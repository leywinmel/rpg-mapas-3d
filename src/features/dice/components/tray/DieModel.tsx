import type { DieKind } from '../../physics/shapes';
import { getDieGeometries } from './die-geometry';
import { getBodyMaterial, getEdgeMaterial, getLabelMaterial } from './die-materials';

const LABEL_RENDER_ORDER = 2;

/** Um dado low-poly facetado, com os números impressos nas faces. */
export function DieModel({ kind }: { kind: DieKind }) {
  const geometries = getDieGeometries(kind);
  return (
    <>
      <mesh geometry={geometries.body} material={getBodyMaterial(kind)} castShadow receiveShadow />
      <lineSegments geometry={geometries.edges} material={getEdgeMaterial()} />
      <mesh
        geometry={geometries.labels}
        material={getLabelMaterial()}
        renderOrder={LABEL_RENDER_ORDER}
      />
    </>
  );
}
