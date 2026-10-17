import { BadRequestException } from '@nestjs/common';
import { AnalyticsQueryDto } from './analytics.dto';

const DAY = 86_400_000;
export const ANALYTICS_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function localDate(now: Date): string {
  return new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

export function analyticsRange(query: AnalyticsQueryDto, now = new Date()) {
  const to = query.to ?? localDate(now);
  const from = query.from ?? localDate(new Date(now.getTime() - 6 * DAY));
  const parse = (value: string) => {
    const utc = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0, 10) !== value)
      throw new BadRequestException('Invalid calendar date.');
    return new Date(`${value}T00:00:00+07:00`);
  };
  const start = parse(from);
  const end = new Date(parse(to).getTime() + DAY);
  const days = (end.getTime() - start.getTime()) / DAY;
  if (days < 1 || days > 366)
    throw new BadRequestException('Select a date range between 1 and 366 days.');
  return { from, to, start, end, days, timeZone: ANALYTICS_TIME_ZONE };
}
