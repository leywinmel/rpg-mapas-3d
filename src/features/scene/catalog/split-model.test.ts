import { BoxGeometry, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { INTERACTIVE_MODELS, type InteractiveModel } from './interactive-models';
import { splitModel } from './split-model';

const triangles = (geometry: { getAttribute: (name: string) => { count: number } }) =>
  geometry.getAttribute('position').count / 3;

/** Barra de 4 de comprimento em x, com a metade da direita como a parte que mexe. */
function bar() {
  const material = new MeshStandardMaterial();
  material.name = 'corpo';
  return [{ geometry: new BoxGeometry(4, 1, 1, 4, 1, 1), material }];
}

describe('splitModel (RPG-44)', () => {
  it('shouldMoveTheTrianglesInsideThePartBoxAndKeepTheRest', () => {
    const model: InteractiveModel = {
      parts: [
        { select: [{ min: [0, -1, -1], max: [3, 1, 1] }], pivot: [0, 0, 0], turn: [0, 1, 0] },
      ],
    };
    const split = splitModel(bar(), model);
    const moved = triangles(split.parts[0]!.layers[0]!.geometry);
    const kept = triangles(split.rest[0]!.geometry);
    expect(moved).toBeGreaterThan(0);
    expect(kept).toBeGreaterThan(0);
    expect(moved + kept).toBe(new BoxGeometry(4, 1, 1, 4, 1, 1).index!.count / 3);
  });

  it('shouldDropRemovedTrianglesAndAddPanelAndInterior', () => {
    const model: InteractiveModel = {
      remove: [{ min: [1, -1, -1], max: [3, 1, 1] }],
      interior: { min: [0, 0, 0], max: [1, 1, 1] },
      parts: [
        {
          panel: { material: 'corpo', box: { min: [0, 0, 0], max: [1, 1, 0.1] } },
          pivot: [0, 0, 0],
          turn: [0, 1, 0],
        },
      ],
    };
    const layers = bar();
    const split = splitModel(layers, model);
    expect(split.rest).toHaveLength(2);
    expect(split.parts[0]!.layers[0]!.material).toBe(layers[0]!.material);
    split.rest[0]!.geometry.computeBoundingBox();
    expect(split.rest[0]!.geometry.boundingBox!.max.x).toBeLessThanOrEqual(1.5);
  });

  it('shouldDescribeTheVanTheAmbulanceAndTheLoader', () => {
    expect(Object.keys(INTERACTIVE_MODELS).sort()).toEqual(
      ['mod-ambulancia', 'mod-trator-pa', 'mod-van'].sort(),
    );
  });
});
