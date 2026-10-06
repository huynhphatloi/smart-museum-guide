/** Bounded, 2D ASCII DXF import for OpenPlan3D's named drawing layers. */
export type DxfLayer = 'WALLS' | 'WINDOWS' | 'DOORS' | 'FURNITURE';
export interface DxfPath {
  layer: DxfLayer;
  points: Array<[number, number]>;
  closed: boolean;
}
export interface DxfPlan {
  widthMeters: number;
  heightMeters: number;
  unit: number;
  paths: DxfPath[];
  counts: Record<DxfLayer, number>;
}
export const DXF_UNITS = [
  { code: 4, label: 'mm', metres: 0.001 },
  { code: 5, label: 'cm', metres: 0.01 },
  { code: 6, label: 'm', metres: 1 },
  { code: 1, label: 'in', metres: 0.0254 },
  { code: 2, label: 'ft', metres: 0.3048 },
] as const;
export type DxfErrorCode = 'invalid' | 'units' | 'walls' | 'unsupported' | 'size';
export class DxfImportError extends Error {
  constructor(public readonly code: DxfErrorCode) {
    super(code);
  }
}
type Pair = [number, string];
function fail(code: DxfErrorCode): never {
  throw new DxfImportError(code);
}
const number = (value: string | undefined): number => {
  if (value === undefined || value === '') return fail('invalid');
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fail('invalid');
};
const first = (record: Pair[], code: number) => record.find(([key]) => key === code)?.[1];
const numbers = (record: Pair[], code: number) =>
  record.filter(([key]) => key === code).map(([, value]) => number(value));
const point = (record: Pair[], code: number): [number, number] => [
  number(first(record, code)),
  number(first(record, code + 10)),
];

function vertices(record: Pair[]): Array<[number, number]> {
  const xs = numbers(record, 10);
  const ys = numbers(record, 20);
  if (xs.length !== ys.length || xs.length < 2 || xs.length > 2048) fail('invalid');
  return xs.map((x, i) => [x, ys[i]]);
}

/** Sample B-splines in homogeneous coordinates, including rational furniture arcs. */
function spline(record: Pair[]): Array<[number, number]> {
  const controls = vertices(record);
  const degree = number(first(record, 71));
  const knots = numbers(record, 40);
  const weights = numbers(record, 41);
  if (
    !Number.isInteger(degree) ||
    degree < 1 ||
    degree > 5 ||
    controls.length <= degree ||
    knots.length !== controls.length + degree + 1 ||
    knots.some((k, i) => i > 0 && k < knots[i - 1]) ||
    (weights.length !== 0 && weights.length !== controls.length) ||
    weights.some((w) => w <= 0 || w > 1e6)
  )
    fail('unsupported');
  const start = knots[degree];
  const end = knots[controls.length];
  if (!(end > start)) fail('invalid');
  // De Boor evaluates the curve, not the control polygon (rounded furniture corners).
  const samples = Math.min(256, Math.max(16, controls.length * 8));
  return Array.from({ length: samples + 1 }, (_, sample) => {
    const u = start + ((end - start) * sample) / samples;
    let span = controls.length - 1;
    if (sample < samples) {
      span = degree;
      while (span < controls.length - 1 && u >= knots[span + 1]) span++;
    }
    const work = controls.slice(span - degree, span + 1).map(([x, y], i) => {
      const weight = weights[span - degree + i] ?? 1;
      return [x * weight, y * weight, weight];
    });
    for (let level = 1; level <= degree; level++) {
      for (let j = degree; j >= level; j--) {
        const index = span - degree + j;
        const denominator = knots[index + degree - level + 1] - knots[index];
        const alpha = denominator === 0 ? 0 : (u - knots[index]) / denominator;
        work[j] = work[j].map((v, axis) => (1 - alpha) * work[j - 1][axis] + alpha * v);
      }
    }
    const [x, y, weight] = work[degree];
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(weight) || weight <= 0)
      fail('invalid');
    return [x / weight, y / weight];
  });
}

export function importDxf(text: string, unitOverride?: number): DxfPlan {
  if (text.length > 5 * 1024 * 1024) fail('size');
  const lines = text
    .replace(/^\uFEFF/, '')
    .trimEnd()
    .split(/\r?\n/);
  if (lines.length % 2 !== 0 || lines.length > 500_000) fail('invalid');
  const pairs: Pair[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    const code = Number(lines[i].trim());
    if (!lines[i].trim() || !Number.isInteger(code) || code < 0 || code > 1071) fail('invalid');
    pairs.push([code, lines[i + 1].trim()]);
  }
  if (!pairs.some(([code, value]) => code === 0 && value === 'EOF')) fail('invalid');
  let section = '';
  let unit = 0;
  const records: Pair[][] = [];
  for (let i = 0; i < pairs.length;) {
    const [code, value] = pairs[i];
    if (code === 0 && value === 'SECTION') {
      if (pairs[i + 1]?.[0] !== 2) fail('invalid');
      section = pairs[i + 1][1];
      i += 2;
      continue;
    }
    if (code === 0 && value === 'ENDSEC') {
      section = '';
      i++;
      continue;
    }
    if (section === 'HEADER' && code === 9 && value === '$INSUNITS') {
      unit = number(pairs[i + 1]?.[1]);
    }
    if (section === 'ENTITIES' && code === 0) {
      const record: Pair[] = [pairs[i++]];
      while (i < pairs.length && pairs[i][0] !== 0) record.push(pairs[i++]);
      records.push(record);
      if (records.length > 20_000) fail('size');
    } else i++;
  }
  unit = unitOverride ?? unit;
  const factor = DXF_UNITS.find((candidate) => candidate.code === unit)?.metres;
  if (factor === undefined) fail('units');
  const counts: DxfPlan['counts'] = { WALLS: 0, WINDOWS: 0, DOORS: 0, FURNITURE: 0 };
  const paths: DxfPath[] = [];
  let pointCount = 0;
  for (const record of records) {
    const type = record[0][1];
    const name = first(record, 8)?.toUpperCase() ?? '0';
    // Text is annotation, and never becomes an object or room boundary.
    if (type === 'TEXT' || type === 'MTEXT') continue;
    // An inserted block can contain walls on inherited layers: do not silently omit it.
    if (type === 'INSERT') fail('unsupported');
    if (!(name in counts)) {
      if (name === 'DIMENSIONS') continue;
      fail('unsupported');
    }
    const layer = name as DxfLayer;
    if (
      [30, 31].some((key) => numbers(record, key).some((z) => Math.abs(z) > 1e-6)) ||
      (first(record, 38) !== undefined && number(first(record, 38)) !== 0) ||
      [210, 220].some(
        (key) => first(record, key) !== undefined && number(first(record, key)) !== 0,
      ) ||
      (first(record, 230) !== undefined && number(first(record, 230)) !== 1)
    )
      fail('unsupported');
    let points: Array<[number, number]>;
    let closed = false;
    if (type === 'LINE') points = [point(record, 10), point(record, 11)];
    else if (type === 'LWPOLYLINE') {
      if (numbers(record, 42).some((bulge) => bulge !== 0)) fail('unsupported');
      points = vertices(record);
      closed = (number(first(record, 70) ?? '0') & 1) !== 0;
    } else if (type === 'SPLINE') points = spline(record);
    else fail('unsupported');
    const a = points[0];
    const b = points[points.length - 1];
    closed ||= Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;
    pointCount += points.length;
    if (pointCount > 100_000) fail('size');
    paths.push({ layer, points, closed });
    counts[layer]++;
  }
  const walls = paths.filter((path) => path.layer === 'WALLS');
  if (walls.length === 0) fail('walls');
  // Geometry only: title, labels and dimensions never enlarge the map canvas.
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const path of paths)
    for (const [x, y] of path.points) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  const widthMeters = Math.ceil((maxX - minX) * factor * 1e6) / 1e6;
  const heightMeters = Math.ceil((maxY - minY) * factor * 1e6) / 1e6;
  if (widthMeters < 0.5 || heightMeters < 0.5 || widthMeters > 1000 || heightMeters > 1000)
    fail('size');
  return {
    widthMeters,
    heightMeters,
    unit,
    counts,
    paths: paths.map((path) => ({
      ...path,
      points: path.points.map(([x, y]) => [(x - minX) * factor, (maxY - y) * factor]),
    })),
  };
}

export function dxfSvg(plan: DxfPlan, furniture = true): string {
  const scale = Math.min(160, 2400 / Math.max(plan.widthMeters, plan.heightMeters));
  const paths = plan.paths
    .filter((path) => furniture || path.layer !== 'FURNITURE')
    .map((path) => {
      const points = path.points.map(([x, y]) => `${x.toFixed(6)},${y.toFixed(6)}`).join(' ');
      const colour =
        path.layer === 'WALLS' ? '#333333' : path.layer === 'FURNITURE' ? '#a77c42' : '#70695f';
      const fill = path.closed ? (path.layer === 'WALLS' ? colour : '#eadcc7') : 'none';
      return `<${path.closed ? 'polygon' : 'polyline'} points="${points}" fill="${fill}" stroke="${colour}" stroke-width="0.012" stroke-linejoin="round"/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${plan.widthMeters * scale}" height="${plan.heightMeters * scale}" viewBox="0 0 ${plan.widthMeters} ${plan.heightMeters}"><rect width="100%" height="100%" fill="#ffffff"/>${paths}</svg>`;
}
