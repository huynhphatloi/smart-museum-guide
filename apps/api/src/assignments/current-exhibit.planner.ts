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
  create: { exhibitId: string; activeFrom: Date } | null;
}

/**
 * Pure decision step behind "set the current exhibit for this zone".
 *
 * The museum's staff no longer think in date ranges - they pick what is in the
 * room. Underneath, the dated assignment model is preserved, because that is
 * what lets a beacon and a QR code stay fixed while exhibits rotate, and what
 * keeps a record of what stood where.
 *
 * Rules:
 *  - the assignment currently on display is *ended*, not deleted, so history survives
 *  - an assignment that has not started yet is deleted, since nothing ever saw it
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

  const deleteAssignmentIds = future.map((assignment) => assignment.id);
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
    active.activeTo === null &&
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
    create: clearing ? null : { exhibitId: exhibitId as string, activeFrom: now },
  };
}
