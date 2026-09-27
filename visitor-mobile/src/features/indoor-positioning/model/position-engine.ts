import {
  DEFAULT_SIGNAL_CONFIG,
  SignalProcessor,
  SignalProcessorConfig,
} from '../../beacon-detection/model/signal-processor';
import { BeaconSignal, BeaconStat } from '../../beacon-detection/model/types';
import { beaconsHeard, vectorFromStats } from './fingerprint-vector';
import { DEFAULT_SMOOTHER, PositionSmoother, SmootherConfig } from './smoother';
import { PositionEstimate, RadioMap, Weighting } from './types';
import { estimatePosition } from './wknn';

export interface PositionEngineConfig {
  /**
   * The positioning layer's own windowing. Kept apart from zone detection so
   * either can be tuned without disturbing the other; calibration replays
   * captures with this exact config.
   */
  processor: SignalProcessorConfig;
  k: number;
  weighting: Weighting;
  /** Fewer beacons than this and the estimate is withheld, not guessed. */
  minBeacons: number;
  smoother: SmootherConfig;
}

/** A 3 s window follows a walking visitor faster than zone detection's 4 s. */
export const DEFAULT_POSITIONING_PROCESSOR: SignalProcessorConfig = {
  ...DEFAULT_SIGNAL_CONFIG,
  scanWindowMs: 3000,
  staleAfterMs: 6000,
};

export const DEFAULT_POSITION_ENGINE: PositionEngineConfig = {
  processor: DEFAULT_POSITIONING_PROCESSOR,
  k: 3,
  weighting: 'inverse',
  minBeacons: 2,
  smoother: DEFAULT_SMOOTHER,
};

export type PositionStatus = 'no-radio-map' | 'weak-signal' | 'ok';

export interface PositionTick {
  status: PositionStatus;
  estimate: PositionEstimate | null;
  /** Current per-beacon levels, for the "explain the algorithm" overlay. */
  stats: BeaconStat[];
}

/**
 * Live fingerprint positioning. Fed raw signals by the scanner, ticked on the
 * scanner's clock, and - like the zone detector - driven entirely by explicit
 * `now` values so it runs the same under test as on a phone.
 */
export class PositionEngine {
  private readonly processor: SignalProcessor;
  private readonly smoother: PositionSmoother;
  private radioMap: RadioMap | null;

  constructor(
    radioMap: RadioMap | null,
    private readonly config: PositionEngineConfig = DEFAULT_POSITION_ENGINE,
  ) {
    this.radioMap = radioMap;
    this.processor = new SignalProcessor(config.processor);
    this.smoother = new PositionSmoother(config.smoother);
  }

  setRadioMap(radioMap: RadioMap | null): void {
    this.radioMap = radioMap;
    this.smoother.reset();
  }

  getRadioMap(): RadioMap | null {
    return this.radioMap;
  }

  ingest(signal: BeaconSignal): void {
    this.processor.ingest(signal);
  }

  reset(): void {
    this.processor.reset();
    this.smoother.reset();
  }

  tick(now: number): PositionTick {
    const stats = this.processor.snapshot(now);
    const map = this.radioMap;
    if (!map) return { status: 'no-radio-map', estimate: null, stats };

    const heard = beaconsHeard(stats, map.beaconOrder);
    const needed = Math.min(this.config.minBeacons, map.beaconOrder.length);
    if (heard < needed) return { status: 'weak-signal', estimate: null, stats };

    const vector = vectorFromStats(stats, map.beaconOrder, map.fillDbm);
    const result = estimatePosition(vector, map.entries, {
      k: this.config.k,
      weighting: this.config.weighting,
    });
    if (!result) return { status: 'no-radio-map', estimate: null, stats };

    const smoothed = this.smoother.update(result.x, result.y, now);
    return {
      status: 'ok',
      stats,
      estimate: {
        x: smoothed.x,
        y: smoothed.y,
        rawX: result.x,
        rawY: result.y,
        spreadM: result.spreadM,
        neighbours: result.neighbours,
        vector,
        beaconsHeard: heard,
        at: now,
      },
    };
  }
}
