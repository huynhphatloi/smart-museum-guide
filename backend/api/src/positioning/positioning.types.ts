import { FingerprintValues, RawSample } from './capture-payload';
import { MapShape } from './map-shape';

/**
 * Everything the visitor app needs to draw a room and position a visitor in
 * it. Pure infrastructure: nothing here comes from or describes a visitor.
 */
export interface PublicFloorPlan {
  id: string;
  code: string;
  name: string;
  level: string | null;
  widthMeters: number;
  heightMeters: number;
  imageUrl: string | null;
  positioningK: number;
  fillDbm: number;
  zones: Array<{ code: string; name: string; mapShape: MapShape | null }>;
  beacons: Array<{
    identifier: string;
    name: string;
    zoneCode: string;
    mapX: number | null;
    mapY: number | null;
  }>;
  /** Only reference points: test points exist purely for evaluation. */
  referencePoints: Array<{ id: string; label: string; x: number; y: number }>;
}

/** One reference fingerprint as the phone uses it to build its radio map. */
export interface PublicFingerprint {
  pointId: string;
  deviceModel: string;
  platform: string;
  orientationDeg: number | null;
  fingerprint: FingerprintValues;
}

/** Full calibration dataset for the offline evaluation script. */
export interface PositioningDataset {
  exportedAt: string;
  floorPlan: PublicFloorPlan;
  /** Each beacon's zone reach (minRssi), so the zone detector can be replayed. */
  beaconReach: Record<string, number | null>;
  points: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    kind: 'REFERENCE' | 'TEST';
    captures: Array<{
      id: string;
      deviceModel: string;
      platform: string;
      orientationDeg: number | null;
      startedAt: string;
      durationMs: number;
      samples: RawSample[];
      fingerprint: FingerprintValues;
    }>;
  }>;
}
