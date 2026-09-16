'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { Paginated, Zone } from '@/lib/types';

export default function ZonesPage() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const zonesQuery = useQuery({
    queryKey: ['zones', search],
    queryFn: () =>
      apiFetch<Paginated<Zone>>(
        `/admin/zones?pageSize=100${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      ),
  });

  const createZone = useMutation({
    mutationFn: (body: { code: string; name: string; floor?: string; description?: string }) =>
      apiFetch<Zone>('/admin/zones', { method: 'POST', body }),
    onSuccess: (zone) => {
      toast.success(t('zoneCreated', { code: zone.code }));
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['zones'] });
      router.push(`/zones/${zone.id}`);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : t('zoneCreateError')),
  });

  const deleteZone = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/admin/zones/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('zoneDeleted'));
      void queryClient.invalidateQueries({ queryKey: ['zones'] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : t('zoneDeleteError')),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createZone.mutate({
      code: String(form.get('code') ?? '').toUpperCase(),
      name: String(form.get('name') ?? ''),
      floor: String(form.get('floor') ?? '') || undefined,
      description: String(form.get('description') ?? '') || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('zonesTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('zonesSubtitle')}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('newZone')}
        </Button>
      </header>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{t('allZones')}</CardTitle>
              <CardDescription>
                {t('zoneCount', { count: String(zonesQuery.data?.total ?? 0) })}
              </CardDescription>
            </div>
            <Input
              className="w-full max-w-xs"
              placeholder={t('searchZones')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {zonesQuery.isLoading ? (
            <Skeleton className="m-6 h-40" />
          ) : !zonesQuery.data?.items.length ? (
            <div className="p-6">
              <EmptyState title={t('noZones')} description={t('noZonesHint')} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('code')}</TableHead>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('floor')}</TableHead>
                  <TableHead>{t('colBeacons')}</TableHead>
                  <TableHead>{t('colSchedule')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {zonesQuery.data.items.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell>
                      <Link className="font-medium hover:underline" href={`/zones/${zone.id}`}>
                        {zone.code}
                      </Link>
                    </TableCell>
                    <TableCell>{zone.name}</TableCell>
                    <TableCell className="text-muted-foreground">{zone.floor ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {zone.beacons?.length ? (
                          zone.beacons.map((beacon) => (
                            <Badge
                              key={beacon.id}
                              variant={beacon.enabled ? 'secondary' : 'destructive'}
                            >
                              {beacon.identifier}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="warning">{t('noBeacon')}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {zone._count?.assignments ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/zones/${zone.id}`}>
                            <Pencil className="h-3.5 w-3.5" />
                            {t('edit')}
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={deleteZone.isPending && deleteZone.variables === zone.id}
                          onClick={() => {
                            if (window.confirm(t('deleteZoneConfirm', { code: zone.code }))) {
                              deleteZone.mutate(zone.id);
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('newZoneTitle')}</DialogTitle>
            <DialogDescription>{t('newZoneHint')}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
            <div className="space-y-2">
              <Label htmlFor="code">{t('code')}</Label>
              <Input id="code" name="code" placeholder="ZONE_A01" autoComplete="off" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input id="name" name="name" autoComplete="off" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor">{t('floor')}</Label>
              <Input id="floor" name="floor" placeholder="1" autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('description')}</Label>
              <Textarea id="description" name="description" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={createZone.isPending}>
                {createZone.isPending ? t('creating') : t('createZone')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
