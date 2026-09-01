import { PlannerAssignment, planCurrentExhibitChange } from './current-exhibit.planner';

const at = (value: string): Date => new Date(value);

const row = (
  id: string,
  exhibitId: string,
  from: string,
  to: string | null,
): PlannerAssignment => ({
  id,
  exhibitId,
  activeFrom: at(from),
  activeTo: to === null ? null : at(to),
});

const NOW = at('2026-08-24T10:00:00Z');

describe('planCurrentExhibitChange', () => {
  it('creates the first assignment for an empty zone', () => {
    const plan = planCurrentExhibitChange([], 'exhibit-a', NOW);

    expect(plan).toEqual({
      unchanged: false,
      closeAssignmentId: null,
      deleteAssignmentIds: [],
      create: { exhibitId: 'exhibit-a', activeFrom: NOW },
    });
  });

  it('ends the current assignment and opens a new one', () => {
    const existing = [row('current', 'exhibit-a', '2026-01-01T00:00:00Z', null)];

    const plan = planCurrentExhibitChange(existing, 'exhibit-b', NOW);

    expect(plan.closeAssignmentId).toBe('current');
    expect(plan.create).toEqual({ exhibitId: 'exhibit-b', activeFrom: NOW });
    expect(plan.deleteAssignmentIds).toEqual([]);
  });

  it('keeps history rather than deleting the previous assignment', () => {
    const existing = [row('current', 'exhibit-a', '2026-01-01T00:00:00Z', null)];

    const plan = planCurrentExhibitChange(existing, 'exhibit-b', NOW);

    expect(plan.deleteAssignmentIds).not.toContain('current');
  });

  it('is a no-op when the zone already shows that exhibit', () => {
    const existing = [row('current', 'exhibit-a', '2026-01-01T00:00:00Z', null)];

    expect(planCurrentExhibitChange(existing, 'exhibit-a', NOW)).toEqual({
      unchanged: true,
      closeAssignmentId: null,
      deleteAssignmentIds: [],
      create: null,
    });
  });

  it('ignores closed assignments when deciding', () => {
    const existing = [
      row('old', 'exhibit-z', '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
      row('current', 'exhibit-a', '2026-06-01T00:00:00Z', null),
    ];

    const plan = planCurrentExhibitChange(existing, 'exhibit-b', NOW);

    expect(plan.closeAssignmentId).toBe('current');
    expect(plan.deleteAssignmentIds).toEqual([]);
  });

  it('removes assignments that were never on display', () => {
    const existing = [
      row('current', 'exhibit-a', '2026-01-01T00:00:00Z', null),
      row('future', 'exhibit-c', '2027-01-01T00:00:00Z', null),
    ];

    const plan = planCurrentExhibitChange(existing, 'exhibit-b', NOW);

    expect(plan.deleteAssignmentIds).toEqual(['future']);
    expect(plan.closeAssignmentId).toBe('current');
  });

  it('deletes rather than closes an assignment created in the same instant', () => {
    const existing = [row('just-created', 'exhibit-a', NOW.toISOString(), null)];

    const plan = planCurrentExhibitChange(existing, 'exhibit-b', NOW);

    // Closing it would produce a zero length interval.
    expect(plan.closeAssignmentId).toBeNull();
    expect(plan.deleteAssignmentIds).toEqual(['just-created']);
  });

  it('clears a zone by closing the current assignment and creating nothing', () => {
    const existing = [row('current', 'exhibit-a', '2026-01-01T00:00:00Z', null)];

    const plan = planCurrentExhibitChange(existing, null, NOW);

    expect(plan.closeAssignmentId).toBe('current');
    expect(plan.create).toBeNull();
    expect(plan.unchanged).toBe(false);
  });

  it('treats clearing an already empty zone as a no-op', () => {
    const existing = [row('old', 'exhibit-z', '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z')];

    expect(planCurrentExhibitChange(existing, null, NOW).unchanged).toBe(true);
  });

  it('never produces two open ended assignments', () => {
    const existing = [row('current', 'exhibit-a', '2026-01-01T00:00:00Z', null)];
    const plan = planCurrentExhibitChange(existing, 'exhibit-b', NOW);

    const remainingOpen = existing.filter(
      (assignment) =>
        assignment.activeTo === null &&
        assignment.id !== plan.closeAssignmentId &&
        !plan.deleteAssignmentIds.includes(assignment.id),
    );

    expect(remainingOpen).toHaveLength(0);
    expect(plan.create).not.toBeNull();
  });
});
