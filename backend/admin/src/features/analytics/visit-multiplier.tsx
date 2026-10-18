'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { analyticsCopy } from './copy';
import { AnalyticsSettings } from './types';

export function VisitMultiplier({ value }: { value: number }) {
  const { language } = useI18n();
  const copy = analyticsCopy[language];
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const current = draft ?? String(value);
  const save = useMutation({
    mutationFn: (visitMultiplier: number) =>
      apiFetch<AnalyticsSettings>('/admin/analytics/settings', {
        method: 'PATCH',
        body: { visitMultiplier },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['visit-analytics'] });
      setDraft(null);
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = Number(current);
    if (!Number.isInteger(next) || next < 1 || next > 100) return;
    save.mutate(next);
  }

  return (
    <form onSubmit={submit} className="space-y-2 border-y border-border py-4">
      <div className="flex flex-wrap items-end gap-3">
        <label htmlFor="visit-multiplier" className="space-y-1 text-sm">
          <span className="block font-medium">{copy.multiplier}</span>
          <Input
            id="visit-multiplier"
            type="number"
            min={1}
            max={100}
            step={1}
            required
            value={current}
            disabled={save.isPending}
            aria-describedby="multiplier-hint multiplier-range"
            onChange={(event) => {
              setDraft(event.target.value);
              save.reset();
            }}
            className="w-28 text-base tabular-nums"
          />
        </label>
        <Button type="submit" variant="outline" disabled={save.isPending || Number(current) === value}>
          {save.isPending ? copy.saving : copy.saveMultiplier}
        </Button>
        <p id="multiplier-range" className="pb-2 text-sm text-muted-foreground">
          {copy.multiplierRange}
        </p>
      </div>
      <p id="multiplier-hint" className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {copy.multiplierHint}
      </p>
      {save.isError ? <p role="alert" className="text-sm text-destructive">{copy.saveError}</p> : null}
      <p role="status" className="text-sm">{save.isSuccess ? copy.saved : ''}</p>
    </form>
  );
}
