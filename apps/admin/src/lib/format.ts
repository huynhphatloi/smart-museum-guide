import { format, isValid, parseISO } from 'date-fns';

export function formatDate(value: string | null | undefined, fallback = 'Open ended'): string {
  if (!value) return fallback;
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, 'dd MMM yyyy') : fallback;
}

export function formatDateTime(value: string | null | undefined, fallback = '-'): string {
  if (!value) return fallback;
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, 'dd MMM yyyy HH:mm') : fallback;
}

/** `2026-01-01T00:00:00.000Z` -> `2026-01-01`, for <input type="date">. */
export function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

/** `2026-01-01` -> ISO instant at UTC midnight, matching the backend's model. */
export function fromDateInput(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

export function formatPeriod(from: string, to: string | null): string {
  return `${formatDate(from)} → ${to ? formatDate(to) : 'open ended'}`;
}
