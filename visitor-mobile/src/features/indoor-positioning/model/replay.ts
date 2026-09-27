import {
  SignalProcessor,
  SignalProcessorConfig,
} from '../../beacon-detection/model/signal-processor';
import { Fingerprint, RawSample } from './types';

export interface ReplayOptions {
  /** Must be the same settings the live position engine uses. */
  processor: SignalProcessorConfig;
  /** Evaluation cadence, normally the scanner's tick interval. */
  tickMs: number;
  /** Stand-in for a beacon missing at a tick. */
  fillDbm: number;
  /**
   * Ticks before this are skipped: the window is still filling and the first
   * values would lean on one or two samples. Defaults to one window, capped at
   * half the capture so short captures still produce something.
   */
  warmupMs?: number;
}

export interface ReplayResult {
  fingerprint: Fingerprint;
  /** Ticks that contributed. */
  ticks: number;
  /** Share of ticks each beacon was present in, 0..1. */
  presence: Record<string, number>;
  /** Raw samples per beacon - a quick signal-quality check for staff. */
  samplesPerBeacon: Record<string, number>;
}

/**
 * Turns a calibration recording into a fingerprint by running it through the
 * very same {@link SignalProcessor} the live engine uses, on a virtual clock,
 * and averaging the vectors it would have seen.
 *
 * Why not simply average the raw samples? Because live positioning never sees
 * raw samples - it sees windowed, outlier-filtered, smoothed values. A radio
 * map built any other way is compared against a different kind of number.
 *
 * A beacon absent at some ticks counts as `fillDbm` for those ticks, again
 * because that is exactly what the live vector would contain then. A beacon
 * never heard is left out and will be filled when the vector is built.
 */
export function replayCapture(samples: readonly RawSample[], options: ReplayOptions): ReplayResult {
  const sorted = [...samples].sort((a, b) => a.t - b.t);
  const samplesPerBeacon: Record<string, number> = {};
  for (const sample of sorted) samplesPerBeacon[sample.b] = (samplesPerBeacon[sample.b] ?? 0) + 1;

  const empty: ReplayResult = { fingerprint: {}, ticks: 0, presence: {}, samplesPerBeacon };
  if (sorted.length === 0) return empty;

  const duration = sorted[sorted.length - 1].t;
  const warmup = Math.min(options.warmupMs ?? options.processor.scanWindowMs, duration / 2);
  const tickMs = Math.max(1, options.tickMs);

  const processor = new SignalProcessor(options.processor);
  const sums: Record<string, number> = {};
  const present: Record<string, number> = {};
  let ticks = 0;
  let cursor = 0;

  for (let now = 0; now <= duration; now += tickMs) {
    while (cursor < sorted.length && sorted[cursor].t <= now) {
      const sample = sorted[cursor];
      processor.ingest({
        identifier: sample.b,
        protocol: 'eddystone_uid',
        beaconId: sample.b,
        rssi: sample.r,
        timestamp: sample.t,
      });
      cursor += 1;
    }
    if (now < warmup) continue;

    const levels = new Map(
      processor.snapshot(now).map((stat) => [stat.identifier, stat.smoothedRssi]),
    );
    ticks += 1;
    for (const beacon of Object.keys(samplesPerBeacon)) {
      const level = levels.get(beacon);
      sums[beacon] = (sums[beacon] ?? 0) + (level ?? options.fillDbm);
      if (level !== undefined) present[beacon] = (present[beacon] ?? 0) + 1;
    }
  }

  if (ticks === 0) return empty;

  const fingerprint: Fingerprint = {};
  const presence: Record<string, number> = {};
  for (const beacon of Object.keys(samplesPerBeacon)) {
    presence[beacon] = (present[beacon] ?? 0) / ticks;
    if (present[beacon]) fingerprint[beacon] = Math.round((sums[beacon] / ticks) * 10) / 10;
  }

  return { fingerprint, ticks, presence, samplesPerBeacon };
}
