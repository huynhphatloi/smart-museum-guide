import { extractEddystoneServiceData, parseEddystoneUid } from './eddystone';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes: number[]): string {
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
}

/** Builds a real Eddystone UID frame the way a Minew i3 advertises one. */
function buildUidFrame(namespaceHex: string, instanceHex: string, rangingData = -8): string {
  const hexToBytes = (hex: string) => (hex.match(/.{2}/g) ?? []).map((pair) => parseInt(pair, 16));
  return toBase64([
    0x00,
    rangingData < 0 ? rangingData + 256 : rangingData,
    ...hexToBytes(namespaceHex),
    ...hexToBytes(instanceHex),
    0x00,
    0x00,
  ]);
}

describe('parseEddystoneUid', () => {
  const namespace = 'a1b2c3d4e5f607182930';
  const instance = '000000000002';

  it('reads namespace, instance and ranging data', () => {
    expect(parseEddystoneUid(buildUidFrame(namespace, instance, -8))).toEqual({
      namespace,
      instance,
      rangingData: -8,
    });
  });

  it('handles a frame without the two reserved bytes', () => {
    const full = buildUidFrame(namespace, instance);
    // 18 bytes is the minimum a valid UID frame can be.
    expect(parseEddystoneUid(full)?.instance).toBe(instance);
  });

  it('ignores a URL frame', () => {
    const url = toBase64([
      0x10, 0xf4, 0x00, 0x6d, 0x75, 0x73, 0x65, 0x75, 0x6d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00,
    ]);
    expect(parseEddystoneUid(url)).toBeNull();
  });

  it('ignores a TLM frame', () => {
    const tlm = toBase64([0x20, ...new Array(17).fill(0)]);
    expect(parseEddystoneUid(tlm)).toBeNull();
  });

  it('returns null for empty or truncated data', () => {
    expect(parseEddystoneUid(null)).toBeNull();
    expect(parseEddystoneUid('')).toBeNull();
    expect(parseEddystoneUid(toBase64([0x00, 0xf8, 0x01]))).toBeNull();
  });
});

describe('extractEddystoneServiceData', () => {
  const payload = 'AAAA';

  it('finds the short 16-bit form', () => {
    expect(extractEddystoneServiceData({ feaa: payload })).toBe(payload);
  });

  it('finds the full 128-bit form', () => {
    expect(extractEddystoneServiceData({ '0000feaa-0000-1000-8000-00805f9b34fb': payload })).toBe(
      payload,
    );
  });

  it('is case insensitive', () => {
    expect(extractEddystoneServiceData({ '0000FEAA-0000-1000-8000-00805F9B34FB': payload })).toBe(
      payload,
    );
  });

  it('ignores unrelated service data', () => {
    expect(
      extractEddystoneServiceData({ '0000180f-0000-1000-8000-00805f9b34fb': payload }),
    ).toBeNull();
    expect(extractEddystoneServiceData(null)).toBeNull();
    expect(extractEddystoneServiceData({})).toBeNull();
  });
});
