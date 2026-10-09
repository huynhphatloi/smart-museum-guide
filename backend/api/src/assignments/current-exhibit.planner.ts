import { selectActiveAssignment } from '../exhibits/exhibit-resolver.service';

export interface PlannerAssignment {
  id: string;
  exhibitId: string;
  activeFrom: Date;
  activeTo: Date | null;
}

/**
 * What has to happen to make `exhibitId` the exhibit on display in a zone.
 * `exhibitId === null` means "clear this zone".
 */
export interface CurrentExhibitPlan {
  /** True when the zone already shows exactly this, and nothing needs writing. */
  unchanged: boolean;
  /** Assignment to end at `now` (it becomes history). */
  closeAssignmentId: string | null;
  /** Assignments to remove outright - rows that never went on display. */
  deleteAssignmentIds: string[];
  /** New open ended assignment to create. */
  create: { exhibitId: string; activeFrom: Date; activeTo: Date | null; autoEnd: boolean } | null;
}

/**
 * Pure decision step behind "set the current exhibit for this zone".
 *
 * Immediate changes keep all upcoming schedules. The replacement remains on
 * display until the next scheduled start, while the previous exhibit becomes history.
 *
 * Rules:
 *  - the assignment currently on display is *ended*, not deleted, so history survives
 *  - future assignments remain untouched
 *  - an assignment created in the same instant is deleted rather than closed,
 *    so a double click cannot produce a zero-length interval
 */
export function planCurrentExhibitChange(
  existing: readonly PlannerAssignment[],
  exhibitId: string | null,
  now: Date,
): CurrentExhibitPlan {
  const active = selectActiveAssignment(existing, now);
  const future = existing.filter((assignment) => assignment.activeFrom.getTime() > now.getTime());

  const deleteAssignmentIds: string[] = [];
  const nextStart = future.reduce<Date | null>(
    (next, assignment) => (!next || assignment.activeFrom < next ? assignment.activeFrom : next),
    null,
  );
  let closeAssignmentId: string | null = null;

  if (active) {
    if (active.activeFrom.getTime() >= now.getTime()) {
      deleteAssignmentIds.push(active.id);
    } else {
      closeAssignmentId = active.id;
    }
  }

  const alreadyCorrect =
    exhibitId !== null &&
    active !== null &&
    active.exhibitId === exhibitId &&
    deleteAssignmentIds.length === 0;

  if (alreadyCorrect) {
    return { unchanged: true, closeAssignmentId: null, deleteAssignmentIds: [], create: null };
  }

  const clearing = exhibitId === null;
  if (clearing && active === null && deleteAssignmentIds.length === 0) {
    return { unchanged: true, closeAssignmentId: null, deleteAssignmentIds: [], create: null };
  }

  return {
    unchanged: false,
    closeAssignmentId,
    deleteAssignmentIds,
    create: clearing
      ? null
      : {
          exhibitId: exhibitId as string,
          activeFrom: now,
          activeTo: nextStart,
          autoEnd: true,
        },
  };
}
