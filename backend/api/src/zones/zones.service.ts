import { Inject, Injectable } from '@nestjs/common';
import { Prisma, Zone } from '@prisma/client';
import * as QRCode from 'qrcode';
import { Paginated, paginate } from '../common/dto/pagination.dto';
import {
  FloorPlanNotFoundException,
  MapShapeInvalidException,
  ResourceInUseException,
  ZoneNotFoundException,
} from '../common/errors/app.exception';
import { APP_CONFIG, AppConfig } from '../config/env.validation';
import { AssignmentsService } from '../assignments/assignments.service';
import { ExhibitResolverService } from '../exhibits/exhibit-resolver.service';
import { parseMapShape, shapeFitsPlan } from '../positioning/map-shape';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto, QueryZonesDto, UpdateZoneDto } from './dto/zone.dto';

@Injectable()
export class ZonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: ExhibitResolverService,
    private readonly assignments: AssignmentsService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** The URL printed on the physical QR sticker for a zone. */
  buildQrValue(zoneCode: string): string {
    return `${this.config.visitorWebUrl}/q/${zoneCode}`;
  }

  async findAll(query: QueryZonesDto): Promise<Paginated<Zone>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where: Prisma.ZoneWhereInput = query.search
      ? {
          OR: [
            { code: { contains: query.search, mode: 'insensitive' } },
            { name: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.zone.findMany({
        where,
        orderBy: { code: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          beacons: { select: { id: true, identifier: true, name: true, enabled: true } },
          _count: { select: { assignments: true } },
        },
      }),
      this.prisma.zone.count({ where }),
    ]);

    return paginate(items, total, page, pageSize);
  }

  /**
   * Zone detail for the CMS: infrastructure (beacons, QR) plus the schedule
   * timeline (what is showing now, what comes next).
   */
  async findOne(id: string, at: Date = new Date()) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: { beacons: { orderBy: { identifier: 'asc' } } },
    });
    if (!zone) throw new ZoneNotFoundException(id);

    const timeline = await this.resolver.getZoneTimeline(id, at);

    return {
      ...zone,
      qrValue: zone.qrCode ?? this.buildQrValue(zone.code),
      currentAssignment: timeline.current,
      currentReason: timeline.currentReason,
      history: timeline.history,
      upcoming: timeline.upcoming,
    };
  }

  /**
   * Change what is in the room now, preserving upcoming schedules.
   */
  async setCurrentExhibit(id: string, exhibitId: string | null) {
    await this.assertExists(id);
    const result = await this.assignments.setCurrentExhibit(id, exhibitId);
    return {
      changed: !result.plan.unchanged,
      current: result.current,
    };
  }

  async findByCode(code: string) {
    const zone = await this.prisma.zone.findUnique({ where: { code: code.toUpperCase().trim() } });
    if (!zone) throw new ZoneNotFoundException(code);
    return zone;
  }

  async create(dto: CreateZoneDto): Promise<Zone> {
    const code = dto.code.toUpperCase().trim();
    return this.prisma.zone.create({
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description ?? null,
        floor: dto.floor ?? null,
        qrCode: this.buildQrValue(code),
      },
    });
  }

  async update(id: string, dto: UpdateZoneDto): Promise<Zone> {
    const zone = await this.prisma.zone.findUnique({ where: { id } });
    if (!zone) throw new ZoneNotFoundException(id);

    const { mapShape, floorPlanId, ...rest } = dto;
    const targetPlanId = floorPlanId === undefined ? zone.floorPlanId : floorPlanId;

    let shape: Prisma.InputJsonValue | typeof Prisma.DbNull | undefined;
    if (mapShape === null) {
      shape = Prisma.DbNull;
    } else if (mapShape !== undefined) {
      const parsed = parseMapShape(mapShape);
      if (!parsed.ok) throw new MapShapeInvalidException(parsed.reason);
      if (!targetPlanId) {
        throw new MapShapeInvalidException(
          'A zone needs a floor plan before it can have an outline.',
        );
      }
      const plan = await this.prisma.floorPlan.findUnique({ where: { id: targetPlanId } });
      if (!plan) throw new FloorPlanNotFoundException(targetPlanId);
      if (!shapeFitsPlan(parsed.shape, plan.widthMeters, plan.heightMeters)) {
        throw new MapShapeInvalidException(
          `The outline does not fit on "${plan.name}" (${plan.widthMeters} x ${plan.heightMeters} m).`,
        );
      }
      shape = parsed.shape;
    }

    if (floorPlanId) {
      const count = await this.prisma.floorPlan.count({ where: { id: floorPlanId } });
      if (count === 0) throw new FloorPlanNotFoundException(floorPlanId);
    }

    return this.prisma.zone.update({
      where: { id },
      data: {
        ...rest,
        ...(floorPlanId === undefined ? {} : { floorPlanId }),
        // Leaving a plan drops the outline too - it was drawn in that plan's metres.
        ...(floorPlanId === null && mapShape === undefined ? { mapShape: Prisma.DbNull } : {}),
        ...(shape === undefined ? {} : { mapShape: shape }),
      },
    });
  }

  /** A zone may only be deleted once no beacon points at it. */
  async remove(id: string) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: { _count: { select: { beacons: true, assignments: true } } },
    });
    if (!zone) throw new ZoneNotFoundException(id);

    if (zone._count.beacons > 0) {
      throw new ResourceInUseException(
        'This zone still has beacons assigned to it. Move or delete those beacons first.',
        { beacons: zone._count.beacons },
      );
    }

    // Assignments are cascade-deleted with the zone, but staff should know.
    return this.prisma.zone.delete({ where: { id } });
  }

  /** Returns the QR payload plus a ready to print PNG data URL. */
  async getQr(id: string): Promise<{ value: string; dataUrl: string }> {
    const zone = await this.prisma.zone.findUnique({ where: { id } });
    if (!zone) throw new ZoneNotFoundException(id);

    const value = zone.qrCode ?? this.buildQrValue(zone.code);
    const dataUrl = await QRCode.toDataURL(value, { width: 512, margin: 2 });
    return { value, dataUrl };
  }

  private async assertExists(id: string): Promise<void> {
    const count = await this.prisma.zone.count({ where: { id } });
    if (count === 0) throw new ZoneNotFoundException(id);
  }
}
