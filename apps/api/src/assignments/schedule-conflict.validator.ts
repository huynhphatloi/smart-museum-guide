import { Injectable } from '@nestjs/common';
import {
  InvalidDateRangeException,
  ScheduleOverlapException,
} from '../common/errors/app.exception';
import { intervalsOverlap } from '../common/utils/date.util';
import { PrismaService } from '../prisma/prisma.service';

export interface ScheduleInterval {
  id?: string;
  activeFrom: Date;
  activeTo: Date | null;
}

export interface ConflictCandidate extends ScheduleInterval {
  zoneId: string;
}

/**
 * Pure overlap detection over half open intervals `[activeFrom, activeTo)`.
 * `activeTo === null` means "open ended".
 *
 * Callers must pass only assignments belonging to the same zone - assignments
 * in different zones are independent and may freely overlap in time.
 */
export function findScheduleConflicts<T extends ScheduleInterval>(
  existing: readonly T[],
  candidate: ScheduleInterval,
): T[] {
  return existing.filter((row) => {
    if (candidate.id !== undefined && row.id === candidate.id) return false; // editing itself
    return intervalsOverlap(candidate.activeFrom, candidate.activeTo, row.activeFrom, row.activeTo);
  });
}

/**
 * Authoritative, database backed schedule validation.
 *
 * The admin UI performs the same check for instant feedback, but this service
 * is what actually protects the data: no zone may ever hold two exhibits at the
 * same moment in time.
 */
@Injectable()
export class ScheduleConflictValidator {
  constructor(private readonly prisma: PrismaService) {}

  /** Rejects an inverted or zero length range before touching the database. */
  assertValidRange(activeFrom: Date, activeTo: Date | null): void {
    if (Number.isNaN(activeFrom.getTime())) {
      throw new InvalidDateRangeException('"activeFrom" is not a valid date.');
    }
    if (activeTo === null) return;
    if (Number.isNaN(activeTo.getTime())) {
      throw new InvalidDateRangeException('"activeTo" is not a valid date.');
    }
    if (activeTo.getTime() <= activeFrom.getTime()) {
      throw new InvalidDateRangeException(
        'The end of the period must be strictly after its start.',
      );
    }
  }

  /**
   * Throws {@link ScheduleOverlapException} when the candidate period collides
   * with an existing assignment inside the same zone.
   */
  async assertNoConflict(candidate: ConflictCandidate): Promise<void> {
    this.assertValidRange(candidate.activeFrom, candidate.activeTo);

    // Narrow the query with SQL, then confirm with the pure rule so both paths
    // agree exactly.
    const potentiallyOverlapping = await this.prisma.exhibitAssignment.findMany({
      where: {
        zoneId: candidate.zoneId,
        ...(candidate.id ? { NOT: { id: candidate.id } } : {}),
        ...(candidate.activeTo ? { OR: [{ activeFrom: { lt: candidate.activeTo } }] } : {}),
      },
      select: {
        id: true,
        activeFrom: true,
        activeTo: true,
        exhibit: { select: { id: true, code: true, defaultTitle: true } },
      },
      orderBy: { activeFrom: 'asc' },
    });

    const conflicts = findScheduleConflicts(potentiallyOverlapping, {
      id: candidate.id,
      activeFrom: candidate.activeFrom,
      activeTo: candidate.activeTo,
    });

    if (conflicts.length > 0) {
      throw new ScheduleOverlapException({
        conflicts: conflicts.map((conflict) => ({
          assignmentId: conflict.id,
          exhibitCode: conflict.exhibit.code,
          exhibitTitle: conflict.exhibit.defaultTitle,
          activeFrom: conflict.activeFrom.toISOString(),
          activeTo: conflict.activeTo ? conflict.activeTo.toISOString() : null,
        })),
      });
    }
  }

  /**
   * Post-write invariant check: a zone must resolve to exactly one exhibit at
   * any instant. The CMS can no longer express an overlapping period, so this
   * exists to catch data that arrived some other way (a manual SQL edit, a
   * restored dump, a future code change).
   */
  async assertSingleActiveAssignment(zoneId: string, at: Date): Promise<void> {
    const active = await this.prisma.exhibitAssignment.findMany({
      where: {
        zoneId,
        activeFrom: { lte: at },
        OR: [{ activeTo: null }, { activeTo: { gt: at } }],
      },
      select: {
        id: true,
        activeFrom: true,
        activeTo: true,
        exhibit: { select: { id: true, code: true, defaultTitle: true } },
      },
    });

    if (active.length > 1) {
      throw new ScheduleOverlapException({
        conflicts: active.map((row) => ({
          assignmentId: row.id,
          exhibitCode: row.exhibit.code,
          exhibitTitle: row.exhibit.defaultTitle,
          activeFrom: row.activeFrom.toISOString(),
          activeTo: row.activeTo ? row.activeTo.toISOString() : null,
        })),
      });
    }
  }
}
