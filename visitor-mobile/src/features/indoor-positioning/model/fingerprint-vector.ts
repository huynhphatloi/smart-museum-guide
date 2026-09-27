import { BeaconStat } from '../../beacon-detection/model/types';
import { Fingerprint, FloorPlan } from './types';

/**
 * The fixed beacon order of a room. WKNN compares vectors element by element,
 * so every vector - calibration and live - must list the same beacons in the
 * same order.
 */
export function beaconOrderFor(plan: Pick<FloorPlan, 'beacons'>): string[] {
  return [...new Set(plan.beacons.map((beacon) => beacon.identifier))].sort();
}

/**
 * Turns a fingerprint into a vector. A beacon that was not heard gets
 * `fillDbm` instead of being left out - [-61, -72, -100] and [-61, -72] are
 * not comparable, a missing beacon is information too.
 */
export function vectorFromFingerprint(
  fingerprint: Fingerprint,
  order: readonly string[],
  fillDbm: number,
): number[] {
  return order.map((identifier) => {
    const value = fingerprint[identifier];
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(value, fillDbm) : fillDbm;
  });
}

/** Live vector from the signal processor's smoothed per-beacon values. */
export function vectorFromStats(
  stats: readonly BeaconStat[],
  order: readonly string[],
  fillDbm: number,
): number[] {
  const levels: Fingerprint = {};
  for (const stat of stats) levels[stat.identifier] = stat.smoothedRssi;
  return vectorFromFingerprint(levels, order, fillDbm);
}

/** How many of the room's beacons the phone can hear right now. */
export function beaconsHeard(stats: readonly BeaconStat[], order: readonly string[]): number {
  const wanted = new Set(order);
  return stats.filter((stat) => wanted.has(stat.identifier)).length;
}

/** Element-wise mean of equally long vectors. */
export function meanVector(vectors: ReadonlyArray<readonly number[]>): number[] {
  if (vectors.length === 0) return [];
  const length = vectors[0].length;
  const sums = new Array<number>(length).fill(0);
  for (const vector of vectors) {
    for (let index = 0; index < length; index += 1) sums[index] += vector[index];
  }
  return sums.map((sum) => sum / vectors.length);
}

/**
 * Subtracts the vector's own mean. Two phones hearing the same beacons often
 * differ by a near-constant offset; centring cancels it at the cost of one
 * dimension. Used by the cross-device experiment, not by default.
 */
export function centreVector(vector: readonly number[]): number[] {
  if (vector.length === 0) return [];
  const average = vector.reduce((total, value) => total + value, 0) / vector.length;
  return vector.map((value) => value - average);
}
