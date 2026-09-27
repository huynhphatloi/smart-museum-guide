/**
 * Test fixture: the seeded 5 x 5 m demo room with three corner beacons and a
 * noise-free radio map generated from the simulator's path loss model.
 * Imported by specs only.
 */
import { beaconOrderFor } from './fingerprint-vector';
import { simulatedRssi } from './simulated-rssi';
import { FloorPlan, RadioMap } from './types';

export const DEMO_BEACONS = [
  { identifier: 'BEACON_A01', x: 0.3, y: 0.3 },
  { identifier: 'BEACON_A02', x: 4.7, y: 0.3 },
  { identifier: 'BEACON_B01', x: 0.3, y: 4.7 },
];

const gridAxis = [0.5, 1.5, 2.5, 3.5, 4.5];

export const DEMO_PLAN: FloorPlan = {
  id: 'plan-demo',
  code: 'DEMO_ROOM',
  name: 'Demo room',
  level: '1',
  widthMeters: 5,
  heightMeters: 5,
  imageUrl: null,
  positioningK: 3,
  fillDbm: -100,
  zones: [
    { code: 'ZONE_A01', name: 'A01', mapShape: { type: 'circle', x: 0.9, y: 0.9, r: 1 } },
    { code: 'ZONE_A02', name: 'A02', mapShape: { type: 'circle', x: 4.1, y: 0.9, r: 1 } },
    { code: 'ZONE_B01', name: 'B01', mapShape: { type: 'circle', x: 0.9, y: 4.1, r: 1 } },
  ],
  beacons: DEMO_BEACONS.map((beacon, index) => ({
    identifier: beacon.identifier,
    name: beacon.identifier,
    zoneCode: ['ZONE_A01', 'ZONE_A02', 'ZONE_B01'][index],
    mapX: beacon.x,
    mapY: beacon.y,
  })),
  referencePoints: gridAxis.flatMap((y, row) =>
    gridAxis.map((x, column) => ({
      id: `p-${row}-${column}`,
      label: `${String.fromCharCode(65 + row)}${column + 1}`,
      x,
      y,
    })),
  ),
};

/** Model RSSI of every demo beacon at (x, y), as a fingerprint. */
export function modelFingerprint(x: number, y: number): Record<string, number> {
  return Object.fromEntries(
    DEMO_BEACONS.map((beacon) => [beacon.identifier, simulatedRssi({ x, y }, beacon)]),
  );
}

export function modelRadioMap(): RadioMap {
  const beaconOrder = beaconOrderFor(DEMO_PLAN);
  return {
    beaconOrder,
    fillDbm: DEMO_PLAN.fillDbm,
    source: 'platform',
    entries: DEMO_PLAN.referencePoints.map((point) => {
      const fingerprint = modelFingerprint(point.x, point.y);
      return {
        pointId: point.id,
        label: point.label,
        x: point.x,
        y: point.y,
        vector: beaconOrder.map((identifier) => fingerprint[identifier]),
        captureCount: 1,
      };
    }),
  };
}

/** Small deterministic PRNG so noisy specs never flake. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
