import { PositionSmoother } from './smoother';
import { centroid, containsPoint } from './zone-geometry';

describe('zone geometry', () => {
  const square = {
    type: 'polygon' as const,
    points: [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ] as Array<[number, number]>,
  };

  it('tests points against circles and polygons', () => {
    expect(containsPoint({ type: 'circle', x: 1, y: 1, r: 1 }, 1.5, 1.5)).toBe(true);
    expect(containsPoint({ type: 'circle', x: 1, y: 1, r: 1 }, 2, 2)).toBe(false);
    expect(containsPoint(square, 1, 1)).toBe(true);
    expect(containsPoint(square, 3, 1)).toBe(false);
  });

  it('finds the centre of a circle and the area centroid of a polygon', () => {
    expect(centroid({ type: 'circle', x: 4.1, y: 0.9, r: 1 })).toEqual({ x: 4.1, y: 0.9 });
    expect(centroid(square)).toEqual({ x: 1, y: 1 });

    const lShape = {
      type: 'polygon' as const,
      points: [
        [0, 0],
        [2, 0],
        [2, 1],
        [1, 1],
        [1, 2],
        [0, 2],
      ] as Array<[number, number]>,
    };
    const c = centroid(lShape);
    expect(c.x).toBeCloseTo(5 / 6, 9);
    expect(c.y).toBeCloseTo(5 / 6, 9);
  });

  it('falls back to the vertex average for a degenerate polygon', () => {
    expect(
      centroid({
        type: 'polygon',
        points: [
          [0, 0],
          [1, 0],
          [2, 0],
        ],
      }),
    ).toEqual({ x: 1, y: 0 });
  });
});

describe('PositionSmoother', () => {
  it('starts on the first estimate, then moves a share of the way each tick', () => {
    const smoother = new PositionSmoother({ alpha: 0.5, resetAfterMs: 4000 });
    expect(smoother.update(0, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(smoother.update(4, 2, 500)).toEqual({ x: 2, y: 1 });
    expect(smoother.update(4, 2, 1000)).toEqual({ x: 3, y: 1.5 });
  });

  it('jumps straight to the estimate after a long silence', () => {
    const smoother = new PositionSmoother({ alpha: 0.5, resetAfterMs: 4000 });
    smoother.update(0, 0, 0);
    expect(smoother.update(4, 4, 10_000)).toEqual({ x: 4, y: 4 });
  });
});
