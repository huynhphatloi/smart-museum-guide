'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';
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
import { Paginated, Zone } from '@/lib/types';

export default function ZonesPage() {
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
      toast.success(`Zone ${zone.code} created.`);
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['zones'] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not create the zone.'),
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
          <h1 className="text-2xl font-semibold">Zones</h1>
          <p className="text-sm text-muted-foreground">
            Physical areas. Beacons and QR codes point at zones, never directly at an exhibit.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New zone
        </Button>
      </header>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>All zones</CardTitle>
              <CardDescription>{zonesQuery.data?.total ?? 0} zone(s)</CardDescription>
            </div>
            <Input
              className="w-full max-w-xs"
              placeholder="Search by code or name"
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
              <EmptyState
                title="No zones yet"
                description="Create your first zone to start mapping beacons."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Beacons</TableHead>
                  <TableHead>Schedule entries</TableHead>
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
                          <Badge variant="warning">No beacon</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {zone._count?.assignments ?? 0}
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
            <DialogTitle>New zone</DialogTitle>
            <DialogDescription>
              The code is permanent &mdash; it is printed inside the QR code (e.g. ZONE_A01).
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" placeholder="ZONE_A01" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Ancient Sculpture" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor">Floor</Label>
              <Input id="floor" name="floor" placeholder="1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createZone.isPending}>
                {createZone.isPending ? 'Creating...' : 'Create zone'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
