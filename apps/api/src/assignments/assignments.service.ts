import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ExhibitNotFoundException, ZoneNotFoundException } from '../common/errors/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentExhibitPlan, planCurrentExhibitChange } from './current-exhibit.planner';
import { ScheduleConflictValidator } from './schedule-conflict.validator';

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
 * There is no scheduling UI any more: staff set what is currently in a room and
 * the service maintains the underlying dated assignments, so BLE and QR keep
 * resolving through the same rule and the museum keeps a record of what was
 * displayed when.
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
    now: Date = new Date(),
  ): Promise<{ plan: CurrentExhibitPlan; current: AssignmentWithRelations | null }> {
    const zone = await this.prisma.zone.count({ where: { id: zoneId } });
    if (zone === 0) throw new ZoneNotFoundException(zoneId);

    if (exhibitId !== null) {
      const exhibit = await this.prisma.exhibit.count({ where: { id: exhibitId } });
      if (exhibit === 0) throw new ExhibitNotFoundException(exhibitId);
    }

    const existing = await this.prisma.exhibitAssignment.findMany({
      where: { zoneId },
      select: { id: true, exhibitId: true, activeFrom: true, activeTo: true },
    });

    const plan = planCurrentExhibitChange(existing, exhibitId, now);

    if (!plan.unchanged) {
      await this.prisma.$transaction(async (tx) => {
        if (plan.deleteAssignmentIds.length > 0) {
          await tx.exhibitAssignment.deleteMany({
            where: { id: { in: plan.deleteAssignmentIds } },
          });
        }
        if (plan.closeAssignmentId) {
          await tx.exhibitAssignment.update({
            where: { id: plan.closeAssignmentId },
            data: { activeTo: now },
          });
        }
        if (plan.create) {
          await tx.exhibitAssignment.create({
            data: {
              zoneId,
              exhibitId: plan.create.exhibitId,
              activeFrom: plan.create.activeFrom,
              activeTo: null,
            },
          });
        }
      });

      // Safety net: the invariant "one exhibit per zone at any instant" is still
      // checked against the database after the write, even though the UI can no
      // longer express an overlapping period.
      if (plan.create) {
        await this.conflicts.assertSingleActiveAssignment(zoneId, now);
      }
    }

    const current = await this.prisma.exhibitAssignment.findFirst({
      where: { zoneId, activeTo: null },
      include: assignmentInclude,
      orderBy: { activeFrom: 'desc' },
    });

    return { plan, current };
  }
}
