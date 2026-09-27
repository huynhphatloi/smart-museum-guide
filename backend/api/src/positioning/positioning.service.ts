import { Injectable } from '@nestjs/common';
import { Prisma, SurveyPointKind } from '@prisma/client';
import {
  CaptureInvalidException,
  FloorPlanNotFoundException,
  SurveyCaptureNotFoundException,
  SurveyPointNotFoundException,
  SurveyPointOutsidePlanException,
} from '../common/errors/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { FingerprintValues, RawSample, parseCapturePayload } from './capture-payload';
import {
  CreateFloorPlanDto,
  CreateSurveyCaptureDto,
  CreateSurveyPointDto,
  GenerateGridDto,
  UpdateFloorPlanDto,
  UpdateSurveyPointDto,
} from './dto/positioning.dto';
import { MapShape, parseMapShape } from './map-shape';
import { PositioningDataset, PublicFingerprint, PublicFloorPlan } from './positioning.types';
import { isOnPlan, outsideAfterResize } from './plan-bounds';
import { generateGrid, withUniqueLabels, withoutOccupied } from './survey-grid';

const floorPlanWithMap = {
  zones: {
    orderBy: { code: 'asc' },
    include: {
      beacons: { where: { enabled: true }, orderBy: { identifier: 'asc' } },
    },
  },
  surveyPoints: {
    where: { kind: SurveyPointKind.REFERENCE },
    orderBy: [{ y: 'asc' }, { x: 'asc' }],
  },
} satisfies Prisma.FloorPlanInclude;

type FloorPlanWithMap = Prisma.FloorPlanGetPayload<{ include: typeof floorPlanWithMap }>;

/** Capture listing for the CMS - everything except the bulky raw samples. */
const captureSummary = {
  select: {
    id: true,
    deviceModel: true,
    platform: true,
    orientationDeg: true,
    durationMs: true,
    createdAt: true,
  },
  orderBy: { createdAt: 'asc' },
} satisfies Prisma.SurveyPoint$capturesArgs;

@Injectable()
export class PositioningService {
  constructor(private readonly prisma: PrismaService) {}

  // --- floor plans ---------------------------------------------------------

  async listFloorPlans() {
    return this.prisma.floorPlan.findMany({
      orderBy: { code: 'asc' },
      include: { _count: { select: { zones: true, surveyPoints: true } } },
    });
  }

  /** CMS editor view: the plan, its zones and their beacons, every survey point. */
  async getFloorPlan(id: string) {
    const plan = await this.prisma.floorPlan.findUnique({
      where: { id },
      include: {
        zones: {
          orderBy: { code: 'asc' },
          include: { beacons: { orderBy: { identifier: 'asc' } } },
        },
        surveyPoints: {
          orderBy: [{ kind: 'asc' }, { y: 'asc' }, { x: 'asc' }],
          include: { captures: captureSummary },
        },
      },
    });
    if (!plan) throw new FloorPlanNotFoundException(id);
    return plan;
  }

  async createFloorPlan(dto: CreateFloorPlanDto) {
    return this.prisma.floorPlan.create({
      data: {
        code: dto.code.toUpperCase().trim(),
        name: dto.name.trim(),
        level: dto.level ?? null,
        widthMeters: dto.widthMeters,
        heightMeters: dto.heightMeters,
        imageUrl: dto.imageUrl ?? null,
        ...(dto.positioningK === undefined ? {} : { positioningK: dto.positioningK }),
        ...(dto.fillDbm === undefined ? {} : { fillDbm: dto.fillDbm }),
      },
    });
  }

  async updateFloorPlan(id: string, dto: UpdateFloorPlanDto) {
    const plan = await this.assertFloorPlan(id);

    // Shrinking the room must not strand points, beacons or zone outlines
    // outside the walls - staff move those first.
    const width = dto.widthMeters ?? plan.widthMeters;
    const height = dto.heightMeters ?? plan.heightMeters;
    if (width < plan.widthMeters || height < plan.heightMeters) {
      const [points, zones] = await Promise.all([
        this.prisma.surveyPoint.findMany({ where: { floorPlanId: id } }),
        this.prisma.zone.findMany({ where: { floorPlanId: id }, include: { beacons: true } }),
      ]);
      const outside = outsideAfterResize(
        {
          points,
          beacons: zones.flatMap((zone) => zone.beacons),
          zones: zones.map((zone) => ({ code: zone.code, shape: readShape(zone.mapShape) })),
        },
        width,
        height,
      );
      if (outside.length > 0) {
        throw new SurveyPointOutsidePlanException(
          `Resizing to ${width} x ${height} m would leave ${outside.join(', ')} outside the room.`,
        );
      }
    }

    return this.prisma.floorPlan.update({ where: { id }, data: dto });
  }

  /** Zones stay (they simply leave the map); survey data goes with the plan. */
  async removeFloorPlan(id: string) {
    await this.assertFloorPlan(id);
    return this.prisma.floorPlan.delete({ where: { id } });
  }

  // --- survey points -------------------------------------------------------

  async createSurveyPoint(floorPlanId: string, dto: CreateSurveyPointDto) {
    const plan = await this.assertFloorPlan(floorPlanId);
    this.assertInside(plan, dto.x, dto.y);
    const kind = dto.kind ?? SurveyPointKind.REFERENCE;
    const label = dto.label?.trim() || (await this.nextLabel(floorPlanId, kind));

    return this.prisma.surveyPoint.create({
      data: { floorPlanId, label, x: dto.x, y: dto.y, kind },
      include: { captures: captureSummary },
    });
  }

  /**
   * Adds a regular grid of reference points. Positions already holding a point
   * are skipped, so running it twice never duplicates anything.
   */
  async generateGrid(floorPlanId: string, dto: GenerateGridDto) {
    const plan = await this.assertFloorPlan(floorPlanId);
    const existing = await this.prisma.surveyPoint.findMany({
      where: { floorPlanId },
      select: { x: true, y: true, label: true },
    });

    const grid = withUniqueLabels(
      withoutOccupied(
        generateGrid({
          widthMeters: plan.widthMeters,
          heightMeters: plan.heightMeters,
          spacing: dto.spacing,
          margin: dto.margin,
        }),
        existing,
      ),
      existing.map((point) => point.label),
    );

    if (grid.length > 0) {
      await this.prisma.surveyPoint.createMany({
        data: grid.map((point) => ({
          floorPlanId,
          label: point.label,
          x: point.x,
          y: point.y,
          kind: SurveyPointKind.REFERENCE,
        })),
      });
    }

    return { created: grid.length };
  }

  async updateSurveyPoint(id: string, dto: UpdateSurveyPointDto) {
    const point = await this.prisma.surveyPoint.findUnique({
      where: { id },
      include: { floorPlan: true },
    });
    if (!point) throw new SurveyPointNotFoundException(id);
    this.assertInside(point.floorPlan, dto.x ?? point.x, dto.y ?? point.y);
    return this.prisma.surveyPoint.update({
      where: { id },
      data: dto,
      include: { captures: captureSummary },
    });
  }

  async removeSurveyPoint(id: string) {
    await this.assertSurveyPoint(id);
    return this.prisma.surveyPoint.delete({ where: { id } });
  }

  // --- captures ------------------------------------------------------------

  async createCapture(pointId: string, dto: CreateSurveyCaptureDto) {
    await this.assertSurveyPoint(pointId);

    const payload = parseCapturePayload(dto.samples, dto.fingerprint);
    if (!payload.ok) throw new CaptureInvalidException(payload.reason);

    return this.prisma.surveyCapture.create({
      data: {
        pointId,
        deviceModel: dto.deviceModel.trim(),
        platform: dto.platform,
        orientationDeg: dto.orientationDeg ?? null,
        startedAt: new Date(dto.startedAt),
        durationMs: dto.durationMs,
        samples: payload.samples as unknown as Prisma.InputJsonValue,
        fingerprint: payload.fingerprint,
      },
      select: captureSummary.select,
    });
  }

  async removeCapture(id: string) {
    const capture = await this.prisma.surveyCapture.findUnique({ where: { id } });
    if (!capture) throw new SurveyCaptureNotFoundException(id);
    return this.prisma.surveyCapture.delete({ where: { id }, select: { id: true } });
  }

  // --- visitor app ---------------------------------------------------------

  async listPublicFloorPlans(): Promise<PublicFloorPlan[]> {
    const plans = await this.prisma.floorPlan.findMany({
      orderBy: { code: 'asc' },
      include: floorPlanWithMap,
    });
    return plans.map(toPublicFloorPlan);
  }

  /**
   * Reference fingerprints from every device. The phone picks the ones
   * recorded on its own model itself, falling back to its platform.
   */
  async listPublicFingerprints(floorPlanId: string): Promise<PublicFingerprint[]> {
    await this.assertFloorPlan(floorPlanId);
    const captures = await this.prisma.surveyCapture.findMany({
      where: { point: { floorPlanId, kind: SurveyPointKind.REFERENCE } },
      orderBy: { createdAt: 'asc' },
      select: {
        pointId: true,
        deviceModel: true,
        platform: true,
        orientationDeg: true,
        fingerprint: true,
      },
    });

    return captures.map((capture) => ({
      pointId: capture.pointId,
      deviceModel: capture.deviceModel,
      platform: capture.platform,
      orientationDeg: capture.orientationDeg,
      fingerprint: capture.fingerprint as FingerprintValues,
    }));
  }

  // --- evaluation ----------------------------------------------------------

  async exportDataset(floorPlanId: string): Promise<PositioningDataset> {
    const plan = await this.prisma.floorPlan.findUnique({
      where: { id: floorPlanId },
      include: floorPlanWithMap,
    });
    if (!plan) throw new FloorPlanNotFoundException(floorPlanId);

    const points = await this.prisma.surveyPoint.findMany({
      where: { floorPlanId },
      orderBy: [{ kind: 'asc' }, { label: 'asc' }],
      include: { captures: { orderBy: { createdAt: 'asc' } } },
    });

    return {
      exportedAt: new Date().toISOString(),
      floorPlan: toPublicFloorPlan(plan),
      beaconReach: Object.fromEntries(
        plan.zones.flatMap((zone) =>
          zone.beacons.map((beacon) => [beacon.identifier, beacon.minRssi]),
        ),
      ),
      points: points.map((point) => ({
        id: point.id,
        label: point.label,
        x: point.x,
        y: point.y,
        kind: point.kind,
        captures: point.captures.map((capture) => ({
          id: capture.id,
          deviceModel: capture.deviceModel,
          platform: capture.platform,
          orientationDeg: capture.orientationDeg,
          startedAt: capture.startedAt.toISOString(),
          durationMs: capture.durationMs,
          samples: capture.samples as unknown as RawSample[],
          fingerprint: capture.fingerprint as FingerprintValues,
        })),
      })),
    };
  }

  // -------------------------------------------------------------------------

  private async assertFloorPlan(id: string) {
    const plan = await this.prisma.floorPlan.findUnique({ where: { id } });
    if (!plan) throw new FloorPlanNotFoundException(id);
    return plan;
  }

  private assertInside(
    plan: { name: string; widthMeters: number; heightMeters: number },
    x: number,
    y: number,
  ) {
    if (!isOnPlan(x, y, plan.widthMeters, plan.heightMeters)) {
      throw new SurveyPointOutsidePlanException(
        `(${x}, ${y}) is outside "${plan.name}" (${plan.widthMeters} x ${plan.heightMeters} m).`,
      );
    }
  }

  private async assertSurveyPoint(id: string): Promise<void> {
    const count = await this.prisma.surveyPoint.count({ where: { id } });
    if (count === 0) throw new SurveyPointNotFoundException(id);
  }

  /** "T1", "T2", ... for test points; "P1", "P2", ... for hand-placed references. */
  private async nextLabel(floorPlanId: string, kind: SurveyPointKind): Promise<string> {
    const prefix = kind === SurveyPointKind.TEST ? 'T' : 'P';
    const labels = await this.prisma.surveyPoint.findMany({
      where: { floorPlanId, label: { startsWith: prefix } },
      select: { label: true },
    });
    const highest = labels.reduce((max, { label }) => {
      const value = Number(label.slice(prefix.length));
      return Number.isInteger(value) && value > max ? value : max;
    }, 0);
    return `${prefix}${highest + 1}`;
  }
}

function readShape(value: Prisma.JsonValue | null): MapShape | null {
  if (value === null) return null;
  const parsed = parseMapShape(value);
  return parsed.ok ? parsed.shape : null;
}

function toPublicFloorPlan(plan: FloorPlanWithMap): PublicFloorPlan {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    level: plan.level,
    widthMeters: plan.widthMeters,
    heightMeters: plan.heightMeters,
    imageUrl: plan.imageUrl,
    positioningK: plan.positioningK,
    fillDbm: plan.fillDbm,
    zones: plan.zones.map((zone) => ({
      code: zone.code,
      name: zone.name,
      mapShape: readShape(zone.mapShape),
    })),
    beacons: plan.zones.flatMap((zone) =>
      zone.beacons.map((beacon) => ({
        identifier: beacon.identifier,
        name: beacon.name,
        zoneCode: zone.code,
        mapX: beacon.mapX,
        mapY: beacon.mapY,
      })),
    ),
    referencePoints: plan.surveyPoints.map((point) => ({
      id: point.id,
      label: point.label,
      x: point.x,
      y: point.y,
    })),
  };
}
