import { decodeBase64 } from './ibeacon';

/**
 * Eddystone service UUID. Advertisements carry their payload in BLE *service
 * data* under this UUID, which is what makes Eddystone the right primary
 * protocol here: Android and iOS both hand service data to an ordinary BLE
 * scan, so `react-native-ble-plx` reads it identically on both platforms.
 *
 * iBeacon does not have that property on iOS - Apple routes iBeacon frames
 * through Core Location instead - which is why iBeacon is our secondary path.
 */
export const EDDYSTONE_SERVICE_UUID = '0000feaa-0000-1000-8000-00805f9b34fb';
export const EDDYSTONE_SERVICE_UUID_SHORT = 'feaa';

/** Eddystone frame types. Only UID carries a beacon identity. */
export const EddystoneFrameType = {
  UID: 0x00,
  URL: 0x10,
  TLM: 0x20,
  EID: 0x30,
} as const;

export interface EddystoneUid {
  /** 10 bytes, 20 lowercase hex characters. One value per museum. */
  namespace: string;
  /** 6 bytes, 12 lowercase hex characters. One value per beacon. */
  instance: string;
  /** Advertised signal strength at 0 m, in dBm (signed). */
  rangingData: number;
}

const toHex = (byte: number): string => byte.toString(16).padStart(2, '0');
const signed8 = (byte: number): number => (byte > 127 ? byte - 256 : byte);

/**
 * Parses an Eddystone UID frame.
 *
 * Layout (18 bytes, plus 2 reserved that some beacons omit):
 *   0      frame type 0x00
 *   1      ranging data (signed int8, dBm at 0 m)
 *   2-11   namespace  (10 bytes)
 *   12-17  instance   (6 bytes)
 *   18-19  reserved
 *
 * Returns null for URL/TLM/EID frames and for anything that is not Eddystone -
 * which is most BLE traffic in a public building.
 */
export function parseEddystoneUid(
  serviceDataBase64: string | null | undefined,
): EddystoneUid | null {
  if (!serviceDataBase64) return null;

  const bytes = decodeBase64(serviceDataBase64);
  if (bytes.length < 18) return null;
  if (bytes[0] !== EddystoneFrameType.UID) return null;

  return {
    rangingData: signed8(bytes[1]),
    namespace: bytes.slice(2, 12).map(toHex).join(''),
    instance: bytes.slice(12, 18).map(toHex).join(''),
  };
}

/**
 * Picks the Eddystone payload out of the `serviceData` map that
 * `react-native-ble-plx` reports, tolerating both the 16-bit short form
 * ("feaa") and the full 128-bit form some platforms report.
 */
export function extractEddystoneServiceData(
  serviceData: Record<string, string> | null | undefined,
): string | null {
  if (!serviceData) return null;

  for (const [uuid, payload] of Object.entries(serviceData)) {
    const normalised = uuid.toLowerCase();
    if (normalised === EDDYSTONE_SERVICE_UUID || normalised === EDDYSTONE_SERVICE_UUID_SHORT) {
      return payload;
    }
    // Some stacks report "0000FEAA" or "FEAA-..." style keys.
    if (normalised.replace(/[^0-9a-f]/g, '').startsWith('0000feaa')) return payload;
  }

  return null;
}
