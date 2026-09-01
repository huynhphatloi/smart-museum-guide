import {
  hexToBytes,
  identifyAdvertisement,
  parseEddystoneUidHex,
  parseIBeaconHex,
  scannedBeaconsFrom,
} from './advertisement.parser';

// Fixtures below are the frames a Minew i3 Robust Beacon actually sends with
// its factory configuration - namespace 00112233445566778899 and the default
// iBeacon UUID - so the parser is exercised against real hardware output.

/** UID frame: type 0x00, ranging -24 dBm, namespace, instance. */
const UID_FRAME = '00e800112233445566778899abcde82b03af';
/** The same beacon's second instance. */
const UID_FRAME_2 = '00e800112233445566778899abcde82b0398';
/** URL frame - Minew ships this enabled; it carries no identity. */
const URL_FRAME = '10e800026d696e657700';
/** TLM frame - battery and temperature, also no identity. */
const TLM_FRAME = '20000cf91d6800000e0a000c0f2a';
/** iBeacon: company 0x004C, type/len, uuid, major 0, minor 0, power -59. */
const IBEACON = '4c000215e2c56db5dffb48d2b060d0f5a71096e000000000c5';

describe('hexToBytes', () => {
  it('decodes a hex string', () => {
    expect(hexToBytes('00ff10')).toEqual([0, 255, 16]);
  });

  it('returns nothing for an odd length rather than guessing', () => {
    expect(hexToBytes('00f')).toEqual([]);
  });
});

describe('parseEddystoneUidHex', () => {
  it('reads the namespace, instance and ranging data of a real i3 frame', () => {
    expect(parseEddystoneUidHex(UID_FRAME)).toEqual({
      namespace: '00112233445566778899',
      instance: 'abcde82b03af',
      rangingData: -24,
    });
  });

  it('rejects the URL frame the i3 also broadcasts', () => {
    expect(parseEddystoneUidHex(URL_FRAME)).toBeNull();
  });

  it('rejects the TLM frame the i3 also broadcasts', () => {
    expect(parseEddystoneUidHex(TLM_FRAME)).toBeNull();
  });

  it('rejects a truncated frame instead of reading past the end', () => {
    expect(parseEddystoneUidHex(UID_FRAME.slice(0, 20))).toBeNull();
  });
});

describe('parseIBeaconHex', () => {
  it('reads uuid, major, minor and measured power', () => {
    expect(parseIBeaconHex(IBEACON)).toEqual({
      uuid: 'e2c56db5-dffb-48d2-b060-d0f5a71096e0',
      major: 0,
      minor: 0,
      txPower: -59,
    });
  });

  it('rejects manufacturer data from another vendor', () => {
    expect(parseIBeaconHex('0600010920022a')).toBeNull();
  });

  it('rejects an Apple frame that is not iBeacon (e.g. Continuity)', () => {
    expect(parseIBeaconHex('4c0010050a1c9b2f7e00000000000000000000000000000')).toBeNull();
  });
});

describe('identifyAdvertisement', () => {
  it('prefers Eddystone when the beacon sends both, matching the mobile app', () => {
    const beacon = identifyAdvertisement({
      serviceData: { feaa: UID_FRAME },
      manufacturerData: IBEACON,
      rssi: -59,
      seen: 12,
    });

    expect(beacon?.protocol).toBe('EDDYSTONE_UID');
    expect(beacon?.namespaceId).toBe('00112233445566778899');
    expect(beacon?.instanceId).toBe('abcde82b03af');
  });

  it('accepts the 128-bit service UUID form some stacks report', () => {
    const beacon = identifyAdvertisement({
      serviceData: { '0000feaa-0000-1000-8000-00805f9b34fb': UID_FRAME },
      rssi: -60,
      seen: 3,
    });

    expect(beacon?.instanceId).toBe('abcde82b03af');
  });

  it('falls back to iBeacon for hardware sending only that frame', () => {
    const beacon = identifyAdvertisement({ manufacturerData: IBEACON, rssi: -61, seen: 4 });

    expect(beacon?.protocol).toBe('IBEACON');
    expect(beacon?.beaconId).toBe('e2c56db5-dffb-48d2-b060-d0f5a71096e0:0:0');
  });

  it('ignores a device that is not a beacon at all', () => {
    expect(
      identifyAdvertisement({ manufacturerData: '060001092002', rssi: -40, seen: 9 }),
    ).toBeNull();
    expect(identifyAdvertisement({ rssi: -40, seen: 1 })).toBeNull();
  });
});

describe('scannedBeaconsFrom', () => {
  it('drops the URL and TLM frames an i3 emits alongside its UID frame', () => {
    const beacons = scannedBeaconsFrom([
      { serviceData: { feaa: UID_FRAME }, rssi: -59, seen: 5 },
      { serviceData: { feaa: URL_FRAME }, rssi: -59, seen: 5 },
      { serviceData: { feaa: TLM_FRAME }, rssi: -59, seen: 5 },
    ]);

    expect(beacons).toHaveLength(1);
    expect(beacons[0].instanceId).toBe('abcde82b03af');
  });

  it('merges repeats of one beacon, keeping the strongest reading', () => {
    const beacons = scannedBeaconsFrom([
      { serviceData: { feaa: UID_FRAME }, rssi: -75, seen: 3 },
      { serviceData: { feaa: UID_FRAME }, rssi: -58, seen: 4 },
    ]);

    expect(beacons).toHaveLength(1);
    expect(beacons[0].rssi).toBe(-58);
    expect(beacons[0].seen).toBe(7);
  });

  it('ranks strongest first so the beacon in your hand is on top', () => {
    const beacons = scannedBeaconsFrom([
      { serviceData: { feaa: UID_FRAME }, rssi: -80, seen: 2 },
      { serviceData: { feaa: UID_FRAME_2 }, rssi: -45, seen: 2 },
    ]);

    expect(beacons.map((beacon) => beacon.instanceId)).toEqual(['abcde82b0398', 'abcde82b03af']);
  });

  it('keeps UID and iBeacon as separate rows - two identities the CMS can register', () => {
    const beacons = scannedBeaconsFrom([
      { serviceData: { feaa: UID_FRAME }, rssi: -59, seen: 5 },
      { manufacturerData: IBEACON, rssi: -60, seen: 5 },
    ]);

    expect(beacons.map((beacon) => beacon.protocol)).toEqual(['EDDYSTONE_UID', 'IBEACON']);
  });
});
