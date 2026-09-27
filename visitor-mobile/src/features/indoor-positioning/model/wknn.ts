import { Neighbour, RadioMap, RadioMapEntry, Weighting } from './types';

export interface WknnOptions {
  /** How many nearest reference points to average. */
  k: number;
  /**
   * inverse: w = 1 / (d + epsilon) - closer fingerprints count more (WKNN).
   * uniform: plain KNN, every neighbour counts the same.
   */
  weighting: Weighting;
  /** Keeps an exact match (d = 0) from dividing by zero. */
  epsilon?: number;
}

export const DEFAULT_WKNN: WknnOptions = { k: 3, weighting: 'inverse', epsilon: 1e-3 };

export interface WknnResult {
  x: number;
  y: number;
  spreadM: number;
  neighbours: Neighbour[];
}

/** Euclidean distance between two RSSI vectors, in dB. */
export function euclidean(a: readonly number[], b: readonly number[]): number {
  let sum = 0;
  for (let index = 0; index < a.length; index += 1) {
    const difference = a[index] - b[index];
    sum += difference * difference;
  }
  return Math.sqrt(sum);
}

/**
 * Weighted k-nearest-neighbours position estimate.
 *
 *   d_i = || live - fingerprint_i ||          distance in signal space
 *   keep the k smallest d_i
 *   w_i = 1 / (d_i + epsilon)                 (or 1 for plain KNN)
 *   x = sum(w_i x_i) / sum(w_i),  y likewise
 *
 * Returns null when the radio map is empty.
 */
export function estimatePosition(
  vector: readonly number[],
  entries: readonly RadioMapEntry[],
  options: WknnOptions = DEFAULT_WKNN,
): WknnResult | null {
  if (entries.length === 0) return null;

  const k = Math.max(1, Math.min(Math.round(options.k), entries.length));
  const epsilon = options.epsilon ?? DEFAULT_WKNN.epsilon ?? 1e-3;

  const nearest = entries
    .map((entry) => ({ entry, distance: euclidean(vector, entry.vector) }))
    .sort((a, b) => a.distance - b.distance || a.entry.label.localeCompare(b.entry.label))
    .slice(0, k);

  const raw = nearest.map(({ distance }) =>
    options.weighting === 'uniform' ? 1 : 1 / (distance + epsilon),
  );
  const total = raw.reduce((sum, weight) => sum + weight, 0);

  const neighbours: Neighbour[] = nearest.map(({ entry, distance }, index) => ({
    pointId: entry.pointId,
    label: entry.label,
    x: entry.x,
    y: entry.y,
    distance,
    weight: raw[index] / total,
  }));

  const x = neighbours.reduce((sum, n) => sum + n.weight * n.x, 0);
  const y = neighbours.reduce((sum, n) => sum + n.weight * n.y, 0);
  const spreadM = neighbours.reduce((sum, n) => sum + n.weight * Math.hypot(n.x - x, n.y - y), 0);

  return { x, y, spreadM, neighbours };
}

/** Convenience wrapper taking the whole radio map. */
export function estimateOnMap(
  vector: readonly number[],
  radioMap: RadioMap,
  options: WknnOptions = DEFAULT_WKNN,
): WknnResult | null {
  return estimatePosition(vector, radioMap.entries, options);
}
