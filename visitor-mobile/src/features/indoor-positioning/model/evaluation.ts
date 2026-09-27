import { RadioMap, RadioMapEntry, Weighting } from './types';
import { estimatePosition } from './wknn';

/**
 * Accuracy measurement for the report. Pure functions over radio maps and
 * labelled vectors, so the offline script and the unit tests share them.
 */

export interface Point {
  x: number;
  y: number;
}

export interface ErrorSummary {
  count: number;
  mean: number;
  median: number;
  p90: number;
  max: number;
}

export function positionError(estimate: Point, truth: Point): number {
  return Math.hypot(estimate.x - truth.x, estimate.y - truth.y);
}

/** Linear-interpolated percentile, p in 0..100. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (Math.min(100, Math.max(0, p)) / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

export function summarise(errors: readonly number[]): ErrorSummary {
  if (errors.length === 0) {
    return { count: 0, mean: Number.NaN, median: Number.NaN, p90: Number.NaN, max: Number.NaN };
  }
  return {
    count: errors.length,
    mean: errors.reduce((sum, value) => sum + value, 0) / errors.length,
    median: percentile(errors, 50),
    p90: percentile(errors, 90),
    max: Math.max(...errors),
  };
}

/** Empirical CDF: share of errors at or below each threshold. */
export function cdf(
  errors: readonly number[],
  stepM = 0.25,
  upToM?: number,
): Array<{ errorM: number; fraction: number }> {
  if (errors.length === 0) return [];
  const limit = upToM ?? Math.ceil(Math.max(...errors) / stepM) * stepM;
  const rows: Array<{ errorM: number; fraction: number }> = [];
  for (let threshold = 0; threshold <= limit + 1e-9; threshold += stepM) {
    const within = errors.filter((error) => error <= threshold + 1e-9).length;
    rows.push({ errorM: Math.round(threshold * 1000) / 1000, fraction: within / errors.length });
  }
  return rows;
}

export interface LabelledVector extends Point {
  label: string;
  vector: number[];
}

export type Estimator = (vector: readonly number[]) => Point | null;

export function wknnEstimator(
  entries: readonly RadioMapEntry[],
  k: number,
  weighting: Weighting,
): Estimator {
  return (vector) => estimatePosition(vector, entries, { k, weighting });
}

/** Errors of an estimator over labelled test vectors (null estimates skipped). */
export function evaluate(estimator: Estimator, tests: readonly LabelledVector[]): number[] {
  const errors: number[] = [];
  for (const test of tests) {
    const estimate = estimator(test.vector);
    if (estimate) errors.push(positionError(estimate, test));
  }
  return errors;
}

/**
 * Leave-one-out over the reference points: each point in turn is removed from
 * the radio map and positioned against the rest. This is how k is chosen
 * without ever looking at the held-out test points.
 */
export function leaveOneOut(radioMap: RadioMap, k: number, weighting: Weighting): number[] {
  return radioMap.entries.flatMap((held, index) => {
    const rest = radioMap.entries.filter((_, other) => other !== index);
    const estimate = estimatePosition(held.vector, rest, { k, weighting });
    return estimate ? [positionError(estimate, held)] : [];
  });
}

export interface KCandidate {
  k: number;
  weighting: Weighting;
  summary: ErrorSummary;
}

/** Tries every (k, weighting) pair; best is the lowest LOO mean, then the smaller k. */
export function chooseK(
  radioMap: RadioMap,
  ks: readonly number[] = [1, 3, 5, 7],
  weightings: readonly Weighting[] = ['uniform', 'inverse'],
): { candidates: KCandidate[]; best: KCandidate } {
  const candidates = ks.flatMap((k) =>
    weightings.map((weighting) => ({
      k,
      weighting,
      summary: summarise(leaveOneOut(radioMap, k, weighting)),
    })),
  );
  const best = [...candidates].sort(
    (a, b) =>
      a.summary.mean - b.summary.mean ||
      a.k - b.k ||
      (a.weighting === 'inverse' ? -1 : 1) - (b.weighting === 'inverse' ? -1 : 1),
  )[0];
  return { candidates, best };
}

// --- baselines -------------------------------------------------------------

export interface PlacedBeacon extends Point {
  identifier: string;
}

/** "You are at the loudest beacon" - what zone-level proximity amounts to. */
export function nearestBeaconEstimator(
  order: readonly string[],
  beacons: readonly PlacedBeacon[],
): Estimator {
  const byId = new Map(beacons.map((beacon) => [beacon.identifier, beacon]));
  return (vector) => {
    let best: PlacedBeacon | null = null;
    let bestRssi = -Infinity;
    for (let index = 0; index < order.length; index += 1) {
      const beacon = byId.get(order[index]);
      if (beacon && vector[index] > bestRssi) {
        best = beacon;
        bestRssi = vector[index];
      }
    }
    return best;
  };
}

/**
 * Weighted centroid of the beacon positions, weight 10^(rssi/20) - signal
 * amplitude, roughly 1/d in free space. Needs beacon positions but no radio
 * map: the obvious "why bother calibrating" comparison.
 */
export function weightedCentroidEstimator(
  order: readonly string[],
  beacons: readonly PlacedBeacon[],
  fillDbm: number,
): Estimator {
  const byId = new Map(beacons.map((beacon) => [beacon.identifier, beacon]));
  return (vector) => {
    let total = 0;
    let x = 0;
    let y = 0;
    order.forEach((identifier, index) => {
      const beacon = byId.get(identifier);
      if (!beacon || vector[index] <= fillDbm) return;
      const weight = 10 ** (vector[index] / 20);
      total += weight;
      x += weight * beacon.x;
      y += weight * beacon.y;
    });
    return total > 0 ? { x: x / total, y: y / total } : null;
  };
}
