/**
 * Parses an ISO date/date-time string into a Date, returning `undefined`
 * for empty input and throwing for malformed input.
 */
export function parseIsoDate(value: string | null | undefined, field: string): Date | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`"${field}" is not a valid ISO date: ${value}`);
  }
  return parsed;
}

/**
 * Half open interval overlap test for `[aFrom, aTo)` and `[bFrom, bTo)`,
 * where a `null` end means "open ended / forever".
 *
 * Two intervals overlap when each one starts before the other one ends.
 */
export function intervalsOverlap(
  aFrom: Date,
  aTo: Date | null,
  bFrom: Date,
  bTo: Date | null,
): boolean {
  const aStartsBeforeBEnds = bTo === null || aFrom.getTime() < bTo.getTime();
  const bStartsBeforeAEnds = aTo === null || bFrom.getTime() < aTo.getTime();
  return aStartsBeforeBEnds && bStartsBeforeAEnds;
}
