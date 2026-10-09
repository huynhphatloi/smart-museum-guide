import { normalizeSchedule, ScheduledAssignment } from './schedule.planner';
import { selectActiveAssignment } from '../exhibits/exhibit-resolver.service';

const NOW = new Date('2026-10-09T03:00:00Z');
const first = new Date('2026-10-10T02:00:00Z');
const second = new Date('2026-10-11T02:00:00Z');
const row = (
  id: string,
  from: Date,
  to: Date | null = null,
  autoEnd = true,
): ScheduledAssignment => ({
  id,
  exhibitId: id,
  activeFrom: from,
  activeTo: to,
  autoEnd,
});

describe('display scheduling', () => {
  it('ends the current period at the future switch and resolves the exact boundary without a cron job', () => {
    const next = normalizeSchedule([row('current', NOW), row('next', first)], NOW);
    expect(next[0].activeTo).toEqual(first);
    expect(selectActiveAssignment(next, new Date(first.getTime() - 1))?.id).toBe('current');
    expect(selectActiveAssignment(next, first)?.id).toBe('next');
  });

  it('inserts between automatic periods without overlaps', () => {
    const next = normalizeSchedule(
      [row('current', NOW, second), row('last', second), row('inserted', first)],
      NOW,
    );
    expect(next.map((entry) => [entry.id, entry.activeTo])).toEqual([
      ['current', first],
      ['inserted', second],
      ['last', null],
    ]);
  });

  it('restores the current open end when the only future change is cancelled', () => {
    const next = normalizeSchedule([row('current', NOW, first)], NOW);
    expect(next[0].activeTo).toBeNull();
  });

  it('reconnects the predecessor after moving a future change', () => {
    const next = normalizeSchedule([row('current', NOW, first), row('moved', second)], NOW);
    expect(next[0].activeTo).toEqual(second);
  });

  it('preserves finished history while reconnecting live periods', () => {
    const past = row('past', new Date('2026-09-01T00:00:00Z'), new Date('2026-09-02T00:00:00Z'));
    const next = normalizeSchedule([past, row('current', NOW, first)], NOW);
    expect(next[0]).toEqual(past);
    expect(next[1].activeTo).toBeNull();
  });

  it('preserves an explicitly chosen end, including a deliberately empty gap', () => {
    const end = new Date(NOW.getTime() + 60_000);
    const next = normalizeSchedule([row('current', NOW, end, false), row('next', first)], NOW);
    expect(next[0].activeTo).toEqual(end);
    expect(selectActiveAssignment(next, new Date(end.getTime() + 1))).toBeNull();
  });

  it('rejects a fixed period extending into another scheduled exhibit', () => {
    expect(() =>
      normalizeSchedule(
        [row('first', first, new Date(second.getTime() + 1), false), row('next', second)],
        NOW,
      ),
    ).toThrow(/another exhibit/);
  });

  it('allows adjacent fixed periods', () => {
    expect(
      normalizeSchedule([row('first', first, second, false), row('next', second)], NOW),
    ).toHaveLength(2);
  });

  it('rejects identical start times even for automatic periods', () => {
    expect(() => normalizeSchedule([row('a', first), row('b', first)], NOW)).toThrow(
      /another exhibit/,
    );
  });

  it('does not mutate the input rows when adjusting their ends', () => {
    const current = row('current', NOW);
    normalizeSchedule([current, row('next', first)], NOW);
    expect(current.activeTo).toBeNull();
  });
});
