import { LineBasicMaterial, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import type { DieKind } from '../../physics/shapes';
import { getLabelAtlas } from './label-atlas';
import { DIE_COLORS, DIE_EDGE_COLOR } from './palette';

const BODY_ROUGHNESS = 0.42;
const BODY_METALNESS = 0.12;
const LABEL_OFFSET_FACTOR = -2;
const LABEL_OFFSET_UNITS = -2;

/**
 * Materiais compartilhados entre todos os dados e todas as rolagens: são só oito cores, um
 * contorno e um material de números, então ficam guardados em vez de nascerem (e ficarem
 * sem descarte) a cada dado jogado.
 */
const bodyMaterials = new Map<DieKind, MeshStandardMaterial>();
let edgeMaterial: LineBasicMaterial | null = null;
let labelMaterial: MeshBasicMaterial | null = null;

export function getBodyMaterial(kind: DieKind): MeshStandardMaterial {
  const cached = bodyMaterials.get(kind);
  if (cached) return cached;
  const created = new MeshStandardMaterial({
    color: DIE_COLORS[kind],
    roughness: BODY_ROUGHNESS,
    metalness: BODY_METALNESS,
  });
  bodyMaterials.set(kind, created);
  return created;
}

export function getEdgeMaterial(): LineBasicMaterial {
  edgeMaterial ??= new LineBasicMaterial({ color: DIE_EDGE_COLOR });
  return edgeMaterial;
}

export function getLabelMaterial(): MeshBasicMaterial {
  labelMaterial ??= new MeshBasicMaterial({
    map: getLabelAtlas(),
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: LABEL_OFFSET_FACTOR,
    polygonOffsetUnits: LABEL_OFFSET_UNITS,
  });
  return labelMaterial;
}
