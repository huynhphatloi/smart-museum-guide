'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { BeaconFormDialog } from '@/features/beacons/ui/beacon-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError, apiFetch } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { Beacon, Paginated, Zone } from '@/lib/types';

export default function BeaconsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Beacon | null>(null);

  const beaconsQuery = useQuery({
    queryKey: ['beacons'],
    queryFn: () => apiFetch<Paginated<Beacon>>('/admin/beacons?pageSize=100'),
  });

  const zonesQuery = useQuery({
    queryKey: ['zones', ''],
    queryFn: () => apiFetch<Paginated<Zone>>('/admin/zones?pageSize=100'),
  });

  const toggleBeacon = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiFetch<Beacon>(`/admin/beacons/${id}/${enabled ? 'enable' : 'disable'}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['beacons'] });
      toast.success(t('beaconToggled'));
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : t('beaconToggleError')),
  });

  const deleteBeacon = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/admin/beacons/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('beaconDeleted'));
      void queryClient.invalidateQueries({ queryKey: ['beacons'] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : t('beaconDeleteError')),
  });

  const zones = zonesQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
            {t('beaconsEyebrow')}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{t('beaconsTitle')}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t('beaconsSubtitle')}
          </p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={zones.length === 0}>
          <Plus className="h-4 w-4" />
          {t('newBeacon')}
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('registeredBeacons')}</CardTitle>
          <CardDescription>
            {t('beaconCount', { count: String(beaconsQuery.data?.total ?? 0) })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {beaconsQuery.isLoading ? (
            <Skeleton className="m-6 h-40" />
          ) : !beaconsQuery.data?.items.length ? (
            <div className="p-6">
              <EmptyState title={t('noBeacons')} description={t('noBeaconsHint')} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('colIdentifier')}</TableHead>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('colZone')}</TableHead>
                  <TableHead>{t('colBroadcast')}</TableHead>
                  <TableHead>{t('colRadio')}</TableHead>
                  <TableHead>{t('colReach')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {beaconsQuery.data.items.map((beacon) => (
                  <TableRow key={beacon.id}>
                    <TableCell className="font-medium">{beacon.identifier}</TableCell>
                    <TableCell>{beacon.name}</TableCell>
                    <TableCell>
                      <p>{beacon.zone?.code ?? '-'}</p>
                      <p className="text-xs text-muted-foreground">{beacon.protocol}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {beacon.namespaceId && beacon.instanceId ? (
                        <p>
                          {beacon.namespaceId}:{beacon.instanceId}
                        </p>
                      ) : null}
                      {beacon.uuid ? (
                        <p className="opacity-70">
                          {beacon.uuid} · {beacon.major ?? '-'}/{beacon.minor ?? '-'}
                        </p>
                      ) : null}
                      {!beacon.namespaceId && !beacon.uuid ? '-' : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {beacon.txPower !== null ? `${beacon.txPower} dBm` : '-'}
                      {beacon.advertisingIntervalMs ? ` · ${beacon.advertisingIntervalMs} ms` : ''}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {beacon.minRssi !== null ? `${beacon.minRssi} dBm` : t('museumDefault')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={beacon.enabled ? 'success' : 'destructive'}>
                        {beacon.enabled ? t('enabled') : t('disabled')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditing(beacon)}>
                          {t('edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleBeacon.mutate({ id: beacon.id, enabled: !beacon.enabled })
                          }
                        >
                          {beacon.enabled ? t('disable') : t('enable')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={deleteBeacon.isPending && deleteBeacon.variables === beacon.id}
                          onClick={() => {
                            if (
                              window.confirm(
                                t('deleteBeaconConfirm', { id: beacon.identifier }),
                              )
                            ) {
                              deleteBeacon.mutate(beacon.id);
                            }
                          }}
                        >
                          {t('delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {creating ? (
        <BeaconFormDialog key="new" open onOpenChange={setCreating} zones={zones} />
      ) : null}
      {editing ? (
        <BeaconFormDialog
          key={editing.id}
          open
          onOpenChange={(next) => !next && setEditing(null)}
          zones={zones}
          beacon={editing}
        />
      ) : null}
    </div>
  );
}
