import { apiFetch } from './api-client';

/**
 * Client for `GET /admin/beacons/scan`.
 *
 * The scan itself runs on the API host, because that is where a radio is. A
 * browser cannot do this on macOS: Chrome's Web Bluetooth never surfaces
 * service data or manufacturer data there, which is exactly where Eddystone and
 * iBeacon identities live - chrome://bluetooth-internals shows an empty
 * Manufacturer Data column for every device. The API spawns a small native
 * helper instead, and decoding happens there under unit test.
 */

export interface ScannedBeacon {
  /** "<namespace>:<instance>" or "<uuid>:<major>:<minor>". */
  beaconId: string;
  protocol: 'EDDYSTONE_UID' | 'IBEACON';
  rssi: number;
  /** How many advertisements were heard; a nearby beacon climbs fast. */
  seen: number;
  txPower: number | null;
  namespaceId: string | null;
  instanceId: string | null;
  uuid: string | null;
  major: number | null;
  minor: number | null;
  /** Set when this beacon is already registered in the CMS. */
  registeredAs: string | null;
  registeredZone: string | null;
}

export interface ScanResult {
  beacons: ScannedBeacon[];
  scannedForMs: number;
}

export function scanForBeacons(seconds = 6, signal?: AbortSignal): Promise<ScanResult> {
  return apiFetch<ScanResult>(`/admin/beacons/scan?seconds=${seconds}`, { signal });
}
