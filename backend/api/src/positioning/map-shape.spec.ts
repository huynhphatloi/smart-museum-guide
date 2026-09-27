import { parseMapShape, shapeFitsPlan } from './map-shape';

describe('parseMapShape', () => {
  it('accepts a circle and a polygon', () => {
    expect(parseMapShape({ type: 'circle', x: 0.3, y: 0.3, r: 1.2 })).toEqual({
      ok: true,
      shape: { type: 'circle', x: 0.3, y: 0.3, r: 1.2 },
    });

    const polygon = {
      type: 'polygon',
      points: [
        [0, 0],
        [2, 0],
        [2, 2],
      ],
    };
    expect(parseMapShape(polygon)).toEqual({ ok: true, shape: polygon });
  });

  it('rejects unknown types, negative coordinates and degenerate polygons', () => {
    expect(parseMapShape({ type: 'square', x: 1 }).ok).toBe(false);
    expect(parseMapShape({ type: 'circle', x: -1, y: 0, r: 1 }).ok).toBe(false);
    expect(parseMapShape({ type: 'circle', x: 1, y: 1, r: 0 }).ok).toBe(false);
    expect(
      parseMapShape({
        type: 'polygon',
        points: [
          [0, 0],
          [1, 1],
        ],
      }).ok,
    ).toBe(false);
  });

  it('rejects extra keys so typos do not silently vanish', () => {
    const result = parseMapShape({ type: 'circle', x: 1, y: 1, r: 1, radius: 2 });
    expect(result.ok).toBe(false);
  });

  it('says where the problem is', () => {
    const result = parseMapShape({ type: 'circle', x: 1, y: 'a', r: 1 });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('at y') });
  });
});

describe('shapeFitsPlan', () => {
  it('checks the centre of a circle and every polygon vertex', () => {
    expect(shapeFitsPlan({ type: 'circle', x: 4.7, y: 0.3, r: 1.2 }, 5, 5)).toBe(true);
    expect(shapeFitsPlan({ type: 'circle', x: 5.5, y: 0.3, r: 1 }, 5, 5)).toBe(false);
    expect(
      shapeFitsPlan(
        {
          type: 'polygon',
          points: [
            [0, 0],
            [6, 0],
            [0, 2],
          ],
        },
        5,
        5,
      ),
    ).toBe(false);
  });
});
