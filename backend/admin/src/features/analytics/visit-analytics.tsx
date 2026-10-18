'use client';

import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiFetch } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { analyticsCopy } from './copy';
import { VisitAnalytics } from './types';
import { VisitMultiplier } from './visit-multiplier';

const DAY = 86_400_000;
function dateRange(days: number) {
  const now = Date.now() + 7 * 3_600_000;
  return {
    from: new Date(now - (days - 1) * DAY).toISOString().slice(0, 10),
    to: new Date(now).toISOString().slice(0, 10),
  };
}

export function VisitAnalyticsPanel() {
  const { language } = useI18n();
  const copy = analyticsCopy[language];
  const [filters, setFilters] = useState(() => ({ ...dateRange(7), source: '' }));
  const [draft, setDraft] = useState(filters);
  const [page, setPage] = useState(1);
  const [rangeError, setRangeError] = useState(false);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['visit-analytics', filters, page],
    queryFn: () =>
      apiFetch<VisitAnalytics>(
        `/admin/analytics?${new URLSearchParams({
          from: filters.from,
          to: filters.to,
          page: String(page),
          ...(filters.source ? { source: filters.source } : {}),
        })}`,
      ),
    refetchInterval: 60_000,
  });
  const locale = language === 'vi' ? 'vi-VN' : 'en-GB';
  const number = (n: number) => n.toLocaleString(locale);
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value.length === 10 ? `${value}T00:00:00+07:00` : value));
  const time = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(value));
  const sourceLabel = (value: string) => (value === 'MANUAL' ? copy.manual : value);
  const hourLabel = (hour: number) =>
    `${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00`;
  function apply(event: FormEvent) {
    event.preventDefault();
    const span = (Date.parse(draft.to) - Date.parse(draft.from)) / DAY + 1;
    if (!Number.isFinite(span) || span < 1 || span > 366) {
      setRangeError(true);
      return;
    }
    setRangeError(false);
    setFilters(draft);
    setPage(1);
  }
  function quick(days: number) {
    const next = { ...dateRange(days), source: draft.source };
    setDraft(next);
    setFilters(next);
    setPage(1);
    setRangeError(false);
  }
  const peak = Math.max(1, ...(data?.hourly.map((row) => row.converted.visits) ?? []));
  const busiest = data?.daily.reduce((best, row) => (row.visits > best.visits ? row : best), {
    date: '',
    visits: 0,
    converted: { visits: 0 },
  });
  const pages = Math.max(1, Math.ceil((data?.history.total ?? 0) / 25));
  const multiplier = data?.conversion.visitMultiplier ?? 1;
  const convertedLabel = (label: string) => `${label} (×${multiplier})`;

  return (
    <section aria-labelledby="access-heading" className="space-y-6 border-y border-border py-7">
      <header className="space-y-1">
        <h2 id="access-heading" className="font-serif text-2xl font-medium">
          {copy.title}
        </h2>
        <p className="text-sm text-muted-foreground">{copy.hint}</p>
      </header>
      <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          {' '}
          <span className="block">{copy.from}</span>
          <Input
            type="date"
            required
            value={draft.from}
            max={draft.to}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            className="w-40"
          />
        </label>
        <label className="space-y-1 text-sm">
          {' '}
          <span className="block">{copy.to}</span>
          <Input
            type="date"
            required
            value={draft.to}
            min={draft.from}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            className="w-40"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block">{copy.channel}</span>
          <select
            value={draft.source}
            onChange={(e) => setDraft({ ...draft, source: e.target.value })}
            className="h-10 rounded-md border border-input bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{copy.all}</option>
            <option value="QR">QR</option>
            <option value="BLE">BLE</option>
            <option value="MANUAL">{copy.manual}</option>
          </select>
        </label>
        <Button type="submit" disabled={isFetching}>
          {copy.apply}
        </Button>
        <div className="flex flex-wrap gap-1" aria-label={copy.title}>
          {[
            { days: 1, label: copy.today },
            { days: 7, label: copy.week },
            { days: 30, label: copy.month },
          ].map((item) => (
            <Button
              type="button"
              variant="outline"
              size="sm"
              key={item.days}
              onClick={() => quick(item.days)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        {rangeError ? (
          <p role="alert" className="basis-full text-sm text-destructive">
            {copy.rangeError}
          </p>
        ) : null}
      </form>
      {isLoading ? (
        <div aria-busy="true" className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-64" />
        </div>
      ) : error || !data ? (
        <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
          {copy.error}
          <Button variant="outline" onClick={() => void refetch()}>
            {copy.retry}
          </Button>
        </div>
      ) : (
        <>
          <VisitMultiplier value={multiplier} />
          <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-6">
            {[
              { label: copy.visits, value: data.totals.visits },
              { label: convertedLabel(copy.converted), value: data.totals.converted.visits },
              { label: copy.devices, value: data.totals.devices },
              { label: convertedLabel('QR'), value: data.totals.converted.qr },
              { label: convertedLabel('BLE'), value: data.totals.converted.ble },
              { label: convertedLabel(copy.manual), value: data.totals.converted.manual },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-sm text-muted-foreground">{item.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{number(item.value)}</dd>
              </div>
            ))}
          </dl>
          <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground">{copy.rule}</p>
          {data.totals.visits === 0 ? (
            <div className="space-y-2 border border-dashed border-border p-6">
              <h3 className="font-medium">{copy.empty}</h3>
              <p className="max-w-2xl text-sm text-muted-foreground">{copy.emptyHint}</p>
            </div>
          ) : null}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">{copy.hourly}</h3>
              <p className="text-xs text-muted-foreground">{copy.hourlyHint}</p>
            </div>
            <div className="overflow-x-auto pb-2">
              <ol
                aria-label={copy.hourly}
                className="grid min-w-[560px] grid-cols-[repeat(24,minmax(0,1fr))] items-end gap-1"
              >
                {data.hourly.map((row) => (
                  <li
                    key={row.hour}
                    aria-label={`${hourLabel(row.hour)}: ${number(row.converted.visits)} ${copy.converted}, ${number(row.visits)} ${copy.visits}`}
                    title={`${hourLabel(row.hour)}: ${number(row.converted.visits)} ${copy.converted}, ${number(row.visits)} ${copy.visits}`}
                  >
                    <div
                      aria-hidden="true"
                      className="flex h-36 flex-col items-center justify-end gap-1"
                    >
                      <span className="text-[10px] tabular-nums">{row.converted.visits || ''}</span>
                      <div
                        className="w-full bg-primary/80"
                        style={{ height: row.visits ? Math.max(3, (row.converted.visits / peak) * 112) : 1 }}
                      />
                    </div>
                    <span
                      aria-hidden="true"
                      className="mt-2 block text-center text-[10px] tabular-nums text-muted-foreground"
                    >
                      {String(row.hour).padStart(2, '0')}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <p className="text-sm">
              <span className="text-muted-foreground">{copy.peak}: </span>
              {data.peakHours.length ? data.peakHours.map(hourLabel).join(', ') : '—'}
              {busiest?.visits ? (
                <>
                  <span className="mx-3 text-muted-foreground">·</span>
                  {copy.peakDay}: {date(busiest.date)} ({number(busiest.converted.visits)} {copy.converted.toLowerCase()})
                </>
              ) : null}
            </p>
          </div>
          <div className="space-y-3 border-t border-border pt-5">
            <div>
              <h3 className="font-medium">{copy.ranked}</h3>
              <p className="text-xs text-muted-foreground">{copy.rankedHint}</p>
              <p className="mt-1 text-xs text-muted-foreground">{copy.channelsHint}</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.exhibit}</TableHead>
                  <TableHead className="text-right">{copy.visits}</TableHead>
                  <TableHead className="text-right">{convertedLabel(copy.converted)}</TableHead>
                  <TableHead className="text-right">{copy.devices}</TableHead>
                  <TableHead className="text-right">{convertedLabel('QR')}</TableHead>
                  <TableHead className="text-right">{convertedLabel('BLE')}</TableHead>
                  <TableHead className="text-right">{convertedLabel(copy.manual)}</TableHead>
                  <TableHead>{copy.last}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.exhibits.map((row) => (
                  <TableRow key={`${row.exhibitId ?? 'deleted'}:${row.code}`}>
                    <TableCell>
                      {row.exhibitId ? (
                        <Link
                          className="font-medium hover:underline"
                          href={`/exhibits/${row.exhibitId}`}
                        >
                          {row.title}
                        </Link>
                      ) : (
                        row.title
                      )}
                      <p className="text-xs text-muted-foreground">{row.code}</p>
                    </TableCell>
                    {[row.visits, row.converted.visits, row.devices, row.converted.qr, row.converted.ble, row.converted.manual].map((value, index) => (
                      <TableCell key={index} className="text-right tabular-nums">
                        {number(value)}
                      </TableCell>
                    ))}
                    <TableCell className="whitespace-nowrap text-xs">
                      {time(row.lastVisitAt)}
                    </TableCell>
                  </TableRow>
                ))}
                {!data.exhibits.length ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      {copy.noVisits}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <details className="border-t border-border pt-4">
            <summary className="cursor-pointer text-sm font-medium">{copy.daily}</summary>
            <div className="mt-3 max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{copy.date}</TableHead>
                    {[copy.visits, convertedLabel(copy.converted), copy.devices, convertedLabel('QR'), convertedLabel('BLE'), convertedLabel(copy.manual)].map((label) => (
                      <TableHead className="text-right" key={label}>
                        {label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.daily.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell>{date(row.date)}</TableCell>
                      {[row.visits, row.converted.visits, row.devices, row.converted.qr, row.converted.ble, row.converted.manual].map((n, index) => (
                        <TableCell className="text-right tabular-nums" key={index}>
                          {number(n)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </details>
          <div className="space-y-3 border-t border-border pt-5">
            <h3 className="font-medium">{copy.history}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  {[copy.time, copy.exhibit, copy.zone, copy.channel, copy.platform].map(
                    (label) => (
                      <TableHead key={label}>{label}</TableHead>
                    ),
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.history.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {time(row.occurredAt)}
                    </TableCell>
                    <TableCell>
                      {row.exhibitTitle}
                      <p className="text-xs text-muted-foreground">{row.exhibitCode}</p>
                    </TableCell>
                    <TableCell>{row.zoneCode}</TableCell>
                    <TableCell>{sourceLabel(row.source)}</TableCell>
                    <TableCell>{row.platform}</TableCell>
                  </TableRow>
                ))}
                {!data.history.items.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      {copy.noVisits}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                {copy.updated}: {time(data.generatedAt)}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage(page - 1)}
                >
                  {copy.previous}
                </Button>
                <span>
                  {copy.page} {page} {copy.of} {pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pages || isFetching}
                  onClick={() => setPage(page + 1)}
                >
                  {copy.next}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
