const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Minimal base64 decoder.
 *
 * react-native-ble-plx returns manufacturer data as a base64 string and React
 * Native has neither `Buffer` nor a reliable `atob` on every platform, so we
 * decode it ourselves. Being a plain function it is also trivially testable.
 */
export function decodeBase64(input: string): number[] {
  const cleaned = input.replace(/[^A-Za-z0-9+/=]/g, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const character of cleaned) {
    if (character === '=') break;
    const value = BASE64_ALPHABET.indexOf(character);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return bytes;
}

export interface IBeaconPayload {
  uuid: string;
  major: number;
  minor: number;
  /** Calibrated RSSI at 1 m, as advertised by the beacon. */
  txPower: number;
}

const toHex = (byte: number): string => byte.toString(16).padStart(2, '0');

/**
 * Parses an Apple iBeacon advertisement.
 *
 * Layout (25 bytes):
 *   0-1  company id 0x004C (little endian: 4C 00)
 *   2    type 0x02
 *   3    length 0x15 (21)
 *   4-19 proximity UUID
 *   20-21 major (big endian)
 *   22-23 minor (big endian)
 *   24   measured power (signed int8)
 *
 * Returns null for anything that is not an iBeacon frame, which is the normal
 * case for most BLE devices around a museum.
 */
export function parseIBeacon(manufacturerData: string | null | undefined): IBeaconPayload | null {
  if (!manufacturerData) return null;

  const bytes = decodeBase64(manufacturerData);
  if (bytes.length < 25) return null;
  if (bytes[0] !== 0x4c || bytes[1] !== 0x00) return null;
  if (bytes[2] !== 0x02 || bytes[3] !== 0x15) return null;

  const hex = bytes.slice(4, 20).map(toHex).join('');
  const uuid = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');

  const major = (bytes[20] << 8) | bytes[21];
  const minor = (bytes[22] << 8) | bytes[23];
  const raw = bytes[24];
  const txPower = raw > 127 ? raw - 256 : raw;

  return { uuid, major, minor, txPower };
}
