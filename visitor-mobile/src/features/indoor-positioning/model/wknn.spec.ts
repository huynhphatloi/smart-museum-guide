import { RadioMapEntry } from './types';
import { estimatePosition, euclidean } from './wknn';

const entry = (label: string, x: number, y: number, vector: number[]): RadioMapEntry => ({
  pointId: label,
  label,
  x,
  y,
  vector,
  captureCount: 1,
});

/**
 * The worked example used in the report. Four beacons, live vector
 * R = [-60, -68, -79, -87]. Keep these numbers and the slides in step.
 */
const P1 = entry('P1', 1, 1, [-52, -76, -81, -90]);
const P2 = entry('P2', 2, 1, [-58, -70, -80, -86]);
const P3 = entry('P3', 3, 1, [-65, -62, -82, -84]);
const P6 = entry('P6', 2, 2, [-60, -68, -79, -79]);
const live = [-60, -68, -79, -87];

describe('euclidean', () => {
  it('matches the hand calculation', () => {
    expect(euclidean(live, P1.vector)).toBeCloseTo(11.87, 2);
    expect(euclidean(live, P2.vector)).toBeCloseTo(3.16, 2);
    expect(euclidean(live, P3.vector)).toBeCloseTo(8.89, 2);
    expect(euclidean(live, P6.vector)).toBeCloseTo(8.0, 5);
  });
});

describe('estimatePosition', () => {
  it('reproduces the worked WKNN example: k = 3 -> (2.20, 1.23)', () => {
    const result = estimatePosition(live, [P1, P2, P3, P6], { k: 3, weighting: 'inverse' });

    expect(result?.neighbours.map((n) => n.label)).toEqual(['P2', 'P6', 'P3']);
    expect(result?.x).toBeCloseTo(2.2, 2);
    expect(result?.y).toBeCloseTo(1.23, 2);
    const weights = result?.neighbours.map((n) => n.weight) ?? [];
    expect(weights.reduce((sum, w) => sum + w, 0)).toBeCloseTo(1, 9);
    expect(weights[0]).toBeGreaterThan(weights[1]);
  });

  it('plain KNN averages the same neighbours equally', () => {
    const result = estimatePosition(live, [P1, P2, P3, P6], { k: 3, weighting: 'uniform' });
    expect(result?.x).toBeCloseTo((2 + 2 + 3) / 3, 9);
    expect(result?.y).toBeCloseTo((1 + 2 + 1) / 3, 9);
  });

  it('k = 1 snaps to the closest fingerprint', () => {
    const result = estimatePosition(live, [P1, P2, P3, P6], { k: 1, weighting: 'inverse' });
    expect(result).toMatchObject({ x: 2, y: 1, spreadM: 0 });
  });

  it('an exact match dominates without dividing by zero', () => {
    const result = estimatePosition(P3.vector, [P1, P2, P3], { k: 3, weighting: 'inverse' });
    expect(result?.x).toBeCloseTo(3, 2);
  });

  it('clamps k to the size of the radio map and handles an empty one', () => {
    expect(
      estimatePosition(live, [P1, P2], { k: 7, weighting: 'inverse' })?.neighbours,
    ).toHaveLength(2);
    expect(estimatePosition(live, [], { k: 3, weighting: 'inverse' })).toBeNull();
  });

  it('reports spread as the weighted distance of neighbours from the estimate', () => {
    const result = estimatePosition(live, [P1, P3], { k: 2, weighting: 'uniform' });
    // Midpoint of (1,1) and (3,1): both neighbours 1 m away.
    expect(result?.spreadM).toBeCloseTo(1, 9);
  });
});
