/**
 * Types for indoor positioning by BLE fingerprinting.
 *
 *   calibration (staff)                      live (visitor)
 *   stand on a reference point               RSSI of every beacon, right now
 *        |                                         |
 *        v                                         v
 *   fingerprint {beacon: dBm}  --> radio map --> weighted k nearest neighbours
 *                                                  |
 *                                                  v
 *                                               (x, y) on the floor plan
 *
 * Coordinates are metres from the floor plan's top-left corner, x to the
 * right, y downwards - the same convention the backend stores.
 */

export type MapShape =
  | { type: 'circle'; x: number; y: number; r: number }
  | { type: 'polygon'; points: Array<[number, number]> };

export interface MapZone {
  code: string;
  name: string;
  mapShape: MapShape | null;
}

export interface MapBeacon {
  identifier: string;
  name: string;
  zoneCode: string;
  mapX: number | null;
  mapY: number | null;
}

export interface ReferencePoint {
  id: string;
  label: string;
  x: number;
  y: number;
}

/** A room plan as served by `GET /public/floor-plans`. */
export interface FloorPlan {
  id: string;
  code: string;
  name: string;
  level: string | null;
  widthMeters: number;
  heightMeters: number;
  imageUrl: string | null;
  positioningK: number;
  fillDbm: number;
  zones: MapZone[];
  beacons: MapBeacon[];
  referencePoints: ReferencePoint[];
}

/** Average RSSI per beacon, in dBm, at one spot. */
export type Fingerprint = Record<string, number>;

/** One calibration recording's fingerprint, as served to the phone. */
export interface CaptureFingerprint {
  pointId: string;
  deviceModel: string;
  platform: string;
  orientationDeg: number | null;
  fingerprint: Fingerprint;
}

/** One raw reading inside a calibration capture; t is ms since the start. */
export interface RawSample {
  b: string;
  r: number;
  t: number;
}

export type DevicePlatform = 'ios' | 'android' | 'simulator';

/** The phone doing the positioning - radio maps are per device model. */
export interface DeviceProfile {
  model: string;
  platform: DevicePlatform;
}

export interface RadioMapEntry {
  pointId: string;
  label: string;
  x: number;
  y: number;
  /** One dBm value per beacon, in `RadioMap.beaconOrder`. */
  vector: number[];
  captureCount: number;
}

export interface RadioMap {
  /** Fixed beacon order every vector follows. */
  beaconOrder: string[];
  /** Stand-in RSSI for a beacon that was not heard. */
  fillDbm: number;
  entries: RadioMapEntry[];
  /** Which captures it was built from - shown in the calibration screen. */
  source: 'model' | 'platform' | 'any';
}

export type Weighting = 'inverse' | 'uniform';

export interface Neighbour {
  pointId: string;
  label: string;
  x: number;
  y: number;
  /** Euclidean distance in signal space, dB. */
  distance: number;
  /** Normalised weight, 0..1; all neighbours sum to 1. */
  weight: number;
}

export interface PositionEstimate {
  /** Smoothed position the map draws, metres. */
  x: number;
  y: number;
  /** Unsmoothed WKNN output for this tick. */
  rawX: number;
  rawY: number;
  /**
   * Weighted mean distance of the neighbours from the estimate, metres. Drawn
   * as the circle around the marker - a rough, honest "somewhere in here".
   */
  spreadM: number;
  neighbours: Neighbour[];
  /** Live fingerprint vector in `RadioMap.beaconOrder`. */
  vector: number[];
  beaconsHeard: number;
  at: number;
}
