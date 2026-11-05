/**
 * Converte um modelo .glb em camadas instanciáveis: cada malha vira uma
 * geometria já posicionada (e, se pedido, encaixada numa casa). Assim um modelo
 * repetido 50 vezes no mapa custa as mesmas chamadas de desenho que um só.
 */
import {
  Box3,
  BufferAttribute,
  Mesh,
  type BufferGeometry,
  type InterleavedBufferAttribute,
  type Material,
  type Object3D,
} from 'three';
import { fitModelToCell } from '../layout';
import type { PieceLayer } from './piece-geometry';

function firstMaterial(material: Material | Material[]): Material | undefined {
  return Array.isArray(material) ? material[0] : material;
}

/**
 * Os pacotes guardam posição e normal comprimidas em inteiros que só cabem entre -1 e 1; quem
 * devolve o tamanho real é a escala do nó. Ao embutir essa escala na geometria, o valor passa
 * de 1 e o inteiro estoura (parede cortada ao meio, carro amassado). Por isso a geometria é
 * descomprimida para números decimais antes de receber a posição do nó.
 */
function toFloatAttribute(
  attribute: BufferAttribute | InterleavedBufferAttribute,
): BufferAttribute {
  if (attribute.array instanceof Float32Array && !('isInterleavedBufferAttribute' in attribute)) {
    return attribute as BufferAttribute;
  }
  const { count, itemSize } = attribute;
  const values = new Float32Array(count * itemSize);
  for (let index = 0; index < count; index += 1) {
    for (let component = 0; component < itemSize; component += 1) {
      values[index * itemSize + component] = attribute.getComponent(index, component);
    }
  }
  return new BufferAttribute(values, itemSize);
}

function decompressed(source: BufferGeometry): BufferGeometry {
  const geometry = source.clone();
  for (const name of Object.keys(geometry.attributes)) {
    geometry.setAttribute(name, toFloatAttribute(geometry.getAttribute(name)));
  }
  return geometry;
}

export function bakeModel(root: Object3D, options: { fitToCell: boolean }): PieceLayer[] {
  root.updateMatrixWorld(true);
  const layers: PieceLayer[] = [];
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const material = firstMaterial(child.material);
    if (!material) return;
    const geometry = decompressed(child.geometry as BufferGeometry).applyMatrix4(child.matrixWorld);
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
