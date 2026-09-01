import { Platform } from 'react-native';
import { RegisteredBeacon } from './beacon-registry';

/**
 * Background detection on iOS - the one thing BLE scanning cannot do well.
 *
 * Apple routes iBeacon frames through Core Location, not Core Bluetooth, and
 * heavily throttles background BLE scanning: duplicate discoveries get
 * coalesced and the scan interval stretches, which makes a 4-second RSSI window
 * and a 3-second dwell timer meaningless once the app is backgrounded.
 *
 * The dependable route is Core Location region monitoring on a CLBeaconRegion,
 * which wakes the app on region entry. `react-native-ble-plx` cannot do this -
 * it is a Core Bluetooth binding - so it needs a small native module exposing
 * CLLocationManager.startMonitoring(for: CLBeaconRegion).
 *
 * This file defines the seam. The default implementation reports that the
 * capability is unavailable, so the rest of the app can ask for it without
 * pretending it exists.
 *
 * ---------------------------------------------------------------------------
 * WHAT AN IMPLEMENTATION NEEDS (not done in this project):
 *
 *   iOS (Swift, via an Expo config plugin / local native module)
 *     - Info.plist: NSLocationWhenInUseUsageDescription (+ Always for
 *       background wake), UIBackgroundModes: location
 *     - CLLocationManager.requestAlwaysAuthorization()
 *     - CLBeaconRegion(uuid:identifier:) per museum proximity UUID
 *     - startMonitoring(for:) and locationManager(_:didEnterRegion:)
 *     - optionally startRangingBeacons(satisfying:) while in the foreground,
 *       which also gives Apple-computed proximity buckets
 *
 *   Android
 *     - foreground service holding a BLE scan, or the same Eddystone scan the
 *       app already performs; Android does not restrict this the way iOS does
 *
 * Until that native module exists, background zone entry is out of scope and
 * the guide detects zones while the app is open. That is stated plainly in
 * docs/ble-detection.md rather than being quietly unimplemented.
 * ---------------------------------------------------------------------------
 */
export interface BeaconRegionMonitor {
  readonly available: boolean;
  /** Why it is unavailable, for display in Settings. */
  readonly reason: string;
  startMonitoring(regions: BeaconRegion[]): Promise<void>;
  stopMonitoring(): Promise<void>;
  onRegionEnter(listener: (region: BeaconRegion) => void): () => void;
}

export interface BeaconRegion {
  /** Proximity UUID shared by every beacon of the museum. */
  uuid: string;
  major?: number;
  minor?: number;
  identifier: string;
}

/** Derives the CLBeaconRegion set from the registry: one region per UUID. */
export function beaconRegionsFor(registry: readonly RegisteredBeacon[]): BeaconRegion[] {
  const uuids = new Set<string>();
  for (const beacon of registry) {
    if (beacon.uuid) uuids.add(beacon.uuid.toLowerCase());
  }
  return [...uuids].map((uuid) => ({ uuid, identifier: `museum:${uuid}` }));
}

/** Default: the native module is not part of this project. */
export class UnavailableRegionMonitor implements BeaconRegionMonitor {
  readonly available = false;
  readonly reason =
    Platform.OS === 'ios'
      ? 'Background zone entry needs a Core Location native module, which this build does not include. Zones are detected while the app is open.'
      : 'Background zone entry is not enabled in this build. Zones are detected while the app is open.';

  async startMonitoring(): Promise<void> {
    // Intentionally empty: nothing to start.
  }

  async stopMonitoring(): Promise<void> {
    // Intentionally empty: nothing to stop.
  }

  onRegionEnter(): () => void {
    return () => undefined;
  }
}

export const regionMonitor: BeaconRegionMonitor = new UnavailableRegionMonitor();
