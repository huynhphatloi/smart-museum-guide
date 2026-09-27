'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Grid3x3, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFloorPlanI18n } from '@/features/floor-plans/i18n';
import { FloorPlanDetail, MapShape, MapZone, SurveyPointKind } from '@/features/floor-plans/types';
import { PlanCanvas } from '@/features/floor-plans/ui/plan-canvas';
import { ApiError, apiFetch, apiUpload } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import { Paginated } from '@/lib/types';

type Tool = 'beacons' | 'zones' | 'points';

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function FloorPlanDetailPage() {
  const { t } = useFloorPlanI18n();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const planId = params.id;

  const [tool, setTool] = useState<Tool>('points');
  const [beaconId, setBeaconId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [shapeType, setShapeType] = useState<'circle' | 'polygon'>('circle');
  const [radius, setRadius] = useState(1);
  const [draft, setDraft] = useState<MapShape | null>(null);
  const [pointKind, setPointKind] = useState<SurveyPointKind>('REFERENCE');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const planQuery = useQuery({
    queryKey: ['floor-plan', planId],
    queryFn: () => apiFetch<FloorPlanDetail>(`/admin/floor-plans/${planId}`),
  });

  // Every zone, so zones not on any plan yet can be placed here.
  const zonesQuery = useQuery({
    queryKey: ['zones', 'all-for-map'],
    queryFn: () => apiFetch<Paginated<MapZone>>('/admin/zones?pageSize=100'),
  });

  const plan = planQuery.data;
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['floor-plan', planId] });
    void queryClient.invalidateQueries({ queryKey: ['floor-plans'] });
    void queryClient.invalidateQueries({ queryKey: ['zones'] });
  };
  const onError = (error: unknown) =>
    toast.error(error instanceof ApiError ? error.message : String(error));

  const beacons = useMemo(() => plan?.zones.flatMap((zone) => zone.beacons) ?? [], [plan]);
  const selectedZone = zonesQuery.data?.items.find((zone) => zone.id === zoneId) ?? null;
  const selectedPoint = plan?.surveyPoints.find((point) => point.id === selectedPointId) ?? null;

  // --- mutations -------------------------------------------------------------

  const savePlan = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/admin/floor-plans/${planId}`, { method: 'PATCH', body }),
    onSuccess: () => {
      toast.success(t('floorPlanSaved'));
      invalidate();
    },
    onError,
  });

  const deletePlan = useMutation({
    mutationFn: () => apiFetch(`/admin/floor-plans/${planId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('floorPlanDeleted'));
      void queryClient.invalidateQueries({ queryKey: ['floor-plans'] });
      router.push('/floor-plans');
    },
    onError,
  });

  const placeBeacon = useMutation({
    mutationFn: (body: { id: string; mapX: number; mapY: number }) =>
      apiFetch(`/admin/beacons/${body.id}`, {
        method: 'PATCH',
        body: { mapX: body.mapX, mapY: body.mapY },
      }),
    onSuccess: (_result, body) => {
      const beacon = beacons.find((candidate) => candidate.id === body.id);
      toast.success(
        t('beaconPlaced', { beacon: beacon?.identifier ?? '', x: body.mapX, y: body.mapY }),
      );
      invalidate();
    },
    onError,
  });

  const saveZone = useMutation({
    mutationFn: (body: { id: string; floorPlanId: string | null; mapShape?: MapShape | null }) =>
      apiFetch<MapZone>(`/admin/zones/${body.id}`, {
        method: 'PATCH',
        body: { floorPlanId: body.floorPlanId, mapShape: body.mapShape },
      }),
    onSuccess: (zone) => {
      toast.success(t('zoneSaved', { code: zone.code }));
      setDraft(null);
      invalidate();
    },
    onError,
  });

  const addPoint = useMutation({
    mutationFn: (body: { x: number; y: number; kind: SurveyPointKind }) =>
      apiFetch<{ id: string; label: string }>(`/admin/floor-plans/${planId}/survey-points`, {
        method: 'POST',
        body,
      }),
    onSuccess: (point) => {
      toast.success(t('pointAdded', { label: point.label }));
      setSelectedPointId(point.id);
      invalidate();
    },
    onError,
  });

  const generateGrid = useMutation({
    mutationFn: (body: { spacing: number; margin: number }) =>
      apiFetch<{ created: number }>(`/admin/floor-plans/${planId}/survey-points/grid`, {
        method: 'POST',
        body,
      }),
    onSuccess: (result) => {
      toast.success(t('gridCreated', { n: result.created }));
      invalidate();
    },
    onError,
  });

  const deletePoint = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/survey-points/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('pointDeleted'));
      setSelectedPointId(null);
      invalidate();
    },
    onError,
  });

  const deleteCapture = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/survey-captures/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('captureDeleted'));
      invalidate();
    },
    onError,
  });

  // --- handlers --------------------------------------------------------------

  const onCanvasClick = (x: number, y: number) => {
    if (tool === 'beacons') {
      if (beaconId) placeBeacon.mutate({ id: beaconId, mapX: x, mapY: y });
      return;
    }
    if (tool === 'zones') {
      if (!zoneId) return;
      if (shapeType === 'circle') {
        setDraft({ type: 'circle', x, y, r: radius });
      } else {
        setDraft((current) => ({
          type: 'polygon',
          points: [...(current?.type === 'polygon' ? current.points : []), [x, y]],
        }));
      }
      return;
    }
    // Survey points: a click near an existing point selects it.
    const near = plan?.surveyPoints.find((point) => Math.hypot(point.x - x, point.y - y) < 0.25);
    if (near) setSelectedPointId(near.id);
    else addPoint.mutate({ x, y, kind: pointKind });
  };

  const onSavePlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    savePlan.mutate({
      name: String(form.get('name') ?? ''),
      level: String(form.get('level') ?? ''),
      widthMeters: Number(form.get('width')),
      heightMeters: Number(form.get('height')),
      positioningK: Number(form.get('k')),
      fillDbm: Number(form.get('fill')),
    });
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const stored = await apiUpload(file);
      savePlan.mutate({ imageUrl: stored.url });
    } catch (error) {
      onError(error);
    }
  };

  const exportDataset = async () => {
    try {
      const dataset = await apiFetch<unknown>(`/admin/floor-plans/${planId}/dataset`);
      const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${plan?.code ?? 'floor-plan'}-dataset-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      onError(error);
    }
  };

  // --- render ----------------------------------------------------------------

  if (planQuery.isLoading || !plan) {
    return <Skeleton className="h-96 w-full" />;
  }

  const coverage = new Map<string, Map<string, number>>();
  const devices = new Set<string>();
  for (const point of plan.surveyPoints) {
    const byDevice = new Map<string, number>();
    for (const capture of point.captures) {
      const device =
        capture.platform === 'simulator' ? `simulator (${t('synthetic')})` : capture.deviceModel;
      devices.add(device);
      byDevice.set(device, (byDevice.get(device) ?? 0) + 1);
    }
    coverage.set(point.id, byDevice);
  }
  const deviceList = [...devices].sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/floor-plans"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </Link>
          <h1 className="mt-1 font-serif text-3xl font-semibold">{plan.name}</h1>
          <p className="font-mono text-xs text-muted-foreground">
            {plan.code} · {plan.widthMeters} × {plan.heightMeters} m
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void exportDataset()}>
            <Download className="h-4 w-4" />
            {t('exportDataset')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (window.confirm(t('deleteConfirm'))) deletePlan.mutate();
            }}
          >
            <Trash2 className="h-4 w-4" />
            {t('delete')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardContent className="pt-6">
            <PlanCanvas
              plan={plan}
              draft={tool === 'zones' ? draft : null}
              selectedZoneId={tool === 'zones' ? zoneId : null}
              selectedBeaconId={tool === 'beacons' ? beaconId : null}
              selectedPointId={tool === 'points' ? selectedPointId : null}
              onClick={onCanvasClick}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <Tabs value={tool} onValueChange={(value) => setTool(value as Tool)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="points">{t('toolPoints')}</TabsTrigger>
                  <TabsTrigger value="zones">{t('toolZones')}</TabsTrigger>
                  <TabsTrigger value="beacons">{t('toolBeacons')}</TabsTrigger>
                </TabsList>

                <TabsContent value="beacons" className="space-y-3 pt-3">
                  {beacons.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('noBeaconsOnPlan')}</p>
                  ) : (
                    <>
                      <Label htmlFor="beacon">{t('pickBeacon')}</Label>
                      <select
                        id="beacon"
                        className={selectClass}
                        value={beaconId}
                        onChange={(event) => setBeaconId(event.target.value)}
                      >
                        <option value="">-</option>
                        {beacons.map((beacon) => (
                          <option key={beacon.id} value={beacon.id}>
                            {beacon.identifier}
                            {beacon.mapX !== null ? ` (${beacon.mapX}, ${beacon.mapY})` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">{t('beaconHint')}</p>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="zones" className="space-y-3 pt-3">
                  <Label htmlFor="zone">{t('pickZone')}</Label>
                  <select
                    id="zone"
                    className={selectClass}
                    value={zoneId}
                    onChange={(event) => {
                      setZoneId(event.target.value);
                      setDraft(null);
                    }}
                  >
                    <option value="">-</option>
                    {(zonesQuery.data?.items ?? []).map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.code} · {zone.name}
                        {zone.floorPlanId === planId ? '' : ` (${t('notOnPlan')})`}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    {(['circle', 'polygon'] as const).map((type) => (
                      <Button
                        key={type}
                        size="sm"
                        variant={shapeType === type ? 'default' : 'outline'}
                        onClick={() => {
                          setShapeType(type);
                          setDraft(null);
                        }}
                      >
                        {t(type)}
                      </Button>
                    ))}
                  </div>
                  {shapeType === 'circle' ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="radius">{t('radius')}</Label>
                      <Input
                        id="radius"
                        type="number"
                        step="0.1"
                        min="0.2"
                        value={radius}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          setRadius(value);
                          setDraft((current) =>
                            current?.type === 'circle' ? { ...current, r: value } : current,
                          );
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setDraft((current) =>
                            current?.type === 'polygon'
                              ? { type: 'polygon', points: current.points.slice(0, -1) }
                              : current,
                          )
                        }
                      >
                        {t('undo')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDraft(null)}>
                        {t('clear')}
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{t('zoneHint')}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={
                        !selectedZone ||
                        !draft ||
                        (draft.type === 'polygon' && draft.points.length < 3)
                      }
                      onClick={() =>
                        selectedZone &&
                        saveZone.mutate({
                          id: selectedZone.id,
                          floorPlanId: planId,
                          mapShape: draft,
                        })
                      }
                    >
                      {t('saveZone')}
                    </Button>
                    {selectedZone?.floorPlanId === planId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveZone.mutate({ id: selectedZone.id, floorPlanId: null })}
                      >
                        {t('removeFromPlan')}
                      </Button>
                    ) : null}
                  </div>
                </TabsContent>

                <TabsContent value="points" className="space-y-3 pt-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{t('pointKind')}</span>
                    {(['REFERENCE', 'TEST'] as const).map((kind) => (
                      <Button
                        key={kind}
                        size="sm"
                        variant={pointKind === kind ? 'default' : 'outline'}
                        onClick={() => setPointKind(kind)}
                      >
                        {kind === 'REFERENCE' ? t('reference') : t('test')}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{t('pointHint')}</p>
                  <form
                    className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      generateGrid.mutate({
                        spacing: Number(form.get('spacing')),
                        margin: Number(form.get('margin')),
                      });
                    }}
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="spacing">{t('spacing')}</Label>
                      <Input
                        id="spacing"
                        name="spacing"
                        type="number"
                        step="0.25"
                        min="0.25"
                        defaultValue="1"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="margin">{t('margin')}</Label>
                      <Input
                        id="margin"
                        name="margin"
                        type="number"
                        step="0.1"
                        min="0"
                        defaultValue="0.5"
                      />
                    </div>
                    <Button type="submit" variant="outline" disabled={generateGrid.isPending}>
                      <Grid3x3 className="h-4 w-4" />
                      {t('grid')}
                    </Button>
                  </form>

                  {selectedPoint ? (
                    <div className="space-y-2 rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {t('selectedPoint', { label: selectedPoint.label })}{' '}
                          <span className="text-sm text-muted-foreground">
                            ({selectedPoint.x}, {selectedPoint.y})
                          </span>
                        </p>
                        <Badge variant={selectedPoint.kind === 'TEST' ? 'warning' : 'secondary'}>
                          {selectedPoint.kind === 'TEST' ? t('test') : t('reference')}
                        </Badge>
                      </div>
                      <p className="text-xs font-medium">{t('captures')}</p>
                      {selectedPoint.captures.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t('noCaptures')}</p>
                      ) : (
                        <ul className="space-y-1 text-xs">
                          {selectedPoint.captures.map((capture) => (
                            <li
                              key={capture.id}
                              className="flex items-center justify-between gap-2"
                            >
                              <span>
                                {capture.deviceModel}
                                {capture.orientationDeg !== null
                                  ? ` · ${capture.orientationDeg}°`
                                  : ''}{' '}
                                · {Math.round(capture.durationMs / 1000)} s ·{' '}
                                {formatDateTime(capture.createdAt)}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteCapture.mutate(capture.id)}
                              >
                                {t('deleteCapture')}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deletePoint.mutate(selectedPoint.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t('deletePoint')}
                      </Button>
                    </div>
                  ) : null}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={onSavePlan} key={plan.id + plan.widthMeters}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="name">{t('name')}</Label>
                    <Input id="name" name="name" defaultValue={plan.name} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="width">{t('width')}</Label>
                    <Input
                      id="width"
                      name="width"
                      type="number"
                      step="0.1"
                      defaultValue={plan.widthMeters}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="height">{t('height')}</Label>
                    <Input
                      id="height"
                      name="height"
                      type="number"
                      step="0.1"
                      defaultValue={plan.heightMeters}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="level">{t('level')}</Label>
                    <Input id="level" name="level" defaultValue={plan.level ?? ''} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="k">{t('k')}</Label>
                    <Input
                      id="k"
                      name="k"
                      type="number"
                      min="1"
                      max="15"
                      defaultValue={plan.positioningK}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="fill">{t('fill')}</Label>
                    <Input
                      id="fill"
                      name="fill"
                      type="number"
                      min="-127"
                      max="-60"
                      defaultValue={plan.fillDbm}
                    />
                    <p className="text-xs text-muted-foreground">{t('fillHint')}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{t('kHint')}</p>
                <Button type="submit" disabled={savePlan.isPending}>
                  {t('save')}
                </Button>
              </form>
              <div className="mt-4 space-y-2 border-t pt-4">
                <Label>{t('background')}</Label>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <label className="cursor-pointer">
                      <Upload className="h-4 w-4" />
                      {t('uploadImage')}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => void onUpload(event.target.files?.[0])}
                      />
                    </label>
                  </Button>
                  {plan.imageUrl ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => savePlan.mutate({ imageUrl: null })}
                    >
                      {t('removeImage')}
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('coverage')}</CardTitle>
          <CardDescription>{t('coverageHint')}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('points')}</TableHead>
                <TableHead />
                {deviceList.map((device) => (
                  <TableHead key={device} className="text-center">
                    {device}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.surveyPoints.map((point) => (
                <TableRow
                  key={point.id}
                  className={point.id === selectedPointId ? 'bg-muted/60' : undefined}
                  onClick={() => {
                    setTool('points');
                    setSelectedPointId(point.id);
                  }}
                >
                  <TableCell className="font-medium">
                    {point.label}{' '}
                    <span className="text-xs text-muted-foreground">
                      ({point.x}, {point.y})
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={point.kind === 'TEST' ? 'warning' : 'secondary'}>
                      {point.kind === 'TEST' ? t('test') : t('reference')}
                    </Badge>
                  </TableCell>
                  {deviceList.map((device) => {
                    const count = coverage.get(point.id)?.get(device) ?? 0;
                    return (
                      <TableCell key={device} className="text-center">
                        {count > 0 ? count : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
