/**
 * Área do chão que a câmera vê: raios pela tela (uma grade de amostras) até o plano do chão.
 * O raio que não toca o chão (acima do horizonte) ou que passa do fim da neblina para no fim da
 * neblina, porque dali em diante a cena não desenha nada.
 */
import { Plane, Raycaster, Vector2, Vector3, type Camera } from 'three';
import type { GridSize } from '@/domain';
import { intersectRects, mapRect, type CellRect } from '@/domain/map-v2';
import { VISIBLE_AREA_SAMPLES } from '../constants';

const GROUND = new Plane(new Vector3(0, 1, 0), 0);
/** A tela vai de -1 a 1 nos dois eixos (coordenadas normalizadas). */
const NDC_SPAN = 2;

export function visibleGroundRect(
  camera: Camera,
  size: GridSize,
  maxDistance: number,
): CellRect | null {
  const raycaster = new Raycaster();
  const point = new Vector3();
  const screen = new Vector2();
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  const last = VISIBLE_AREA_SAMPLES - 1;
  for (let row = 0; row <= last; row += 1) {
    for (let column = 0; column <= last; column += 1) {
      screen.set((column / last) * NDC_SPAN - 1, (row / last) * NDC_SPAN - 1);
      raycaster.setFromCamera(screen, camera);
      const { ray } = raycaster;
      const hit = ray.intersectPlane(GROUND, point);
      if (!hit || ray.origin.distanceTo(hit) > maxDistance) ray.at(maxDistance, point);
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    }
  }
  const x = Math.floor(minX);
  const z = Math.floor(minZ);
  return intersectRects(mapRect(size), {
    x,
    z,
    width: Math.ceil(maxX) - x,
    depth: Math.ceil(maxZ) - z,
  });
}
