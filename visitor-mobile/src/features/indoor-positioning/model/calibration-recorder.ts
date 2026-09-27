import { BeaconSignal } from '../../beacon-detection/model/types';
import { RawSample } from './types';

export interface RecordedCapture {
  startedAt: number;
  durationMs: number;
  samples: RawSample[];
}

/**
 * Collects raw readings while a staff member stands still on a survey point.
 * Raw, not smoothed: the fingerprint is derived by replaying these through the
 * positioning processor, and the evaluation can replay them again with other
 * settings later.
 */
export class CalibrationRecorder {
  private readonly samples: RawSample[] = [];
  private readonly lastHeard = new Map<string, number>();

  constructor(
    private readonly startedAt: number,
    private readonly roomBeacons: ReadonlySet<string>,
  ) {}

  /** Keeps readings of this room's beacons only. */
  record(signal: BeaconSignal): void {
    if (!this.roomBeacons.has(signal.identifier)) return;
    const t = signal.timestamp - this.startedAt;
    if (t < 0) return;
    this.samples.push({ b: signal.identifier, r: Math.round(signal.rssi * 10) / 10, t });
    this.lastHeard.set(signal.identifier, signal.timestamp);
  }

  /** Beacons heard within the last `windowMs` - the live "3 beacons heard" readout. */
  heardRecently(now: number, windowMs = 2000): number {
    let count = 0;
    for (const at of this.lastHeard.values()) if (now - at <= windowMs) count += 1;
    return count;
  }

  finish(now: number): RecordedCapture {
    return {
      startedAt: this.startedAt,
      durationMs: Math.max(0, now - this.startedAt),
      samples: [...this.samples],
    };
  }
}
