import type { ZoneDetail } from '@/lib/types';

export function dateInput(value: string | Date): string {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Suggest the next slot after the latest period, without changing existing dates. */
export function defaultScheduleStart(
  zone: Pick<ZoneDetail, 'currentAssignment' | 'upcoming'>,
  now = new Date(),
): string {
  const latest = [...zone.upcoming, ...(zone.currentAssignment ? [zone.currentAssignment] : [])]
    .sort((a, b) => Date.parse(b.activeFrom) - Date.parse(a.activeFrom))[0];

  if (latest?.activeTo && Date.parse(latest.activeTo) > now.getTime()) {
    // The form has minute precision; never round an existing end backwards.
    return dateInput(new Date(Math.ceil(Date.parse(latest.activeTo) / 60_000) * 60_000));
  }
  if (latest && Date.parse(latest.activeFrom) > now.getTime()) {
    // An open-ended period has no last end. Allow it one calendar day before
    // suggesting another switch, so we never duplicate its start timestamp.
    const next = new Date(latest.activeFrom);
    next.setDate(next.getDate() + 1);
    return dateInput(next);
  }
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return dateInput(next);
}
