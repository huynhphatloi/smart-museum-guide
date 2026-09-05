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
import { Beacon, Paginated, Zone } from '@/lib/types';

export default function BeaconsPage() {
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
      toast.success('Beacon updated.');
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not update the beacon.'),
  });

  const zones = zonesQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
            Museum infrastructure
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Beacon settings</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Assign each device to a zone and tune its detection reach. These settings are managed by
            staff and published read-only to the visitor app.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={zones.length === 0}>
          <Plus className="h-4 w-4" />
          New beacon
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Registered beacons</CardTitle>
          <CardDescription>{beaconsQuery.data?.total ?? 0} beacon(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {beaconsQuery.isLoading ? (
            <Skeleton className="m-6 h-40" />
          ) : !beaconsQuery.data?.items.length ? (
            <div className="p-6">
              <EmptyState
                title="No beacons registered"
                description="Add a beacon and assign it to a zone."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identifier</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Broadcast identity</TableHead>
                  <TableHead>Radio</TableHead>
                  <TableHead>Detection reach</TableHead>
                  <TableHead>Status</TableHead>
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
                      {beacon.minRssi !== null ? `${beacon.minRssi} dBm` : 'museum default'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={beacon.enabled ? 'success' : 'destructive'}>
                        {beacon.enabled ? 'enabled' : 'disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditing(beacon)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleBeacon.mutate({ id: beacon.id, enabled: !beacon.enabled })
                          }
                        >
                          {beacon.enabled ? 'Disable' : 'Enable'}
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

      {/* Remounted per beacon so the uncontrolled fields pick up new defaults. */}
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
