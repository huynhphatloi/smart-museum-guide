import { extractEddystoneServiceData, parseEddystoneUid } from './eddystone';
import { parseIBeacon } from './ibeacon';
import { BeaconProtocol } from './types';

/** The raw fields one BLE advertisement gives us, platform independent. */
export interface RawAdvertisement {
  manufacturerData?: string | null;
  serviceData?: Record<string, string> | null;
}

export interface ReadIdentity {
  protocol: BeaconProtocol;
  /**
   * Protocol-qualified identity read from the air:
   *   eddystone_uid -> "<namespace>:<instance>"
   *   ibeacon       -> "<uuid>:<major>:<minor>"
   */
  beaconId: string;
  /** Advertised transmit power, when the frame carries one. */
  txPower?: number;
}

export function eddystoneBeaconId(namespace: string, instance: string): string {
  return `${namespace.toLowerCase()}:${instance.toLowerCase()}`;
}

export function ibeaconBeaconId(uuid: string, major: number, minor: number): string {
  return `${uuid.toLowerCase()}:${major}:${minor}`;
}

/**
 * Reads a beacon identity out of one advertisement.
 *
 * Eddystone UID is tried first because it is the protocol this project relies
 * on for foreground detection; iBeacon is the fallback for hardware advertising
 * only that frame. A device carrying neither is not museum hardware.
 *
 * Note what is deliberately absent: the BLE device id / MAC address is never
 * used as identity. Android reports a stable MAC there, but iOS reports a
 * per-installation UUID, so it can never identify the same beacon across
 * platforms.
 */
export function readAdvertisement(advertisement: RawAdvertisement): ReadIdentity | null {
  const eddystonePayload = extractEddystoneServiceData(advertisement.serviceData);
  const uid = parseEddystoneUid(eddystonePayload);
  if (uid) {
    return {
      protocol: 'eddystone_uid',
      beaconId: eddystoneBeaconId(uid.namespace, uid.instance),
      txPower: uid.rangingData,
    };
  }

  const iBeacon = parseIBeacon(advertisement.manufacturerData);
  if (iBeacon) {
    return {
      protocol: 'ibeacon',
      beaconId: ibeaconBeaconId(iBeacon.uuid, iBeacon.major, iBeacon.minor),
      txPower: iBeacon.txPower,
    };
  }

  return null;
}
