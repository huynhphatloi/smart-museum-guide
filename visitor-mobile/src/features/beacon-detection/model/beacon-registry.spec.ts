import {
  RegisteredBeacon,
  beaconIdsFor,
  buildBeaconIndex,
  buildZoneLookup,
  findZoneName,
  matchBeacon,
} from './beacon-registry';

const registry: RegisteredBeacon[] = [
  {
    identifier: 'BEACON_A01',
    name: 'Minew i3 - Gallery A01',
    protocol: 'EDDYSTONE_UID',
    namespaceId: 'A1B2C3D4E5F607182930',
    instanceId: '000000000001',
    uuid: 'F7826DA6-4FA2-4E98-8024-BC5B71E0893E',
    major: 1,
    minor: 1,
    txPower: -8,
    advertisingIntervalMs: 500,
    minRssi: null,
    zoneCode: 'ZONE_A01',
    zoneName: 'Ancient Sculpture',
  },
  {
    identifier: 'BEACON_A02',
    name: 'Legacy iBeacon only',
    protocol: 'IBEACON',
    namespaceId: null,
    instanceId: null,
    uuid: 'f7826da6-4fa2-4e98-8024-bc5b71e0893e',
    major: 1,
    minor: 2,
    txPower: null,
    advertisingIntervalMs: null,
    minRssi: null,
    zoneCode: 'ZONE_A02',
    zoneName: 'Traditional Painting',
  },
];

const index = buildBeaconIndex(registry);

describe('beaconIdsFor', () => {
  it('returns both identities for hardware advertising both frames', () => {
    expect(beaconIdsFor(registry[0])).toEqual([
      'a1b2c3d4e5f607182930:000000000001',
      'f7826da6-4fa2-4e98-8024-bc5b71e0893e:1:1',
    ]);
  });

  it('returns only what a beacon actually advertises', () => {
    expect(beaconIdsFor(registry[1])).toEqual(['f7826da6-4fa2-4e98-8024-bc5b71e0893e:1:2']);
  });

  it('returns nothing for a beacon with no readable identity', () => {
    expect(beaconIdsFor({ ...registry[1], uuid: null, major: null, minor: null })).toEqual([]);
  });
});

describe('matchBeacon', () => {
  it('matches an Eddystone UID identity', () => {
    const matched = matchBeacon(index, {
      protocol: 'eddystone_uid',
      beaconId: 'a1b2c3d4e5f607182930:000000000001',
    });
    expect(matched?.identifier).toBe('BEACON_A01');
  });

  it('matches the same physical beacon through its iBeacon identity', () => {
    const matched = matchBeacon(index, {
      protocol: 'ibeacon',
      beaconId: 'f7826da6-4fa2-4e98-8024-bc5b71e0893e:1:1',
    });
    expect(matched?.identifier).toBe('BEACON_A01');
  });

  it('is case insensitive about the advertised identity', () => {
    const matched = matchBeacon(index, {
      protocol: 'eddystone_uid',
      beaconId: 'A1B2C3D4E5F607182930:000000000001',
    });
    expect(matched?.identifier).toBe('BEACON_A01');
  });

  it('does not match a different instance in the same namespace', () => {
    expect(
      matchBeacon(index, {
        protocol: 'eddystone_uid',
        beaconId: 'a1b2c3d4e5f607182930:000000000099',
      }),
    ).toBeUndefined();
  });

  it('does not match a foreign namespace', () => {
    expect(
      matchBeacon(index, {
        protocol: 'eddystone_uid',
        beaconId: '00000000000000000000:000000000001',
      }),
    ).toBeUndefined();
  });

  it('ignores unrelated devices entirely', () => {
    expect(matchBeacon(index, { protocol: 'ibeacon', beaconId: 'nope:0:0' })).toBeUndefined();
  });
});

describe('buildZoneLookup', () => {
  it('maps beacon identifiers to zone codes', () => {
    const lookup = buildZoneLookup(registry);
    expect(lookup('BEACON_A01')).toBe('ZONE_A01');
    expect(lookup('BEACON_UNKNOWN')).toBeUndefined();
  });

  it('resolves a zone name for display', () => {
    expect(findZoneName(registry, 'ZONE_A02')).toBe('Traditional Painting');
  });
});
