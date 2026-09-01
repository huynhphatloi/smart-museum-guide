import { intervalsOverlap, parseIsoDate } from './date.util';

const at = (value: string): Date => new Date(value);

describe('intervalsOverlap', () => {
  it('detects overlap of two bounded intervals', () => {
    expect(
      intervalsOverlap(
        at('2026-01-01T00:00:00Z'),
        at('2026-03-01T00:00:00Z'),
        at('2026-02-01T00:00:00Z'),
        at('2026-04-01T00:00:00Z'),
      ),
    ).toBe(true);
  });

  it('treats touching intervals as non overlapping', () => {
    expect(
      intervalsOverlap(
        at('2026-01-01T00:00:00Z'),
        at('2026-03-01T00:00:00Z'),
        at('2026-03-01T00:00:00Z'),
        at('2026-04-01T00:00:00Z'),
      ),
    ).toBe(false);
  });

  it('handles open ended intervals on either side', () => {
    expect(
      intervalsOverlap(at('2026-01-01T00:00:00Z'), null, at('2030-01-01T00:00:00Z'), null),
    ).toBe(true);
    expect(
      intervalsOverlap(
        at('2026-01-01T00:00:00Z'),
        at('2026-02-01T00:00:00Z'),
        at('2030-01-01T00:00:00Z'),
        null,
      ),
    ).toBe(false);
  });
});

describe('parseIsoDate', () => {
  it('returns undefined for empty input', () => {
    expect(parseIsoDate(null, 'activeTo')).toBeUndefined();
    expect(parseIsoDate('', 'activeTo')).toBeUndefined();
  });

  it('parses a valid ISO string', () => {
    expect(parseIsoDate('2026-01-01T00:00:00Z', 'activeFrom')?.toISOString()).toBe(
      '2026-01-01T00:00:00.000Z',
    );
  });

  it('throws on malformed input', () => {
    expect(() => parseIsoDate('not-a-date', 'activeFrom')).toThrow(/activeFrom/);
  });
});
