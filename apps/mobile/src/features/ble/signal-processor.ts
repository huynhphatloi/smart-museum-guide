import { BeaconProtocol, BeaconSignal, BeaconStat } from './types';

export interface SignalProcessorConfig {
  /** How much history is kept per beacon, in milliseconds. */
  scanWindowMs: number;
  /** Hard cap on samples per beacon so memory stays bounded. */
  maxSamplesPerBeacon: number;
  /**
   * A sample further than this many dB from the window median is treated as a
   * momentary spike (someone walking between phone and beacon, a reflection)
   * and excluded from the smoothed value.
   */
  outlierThresholdDb: number;
  /** Smoothing strategy. No machine learning involved on purpose. */
  smoothing: 'median' | 'mean' | 'weighted';
  /** A beacon not heard for this long is dropped from the ranking entirely. */
  staleAfterMs: number;
}

export const DEFAULT_SIGNAL_CONFIG: SignalProcessorConfig = {
  scanWindowMs: 4000,
  maxSamplesPerBeacon: 25,
  outlierThresholdDb: 12,
  smoothing: 'weighted',
  staleAfterMs: 8000,
};

// --- pure helpers ----------------------------------------------------------

export function median(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/**
 * Weighted moving average where the newest sample counts most.
 * Weights are 1, 2, 3, ... from oldest to newest.
 */
export function weightedMovingAverage(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  let weightedSum = 0;
  let weightTotal = 0;
  values.forEach((value, index) => {
    const weight = index + 1;
    weightedSum += value * weight;
    weightTotal += weight;
  });
  return weightedSum / weightTotal;
}

/**
 * Drops samples that sit further than `thresholdDb` from the median.
 * With fewer than 3 samples there is nothing meaningful to compare against,
 * so everything is kept.
 */
export function removeOutliers(
  values: readonly number[],
  thresholdDb: number,
): { kept: number[]; removed: number } {
  if (values.length < 3) return { kept: [...values], removed: 0 };

  const centre = median(values);
  const kept = values.filter((value) => Math.abs(value - centre) <= thresholdDb);

  // Never return an empty set - if every sample looks like an outlier the
  // threshold is simply mis-calibrated for this environment.
  if (kept.length === 0) return { kept: [...values], removed: 0 };

  return { kept, removed: values.length - kept.length };
}

export function smooth(
  values: readonly number[],
  strategy: SignalProcessorConfig['smoothing'],
): number {
  switch (strategy) {
    case 'median':
      return median(values);
    case 'mean':
      return mean(values);
    case 'weighted':
    default:
      return weightedMovingAverage(values);
  }
}

// --- processor -------------------------------------------------------------

interface Sample {
  rssi: number;
  timestamp: number;
  protocol: BeaconProtocol;
}

/**
 * Keeps a sliding window of raw RSSI values per beacon and turns them into a
 * stable, comparable number. Pure in behaviour: every method takes `now`
 * explicitly, so tests can drive a virtual clock.
 */
export class SignalProcessor {
  private readonly windows = new Map<string, Sample[]>();

  constructor(private readonly config: SignalProcessorConfig = DEFAULT_SIGNAL_CONFIG) {}

  ingest(signal: BeaconSignal): void {
    const samples = this.windows.get(signal.identifier) ?? [];
    samples.push({ rssi: signal.rssi, timestamp: signal.timestamp, protocol: signal.protocol });
    this.windows.set(signal.identifier, samples);
  }

  /** Forgets everything - used when scanning stops. */
  reset(): void {
    this.windows.clear();
  }

  /** Beacons currently known, whether or not they are still fresh. */
  get trackedIdentifiers(): string[] {
    return [...this.windows.keys()];
  }

  /**
   * Aggregates the current window into one {@link BeaconStat} per beacon,
   * strongest first. Stale beacons are dropped.
   */
  snapshot(now: number): BeaconStat[] {
    const stats: BeaconStat[] = [];

    for (const [identifier, samples] of this.windows) {
      const fresh = samples
        .filter((sample) => now - sample.timestamp <= this.config.scanWindowMs)
        .slice(-this.config.maxSamplesPerBeacon);

      if (fresh.length !== samples.length) this.windows.set(identifier, fresh);
      if (fresh.length === 0) {
        const lastSeen = samples[samples.length - 1]?.timestamp ?? 0;
        if (now - lastSeen > this.config.staleAfterMs) this.windows.delete(identifier);
        continue;
      }

      const values = fresh.map((sample) => sample.rssi);
      const { kept, removed } = removeOutliers(values, this.config.outlierThresholdDb);

      stats.push({
        identifier,
        smoothedRssi: smooth(kept, this.config.smoothing),
        lastRssi: values[values.length - 1],
        sampleCount: fresh.length,
        outliersRemoved: removed,
        lastSeen: fresh[fresh.length - 1].timestamp,
        protocol: fresh[fresh.length - 1].protocol,
      });
    }

    return stats.sort((a, b) => b.smoothedRssi - a.smoothedRssi);
  }
}
