import { analyticsRange, localDate } from './analytics-range';

describe('Vietnam analytics dates', () => {
  it('starts a local day at 17:00 UTC on the preceding date', () => {
    const range = analyticsRange({ from: '2026-10-17', to: '2026-10-17' });
    expect(range.start.toISOString()).toBe('2026-10-16T17:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-10-17T17:00:00.000Z');
    expect(range.days).toBe(1);
  });
  it('uses the Vietnam date around UTC midnight and supplies seven days', () => {
    const now = new Date('2026-10-16T18:00:00Z');
    expect(localDate(now)).toBe('2026-10-17');
    expect(analyticsRange({}, now)).toMatchObject({ from: '2026-10-11', to: '2026-10-17' });
  });
  it.each([
    { from: '2026-02-30', to: '2026-03-01' },
    { from: '2026-10-18', to: '2026-10-17' },
    { from: '2025-01-01', to: '2026-01-02' },
  ])('rejects impossible/reversed/oversized ranges: %s', (query) => {
    expect(() => analyticsRange(query)).toThrow();
  });
});
