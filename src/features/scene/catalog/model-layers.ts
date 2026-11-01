/**
 * Converte um modelo .glb em camadas instanciáveis: cada malha vira uma
 * geometria já posicionada (e, se pedido, encaixada numa casa). Assim um modelo
 * repetido 50 vezes no mapa custa as mesmas chamadas de desenho que um só.
 */
import { Box3, Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import { fitModelToCell } from '../layout';
import type { PieceLayer } from './piece-geometry';

function firstMaterial(material: Material | Material[]): Material | undefined {
  return Array.isArray(material) ? material[0] : material;
}

export function bakeModel(root: Object3D, options: { fitToCell: boolean }): PieceLayer[] {
  root.updateMatrixWorld(true);
  const layers: PieceLayer[] = [];
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const material = firstMaterial(child.material);
    if (!material) return;
    const geometry = (child.geometry as BufferGeometry).clone().applyMatrix4(child.matrixWorld);
    layers.push({ geometry, material });
  });
  if (!options.fitToCell || layers.length === 0) return layers;

  const bounds = new Box3();
  for (const layer of layers) {
    layer.geometry.computeBoundingBox();
    if (layer.geometry.boundingBox) bounds.union(layer.geometry.boundingBox);
  }
  const fit = fitModelToCell(bounds);
  for (const layer of layers) {
    layer.geometry.scale(fit.scale, fit.scale, fit.scale);
    layer.geometry.translate(fit.offset.x, fit.offset.y, fit.offset.z);
    layer.geometry.computeBoundingBox();
    layer.geometry.computeBoundingSphere();
  }
  return layers;
}
