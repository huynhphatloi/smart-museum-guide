'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarClock, Pencil, Zap } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError, apiFetch } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { AssignmentSummary, Exhibit, Paginated, ZoneDetail } from '@/lib/types';
import { dateInput, defaultScheduleStart } from '../model/schedule-start';

/** Include automatically adjusted predecessor ends when previewing conflicts. */
function overlappingAssignment(
  zone: ZoneDetail,
  id: string | null,
  from: string,
  to: string,
): AssignmentSummary | undefined {
  if (
    !from ||
    !Number.isFinite(new Date(from).getTime()) ||
    (to && !Number.isFinite(new Date(to).getTime()))
  )
    return;
  const candidate = {
    id: id ?? 'new',
    activeFrom: new Date(from).toISOString(),
    activeTo: to ? new Date(to).toISOString() : null,
    autoEnd: !to,
  };
  const existing = [zone.currentAssignment, ...zone.upcoming].filter(
    (row): row is AssignmentSummary => Boolean(row && row.id !== id),
  );
  const timeline = [...existing, candidate].sort(
    (a, b) => Date.parse(a.activeFrom) - Date.parse(b.activeFrom),
  );
  const periods = timeline.map((row, index) => ({
    ...row,
    activeTo: row.autoEnd ? (timeline[index + 1]?.activeFrom ?? null) : row.activeTo,
  }));
  const proposed = periods.find((row) => row.id === candidate.id)!;
  const conflict = periods.find(
    (row) =>
      row.id !== candidate.id &&
      (row.activeFrom === proposed.activeFrom ||
        ((!row.activeTo || proposed.activeFrom < row.activeTo) &&
          (!proposed.activeTo || row.activeFrom < proposed.activeTo))),
  );
  return existing.find((row) => row.id === conflict?.id);
}

export function ZoneDisplayControls({
  zone,
  onChanged,
}: {
  zone: ZoneDetail;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState('now');
  const [picked, setPicked] = useState('');
  const [search, setSearch] = useState('');
  const [customFrom, setFrom] = useState<string | null>(null);
  const from = customFrom ?? defaultScheduleStart(zone);
  const [to, setTo] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState('');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const exhibits = useQuery({
    queryKey: ['exhibits', 'PUBLISHED', search],
    queryFn: () =>
      apiFetch<Paginated<Exhibit>>(
        `/admin/exhibits?status=PUBLISHED&pageSize=100${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      ),
  });

  function reportError(caught: unknown) {
    setError(
      caught instanceof ApiError && caught.code === 'SCHEDULE_OVERLAP'
        ? t('scheduleOverlap')
        : caught instanceof ApiError && caught.code === 'INVALID_DATE_RANGE'
          ? t('scheduleInvalidTime')
          : caught instanceof ApiError && caught.code === 'EXHIBIT_NOT_PUBLISHED'
            ? t('schedulePublishedOnly')
            : caught instanceof ApiError && caught.status === 404
              ? t('scheduleAlreadyChanged')
              : t('scheduleSaveError'),
    );
  }

  const save = useMutation({
    mutationFn: () =>
      mode === 'now'
        ? apiFetch(`/admin/zones/${zone.id}/current-exhibit`, {
            method: 'PUT',
            body: { exhibitId: picked },
          })
        : apiFetch(`/admin/zones/${zone.id}/schedule${editing ? `/${editing}` : ''}`, {
            method: editing ? 'PUT' : 'POST',
            body: {
              exhibitId: picked,
              activeFrom: new Date(from).toISOString(),
              activeTo: to ? new Date(to).toISOString() : null,
            },
          }),
    onSuccess: () => {
      toast.success(mode === 'now' ? t('exhibitSet') : t('scheduleSaved'));
      setPicked('');
      setEditing(null);
      setError('');
      setSearch('');
      if (mode === 'schedule') {
        setFrom(null);
        setTo('');
      }
      onChanged();
    },
    onError: reportError,
  });
  const cancel = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/zones/${zone.id}/schedule/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      toast.success(t('scheduleCancelled'));
      setCancelling(null);
      if (editing === id) {
        setEditing(null);
        setPicked('');
        setFrom(null);
        setTo('');
      }
      setError('');
      onChanged();
    },
    onError: reportError,
  });
  const clear = useMutation({
    mutationFn: () => apiFetch(`/admin/zones/${zone.id}/current-exhibit`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('zoneEmptied'));
      setError('');
      onChanged();
    },
    onError: reportError,
  });
  const pending = save.isPending || cancel.isPending || clear.isPending;
  const invalidTime =
    mode === 'schedule' &&
    (!from ||
      !Number.isFinite(Date.parse(from)) ||
      Date.parse(from) <= Date.now() ||
      (Boolean(to) && (!Number.isFinite(Date.parse(to)) || Date.parse(to) <= Date.parse(from))));
  const conflict =
    mode === 'schedule' && Boolean(picked) && !invalidTime
      ? overlappingAssignment(zone, editing, from, to)
      : undefined;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!picked || invalidTime || conflict) return;
    setError('');
    save.mutate();
  }

  function edit(row: AssignmentSummary) {
    setMode('schedule');
    setEditing(row.id);
    setPicked(row.exhibitId);
    setSearch('');
    setFrom(dateInput(row.activeFrom));
    setTo(row.autoEnd ? '' : dateInput(row.activeTo ?? ''));
    setError('');
    setCancelling(null);
  }

  return (
    <div className="space-y-6">
      <Tabs
        value={mode}
        onValueChange={(value) => {
          setMode(value);
          setEditing(null);
          setPicked('');
          setFrom(null);
          setTo('');
          setError('');
        }}
      >
        <TabsList aria-label={t('scheduleChangeMethod')} className="w-full sm:w-auto">
          <TabsTrigger value="now" className="flex-1 gap-2">
            <Zap className="h-4 w-4" />
            {t('scheduleChangeNow')}
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex-1 gap-2">
            <CalendarClock className="h-4 w-4" />
            {t('schedulePlanAhead')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value={mode}>
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={pending} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {mode === 'now' ? t('scheduleImmediateHint') : t('schedulePlanningHint')}
              </p>
              {editing ? <p className="text-sm font-medium">{t('scheduleEditing')}</p> : null}
              <div className="space-y-2">
                <Label htmlFor="display-exhibit">{t('scheduleExhibit')}</Label>
                <Input
                  aria-label={t('searchExhibits')}
                  placeholder={t('searchExhibits')}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPicked('');
                  }}
                />
                <select
                  id="display-exhibit"
                  required
                  className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm"
                  value={picked}
                  onChange={(event) => setPicked(event.target.value)}
                >
                  <option value="">{t('selectExhibit')}</option>
                  {(exhibits.data?.items ?? []).map((exhibit) => (
                    <option key={exhibit.id} value={exhibit.id}>
                      {exhibit.defaultTitle} · {exhibit.code}
                    </option>
                  ))}
                </select>
                {exhibits.isError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {t('listLoadError')}
                  </p>
                ) : null}
                {!exhibits.isLoading && !exhibits.isError && exhibits.data?.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('noPublishedExhibits')}</p>
                ) : null}
              </div>
              {mode === 'schedule' ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="schedule-from">{t('scheduleStart')}</Label>
                      <Input
                        id="schedule-from"
                        type="datetime-local"
                        required
                        value={from}
                        onChange={(event) => {
                          setFrom(event.target.value);
                          setError('');
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schedule-to">{t('scheduleEnd')}</Label>
                      <Input
                        id="schedule-to"
                        type="datetime-local"
                        value={to}
                        onChange={(event) => {
                          setTo(event.target.value);
                          setError('');
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('scheduleEndHint')} {t('scheduleTimezone', { timezone })}
                  </p>
                  {invalidTime ? (
                    <p className="text-sm text-destructive" role="alert">
                      {t('scheduleInvalidTime')}
                    </p>
                  ) : null}
                  {conflict ? (
                    <p className="text-sm text-destructive" role="alert">
                      {t('scheduleConflictWith', { title: conflict.exhibit.defaultTitle })}
                    </p>
                  ) : null}
                </>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={!picked || Boolean(invalidTime) || Boolean(conflict) || pending}
                >
                  {save.isPending
                    ? t('saving')
                    : mode === 'now'
                      ? t('scheduleChangeNow')
                      : editing
                        ? t('scheduleSaveChanges')
                        : t('scheduleCreate')}
                </Button>
                {editing ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(null);
                      setPicked('');
                      setFrom(null);
                      setTo('');
                      setError('');
                    }}
                  >
                    {t('cancel')}
                  </Button>
                ) : null}
                {mode === 'now' && zone.currentAssignment ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (window.confirm(t('scheduleEmptyConfirm'))) clear.mutate();
                    }}
                  >
                    {t('emptyZone')}
                  </Button>
                ) : null}
              </div>
            </fieldset>
          </form>
        </TabsContent>
      </Tabs>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <section className="border-t pt-5" aria-labelledby="upcoming-heading">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 id="upcoming-heading" className="text-sm font-semibold">
            {t('scheduleUpcoming')}
          </h3>
          <span className="text-sm tabular-nums text-muted-foreground">{zone.upcoming.length}</span>
        </div>
        {zone.upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('scheduleEmpty')}</p>
        ) : (
          <ul className="divide-y">
            {zone.upcoming.map((row) => (
              <li key={row.id} className="py-3 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{row.exhibit.defaultTitle}</p>
                    <p className="mt-1 text-sm tabular-nums">
                      {formatDateTime(row.activeFrom)} →{' '}
                      {row.activeTo ? formatDateTime(row.activeTo) : t('scheduleUntilChanged')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.autoEnd ? t('scheduleAutomaticEnd') : t('scheduleFixedEnd')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => edit(row)}
                      aria-label={t('scheduleEditNamed', { title: row.exhibit.defaultTitle })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t('edit')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => setCancelling(row.id)}
                    >
                      {t('scheduleCancel')}
                    </Button>
                  </div>
                </div>
                {cancelling === row.id ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-muted p-3">
                    <p className="w-full text-sm">{t('scheduleCancelConfirm')}</p>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => cancel.mutate(row.id)}
                    >
                      {t('scheduleConfirmCancel')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCancelling(null)}>
                      {t('scheduleKeep')}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-muted-foreground">{t('beaconQrUntouched')}</p>
    </div>
  );
}
