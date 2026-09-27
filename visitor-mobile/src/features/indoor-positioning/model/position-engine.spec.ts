import { BeaconSignal } from '../../beacon-detection/model/types';
import { DEMO_BEACONS, modelRadioMap, seededRandom } from './demo-room.fixture';
import { PositionEngine } from './position-engine';
import { simulatedRssi } from './simulated-rssi';

function feed(
  engine: PositionEngine,
  at: { x: number; y: number },
  fromMs: number,
  toMs: number,
  options: { jitterDb?: number; beacons?: typeof DEMO_BEACONS; random?: () => number } = {},
): void {
  const random = options.random ?? seededRandom(7);
  const jitter = options.jitterDb ?? 0;
  for (let t = fromMs; t <= toMs; t += 200) {
    for (const beacon of options.beacons ?? DEMO_BEACONS) {
      const signal: BeaconSignal = {
        identifier: beacon.identifier,
        protocol: 'eddystone_uid',
        beaconId: beacon.identifier,
        rssi: simulatedRssi(at, beacon) + (random() * 2 - 1) * jitter,
        timestamp: t,
      };
      engine.ingest(signal);
    }
  }
}

describe('PositionEngine', () => {
  it('says there is no radio map rather than guessing', () => {
    const engine = new PositionEngine(null);
    feed(engine, { x: 2, y: 2 }, 0, 3000);
    expect(engine.tick(3000)).toMatchObject({ status: 'no-radio-map', estimate: null });
  });

  it('withholds the estimate when too few beacons are heard', () => {
    const engine = new PositionEngine(modelRadioMap());
    feed(engine, { x: 2, y: 2 }, 0, 3000, { beacons: DEMO_BEACONS.slice(0, 1) });
    expect(engine.tick(3000)).toMatchObject({ status: 'weak-signal', estimate: null });
  });

  it('lands on a reference point it was calibrated at', () => {
    const engine = new PositionEngine(modelRadioMap());
    feed(engine, { x: 2.5, y: 1.5 }, 0, 3000);
    const { status, estimate } = engine.tick(3000);

    expect(status).toBe('ok');
    expect(estimate?.x).toBeCloseTo(2.5, 1);
    expect(estimate?.y).toBeCloseTo(1.5, 1);
    expect(estimate?.beaconsHeard).toBe(3);
    expect(estimate?.neighbours[0].label).toBe('B3');
  });

  it('interpolates between reference points with noisy readings', () => {
    const engine = new PositionEngine(modelRadioMap());
    const truth = { x: 2, y: 3 };
    feed(engine, truth, 0, 6000, { jitterDb: 2 });

    let estimate = null;
    for (let now = 3000; now <= 6000; now += 500) estimate = engine.tick(now).estimate;

    expect(estimate).not.toBeNull();
    expect(Math.hypot((estimate?.x ?? 0) - truth.x, (estimate?.y ?? 0) - truth.y)).toBeLessThan(
      0.6,
    );
  });

  it('glides the marker towards a new position instead of jumping', () => {
    const engine = new PositionEngine(modelRadioMap());
    feed(engine, { x: 0.5, y: 0.5 }, 0, 3000);
    const first = engine.tick(3000).estimate;

    feed(engine, { x: 4.5, y: 4.5 }, 3200, 7000);
    const next = engine.tick(7000).estimate;

    expect(first?.x).toBeCloseTo(0.5, 1);
    // The raw estimate is already in the far corner; the marker is on its way.
    expect(next?.rawX).toBeGreaterThan(4);
    expect(next?.x).toBeGreaterThan(first?.x ?? 0);
    expect(next?.x).toBeLessThan(next?.rawX ?? 0);
  });

  it('starts over after a reset', () => {
    const engine = new PositionEngine(modelRadioMap());
    feed(engine, { x: 2, y: 2 }, 0, 3000);
    engine.tick(3000);
    engine.reset();
    expect(engine.tick(3500).status).toBe('weak-signal');
  });
});
