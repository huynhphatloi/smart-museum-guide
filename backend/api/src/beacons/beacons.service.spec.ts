import { BeaconProtocol } from '@prisma/client';
import { BeaconIdentityInvalidException } from '../common/errors/app.exception';
import { assertReadableIdentity, BeaconsService } from './beacons.service';
import { PrismaService } from '../prisma/prisma.service';

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

describe('beacon management codes', () => {
  const dto = {
    name: 'Local test',
    zoneId: 'zone-1',
    namespaceId: 'a1b2c3d4e5f607182930',
    instanceId: '000000000001',
  };

  function setup() {
    const prisma = {
      zone: { count: jest.fn().mockResolvedValue(1) },
      beacon: { create: jest.fn().mockResolvedValue({ id: 'new' }) },
    };
    return { prisma, service: new BeaconsService(prisma as unknown as PrismaService) };
  }

  it('creates a distinct management code when the compact form omits it', async () => {
    const { prisma, service } = setup();
    await service.create(dto);
    await service.create(dto);
    const first = prisma.beacon.create.mock.calls[0][0].data.identifier;
    const second = prisma.beacon.create.mock.calls[1][0].data.identifier;
    expect(first).toMatch(/^BEACON_[A-F0-9]{16}$/);
    expect(second).toMatch(/^BEACON_[A-F0-9]{16}$/);
    expect(first).not.toBe(second);
  });

  it('preserves explicit identifiers from existing API clients', async () => {
    const { prisma, service } = setup();
    await service.create({ ...dto, identifier: 'BEACON_A01' });
    expect(prisma.beacon.create.mock.calls[0][0].data.identifier).toBe('BEACON_A01');
  });

  it('still rejects missing hardware identity before creating a beacon', async () => {
    const { prisma, service } = setup();
    await expect(service.create({ name: 'Local test', zoneId: 'zone-1' })).rejects.toThrow(
      BeaconIdentityInvalidException,
    );
    expect(prisma.beacon.create).not.toHaveBeenCalled();
  });
});
