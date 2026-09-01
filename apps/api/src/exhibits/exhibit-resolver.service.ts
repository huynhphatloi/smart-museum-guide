import { Injectable } from '@nestjs/common';
import { ExhibitStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AssignmentWithExhibit, ExhibitResolution } from './exhibit.types';

/**
 * Pure selection step, extracted so it can be unit tested without a database.
 *
 * An assignment is active at `at` when:
 *   activeFrom <= at  AND  (activeTo IS NULL OR at < activeTo)
 *
 * The interval is half open on purpose: an assignment ending on 2026-04-01T00:00
 * and the next one starting at the same instant do not overlap, and there is
 * never a moment where two exhibits are both "current".
 *
 * If the data somehow contains several matches (legacy rows, manual SQL), the
 * one with the latest `activeFrom` wins so behaviour stays deterministic.
 */
export function selectActiveAssignment<T extends { activeFrom: Date; activeTo: Date | null }>(
  assignments: readonly T[],
  at: Date,
): T | null {
  const timestamp = at.getTime();

  const candidates = assignments.filter((assignment) => {
    const from = assignment.activeFrom.getTime();
    const to = assignment.activeTo === null ? null : assignment.activeTo.getTime();
    return from <= timestamp && (to === null || timestamp < to);
  });

  if (candidates.length === 0) return null;

  return candidates.reduce((best, current) =>
    current.activeFrom.getTime() > best.activeFrom.getTime() ? current : best,
  );
}

/**
 * The single source of truth for "which exhibit is on display in zone X at
 * time T". BLE resolution, QR resolution and the admin dashboard all call this
 * service - the rule is never duplicated inside a controller.
 */
@Injectable()
export class ExhibitResolverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the assignment active in a zone at a given timestamp.
   *
   * @param options.requirePublished when true (the visitor facing default) a
   *   DRAFT or ARCHIVED exhibit is reported as EXHIBIT_NOT_PUBLISHED instead of
   *   being returned. The admin CMS calls it with `false` so staff can see what
   *   is scheduled even before publishing.
   */
  async resolveActiveExhibit(
    zoneId: string,
    at: Date = new Date(),
    options: { requirePublished?: boolean } = {},
  ): Promise<ExhibitResolution> {
    const requirePublished = options.requirePublished ?? true;

    // Push the interval predicate into SQL, then apply the same rule in
    // `selectActiveAssignment` to pick a winner deterministically.
    const assignments = (await this.prisma.exhibitAssignment.findMany({
      where: {
        zoneId,
        activeFrom: { lte: at },
        OR: [{ activeTo: null }, { activeTo: { gt: at } }],
      },
      orderBy: { activeFrom: 'desc' },
      select: {
        id: true,
        zoneId: true,
        exhibitId: true,
        activeFrom: true,
        activeTo: true,
        exhibit: {
          select: { id: true, code: true, defaultTitle: true, status: true },
        },
      },
    })) as AssignmentWithExhibit[];

    const active = selectActiveAssignment(assignments, at);

    if (!active) {
      return { reason: 'NO_ASSIGNMENT', assignment: null };
    }

    if (requirePublished && active.exhibit.status !== ExhibitStatus.PUBLISHED) {
      return { reason: 'EXHIBIT_NOT_PUBLISHED', assignment: active };
    }

    return { reason: 'RESOLVED', assignment: active };
  }

  /**
   * Zone view used by the admin CMS: what is on display now, and what stood
   * here before it. Staff no longer schedule ahead, so there is no "upcoming" -
   * but the record of what was displayed when is kept.
   */
  async getZoneTimeline(zoneId: string, at: Date = new Date(), historyLimit = 20) {
    const [current, history] = await Promise.all([
      this.resolveActiveExhibit(zoneId, at, { requirePublished: false }),
      this.prisma.exhibitAssignment.findMany({
        where: { zoneId, activeTo: { not: null, lte: at } },
        orderBy: { activeFrom: 'desc' },
        take: historyLimit,
        include: {
          exhibit: { select: { id: true, code: true, defaultTitle: true, status: true } },
        },
      }),
    ]);

    return { current: current.assignment, currentReason: current.reason, history };
  }
}
