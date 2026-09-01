import { eddystoneBeaconId, ibeaconBeaconId, readAdvertisement } from './advertisement';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const toBase64 = (bytes: number[]): string => {
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const chunk = bytes.slice(index, index + 3);
    const value = (chunk[0] << 16) | ((chunk[1] ?? 0) << 8) | (chunk[2] ?? 0);
    output += ALPHABET[(value >> 18) & 63];
    output += ALPHABET[(value >> 12) & 63];
    output += chunk.length > 1 ? ALPHABET[(value >> 6) & 63] : '=';
    output += chunk.length > 2 ? ALPHABET[value & 63] : '=';
  }
  return output;
};
const hexToBytes = (hex: string) => (hex.match(/.{2}/g) ?? []).map((pair) => parseInt(pair, 16));

const NAMESPACE = 'a1b2c3d4e5f607182930';
const INSTANCE = '000000000002';
const UUID_HEX = 'f7826da64fa24e988024bc5b71e0893e';

const eddystoneFrame = toBase64([
  0x00,
  0xf8,
  ...hexToBytes(NAMESPACE),
  ...hexToBytes(INSTANCE),
  0,
  0,
]);
const ibeaconFrame = toBase64([
  0x4c,
  0x00,
  0x02,
  0x15,
  ...hexToBytes(UUID_HEX),
  0x00,
  0x01,
  0x00,
  0x02,
  0xc5,
]);

describe('readAdvertisement', () => {
  it('reads an Eddystone UID advertisement', () => {
    expect(readAdvertisement({ serviceData: { feaa: eddystoneFrame } })).toEqual({
      protocol: 'eddystone_uid',
      beaconId: `${NAMESPACE}:${INSTANCE}`,
      txPower: -8,
    });
  });

  it('reads an iBeacon advertisement', () => {
    expect(readAdvertisement({ manufacturerData: ibeaconFrame })).toEqual({
      protocol: 'ibeacon',
      beaconId: 'f7826da6-4fa2-4e98-8024-bc5b71e0893e:1:2',
      txPower: -59,
    });
  });

  it('prefers Eddystone when the beacon advertises both frames', () => {
    // A Minew i3 configured with BeaconSET+ does exactly this.
    const identity = readAdvertisement({
      serviceData: { feaa: eddystoneFrame },
      manufacturerData: ibeaconFrame,
    });

    expect(identity?.protocol).toBe('eddystone_uid');
  });

  it('returns null for an ordinary BLE device', () => {
    expect(readAdvertisement({})).toBeNull();
    expect(
      readAdvertisement({ manufacturerData: 'AAAA', serviceData: { '180f': 'ZA==' } }),
    ).toBeNull();
  });
});

describe('beaconId builders', () => {
  it('lowercases Eddystone identities', () => {
    expect(eddystoneBeaconId('A1B2C3D4E5F607182930', '000000000001')).toBe(
      'a1b2c3d4e5f607182930:000000000001',
    );
  });

  it('formats iBeacon identities as uuid:major:minor', () => {
    expect(ibeaconBeaconId('F7826DA6-4FA2-4E98-8024-BC5B71E0893E', 1, 2)).toBe(
      'f7826da6-4fa2-4e98-8024-bc5b71e0893e:1:2',
    );
  });
});
