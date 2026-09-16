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
import { useI18n } from '@/lib/i18n';
import { DashboardSummary } from '@/lib/types';

export default function DashboardPage() {
  const { t } = useI18n();
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
    return <p className="text-sm text-destructive">{t('dashboardLoadError')}</p>;
  }

  const stats = [
    { label: t('statZones'), value: String(data.counts.zones) },
    {
      label: t('statBeacons'),
      value: t('beaconsEnabled', {
        enabled: String(data.counts.beacons - data.counts.disabledBeacons),
        total: String(data.counts.beacons),
      }),
    },
    {
      label: t('statExhibits'),
      value: t('exhibitsPublished', {
        published: String(data.counts.publishedExhibits),
        total: String(data.counts.exhibits),
      }),
    },
    { label: t('statSchedule'), value: String(data.counts.scheduleEntries) },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t('dashboardTitle')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('dashboardGenerated', { time: formatDateTime(data.generatedAt) })}
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
          <p>{t('zonesEmptyWarning', { zones: data.zonesWithoutContent.join(', ') })}</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t('allZonesOk')}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('liveZoneStatus')}</CardTitle>
          <CardDescription>{t('liveZoneHint')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('colZone')}</TableHead>
                <TableHead>{t('colBeacons')}</TableHead>
                <TableHead>{t('colCurrentExhibit')}</TableHead>
                <TableHead>{t('colOnDisplaySince')}</TableHead>
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
                      <Badge variant="destructive">{t('nothingScheduled')}</Badge>
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
