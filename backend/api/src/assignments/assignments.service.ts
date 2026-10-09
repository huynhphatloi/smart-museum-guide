import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  ExhibitNotFoundException,
  ExhibitNotPublishedException,
  InvalidDateRangeException,
  ZoneNotFoundException,
} from '../common/errors/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentExhibitPlan, planCurrentExhibitChange } from './current-exhibit.planner';
import { ScheduleConflictValidator } from './schedule-conflict.validator';
import { normalizeSchedule, ScheduledAssignment } from './schedule.planner';
import type { ScheduleExhibitDto } from './schedule.controller';

const assignmentInclude = {
  zone: { select: { id: true, code: true, name: true } },
  exhibit: { select: { id: true, code: true, defaultTitle: true, status: true } },
} satisfies Prisma.ExhibitAssignmentInclude;

export type AssignmentWithRelations = Prisma.ExhibitAssignmentGetPayload<{
  include: typeof assignmentInclude;
}>;

/**
 * Owns the zone -> exhibit link over time.
 *
 * Immediate and future changes share the dated assignment model. All changes
 * lock the zone inside a transaction so simultaneous writes cannot overlap.
 */
@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conflicts: ScheduleConflictValidator,
  ) {}

  /** Full history for a zone, newest first. */
  historyForZone(zoneId: string): Promise<AssignmentWithRelations[]> {
    return this.prisma.exhibitAssignment.findMany({
      where: { zoneId },
      include: assignmentInclude,
      orderBy: { activeFrom: 'desc' },
    });
  }

  /** Every zone an exhibit is or was displayed in. */
  historyForExhibit(exhibitId: string): Promise<AssignmentWithRelations[]> {
    return this.prisma.exhibitAssignment.findMany({
      where: { exhibitId },
      include: assignmentInclude,
      orderBy: { activeFrom: 'desc' },
    });
  }

  /**
   * Makes `exhibitId` the exhibit on display in `zoneId` right now.
   * Pass `null` to empty the zone.
   */
  async setCurrentExhibit(
    zoneId: string,
    exhibitId: string | null,
    at?: Date,
  ): Promise<{ plan: CurrentExhibitPlan; current: AssignmentWithRelations | null }> {
    return this.withZoneLock(zoneId, async (tx) => {
      const now = at ?? new Date();
      if (exhibitId !== null) await this.assertPublished(tx, exhibitId);
      const existing = await tx.exhibitAssignment.findMany({ where: { zoneId } });
      const plan = planCurrentExhibitChange(existing, exhibitId, now);
      if (!plan.unchanged) {
        const remaining = existing
          .filter((row) => !plan.deleteAssignmentIds.includes(row.id))
          .map((row) =>
            row.id === plan.closeAssignmentId ? { ...row, activeTo: now, autoEnd: false } : row,
          );
        const next: ScheduledAssignment[] = [...remaining];
        if (plan.create) next.push({ id: randomUUID(), ...plan.create });
        await this.persistSchedule(tx, zoneId, existing, normalizeSchedule(next, now));
      }
      const current = await tx.exhibitAssignment.findFirst({
        where: {
          zoneId,
          activeFrom: { lte: now },
          OR: [{ activeTo: null }, { activeTo: { gt: now } }],
        },
        include: assignmentInclude,
        orderBy: { activeFrom: 'desc' },
      });
      return { plan, current };
    });
  }

  async scheduleForZone(zoneId: string) {
    if (!(await this.prisma.zone.count({ where: { id: zoneId } })))
      throw new ZoneNotFoundException(zoneId);
    return this.historyForZone(zoneId);
  }

  async saveScheduledExhibit(zoneId: string, dto: ScheduleExhibitDto, id?: string) {
    const activeFrom = new Date(dto.activeFrom);
    const activeTo = dto.activeTo ? new Date(dto.activeTo) : null;
    this.conflicts.assertValidRange(activeFrom, activeTo);
    return this.withZoneLock(zoneId, async (tx) => {
      const now = new Date();
      if (activeFrom <= now)
        throw new InvalidDateRangeException('Choose a future start time, or use Change now.');
      await this.assertPublished(tx, dto.exhibitId);
      const existing = await tx.exhibitAssignment.findMany({ where: { zoneId } });
      if (id) this.assertUpcoming(existing, id, now);
      const assignmentId = id ?? randomUUID();
      const candidate: ScheduledAssignment = {
        id: assignmentId,
        exhibitId: dto.exhibitId,
        activeFrom,
        activeTo,
        autoEnd: activeTo === null,
      };
      const next = normalizeSchedule([...existing.filter((row) => row.id !== id), candidate], now);
      await this.persistSchedule(tx, zoneId, existing, next);
      return tx.exhibitAssignment.findUnique({
        where: { id: assignmentId },
        include: assignmentInclude,
      });
    });
  }

  async cancelScheduledExhibit(zoneId: string, id: string) {
    return this.withZoneLock(zoneId, async (tx) => {
      const now = new Date();
      const existing = await tx.exhibitAssignment.findMany({ where: { zoneId } });
      this.assertUpcoming(existing, id, now);
      await this.persistSchedule(
        tx,
        zoneId,
        existing,
        normalizeSchedule(
          existing.filter((row) => row.id !== id),
          now,
        ),
      );
      return { cancelled: true };
    });
  }

  private assertUpcoming(rows: ScheduledAssignment[], id: string, now: Date) {
    const row = rows.find((assignment) => assignment.id === id);
    if (!row) throw new NotFoundException('Scheduled exhibit not found in this zone.');
    if (row.activeFrom <= now)
      throw new InvalidDateRangeException(
        'This period has already started. Use Change now; display history cannot be edited.',
      );
  }

  private async assertPublished(tx: Prisma.TransactionClient, exhibitId: string) {
    const exhibit = await tx.exhibit.findUnique({
      where: { id: exhibitId },
      select: { status: true },
    });
    if (!exhibit) throw new ExhibitNotFoundException(exhibitId);
    if (exhibit.status !== 'PUBLISHED') throw new ExhibitNotPublishedException(exhibitId);
  }

  private withZoneLock<T>(zoneId: string, action: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(async (tx) => {
      const zones = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM zones WHERE id = ${zoneId} FOR UPDATE`;
      if (!zones.length) throw new ZoneNotFoundException(zoneId);
      return action(tx);
    });
  }

  private async persistSchedule(
    tx: Prisma.TransactionClient,
    zoneId: string,
    existing: ScheduledAssignment[],
    next: ScheduledAssignment[],
  ) {
    const removed = existing.filter((row) => !next.some((candidate) => candidate.id === row.id));
    if (removed.length)
      await tx.exhibitAssignment.deleteMany({
        where: { id: { in: removed.map((row) => row.id) }, zoneId },
      });
    for (const row of next) {
      const before = existing.find((candidate) => candidate.id === row.id);
      const data = {
        exhibitId: row.exhibitId,
        activeFrom: row.activeFrom,
        activeTo: row.activeTo,
        autoEnd: row.autoEnd,
      };
      if (!before) {
        await tx.exhibitAssignment.create({ data: { id: row.id, zoneId, ...data } });
      } else if (
        before.exhibitId !== row.exhibitId ||
        before.activeFrom.getTime() !== row.activeFrom.getTime() ||
        before.activeTo?.getTime() !== row.activeTo?.getTime() ||
        before.autoEnd !== row.autoEnd
      ) {
        await tx.exhibitAssignment.update({ where: { id: row.id }, data });
      }
    }
  }
}
