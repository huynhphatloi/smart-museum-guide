import { DEMO_PLAN } from './demo-room.fixture';
import { buildRadioMap, selectCaptures } from './radio-map';
import { CaptureFingerprint } from './types';

const capture = (
  pointId: string,
  deviceModel: string,
  platform: string,
  fingerprint: Record<string, number>,
): CaptureFingerprint => ({ pointId, deviceModel, platform, orientationDeg: null, fingerprint });

const [A1, A2] = DEMO_PLAN.referencePoints;

const captures = [
  capture(A1.id, 'iPhone 13', 'ios', { BEACON_A01: -60, BEACON_A02: -80, BEACON_B01: -82 }),
  capture(A1.id, 'iPhone 13', 'ios', { BEACON_A01: -62, BEACON_A02: -78 }),
  capture(A2.id, 'iPhone 15', 'ios', { BEACON_A01: -66, BEACON_A02: -76, BEACON_B01: -84 }),
  capture(A1.id, 'Pixel 7', 'android', { BEACON_A01: -70, BEACON_A02: -88, BEACON_B01: -90 }),
  capture(A1.id, 'simulator', 'simulator', { BEACON_A01: -55, BEACON_A02: -75, BEACON_B01: -75 }),
];

describe('selectCaptures', () => {
  it('prefers the exact model, then the platform, then any real phone', () => {
    expect(selectCaptures(captures, { model: 'iPhone 13', platform: 'ios' })).toMatchObject({
      source: 'model',
      captures: [captures[0], captures[1]],
    });
    expect(selectCaptures(captures, { model: 'iPhone 12', platform: 'ios' })).toMatchObject({
      source: 'platform',
      captures: [captures[0], captures[1], captures[2]],
    });
    expect(
      selectCaptures(captures.slice(0, 3), { model: 'Pixel 7', platform: 'android' }).source,
    ).toBe('any');
  });

  it('keeps synthetic data and real phones apart', () => {
    expect(selectCaptures(captures, { model: 'x', platform: 'simulator' }).captures).toEqual([
      captures[4],
    ]);
    expect(
      selectCaptures([captures[4]], { model: 'Pixel 7', platform: 'android' }).captures,
    ).toEqual([]);
  });
});

describe('buildRadioMap', () => {
  it('averages every capture at a point, filling beacons a capture missed', () => {
    const map = buildRadioMap(DEMO_PLAN, captures, { model: 'iPhone 13', platform: 'ios' });

    expect(map?.beaconOrder).toEqual(['BEACON_A01', 'BEACON_A02', 'BEACON_B01']);
    expect(map?.entries).toHaveLength(1);
    expect(map?.entries[0]).toMatchObject({ label: 'A1', x: 0.5, y: 0.5, captureCount: 2 });
    // BEACON_B01 missing in the second capture counts as -100.
    expect(map?.entries[0].vector).toEqual([-61, -79, -91]);
  });

  it('ignores captures for points that are not reference points of this plan', () => {
    const stray = capture('somewhere-else', 'iPhone 13', 'ios', { BEACON_A01: -50 });
    const map = buildRadioMap(DEMO_PLAN, [stray], { model: 'iPhone 13', platform: 'ios' });
    expect(map).toBeNull();
  });

  it('returns null for a room without beacons', () => {
    expect(
      buildRadioMap({ ...DEMO_PLAN, beacons: [] }, captures, {
        model: 'iPhone 13',
        platform: 'ios',
      }),
    ).toBeNull();
  });
});
