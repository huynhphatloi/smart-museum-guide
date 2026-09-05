import { LocalisedExhibit } from '../exhibits/exhibit.types';

export interface PublicZone {
  id: string;
  code: string;
  name: string;
  description: string | null;
  floor: string | null;
}

/**
 * One entry of the museum's beacon registry, handed to the mobile app so it can
 * match advertisements locally.
 *
 * `namespaceId` + `instanceId` (Eddystone UID) is the primary identity because
 * both Android and iOS expose Eddystone service data to a normal BLE scan. The
 * iBeacon triple is secondary - the same hardware advertises both, and on iOS it
 * is what Core Location region monitoring would use for background detection.
 */
export interface PublicBeacon {
  identifier: string;
  name: string;
  protocol: string;
  namespaceId: string | null;
  instanceId: string | null;
  uuid: string | null;
  major: number | null;
  minor: number | null;
  txPower: number | null;
  advertisingIntervalMs: number | null;
  /** Per-beacon zone reach in dBm; null means use the app's global default. */
  minRssi: number | null;
  zoneCode: string;
  zoneName: string;
}

export interface ActiveExhibitResponse {
  zone: PublicZone;
  beacon: { identifier: string; name: string } | null;
  assignment: { id: string; activeFrom: string; activeTo: string | null };
  exhibit: LocalisedExhibit;
  resolvedAt: string;
}
