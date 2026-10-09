import {
  InvalidDateRangeException,
  ScheduleOverlapException,
} from '../common/errors/app.exception';
import { findScheduleConflicts } from './schedule-conflict.validator';

export interface ScheduledAssignment {
  id: string;
  exhibitId: string;
  activeFrom: Date;
  activeTo: Date | null;
  autoEnd: boolean;
}

/** Reconnect automatic periods when inserting, moving or cancelling a future change.
 * Finished history and explicitly chosen end dates are never extended.
 */
export function normalizeSchedule<T extends ScheduledAssignment>(
  rows: readonly T[],
  now: Date,
): T[] {
  const sorted = rows
    .map((row) => ({ ...row }))
    .sort((a, b) => a.activeFrom.getTime() - b.activeFrom.getTime());
  const live = sorted.filter((row) => row.activeTo === null || row.activeTo > now);
  for (let i = 0; i < live.length; i++) {
    const row = live[i];
    if (live[i + 1] && row.activeFrom.getTime() === live[i + 1].activeFrom.getTime()) {
      throw new ScheduleOverlapException({ conflicts: [{ assignmentId: live[i + 1].id }] });
    }
    if (row.autoEnd) row.activeTo = live[i + 1]?.activeFrom ?? null;
    if (
      !Number.isFinite(row.activeFrom.getTime()) ||
      (row.activeTo && (!Number.isFinite(row.activeTo.getTime()) || row.activeTo <= row.activeFrom))
    ) {
      throw new InvalidDateRangeException();
    }
  }
  for (const row of live) {
    const conflicts = findScheduleConflicts(live, row);
    if (conflicts.length) {
      throw new ScheduleOverlapException({
        conflicts: conflicts.map((conflict) => ({
          assignmentId: conflict.id,
          activeFrom: conflict.activeFrom.toISOString(),
          activeTo: conflict.activeTo?.toISOString() ?? null,
        })),
      });
    }
  }
  return sorted;
}
