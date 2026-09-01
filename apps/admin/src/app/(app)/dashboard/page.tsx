'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatDateTime } from '@/lib/format';
import { DashboardSummary } from '@/lib/types';

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardSummary>('/admin/dashboard'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-52" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">Could not load the dashboard. Is the API running?</p>
    );
  }

  const stats = [
    { label: 'Zones', value: data.counts.zones },
    {
      label: 'Beacons',
      value: `${data.counts.beacons - data.counts.disabledBeacons}/${data.counts.beacons} enabled`,
    },
    {
      label: 'Exhibits',
      value: `${data.counts.publishedExhibits}/${data.counts.exhibits} published`,
    },
    { label: 'Schedule entries', value: data.counts.scheduleEntries },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          What every zone is showing right now &mdash; generated {formatDateTime(data.generatedAt)}.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.zonesWithoutContent.length > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            No published exhibit is currently scheduled in{' '}
            <strong>{data.zonesWithoutContent.join(', ')}</strong>. Visitors scanning those beacons
            or QR codes will see an empty state.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Every zone currently resolves to a published exhibit.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Live zone status</CardTitle>
          <CardDescription>
            What each beacon and QR code resolves to right now, using the same rule the visitor apps
            use.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead>Beacons</TableHead>
                <TableHead>Current exhibit</TableHead>
                <TableHead>On display since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.zones.map((zone) => (
                <TableRow key={zone.zoneId}>
                  <TableCell>
                    <Link className="font-medium hover:underline" href={`/zones/${zone.zoneId}`}>
                      {zone.zoneCode}
                    </Link>
                    <p className="text-xs text-muted-foreground">{zone.zoneName}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {zone.enabledBeaconCount}/{zone.beaconCount}
                  </TableCell>
                  <TableCell>
                    {zone.currentExhibit ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{zone.currentExhibit.title}</span>
                        <Badge
                          variant={
                            zone.currentExhibit.status === 'PUBLISHED' ? 'success' : 'warning'
                          }
                        >
                          {zone.currentExhibit.status}
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant="destructive">Nothing scheduled</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {zone.onDisplaySince ? formatDateTime(zone.onDisplaySince) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
