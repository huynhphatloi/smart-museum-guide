import { isOnPlan, outsideAfterResize } from './plan-bounds';
import { withUniqueLabels } from './survey-grid';

describe('isOnPlan', () => {
  it('accepts the walls themselves and rejects anything past them', () => {
    expect(isOnPlan(0, 0, 5, 5)).toBe(true);
    expect(isOnPlan(5, 5, 5, 5)).toBe(true);
    expect(isOnPlan(5.01, 1, 5, 5)).toBe(false);
    expect(isOnPlan(1, -0.1, 5, 5)).toBe(false);
  });
});

describe('outsideAfterResize', () => {
  const contents = {
    points: [
      { label: 'A1', x: 0.5, y: 0.5 },
      { label: 'E5', x: 4.5, y: 4.5 },
    ],
    beacons: [
      { identifier: 'B1', mapX: 0.3, mapY: 0.3 },
      { identifier: 'B2', mapX: 4.7, mapY: 0.3 },
      { identifier: 'B3', mapX: null, mapY: null },
    ],
    zones: [
      { code: 'Z1', shape: { type: 'circle' as const, x: 0.9, y: 0.9, r: 1 } },
      { code: 'Z2', shape: { type: 'circle' as const, x: 4.1, y: 0.9, r: 1 } },
      { code: 'Z3', shape: null },
    ],
  };

  it('is empty when everything still fits', () => {
    expect(outsideAfterResize(contents, 5, 5)).toEqual([]);
  });

  it('names whatever would fall off a smaller plan', () => {
    expect(outsideAfterResize(contents, 4, 4)).toEqual(['point E5', 'beacon B2', 'zone Z2']);
  });
});

describe('withUniqueLabels', () => {
  it('suffixes labels already in use instead of dropping the point', () => {
    const grid = [
      { label: 'A1', x: 0.25, y: 0.25 },
      { label: 'A2', x: 1.25, y: 0.25 },
    ];
    expect(withUniqueLabels(grid, ['A1', 'A1-2']).map((point) => point.label)).toEqual([
      'A1-3',
      'A2',
    ]);
  });
});
