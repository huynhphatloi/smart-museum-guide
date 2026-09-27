import { BeaconStat } from '../../beacon-detection/model/types';
import {
  beaconOrderFor,
  beaconsHeard,
  centreVector,
  meanVector,
  vectorFromFingerprint,
  vectorFromStats,
} from './fingerprint-vector';

const stat = (identifier: string, smoothedRssi: number): BeaconStat => ({
  identifier,
  smoothedRssi,
  lastRssi: smoothedRssi,
  sampleCount: 5,
  outliersRemoved: 0,
  lastSeen: 0,
  protocol: 'eddystone_uid',
});

describe('fingerprint vectors', () => {
  const order = ['B1', 'B2', 'B3'];

  it('orders beacons deterministically and without duplicates', () => {
    const plan = {
      beacons: [
        { identifier: 'B3', name: '', zoneCode: 'Z', mapX: null, mapY: null },
        { identifier: 'B1', name: '', zoneCode: 'Z', mapX: null, mapY: null },
        { identifier: 'B3', name: '', zoneCode: 'Z', mapX: null, mapY: null },
      ],
    };
    expect(beaconOrderFor(plan)).toEqual(['B1', 'B3']);
  });

  it('fills a beacon that was not heard instead of dropping it', () => {
    expect(vectorFromFingerprint({ B1: -61, B3: -84 }, order, -100)).toEqual([-61, -100, -84]);
  });

  it('never lets a reading fall below the fill value', () => {
    expect(vectorFromFingerprint({ B1: -104, B2: -70, B3: -80 }, order, -100)).toEqual([
      -100, -70, -80,
    ]);
  });

  it('builds the live vector from processor stats and ignores foreign beacons', () => {
    const stats = [stat('B2', -58), stat('OTHER', -40), stat('B1', -71.5)];
    expect(vectorFromStats(stats, order, -100)).toEqual([-71.5, -58, -100]);
    expect(beaconsHeard(stats, order)).toBe(2);
  });

  it('averages vectors element-wise', () => {
    expect(
      meanVector([
        [-60, -70],
        [-64, -80],
      ]),
    ).toEqual([-62, -75]);
    expect(meanVector([])).toEqual([]);
  });

  it('centring removes a constant device offset', () => {
    const iphone = centreVector([-60, -70, -80]);
    const android = centreVector([-66, -76, -86]);
    expect(iphone).toEqual(android);
  });
});
