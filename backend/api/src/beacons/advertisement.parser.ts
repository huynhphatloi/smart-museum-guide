/**
 * Decodes the raw advertisements captured by `tools/beacon-scan`.
 *
 * The native binary only reaches the radio; every byte-level decision lives
 * here, where it can be unit tested without Bluetooth, a Mac, or a beacon.
 *
 * Identity comes from the advertised payload and never from a device id: on
 * macOS CoreBluetooth reports a per-host UUID rather than a MAC, exactly the
 * cross-platform problem the mobile app documents.
 */

/** Eddystone payloads travel in service data under this UUID. */
const EDDYSTONE_SHORT = 'feaa';
const EDDYSTONE_LONG = '0000feaa-0000-1000-8000-00805f9b34fb';

export interface RawAdvertisement {
  /** Service data keyed by lowercase UUID, values are hex strings. */
  serviceData?: Record<string, string>;
  /** Manufacturer data as a hex string, company id included. */
  manufacturerData?: string;
  rssi: number;
  seen: number;
}

export interface ScannedBeacon {
  /** "<namespace>:<instance>" or "<uuid>:<major>:<minor>". */
  beaconId: string;
  protocol: 'EDDYSTONE_UID' | 'IBEACON';
  rssi: number;
  seen: number;
  txPower: number | null;
  namespaceId: string | null;
  instanceId: string | null;
  uuid: string | null;
  major: number | null;
  minor: number | null;
  /** Set by the service when this beacon is already in the CMS. */
  registeredAs: string | null;
  registeredZone: string | null;
}

/** Hex string -> byte array. Returns [] for anything malformed. */
export function hexToBytes(hex: string): number[] {
  const cleaned = hex
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-f]/g, '');
  if (cleaned.length % 2 !== 0) return [];

  const bytes: number[] = [];
  for (let index = 0; index < cleaned.length; index += 2) {
    bytes.push(Number.parseInt(cleaned.slice(index, index + 2), 16));
  }
  return bytes;
}

const signed8 = (byte: number): number => (byte > 127 ? byte - 256 : byte);
const toHex = (byte: number): string => byte.toString(16).padStart(2, '0');

export interface EddystoneUid {
  namespace: string;
  instance: string;
  rangingData: number;
}

/**
 * Eddystone UID frame:
 *   0      frame type 0x00
 *   1      ranging data (signed int8, dBm at 0 m)
 *   2-11   namespace (10 bytes)
 *   12-17  instance  (6 bytes)
 *
 * URL, TLM and EID frames carry no identity and return null - which matters
 * here, because a Minew i3 ships advertising all four.
 */
export function parseEddystoneUidHex(hex: string): EddystoneUid | null {
  const bytes = hexToBytes(hex);
  if (bytes.length < 18) return null;
  if (bytes[0] !== 0x00) return null;

  return {
    rangingData: signed8(bytes[1]),
    namespace: bytes.slice(2, 12).map(toHex).join(''),
    instance: bytes.slice(12, 18).map(toHex).join(''),
  };
}

export interface IBeaconPayload {
  uuid: string;
  major: number;
  minor: number;
  txPower: number;
}

/**
 * iBeacon manufacturer data, as CoreBluetooth reports it - company id included:
 *   0-1   company id 0x004C, little endian (4C 00)
 *   2     type 0x02
 *   3     length 0x15
 *   4-19  proximity UUID
 *   20-21 major (big endian)
 *   22-23 minor (big endian)
 *   24    measured power (signed int8)
 */
export function parseIBeaconHex(hex: string): IBeaconPayload | null {
  const bytes = hexToBytes(hex);
  if (bytes.length < 25) return null;
  if (bytes[0] !== 0x4c || bytes[1] !== 0x00) return null;
  if (bytes[2] !== 0x02 || bytes[3] !== 0x15) return null;

  const raw = bytes.slice(4, 20).map(toHex).join('');
  const uuid = [
    raw.slice(0, 8),
    raw.slice(8, 12),
    raw.slice(12, 16),
    raw.slice(16, 20),
    raw.slice(20, 32),
  ].join('-');

  return {
    uuid,
    major: (bytes[20] << 8) | bytes[21],
    minor: (bytes[22] << 8) | bytes[23],
    txPower: signed8(bytes[24]),
  };
}

/** Picks the Eddystone payload out of a service data map. */
export function eddystonePayload(serviceData: Record<string, string> | undefined): string | null {
  if (!serviceData) return null;

  for (const [uuid, payload] of Object.entries(serviceData)) {
    const normalised = uuid.toLowerCase();
    if (normalised === EDDYSTONE_SHORT || normalised === EDDYSTONE_LONG) return payload;
    if (normalised.replace(/[^0-9a-f]/g, '').startsWith('0000feaa')) return payload;
  }

  return null;
}

/**
 * Turns one captured advertisement into a beacon, or null when it carries no
 * usable identity. Eddystone wins when a beacon sends both frames, matching
 * the mobile app's precedence so the CMS and the phone agree on identity.
 */
export function identifyAdvertisement(advertisement: RawAdvertisement): ScannedBeacon | null {
  const base = {
    rssi: advertisement.rssi,
    seen: advertisement.seen,
    registeredAs: null,
    registeredZone: null,
  };

  const eddystone = parseEddystoneUidHex(eddystonePayload(advertisement.serviceData) ?? '');
  if (eddystone) {
    return {
      ...base,
      beaconId: `${eddystone.namespace}:${eddystone.instance}`,
      protocol: 'EDDYSTONE_UID',
      txPower: eddystone.rangingData,
      namespaceId: eddystone.namespace,
      instanceId: eddystone.instance,
      uuid: null,
      major: null,
      minor: null,
    };
  }

  const iBeacon = parseIBeaconHex(advertisement.manufacturerData ?? '');
  if (iBeacon) {
    return {
      ...base,
      beaconId: `${iBeacon.uuid}:${iBeacon.major}:${iBeacon.minor}`,
      protocol: 'IBEACON',
      txPower: iBeacon.txPower,
      namespaceId: null,
      instanceId: null,
      uuid: iBeacon.uuid,
      major: iBeacon.major,
      minor: iBeacon.minor,
    };
  }

  return null;
}

/**
 * Decodes a whole capture, merging frames that resolve to the same beacon and
 * ranking them strongest first, so the beacon held up to the laptop is on top.
 *
 * One Minew i3 advertises UID, URL, TLM and iBeacon in rotation; the URL and
 * TLM frames drop out here, and the UID and iBeacon frames stay separate rows
 * because they are two distinct identities the CMS can register.
 */
export function scannedBeaconsFrom(advertisements: readonly RawAdvertisement[]): ScannedBeacon[] {
  const merged = new Map<string, ScannedBeacon>();

  for (const advertisement of advertisements) {
    const beacon = identifyAdvertisement(advertisement);
    if (!beacon) continue;

    const existing = merged.get(beacon.beaconId);
    merged.set(
      beacon.beaconId,
      existing
        ? {
            ...beacon,
            rssi: Math.max(existing.rssi, beacon.rssi),
            seen: existing.seen + beacon.seen,
          }
        : beacon,
    );
  }

  return [...merged.values()].sort((a, b) => b.rssi - a.rssi);
}
