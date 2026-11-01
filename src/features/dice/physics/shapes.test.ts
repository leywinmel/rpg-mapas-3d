import { centroid, cross, dot, length, normalize, sub, type Vec3 } from './vec';
import { allLabelTexts, BODY_KINDS, DIE_KINDS, getDieShape, type DieKind } from './shapes';

const EXPECTED_FACES: Record<DieKind, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
  'd100-tens': 10,
  'd100-units': 10,
};

const EXPECTED_VERTICES: Record<DieKind, number> = {
  d4: 4,
  d6: 8,
  d8: 6,
  d10: 12,
  d12: 20,
  d20: 12,
  'd100-tens': 12,
  'd100-units': 12,
};

const TOLERANCE = 1e-9;

function pointsOf(kind: DieKind, face: readonly number[]): Vec3[] {
  const { vertices } = getDieShape(kind);
  return face.map((index) => vertices[index] ?? [0, 0, 0]);
}

/** Normal pela regra da mão direita nos três primeiros vértices da face. */
function windingNormal(points: readonly Vec3[]): Vec3 {
  const [a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0]] = points;
  return normalize(cross(sub(b, a), sub(c, b)));
}

describe.each(DIE_KINDS)('forma do %s', (kind) => {
  const shape = getDieShape(kind);

  it('shouldHaveTheRightNumberOfFacesAndVertices', () => {
    expect(shape.faces).toHaveLength(EXPECTED_FACES[kind]);
    expect(shape.vertices).toHaveLength(EXPECTED_VERTICES[kind]);
  });

  it('shouldKeepEveryFaceFlat', () => {
    for (const face of shape.faces) {
      const points = pointsOf(kind, face);
      const normal = windingNormal(points);
      const plane = dot(normal, points[0] ?? [0, 0, 0]);
      for (const point of points) expect(Math.abs(dot(normal, point) - plane)).toBeLessThan(1e-9);
    }
  });

  it('shouldWindEveryFaceCounterClockwiseSeenFromOutside', () => {
    for (const face of shape.faces) {
      const points = pointsOf(kind, face);
      expect(dot(windingNormal(points), centroid(points))).toBeGreaterThan(0);
    }
  });

  it('shouldBeConvexWithEveryVertexBehindEveryFace', () => {
    for (const face of shape.faces) {
      const points = pointsOf(kind, face);
      const normal = windingNormal(points);
      const plane = dot(normal, points[0] ?? [0, 0, 0]);
      for (const vertex of shape.vertices) {
        expect(dot(normal, vertex)).toBeLessThanOrEqual(plane + TOLERANCE);
      }
    }
  });

  it('shouldBeCenteredOnTheOrigin', () => {
    const middle = centroid(shape.vertices);
    expect(length(middle)).toBeLessThan(1e-9);
  });

  it('shouldPrintEachPossibleValueExactlyOnce', () => {
    const values = shape.readings.map((reading) => reading.value).sort((a, b) => a - b);
    expect(new Set(values).size).toBe(values.length);
    const expectedValues: Record<DieKind, number[]> = {
      d4: [1, 2, 3, 4],
      d6: [1, 2, 3, 4, 5, 6],
      d8: [1, 2, 3, 4, 5, 6, 7, 8],
      d10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      d12: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      d20: Array.from({ length: 20 }, (_, index) => index + 1),
      'd100-tens': [0, 10, 20, 30, 40, 50, 60, 70, 80, 90],
      'd100-units': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    };
    expect(values).toEqual(expectedValues[kind]);
  });

  it('shouldKeepEveryLabelOnTheSurfaceFacingOutward', () => {
    for (const label of shape.labels) {
      expect(length(label.normal)).toBeCloseTo(1, 9);
      expect(length(label.up)).toBeCloseTo(1, 9);
      expect(Math.abs(dot(label.up, label.normal))).toBeLessThan(1e-9);
      expect(dot(label.center, label.normal)).toBeGreaterThan(0);
      expect(label.halfSize).toBeGreaterThan(0);
    }
  });
});

describe('opposite faces', () => {
  const oppositeSums: Array<[DieKind, number]> = [
    ['d6', 7],
    ['d8', 9],
    ['d10', 11],
    ['d12', 13],
    ['d20', 21],
    ['d100-tens', 90],
    ['d100-units', 9],
  ];

  it.each(oppositeSums)('shouldMakeOppositeFacesOfTheD%s', (kind, sum) => {
    const { readings } = getDieShape(kind);
    for (const reading of readings) {
      const opposite = readings.find((other) => dot(other.up, reading.up) < -1 + 1e-9);
      expect((opposite?.value ?? Number.NaN) + reading.value).toBe(sum);
    }
  });
});

describe('d4', () => {
  it('shouldReadTheNumberOfTheVertexThatPointsUp', () => {
    const { readings, vertices } = getDieShape('d4');
    readings.forEach((reading) => {
      const vertex = vertices[reading.value - 1] ?? [0, 0, 0];
      expect(dot(reading.up, normalize(vertex))).toBeCloseTo(1, 9);
    });
  });

  it('shouldPrintThreeNumbersPerFaceOneAtEachCorner', () => {
    const { labels } = getDieShape('d4');
    expect(labels).toHaveLength(12);
    const copies = labels.filter((label) => label.text === '1');
    expect(copies).toHaveLength(3);
  });
});

describe('d100', () => {
  it('shouldUseTwoD10sWithTensAndUnits', () => {
    expect(BODY_KINDS[100]).toEqual(['d100-tens', 'd100-units']);
    const tens = getDieShape('d100-tens').labels.map((label) => label.text);
    expect(tens).toContain('00');
    expect(tens).toContain('90');
    const units = getDieShape('d100-units').labels.map((label) => label.text);
    expect(units).toContain('0');
    expect(units).toContain('9');
  });
});

describe('allLabelTexts', () => {
  it('shouldListEveryPrintedTextOnce', () => {
    const texts = allLabelTexts();
    expect(new Set(texts).size).toBe(texts.length);
    for (const expected of ['0', '1', '9', '10', '12', '20', '00', '30', '90']) {
      expect(texts).toContain(expected);
    }
  });
});
