import { eddystoneBeaconId, ibeaconBeaconId } from './advertisement';
import { BeaconProtocol } from './types';

/**
 * The museum's beacon registry, downloaded once from
 * `GET /api/public/beacons`. It is pure infrastructure data - no visitor
 * information is involved - and it is what lets the phone match a raw BLE
 * advertisement to a logical beacon identifier *locally*, without streaming
 * anything to the backend.
 */
export interface RegisteredBeacon {
  identifier: string;
  name: string;
  protocol: string;
  /** Eddystone UID namespace, 20 hex characters. */
  namespaceId: string | null;
  /** Eddystone UID instance, 12 hex characters. */
  instanceId: string | null;
  uuid: string | null;
  major: number | null;
  minor: number | null;
  txPower: number | null;
  advertisingIntervalMs: number | null;
  /** Zone reach in dBm, set per beacon in the CMS. Null uses the app default. */
  minRssi: number | null;
  zoneCode: string;
  zoneName: string;
}

/**
 * Every identity a registered beacon can be recognised by.
 *
 * A single Minew i3 configured with BeaconSET+ advertises Eddystone UID *and*
 * iBeacon, so one database row legitimately answers to two beaconIds.
 */
export function beaconIdsFor(beacon: RegisteredBeacon): string[] {
  const ids: string[] = [];

  if (beacon.namespaceId && beacon.instanceId) {
    ids.push(eddystoneBeaconId(beacon.namespaceId, beacon.instanceId));
  }
  if (beacon.uuid && beacon.major !== null && beacon.minor !== null) {
    ids.push(ibeaconBeaconId(beacon.uuid, beacon.major, beacon.minor));
  }

  return ids;
}

/** Fast beaconId -> beacon index, rebuilt whenever the registry is refreshed. */
export function buildBeaconIndex(
  registry: readonly RegisteredBeacon[],
): Map<string, RegisteredBeacon> {
  const index = new Map<string, RegisteredBeacon>();
  for (const beacon of registry) {
    for (const id of beaconIdsFor(beacon)) index.set(id, beacon);
  }
  return index;
}

/**
 * Resolves an identity read from the air to a registered beacon.
 *
 * Matching is on the advertised payload only. The BLE device id is never
 * consulted: Android reports a stable MAC there while iOS reports a
 * per-installation UUID, so it cannot identify the same beacon on both.
 */
export function matchBeacon(
  index: Map<string, RegisteredBeacon>,
  identity: { protocol: BeaconProtocol; beaconId: string },
): RegisteredBeacon | undefined {
  return index.get(identity.beaconId.toLowerCase());
}

/** Builds the beacon -> zone lookup the detector needs. */
export function buildZoneLookup(registry: readonly RegisteredBeacon[]) {
  const map = new Map(registry.map((beacon) => [beacon.identifier, beacon.zoneCode]));
  return (identifier: string): string | undefined => map.get(identifier);
}

/**
 * Builds the beacon -> minimum RSSI lookup. A zone set tight in the CMS (a
 * display case) and one set wide (a hall) then coexist, instead of one global
 * threshold having to suit both.
 */
export function buildMinRssiLookup(registry: readonly RegisteredBeacon[]) {
  const map = new Map(
    registry
      .filter((beacon) => beacon.minRssi !== null)
      .map((beacon) => [beacon.identifier, beacon.minRssi as number]),
  );
  return (identifier: string): number | undefined => map.get(identifier);
}

export function findZoneName(
  registry: readonly RegisteredBeacon[],
  zoneCode: string,
): string | undefined {
  return registry.find((beacon) => beacon.zoneCode === zoneCode)?.zoneName;
}
