'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { ZoneDisplayControls } from '@/features/schedule/ui/zone-display-controls';
import { Zone, ZoneDetail } from '@/lib/types';

export default function ZoneDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const zoneId = params.id;

  const zoneQuery = useQuery({
    queryKey: ['zone', zoneId],
    queryFn: () => apiFetch<ZoneDetail>(`/admin/zones/${zoneId}`),
    refetchInterval: 10_000,
  });

  const qrQuery = useQuery({
    queryKey: ['zone-qr', zoneId],
    queryFn: () => apiFetch<{ value: string; dataUrl: string }>(`/admin/zones/${zoneId}/qr`),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['zone', zoneId] });
    void queryClient.invalidateQueries({ queryKey: ['zones'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const saveZone = useMutation({
    mutationFn: (body: { name: string; floor?: string | null; description?: string | null }) =>
      apiFetch<Zone>(`/admin/zones/${zoneId}`, { method: 'PATCH', body }),
    onSuccess: () => {
      toast.success(t('zoneUpdated'));
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : t('zoneUpdateError')),
  });

  const removeZone = useMutation({
    mutationFn: () => apiFetch<void>(`/admin/zones/${zoneId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('zoneDeleted'));
      void queryClient.invalidateQueries({ queryKey: ['zones'] });
      router.push('/zones');
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : t('zoneDeleteError')),
  });

  if (zoneQuery.isLoading) return <Skeleton className="h-96" />;
  if (zoneQuery.error || !zoneQuery.data) {
    return (
      <div className="space-y-3" role="alert">
        <p className="text-sm text-destructive">{t('listLoadError')}</p>
        <Button variant="outline" onClick={() => void zoneQuery.refetch()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  const zone = zoneQuery.data;
  const current = zone.currentAssignment;

  function handleSaveZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    saveZone.mutate({
      name: String(form.get('name') ?? ''),
      floor: String(form.get('floor') ?? '') || null,
      description: String(form.get('description') ?? '') || null,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
            href="/zones"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t('allZonesLink')}
          </Link>
          <h1 className="text-2xl font-semibold">{zone.code}</h1>
          <p className="text-sm text-muted-foreground">
            {zone.name}
            {zone.floor ? ` · ${t('floor')} ${zone.floor}` : ''}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (window.confirm(t('deleteZoneConfirm', { code: zone.code }))) {
              removeZone.mutate();
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          {t('deleteZone')}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('whatIsInRoom')}</CardTitle>
            <CardDescription>{t('whatIsInRoomHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {current ? (
              <div className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{current.exhibit.defaultTitle}</p>
                  <Badge variant={current.exhibit.status === 'PUBLISHED' ? 'success' : 'warning'}>
                    {current.exhibit.status === 'PUBLISHED'
                      ? t('filterPUBLISHED')
                      : current.exhibit.status === 'DRAFT'
                        ? t('filterDRAFT')
                        : t('filterARCHIVED')}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{current.exhibit.code}</p>
                <p className="mt-2 text-sm">
                  {t('onDisplaySince', { date: formatDateTime(current.activeFrom) })}
                  {current.activeTo ? ` → ${formatDateTime(current.activeTo)}` : ''}
                </p>
                {zone.currentReason === 'EXHIBIT_NOT_PUBLISHED' ? (
                  <p className="mt-2 text-sm text-amber-700">{t('assignedNotPublished')}</p>
                ) : null}
                <Link
                  className="mt-3 inline-block text-sm underline"
                  href={`/exhibits/${current.exhibit.id}`}
                >
                  {t('openExhibit')}
                </Link>
              </div>
            ) : (
              <EmptyState title={t('nothingOnDisplay')} description={t('nothingOnDisplayHint')} />
            )}

            <ZoneDisplayControls zone={zone} onChanged={invalidate} />

            <div>
              <h3 className="mb-2 text-sm font-semibold">{t('previouslyInRoom')}</h3>
              {zone.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noEarlierExhibit')}</p>
              ) : (
                <ul className="space-y-2">
                  {zone.history.map((assignment) => (
                    <li key={assignment.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{assignment.exhibit.defaultTitle}</p>
                      <p className="text-muted-foreground">
                        {formatDateTime(assignment.activeFrom)} →{' '}
                        {formatDateTime(assignment.activeTo)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('zoneSettings')}</CardTitle>
              <CardDescription>{t('zoneSettingsHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 " onSubmit={handleSaveZone}>
                <div className="space-y-2">
                  <Label htmlFor="name">{t('name')}</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={zone.name}
                    required
                    key={zone.updatedAt}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">{t('floor')}</Label>
                  <Input
                    id="floor"
                    name="floor"
                    defaultValue={zone.floor ?? ''}
                    key={zone.updatedAt}
                  />
                </div>
                <div className="space-y-2 ">
                  <Label htmlFor="description">{t('description')}</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={zone.description ?? ''}
                    key={zone.updatedAt}
                  />
                </div>
                <div className="">
                  <Button type="submit" disabled={saveZone.isPending}>
                    {saveZone.isPending ? t('saving') : t('saveZone')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('beaconsInZone')}</CardTitle>
              <CardDescription>{t('beaconsInZoneHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {zone.beacons?.length ? (
                zone.beacons.map((beacon) => (
                  <div key={beacon.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{beacon.identifier}</span>
                      <Badge variant={beacon.enabled ? 'success' : 'destructive'}>
                        {beacon.enabled ? t('enabled') : t('disabled')}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{beacon.name}</p>
                    {beacon.namespaceId && beacon.instanceId ? (
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                        Eddystone {beacon.namespaceId}:{beacon.instanceId}
                      </p>
                    ) : null}
                    {beacon.uuid ? (
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                        iBeacon {beacon.uuid} · {beacon.major}/{beacon.minor}
                      </p>
                    ) : null}
                    {beacon.txPower !== null ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {beacon.txPower} dBm
                        {beacon.advertisingIntervalMs
                          ? ` · ${beacon.advertisingIntervalMs} ms`
                          : ''}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t('noBeaconInstalled')}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('qrCode')}</CardTitle>
              <CardDescription>{t('qrHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {qrQuery.data ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrQuery.data.dataUrl}
                    alt={`QR code for ${zone.code}`}
                    className="mx-auto h-48 w-48 rounded-md border bg-white p-2"
                  />
                  <p className="break-all text-center text-xs text-muted-foreground">
                    {qrQuery.data.value}
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <a href={qrQuery.data.dataUrl} download={`${zone.code}-qr.png`}>
                      {t('downloadPng')}
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <a href={qrQuery.data.value} target="_blank" rel="noopener noreferrer">
                      {t('viewVisitorPage')}
                    </a>
                  </Button>
                </>
              ) : (
                <Skeleton className="h-48" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('lastChecked')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{formatDateTime(zone.updatedAt)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
