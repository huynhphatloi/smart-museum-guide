import { BeaconProtocol } from '@prisma/client';
import { BeaconIdentityInvalidException } from '../common/errors/app.exception';
import { assertReadableIdentity } from './beacons.service';

describe('assertReadableIdentity', () => {
  const namespaceId = 'a1b2c3d4e5f607182930';
  const instanceId = '000000000001';
  const uuid = 'f7826da6-4fa2-4e98-8024-bc5b71e0893e';

  it('accepts an Eddystone UID beacon with namespace and instance', () => {
    expect(() =>
      assertReadableIdentity({ protocol: BeaconProtocol.EDDYSTONE_UID, namespaceId, instanceId }),
    ).not.toThrow();
  });

  it('rejects an Eddystone UID beacon missing its instance', () => {
    expect(() =>
      assertReadableIdentity({
        protocol: BeaconProtocol.EDDYSTONE_UID,
        namespaceId,
        instanceId: null,
      }),
    ).toThrow(BeaconIdentityInvalidException);
  });

  it('rejects an Eddystone UID beacon that only has an iBeacon triple', () => {
    expect(() =>
      assertReadableIdentity({ protocol: BeaconProtocol.EDDYSTONE_UID, uuid, major: 1, minor: 1 }),
    ).toThrow(BeaconIdentityInvalidException);
  });

  it('accepts an iBeacon with uuid, major and minor', () => {
    expect(() =>
      assertReadableIdentity({ protocol: BeaconProtocol.IBEACON, uuid, major: 1, minor: 1 }),
    ).not.toThrow();
  });

  it('accepts minor 0, which is falsy but valid', () => {
    expect(() =>
      assertReadableIdentity({ protocol: BeaconProtocol.IBEACON, uuid, major: 0, minor: 0 }),
    ).not.toThrow();
  });

  it('rejects an iBeacon without a major value', () => {
    expect(() =>
      assertReadableIdentity({ protocol: BeaconProtocol.IBEACON, uuid, major: null, minor: 1 }),
    ).toThrow(BeaconIdentityInvalidException);
  });

  it('accepts a GENERIC beacon that carries either identity', () => {
    expect(() =>
      assertReadableIdentity({ protocol: BeaconProtocol.GENERIC, namespaceId, instanceId }),
    ).not.toThrow();
    expect(() => assertReadableIdentity({ protocol: BeaconProtocol.GENERIC, uuid })).not.toThrow();
  });

  it('rejects a beacon with no readable identity at all', () => {
    expect(() => assertReadableIdentity({ protocol: BeaconProtocol.GENERIC })).toThrow(
      BeaconIdentityInvalidException,
    );
  });
});
