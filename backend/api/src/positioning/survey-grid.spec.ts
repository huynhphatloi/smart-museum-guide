import { generateGrid, withoutOccupied } from './survey-grid';

describe('generateGrid', () => {
  it('lays a 1 m grid across a 5 x 5 m room with a 0.5 m margin', () => {
    const grid = generateGrid({ widthMeters: 5, heightMeters: 5, spacing: 1, margin: 0.5 });

    expect(grid).toHaveLength(25);
    expect(grid[0]).toEqual({ label: 'A1', x: 0.5, y: 0.5 });
    expect(grid[4]).toEqual({ label: 'A5', x: 4.5, y: 0.5 });
    expect(grid[24]).toEqual({ label: 'E5', x: 4.5, y: 4.5 });
  });

  it('centres the grid when the spacing does not divide the room evenly', () => {
    const grid = generateGrid({ widthMeters: 5, heightMeters: 3, spacing: 1.5, margin: 0.5 });

    // 5 m wide: usable 4 m -> 3 columns at 1.0, 2.5, 4.0 (0.5 m spare split evenly).
    expect(grid.filter((point) => point.y === grid[0].y).map((point) => point.x)).toEqual([
      1, 2.5, 4,
    ]);
    // 3 m tall: usable 2 m -> 2 rows at 0.75 and 2.25.
    expect([...new Set(grid.map((point) => point.y))]).toEqual([0.75, 2.25]);
  });

  it('keeps the last point when floating point division lands just short', () => {
    const grid = generateGrid({ widthMeters: 1.3, heightMeters: 1, spacing: 0.1, margin: 0.5 });
    expect(grid.map((point) => point.x)).toEqual([0.5, 0.6, 0.7, 0.8]);
  });

  it('returns nothing for a room smaller than its margins or a non-positive spacing', () => {
    expect(generateGrid({ widthMeters: 0.8, heightMeters: 5, spacing: 1, margin: 0.5 })).toEqual(
      [],
    );
    expect(generateGrid({ widthMeters: 5, heightMeters: 5, spacing: 0, margin: 0.5 })).toEqual([]);
  });

  it('labels rows past Z without breaking', () => {
    // A single column, so point n sits on row n.
    const grid = generateGrid({ widthMeters: 0, heightMeters: 28, spacing: 1, margin: 0 });
    expect(grid[25].label).toBe('Z1');
    expect(grid[26].label).toBe('AA1');
  });
});

describe('withoutOccupied', () => {
  it('skips grid points already covered by an existing point', () => {
    const grid = generateGrid({ widthMeters: 3, heightMeters: 1, spacing: 1, margin: 0.5 });
    const kept = withoutOccupied(grid, [{ x: 1.52, y: 0.5 }]);
    expect(kept.map((point) => point.label)).toEqual(['A1', 'A3']);
  });
});
