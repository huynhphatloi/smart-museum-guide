import { decodeBase64, parseIBeacon } from './ibeacon';

/** Builds a valid iBeacon manufacturer payload as base64, the way a real beacon advertises. */
function buildIBeaconBase64(uuidHex: string, major: number, minor: number, txPower = -59): string {
  const bytes = [
    0x4c,
    0x00,
    0x02,
    0x15,
    ...(uuidHex.match(/.{2}/g) ?? []).map((pair) => parseInt(pair, 16)),
    (major >> 8) & 0xff,
    major & 0xff,
    (minor >> 8) & 0xff,
    minor & 0xff,
    txPower < 0 ? txPower + 256 : txPower,
  ];

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const chunk = bytes.slice(index, index + 3);
    const value = (chunk[0] << 16) | ((chunk[1] ?? 0) << 8) | (chunk[2] ?? 0);
    output += alphabet[(value >> 18) & 63];
    output += alphabet[(value >> 12) & 63];
    output += chunk.length > 1 ? alphabet[(value >> 6) & 63] : '=';
    output += chunk.length > 2 ? alphabet[value & 63] : '=';
  }
  return output;
}

describe('decodeBase64', () => {
  it('decodes a known string', () => {
    expect(decodeBase64('TUFO')).toEqual([0x4d, 0x41, 0x4e]);
  });

  it('handles padding', () => {
    expect(decodeBase64('TQ==')).toEqual([0x4d]);
    expect(decodeBase64('TUE=')).toEqual([0x4d, 0x41]);
  });
});

describe('parseIBeacon', () => {
  const uuidHex = 'f7826da64fa24e988024bc5b71e0893e';

  it('parses uuid, major, minor and tx power', () => {
    const payload = parseIBeacon(buildIBeaconBase64(uuidHex, 1, 2, -59));

    expect(payload).toEqual({
      uuid: 'f7826da6-4fa2-4e98-8024-bc5b71e0893e',
      major: 1,
      minor: 2,
      txPower: -59,
    });
  });

  it('parses large major/minor values', () => {
    expect(parseIBeacon(buildIBeaconBase64(uuidHex, 65535, 4660))).toMatchObject({
      major: 65535,
      minor: 4660,
    });
  });

  it('returns null for non iBeacon advertisements', () => {
    expect(parseIBeacon(null)).toBeNull();
    expect(parseIBeacon('')).toBeNull();
    expect(parseIBeacon('AAAA')).toBeNull();
  });
});
