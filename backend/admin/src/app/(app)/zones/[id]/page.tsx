'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, apiFetch } from '@/lib/api-client';
import { formatDate, formatDateTime } from '@/lib/format';
import { Exhibit, Paginated, ZoneDetail } from '@/lib/types';

export default function ZoneDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const zoneId = params.id;
  const [picked, setPicked] = useState('');

  const zoneQuery = useQuery({
    queryKey: ['zone', zoneId],
    queryFn: () => apiFetch<ZoneDetail>(`/admin/zones/${zoneId}`),
  });

  const qrQuery = useQuery({
    queryKey: ['zone-qr', zoneId],
    queryFn: () => apiFetch<{ value: string; dataUrl: string }>(`/admin/zones/${zoneId}/qr`),
  });

  const exhibitsQuery = useQuery({
    queryKey: ['exhibits', 'ALL'],
    queryFn: () => apiFetch<Paginated<Exhibit>>('/admin/exhibits?pageSize=100'),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['zone', zoneId] });
    void queryClient.invalidateQueries({ queryKey: ['zones'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const setCurrent = useMutation({
    mutationFn: (exhibitId: string) =>
      apiFetch(`/admin/zones/${zoneId}/current-exhibit`, { method: 'PUT', body: { exhibitId } }),
    onSuccess: () => {
      toast.success('This zone now shows the selected exhibit. BLE and QR follow immediately.');
      setPicked('');
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not change the exhibit.'),
  });

  const clearCurrent = useMutation({
    mutationFn: () => apiFetch(`/admin/zones/${zoneId}/current-exhibit`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Zone emptied. Visitors will see the "nothing on display" state.');
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not empty the zone.'),
  });

  const removeZone = useMutation({
    mutationFn: () => apiFetch<void>(`/admin/zones/${zoneId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Zone deleted.');
      void queryClient.invalidateQueries({ queryKey: ['zones'] });
      router.push('/zones');
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not delete the zone.'),
  });

  if (zoneQuery.isLoading) return <Skeleton className="h-96" />;
  if (zoneQuery.error || !zoneQuery.data) {
    return <p className="text-sm text-destructive">Zone not found.</p>;
  }

  const zone = zoneQuery.data;
  const current = zone.currentAssignment;
  const publishable = (exhibitsQuery.data?.items ?? []).filter(
    (exhibit) => exhibit.status !== 'ARCHIVED',
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
            href="/zones"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All zones
          </Link>
          <h1 className="text-2xl font-semibold">{zone.code}</h1>
          <p className="text-sm text-muted-foreground">
            {zone.name}
            {zone.floor ? ` · Floor ${zone.floor}` : ''}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (window.confirm(`Delete ${zone.code}? Its display history is removed too.`)) {
              removeZone.mutate();
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete zone
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>What is in this room</CardTitle>
            <CardDescription>
              Exactly what the BLE and QR endpoints resolve for this zone right now.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {current ? (
              <div className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{current.exhibit.defaultTitle}</p>
                  <Badge variant={current.exhibit.status === 'PUBLISHED' ? 'success' : 'warning'}>
                    {current.exhibit.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{current.exhibit.code}</p>
                <p className="mt-2 text-sm">On display since {formatDate(current.activeFrom)}</p>
                {zone.currentReason === 'EXHIBIT_NOT_PUBLISHED' ? (
                  <p className="mt-2 text-sm text-amber-700">
                    Assigned, but not published &mdash; visitors will see &ldquo;nothing on
                    display&rdquo;.
                  </p>
                ) : null}
                <Link
                  className="mt-3 inline-block text-sm underline"
                  href={`/exhibits/${current.exhibit.id}`}
                >
                  Open exhibit
                </Link>
              </div>
            ) : (
              <EmptyState
                title="Nothing on display here"
                description="Pick an exhibit below so visitors in this zone receive content."
              />
            )}

            <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <Label htmlFor="exhibit">Change the exhibit in this room</Label>
              <div className="flex flex-wrap gap-2">
                <select
                  id="exhibit"
                  className="h-10 min-w-[240px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
                  value={picked}
                  onChange={(event) => setPicked(event.target.value)}
                >
                  <option value="">Select an exhibit…</option>
                  {publishable.map((exhibit) => (
                    <option key={exhibit.id} value={exhibit.id}>
                      {exhibit.code} — {exhibit.defaultTitle}
                      {exhibit.status === 'PUBLISHED' ? '' : ` (${exhibit.status})`}
                    </option>
                  ))}
                </select>
                <Button
                  disabled={!picked || setCurrent.isPending}
                  onClick={() => setCurrent.mutate(picked)}
                >
                  {setCurrent.isPending ? 'Saving…' : 'Set as current'}
                </Button>
                {current ? (
                  <Button
                    variant="outline"
                    disabled={clearCurrent.isPending}
                    onClick={() => {
                      if (window.confirm('Empty this zone? Visitors will see an empty state.')) {
                        clearCurrent.mutate();
                      }
                    }}
                  >
                    Empty zone
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                The beacon and the printed QR code are untouched &mdash; only the content changes.
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Previously in this room</h3>
              {zone.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No earlier exhibit recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {zone.history.map((assignment) => (
                    <li key={assignment.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{assignment.exhibit.defaultTitle}</p>
                      <p className="text-muted-foreground">
                        {formatDate(assignment.activeFrom)} → {formatDate(assignment.activeTo)}
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
              <CardTitle>Beacons</CardTitle>
              <CardDescription>Hardware installed in this zone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {zone.beacons?.length ? (
                zone.beacons.map((beacon) => (
                  <div key={beacon.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{beacon.identifier}</span>
                      <Badge variant={beacon.enabled ? 'success' : 'destructive'}>
                        {beacon.enabled ? 'enabled' : 'disabled'}
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
                <p className="text-sm text-muted-foreground">
                  No beacon installed. Visitors can still reach this zone through its QR code.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>QR code</CardTitle>
              <CardDescription>
                Print once &mdash; it never changes when the exhibit does.
              </CardDescription>
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
                      Download PNG
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
              <CardTitle className="text-base">Last checked</CardTitle>
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
