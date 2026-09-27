import { BeaconSignal } from '../../beacon-detection/model/types';
import { CalibrationRecorder } from './calibration-recorder';

const signal = (identifier: string, rssi: number, timestamp: number): BeaconSignal => ({
  identifier,
  protocol: 'eddystone_uid',
  beaconId: identifier,
  rssi,
  timestamp,
});

describe('CalibrationRecorder', () => {
  it('keeps this room’s beacons with times relative to the start', () => {
    const recorder = new CalibrationRecorder(1000, new Set(['B1', 'B2']));
    recorder.record(signal('B1', -61.26, 1200));
    recorder.record(signal('OTHER_ROOM', -50, 1300));
    recorder.record(signal('B2', -80, 999)); // before the start - dropped
    recorder.record(signal('B2', -79, 1500));

    expect(recorder.finish(11_000)).toEqual({
      startedAt: 1000,
      durationMs: 10_000,
      samples: [
        { b: 'B1', r: -61.3, t: 200 },
        { b: 'B2', r: -79, t: 500 },
      ],
    });
  });

  it('counts the beacons heard recently', () => {
    const recorder = new CalibrationRecorder(0, new Set(['B1', 'B2', 'B3']));
    recorder.record(signal('B1', -60, 100));
    recorder.record(signal('B2', -70, 2500));
    recorder.record(signal('B3', -80, 2900));
    expect(recorder.heardRecently(3000)).toBe(2);
    expect(recorder.heardRecently(3000, 5000)).toBe(3);
  });
});
