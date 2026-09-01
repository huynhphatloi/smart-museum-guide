import { Injectable } from '@nestjs/common';
import { Beacon, BeaconProtocol, Prisma } from '@prisma/client';
import { Paginated, paginate } from '../common/dto/pagination.dto';
import {
  BeaconIdentityInvalidException,
  BeaconNotFoundException,
  ZoneNotFoundException,
} from '../common/errors/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBeaconDto, QueryBeaconsDto, UpdateBeaconDto } from './dto/beacon.dto';

const zoneSelect = { select: { id: true, code: true, name: true } };

interface BeaconIdentityFields {
  protocol: BeaconProtocol;
  namespaceId?: string | null;
  instanceId?: string | null;
  uuid?: string | null;
  major?: number | null;
  minor?: number | null;
}

/**
 * A beacon is only useful if the phone can recognise it from its advertisement.
 * Exported so the rule can be unit tested without a database.
 */
export function assertReadableIdentity(fields: BeaconIdentityFields): void {
  if (fields.protocol === BeaconProtocol.EDDYSTONE_UID) {
    if (!fields.namespaceId || !fields.instanceId) {
      throw new BeaconIdentityInvalidException(
        'An Eddystone UID beacon needs both a namespace ID (20 hex characters) and an instance ID (12 hex characters).',
      );
    }
    return;
  }

  if (fields.protocol === BeaconProtocol.IBEACON) {
    if (
      !fields.uuid ||
      fields.major === null ||
      fields.major === undefined ||
      fields.minor === null ||
      fields.minor === undefined
    ) {
      throw new BeaconIdentityInvalidException(
        'An iBeacon needs a proximity UUID together with a major and a minor value.',
      );
    }
    return;
  }

  // GENERIC: anything readable will do, but *something* must be present.
  const hasEddystone = Boolean(fields.namespaceId && fields.instanceId);
  const hasIBeacon = Boolean(fields.uuid);
  if (!hasEddystone && !hasIBeacon) {
    throw new BeaconIdentityInvalidException(
      'This beacon has no readable identity. Add either an Eddystone namespace + instance, or an iBeacon UUID.',
    );
  }
}

@Injectable()
export class BeaconsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryBeaconsDto): Promise<Paginated<Beacon>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where: Prisma.BeaconWhereInput = {
      ...(query.zoneId ? { zoneId: query.zoneId } : {}),
      ...(query.search
        ? {
            OR: [
              { identifier: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { namespaceId: { contains: query.search, mode: 'insensitive' } },
              { instanceId: { contains: query.search, mode: 'insensitive' } },
              { uuid: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.beacon.findMany({
        where,
        orderBy: { identifier: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { zone: zoneSelect },
      }),
      this.prisma.beacon.count({ where }),
    ]);

    return paginate(items, total, page, pageSize);
  }

  async findOne(id: string) {
    const beacon = await this.prisma.beacon.findUnique({
      where: { id },
      include: { zone: zoneSelect },
    });
    if (!beacon) throw new BeaconNotFoundException(id);
    return beacon;
  }

  async create(dto: CreateBeaconDto) {
    await this.assertZoneExists(dto.zoneId);

    const protocol = dto.protocol ?? BeaconProtocol.EDDYSTONE_UID;
    const namespaceId = normaliseHex(dto.namespaceId);
    const instanceId = normaliseHex(dto.instanceId);
    const uuid = dto.uuid ? dto.uuid.toLowerCase() : null;

    assertReadableIdentity({
      protocol,
      namespaceId,
      instanceId,
      uuid,
      major: dto.major ?? null,
      minor: dto.minor ?? null,
    });

    return this.prisma.beacon.create({
      data: {
        identifier: dto.identifier.toUpperCase().trim(),
        name: dto.name.trim(),
        zoneId: dto.zoneId,
        protocol,
        namespaceId,
        instanceId,
        uuid,
        major: dto.major ?? null,
        minor: dto.minor ?? null,
        txPower: dto.txPower ?? null,
        advertisingIntervalMs: dto.advertisingIntervalMs ?? null,
        minRssi: dto.minRssi ?? null,
        enabled: dto.enabled ?? true,
      },
      include: { zone: zoneSelect },
    });
  }

  async update(id: string, dto: UpdateBeaconDto) {
    const existing = await this.findOne(id);
    if (dto.zoneId) await this.assertZoneExists(dto.zoneId);

    const merged = {
      protocol: dto.protocol ?? existing.protocol,
      namespaceId:
        dto.namespaceId === undefined ? existing.namespaceId : normaliseHex(dto.namespaceId),
      instanceId: dto.instanceId === undefined ? existing.instanceId : normaliseHex(dto.instanceId),
      uuid: dto.uuid === undefined ? existing.uuid : dto.uuid ? dto.uuid.toLowerCase() : null,
      major: dto.major === undefined ? existing.major : dto.major,
      minor: dto.minor === undefined ? existing.minor : dto.minor,
    };

    assertReadableIdentity(merged);

    return this.prisma.beacon.update({
      where: { id },
      data: {
        ...(dto.name === undefined ? {} : { name: dto.name }),
        ...(dto.zoneId === undefined ? {} : { zoneId: dto.zoneId }),
        ...(dto.txPower === undefined ? {} : { txPower: dto.txPower }),
        ...(dto.advertisingIntervalMs === undefined
          ? {}
          : { advertisingIntervalMs: dto.advertisingIntervalMs }),
        // null is meaningful here: it hands this beacon back to the app default.
        ...(dto.minRssi === undefined ? {} : { minRssi: dto.minRssi }),
        ...(dto.enabled === undefined ? {} : { enabled: dto.enabled }),
        ...merged,
      },
      include: { zone: zoneSelect },
    });
  }

  async setEnabled(id: string, enabled: boolean) {
    await this.findOne(id);
    return this.prisma.beacon.update({
      where: { id },
      data: { enabled },
      include: { zone: zoneSelect },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.beacon.delete({ where: { id } });
  }

  private async assertZoneExists(zoneId: string): Promise<void> {
    const count = await this.prisma.zone.count({ where: { id: zoneId } });
    if (count === 0) throw new ZoneNotFoundException(zoneId);
  }
}

/** Hex identifiers are stored lowercase so comparisons never depend on casing. */
function normaliseHex(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  return value.toLowerCase();
}
