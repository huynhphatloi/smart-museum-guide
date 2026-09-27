export interface GridOptions {
  widthMeters: number;
  heightMeters: number;
  /** Distance between neighbouring points, in metres. */
  spacing: number;
  /** Minimum distance from any wall, in metres. */
  margin: number;
}

export interface GridPoint {
  /** Row letter + column number, e.g. "B3" - easy to shout across a room. */
  label: string;
  x: number;
  y: number;
}

/** Positions along one axis, centred so the leftover space splits evenly. */
function axis(length: number, spacing: number, margin: number): number[] {
  const usable = length - 2 * margin;
  if (usable < 0) return [];

  // The epsilon keeps 4.0 / 1.0 from becoming 3.9999999 and losing a point.
  const count = Math.floor(usable / spacing + 1e-9) + 1;
  const start = (length - (count - 1) * spacing) / 2;
  return Array.from({ length: count }, (_, index) => round(start + index * spacing));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function rowLabel(index: number): string {
  // A..Z, then AA, AB, ... - a room will never need more, but never crash.
  let label = '';
  let remaining = index;
  do {
    label = String.fromCharCode(65 + (remaining % 26)) + label;
    remaining = Math.floor(remaining / 26) - 1;
  } while (remaining >= 0);
  return label;
}

/**
 * Lays out the reference points staff will stand on while calibrating.
 * Rows run top to bottom (A, B, C...), columns left to right (1, 2, 3...).
 */
export function generateGrid(options: GridOptions): GridPoint[] {
  const { widthMeters, heightMeters, spacing, margin } = options;
  if (!(spacing > 0) || margin < 0) return [];

  const xs = axis(widthMeters, spacing, margin);
  const ys = axis(heightMeters, spacing, margin);

  return ys.flatMap((y, row) =>
    xs.map((x, column) => ({ label: `${rowLabel(row)}${column + 1}`, x, y })),
  );
}

/** Drops grid points that land on (or within `tolerance` of) an existing point. */
export function withoutOccupied(
  grid: GridPoint[],
  existing: ReadonlyArray<{ x: number; y: number }>,
  tolerance = 0.05,
): GridPoint[] {
  return grid.filter(
    (point) =>
      !existing.some((other) => Math.hypot(other.x - point.x, other.y - point.y) <= tolerance),
  );
}

/**
 * Makes grid labels unique against labels already on the plan: a second grid
 * laid over an old one gets "B3-2" rather than being silently skipped.
 */
export function withUniqueLabels(grid: GridPoint[], taken: Iterable<string>): GridPoint[] {
  const used = new Set(taken);
  return grid.map((point) => {
    let label = point.label;
    for (let suffix = 2; used.has(label); suffix += 1) label = `${point.label}-${suffix}`;
    used.add(label);
    return { ...point, label };
  });
}
