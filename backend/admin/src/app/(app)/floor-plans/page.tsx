'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { useFloorPlanI18n } from '@/features/floor-plans/i18n';
import { FloorPlanSummary } from '@/features/floor-plans/types';
import { DxfImportDialog } from '@/features/floor-plans/ui/dxf-import-dialog';
import { ApiError, apiFetch, apiUpload } from '@/lib/api-client';

export default function FloorPlansPage() {
  const { t } = useFloorPlanI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const plansQuery = useQuery({
    queryKey: ['floor-plans'],
    queryFn: () => apiFetch<FloorPlanSummary[]>('/admin/floor-plans'),
  });

  const createPlan = useMutation({
    mutationFn: (body: {
      code: string;
      name: string;
      level?: string;
      widthMeters: number;
      heightMeters: number;
    }) => apiFetch<FloorPlanSummary>('/admin/floor-plans', { method: 'POST', body }),
    onSuccess: (plan) => {
      toast.success(t('floorPlanCreated', { code: plan.code }));
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['floor-plans'] });
      router.push(`/floor-plans/${plan.id}`);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : String(error)),
  });

  const onCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createPlan.mutate({
      code: String(form.get('code') ?? '').toUpperCase(),
      name: String(form.get('name') ?? ''),
      level: String(form.get('level') ?? '') || undefined,
      widthMeters: Number(form.get('width')),
      heightMeters: Number(form.get('height')),
    });
  };

  const plans = plansQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold">{t('floorPlans')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t('floorPlansDescription')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DxfImportDialog
            create
            onApply={async (file, drawing, identity) => {
              const stored = await apiUpload(file);
              const plan = await apiFetch<FloorPlanSummary>('/admin/floor-plans', {
                method: 'POST',
                body: {
                  ...identity,
                  imageUrl: stored.url,
                  widthMeters: drawing.widthMeters,
                  heightMeters: drawing.heightMeters,
                },
              });
              toast.success(t('floorPlanCreated', { code: plan.code }));
              void queryClient.invalidateQueries({ queryKey: ['floor-plans'] });
              router.push(`/floor-plans/${plan.id}`);
            }}
          />
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('newFloorPlan')}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {plansQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : plans.length === 0 ? (
            <EmptyState title={t('noFloorPlans')} description={t('noFloorPlansHint')} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('code')}</TableHead>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('size')}</TableHead>
                  <TableHead>{t('zones')}</TableHead>
                  <TableHead>{t('points')}</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-mono text-xs">{plan.code}</TableCell>
                    <TableCell>
                      {plan.name}
                      {plan.level ? (
                        <span className="text-muted-foreground"> · {plan.level}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {plan.widthMeters} × {plan.heightMeters} m
                    </TableCell>
                    <TableCell>{plan._count.zones}</TableCell>
                    <TableCell>{plan._count.surveyPoints}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/floor-plans/${plan.id}`}>{t('open')}</Link>
                      </Button>
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
          <form onSubmit={onCreate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t('newFloorPlan')}</DialogTitle>
              <DialogDescription>{t('floorPlansDescription')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="code">{t('code')}</Label>
                <Input id="code" name="code" placeholder="DEMO_ROOM" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">{t('name')}</Label>
                <Input id="name" name="name" placeholder="Demo room" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="width">{t('width')}</Label>
                <Input
                  id="width"
                  name="width"
                  type="number"
                  step="0.1"
                  min="0.5"
                  defaultValue="5"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="height">{t('height')}</Label>
                <Input
                  id="height"
                  name="height"
                  type="number"
                  step="0.1"
                  min="0.5"
                  defaultValue="5"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="level">{t('level')}</Label>
                <Input id="level" name="level" placeholder="1" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createPlan.isPending}>
                {t('createFloorPlan')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
