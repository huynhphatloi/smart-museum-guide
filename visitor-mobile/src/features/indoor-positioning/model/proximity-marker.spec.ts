import { BeaconStat } from '../../beacon-detection/model/types';
import { DEMO_PLAN } from './demo-room.fixture';
import { proximityMarker } from './proximity-marker';
import { FloorPlan } from './types';

const plan: FloorPlan = {
  ...DEMO_PLAN,
  referencePoints: [],
  zones: DEMO_PLAN.zones.map((zone) => ({ ...zone, mapShape: null })),
};
const stat = (identifier: string, smoothedRssi: number): BeaconStat => ({
  identifier,
  smoothedRssi,
  lastRssi: smoothedRssi,
  sampleCount: 2,
  outliersRemoved: 0,
  lastSeen: 1000,
  protocol: 'eddystone_uid',
});

describe('uncalibrated proximity marker', () => {
  it('uses the saved beacon landmark with no fingerprints or zone shape', () => {
    expect(proximityMarker(plan, 'ZONE_A01', [])).toEqual({ x: 0.3, y: 0.3 });
  });
  it('does not show an unconfirmed zone', () => {
    expect(proximityMarker(plan, null, [stat('BEACON_A01', -50)])).toBeNull();
  });
  it('moves to the landmark of the newly confirmed zone', () => {
    expect(proximityMarker(plan, 'ZONE_A02', [stat('BEACON_A01', -40)])).toEqual({
      x: 4.7,
      y: 0.3,
    });
  });
  it('uses the strongest observed device when a zone has multiple beacons', () => {
    const shared = {
      ...plan,
      beacons: plan.beacons.map((beacon) => ({ ...beacon, zoneCode: 'ZONE_A01' })),
    };
    expect(
      proximityMarker(shared, 'ZONE_A01', [stat('BEACON_A01', -70), stat('BEACON_B01', -52)]),
    ).toEqual({ x: 0.3, y: 4.7 });
  });
  it('falls back to the zone centre when its device is not placed', () => {
    const unplaced = { ...DEMO_PLAN, beacons: [] };
    expect(proximityMarker(unplaced, 'ZONE_A01', [])).toEqual({ x: 0.9, y: 0.9 });
  });
  it('does not invent a point when neither a landmark nor zone shape exists', () => {
    expect(proximityMarker({ ...plan, beacons: [] }, 'ZONE_A01', [])).toBeNull();
  });
  it('rejects incomplete or out-of-bounds landmarks', () => {
    const invalid = { ...plan, beacons: plan.beacons.map((beacon) => ({ ...beacon, mapX: 99 })) };
    expect(proximityMarker(invalid, 'ZONE_A01', [])).toBeNull();
  });
});
